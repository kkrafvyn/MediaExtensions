import { Router } from "express";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index.js";
import { orderItems, orders, products } from "../db/schema.js";
import { clearCart, getCartWithItems } from "../services/cart.js";
import { markOrderPaid, reserveStockForOrder } from "../services/orders.js";
import { notifyOrderEvent } from "../lib/notify.js";
import { availableStock } from "../lib/inventory.js";
import { ensureStoreConfig } from "../lib/storeConfig.js";
import { initializeTransaction, isPaystackConfigured, verifyTransaction } from "../lib/paystack.js";
import { paymentInstructions, shippingPesewasForRegion } from "../lib/utils.js";
import { getCartSessionId, type AuthedRequest } from "../middleware/auth.js";
import { grantOrderAccess } from "../services/guestLinking.js";

const router = Router();

const shippingSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(8),
  street: z.string().min(1),
  city: z.string().min(1),
  region: z.string().min(1),
  landmark: z.string().optional(),
});

const checkoutSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().min(8),
  fulfillmentMethod: z.enum(["digital", "delivery", "pickup"]).optional(),
  paymentMethod: z.enum(["momo", "bank", "pickup", "pay_on_pickup", "paystack"]),
  paymentNote: z.string().trim().max(200).optional(),
  shipping: shippingSchema.optional(),
});

router.get("/payment-info", (_req, res) => {
  res.json(paymentInstructions());
});

router.post("/", async (req: AuthedRequest, res) => {
  await ensureStoreConfig();
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid checkout data", details: parsed.error.flatten() });
  }

  if (parsed.data.paymentMethod === "paystack" && !isPaystackConfigured()) {
    return res.status(503).json({ error: "Paystack is not configured" });
  }

  const cart = await getCartWithItems(req);
  if (cart.items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  const fulfillmentMethod = parsed.data.fulfillmentMethod ?? (
    parsed.data.paymentMethod === "pickup" ? "pickup" : cart.needsShipping ? "delivery" : "digital"
  );
  const paymentMethod = parsed.data.paymentMethod === "pickup" ? "pay_on_pickup" : parsed.data.paymentMethod;
  if ((cart.needsShipping && fulfillmentMethod === "digital") || (!cart.needsShipping && fulfillmentMethod !== "digital")) {
    return res.status(400).json({ error: "Fulfillment choice does not match the items in your cart" });
  }
  if (paymentMethod === "pay_on_pickup" && fulfillmentMethod !== "pickup") {
    return res.status(400).json({ error: "Pay on pickup requires in-store pickup" });
  }
  const requiresShipping = fulfillmentMethod === "delivery";
  if (requiresShipping && !parsed.data.shipping) {
    return res.status(400).json({ error: "Shipping address required for delivery" });
  }

  const shippingPesewas =
    requiresShipping && parsed.data.shipping
      ? shippingPesewasForRegion(parsed.data.shipping.region)
      : 0;

  const totalPesewas = cart.subtotalPesewas + shippingPesewas;
  const status = "pending_payment";

  const paystackReference =
    paymentMethod === "paystack" ? `me_${nanoid(16)}` : null;

  const productRows = await Promise.all(
    cart.items.map((line) =>
      db.query.products.findFirst({ where: eq(products.id, line.product.id) }),
    ),
  );

  if (productRows.some((product) => !product || !product.active)) {
    return res.status(409).json({ error: "One or more items are no longer available" });
  }
  if (
    productRows.some(
      (product, index) =>
        product &&
        product.fulfillment !== "digital" &&
        availableStock(product) < cart.items[index].quantity,
    )
  ) {
    return res.status(409).json({ error: "One or more items no longer have enough stock" });
  }

  // Initialize online payment before consuming the cart. A provider failure leaves
  // the customer's basket intact so they can retry or choose another method.
  let paystackInit: Awaited<ReturnType<typeof initializeTransaction>> = null;
  if (paymentMethod === "paystack" && paystackReference) {
    try {
      paystackInit = await initializeTransaction({
        email: parsed.data.email.toLowerCase(),
        amountPesewas: totalPesewas,
        reference: paystackReference,
      });
    } catch (err) {
      console.error("[paystack] initialize error", err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : "Unable to start secure payment",
      });
    }
    if (!paystackInit) {
      return res.status(503).json({ error: "Paystack is not configured" });
    }
  }

  const [order] = await db
    .insert(orders)
    .values({
      userId: req.user?.id ?? null,
      sessionId: getCartSessionId(req),
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      name: parsed.data.name,
      status,
      fulfillmentMethod,
      fulfillmentStatus: fulfillmentMethod === "digital" ? "not_required" : "unfulfilled",
      paymentMethod,
      subtotalPesewas: cart.subtotalPesewas,
      shippingPesewas,
      totalPesewas,
      currency: "GHS",
      shipping: requiresShipping ? parsed.data.shipping ?? null : null,
      paymentNote: parsed.data.paymentNote || null,
      paystackReference,
    })
    .returning();

  await db.insert(orderItems).values(
    cart.items.map((line, index) => ({
      orderId: order.id,
      productId: line.product.id,
      name: line.product.name,
      slug: line.product.slug,
      quantity: line.quantity,
      unitPricePesewas: line.product.pricePesewas,
      fulfillment: line.product.fulfillment,
      digitalAssetPath: productRows[index]?.digitalAssetPath ?? null,
    })),
  );

  try {
    await reserveStockForOrder(order.id);
  } catch (err) {
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
    await db.delete(orders).where(eq(orders.id, order.id));
    return res.status(409).json({
      error: err instanceof Error ? err.message : "Unable to reserve stock",
    });
  }

  await clearCart(cart.cartId);
  grantOrderAccess(req, order.id);
  await notifyOrderEvent(order, "created");

  if (paystackInit) {
      return res.status(201).json({
        order: {
          id: order.id,
          status: order.status,
          fulfillmentMethod: order.fulfillmentMethod,
          paymentMethod: order.paymentMethod,
          totalPesewas: order.totalPesewas,
          currency: order.currency,
          paystackReference,
        },
        authorizationUrl: paystackInit.authorization_url,
        authorization_url: paystackInit.authorization_url,
        access_code: paystackInit.access_code,
        reference: paystackInit.reference,
      });
  }

  res.status(201).json({
    order: {
      id: order.id,
      status: order.status,
      fulfillmentMethod: order.fulfillmentMethod,
      paymentMethod: order.paymentMethod,
      totalPesewas: order.totalPesewas,
      currency: order.currency,
    },
    paymentInstructions: paymentInstructions(),
  });
});

router.post("/paystack/verify", async (req, res) => {
  const schema = z.object({ reference: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "reference required" });
  }

  if (!isPaystackConfigured()) {
    return res.status(503).json({ error: "Paystack is not configured" });
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.paystackReference, parsed.data.reference),
    with: { items: true },
  });
  if (!order) {
    return res.status(404).json({ error: "Order not found for reference" });
  }

  try {
    const verified = await verifyTransaction(parsed.data.reference);
    if (!verified) {
      return res.status(503).json({ error: "Paystack is not configured" });
    }

    if (verified.status !== "success") {
      return res.status(402).json({
        error: "Payment not successful",
        status: verified.status,
        order: { id: order.id, status: order.status },
      });
    }

    if (verified.amount !== order.totalPesewas || verified.currency !== "GHS") {
      return res.status(402).json({ error: "Paid amount or currency mismatch" });
    }

    const updated = await markOrderPaid(order.id);
    return res.json({
      ok: true,
      order: updated,
      paystack: {
        reference: verified.reference,
        amount: verified.amount,
        currency: verified.currency,
      },
    });
  } catch (err) {
    console.error("[paystack] verify error", err);
    return res.status(502).json({
      error: err instanceof Error ? err.message : "Paystack verify failed",
    });
  }
});

export default router;
