import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { cartItems } from "../db/schema.js";
import {
  assertProductAvailable,
  getCartWithItems,
  getOrCreateCart,
} from "../services/cart.js";

const router = Router();

router.get("/", async (req, res) => {
  const cart = await getCartWithItems(req);
  res.json(cart);
});

router.post("/items", async (req, res) => {
  const schema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).default(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const product = await assertProductAvailable(parsed.data.productId, parsed.data.quantity);
  if (!product) {
    return res.status(400).json({ error: "Product unavailable" });
  }

  const cart = await getOrCreateCart(req);
  const existing = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, product.id)),
  });

  if (existing) {
    const nextQty = existing.quantity + parsed.data.quantity;
    if (product.fulfillment !== "digital" && nextQty > product.stock) {
      return res.status(400).json({ error: "Not enough stock" });
    }
    await db.update(cartItems).set({ quantity: nextQty }).where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      productId: product.id,
      quantity: parsed.data.quantity,
    });
  }

  res.status(201).json(await getCartWithItems(req));
});

router.patch("/items/:id", async (req, res) => {
  const schema = z.object({ quantity: z.number().int().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid quantity" });
  }

  const cart = await getOrCreateCart(req);
  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, req.params.id), eq(cartItems.cartId, cart.id)),
    with: { product: true },
  });
  if (!item || !item.product) {
    return res.status(404).json({ error: "Item not found" });
  }
  if (item.product.fulfillment !== "digital" && parsed.data.quantity > item.product.stock) {
    return res.status(400).json({ error: "Not enough stock" });
  }

  await db
    .update(cartItems)
    .set({ quantity: parsed.data.quantity })
    .where(eq(cartItems.id, item.id));

  res.json(await getCartWithItems(req));
});

router.delete("/items/:id", async (req, res) => {
  const cart = await getOrCreateCart(req);
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, req.params.id), eq(cartItems.cartId, cart.id)));
  res.json(await getCartWithItems(req));
});

export default router;
