import { and, eq, isNull } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../db/index.js";
import { cartItems, carts, products } from "../db/schema.js";
import { getCartSessionId } from "../middleware/auth.js";

export async function getOrCreateCart(req: Request) {
  const userId = req.session.userId;
  const sessionId = getCartSessionId(req);

  let cart = userId
    ? await db.query.carts.findFirst({ where: eq(carts.userId, userId) })
    : await db.query.carts.findFirst({ where: eq(carts.sessionId, sessionId) });

  if (!cart) {
    const [created] = await db
      .insert(carts)
      .values(userId ? { userId, sessionId } : { sessionId })
      .returning();
    cart = created;
  }

  return cart;
}

export async function getCartWithItems(req: Request) {
  const cart = await getOrCreateCart(req);
  const items = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cart.id),
    with: { product: true },
  });

  const lines = items
    .filter((i) => i.product && i.product.active)
    .map((i) => ({
      id: i.id,
      quantity: i.quantity,
      product: {
        id: i.product!.id,
        name: i.product!.name,
        slug: i.product!.slug,
        pricePesewas: i.product!.pricePesewas,
        images: i.product!.images,
        fulfillment: i.product!.fulfillment,
        stock: i.product!.stock,
      },
      lineTotalPesewas: i.quantity * i.product!.pricePesewas,
    }));

  const subtotalPesewas = lines.reduce((sum, l) => sum + l.lineTotalPesewas, 0);
  const needsShipping = lines.some(
    (l) => l.product.fulfillment === "physical" || l.product.fulfillment === "both",
  );

  return { cartId: cart.id, items: lines, subtotalPesewas, needsShipping, itemCount: lines.reduce((s, l) => s + l.quantity, 0) };
}

export async function mergeGuestCartIntoUser(req: Request, userId: string) {
  const sessionId = req.session.cartSessionId;
  if (!sessionId) return;

  const guestCart = await db.query.carts.findFirst({
    where: and(eq(carts.sessionId, sessionId), isNull(carts.userId)),
  });
  if (!guestCart) return;

  let userCart = await db.query.carts.findFirst({ where: eq(carts.userId, userId) });
  if (!userCart) {
    const [created] = await db
      .insert(carts)
      .values({ userId, sessionId })
      .returning();
    userCart = created;
  }

  const guestItems = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, guestCart.id),
  });

  for (const item of guestItems) {
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.cartId, userCart.id), eq(cartItems.productId, item.productId)),
    });
    if (existing) {
      await db
        .update(cartItems)
        .set({ quantity: existing.quantity + item.quantity })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId: userCart.id,
        productId: item.productId,
        quantity: item.quantity,
      });
    }
  }

  await db.delete(carts).where(eq(carts.id, guestCart.id));
}

export async function clearCart(cartId: string) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}

export async function assertProductAvailable(productId: string, quantity: number) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.active, true)),
  });
  if (!product) return null;
  if (product.fulfillment !== "digital" && product.stock < quantity) {
    return null;
  }
  return product;
}
