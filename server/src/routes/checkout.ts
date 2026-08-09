import { Router } from "express";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db/index.js";
import { orderItems, orders, products } from "../db/schema.js";
import { clearCart, getCartWithItems } from "../services/cart.js";
import { markOrderPaid } from "../services/orders.js";
import { notifyOrderEvent } from "../lib/notify.js";
import { initializeTransaction, isPaystackConfigured, verifyTransaction } from "../lib/paystack.js";
import { paymentInstructions, shippingPesewasForRegion } from "../lib/utils.js";
import { getCartSessionId, type AuthedRequest } from "../middleware/auth.js";

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
  phone: z.string().optional(),
  paymentMethod: z.enum(["momo", "bank", "pickup", "paystack"]),
  paymentNote: z.string().optional(),
  shipping: shippingSchema.optional(),
});

router.get("/payment-info", (_req, res) => {
  res.json(paymentInstructions());
});

router.post("/", async (req: AuthedRequest, res) => {
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

  if (cart.needsShipping && !parsed.data.shipping && parsed.data.paymentMethod !== "pickup") {
    return res.status(400).json({ error: "Shipping address required for delivery" });
  }

  if (cart.needsShipping && parsed.data.paymentMethod === "pickup" && !parsed.data.phone) {
    return res.status(400).json({ error: "Phone required for pickup orders" });
  }

  const shippingPesewas =
    cart.needsShipping && parsed.data.paymentMethod !== "pickup" && parsed.data.shipping
      ? shippingPesewasForRegion(parsed.data.shipping.region)
      : 0;

  const totalPesewas = cart.subtotalPesewas + shippingPesewas;
  const status =
    parsed.data.paymentMethod === "pickup" ? "awaiting_pickup" : "pending_payment";

  const paystackReference =
    parsed.data.paymentMethod === "paystack" ? `me_${nanoid(16)}` : null;

  const productRows = await Promise.all(
    cart.items.map((line) =>
      db.query.products.findFirst({ where: eq(products.id, line.product.id) }),
    ),
  );

  const [order] = await db
    .insert(orders)
    .values({
      userId: req.user?.id ?? null,
      sessionId: getCartSessionId(req),
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      name: parsed.data.name,
      status,
      paymentMethod: parsed.data.paymentMethod,
      subtotalPesewas: cart.subtotalPesewas,
      shippingPesewas,
      totalPesewas,
      currency: "GHS",
      shipping:
        cart.needsShipping && parsed.data.paymentMethod !== "pickup"
          ? parsed.data.shipping ?? null
          : null,
      paymentNote: parsed.data.paymentNote,
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

  await clearCart(cart.cartId);
  await notifyOrderEvent(order, "created");

  if (parsed.data.paymentMethod === "paystack" && paystackReference) {
    try {
      const init = await initializeTransaction({
        email: order.email,
        amountPesewas: order.totalPesewas,
        reference: paystackReference,
        metadata: { orderId: order.id },
      });

      if (!init) {
        return res.status(503).json({
          error: "Paystack is not configured",
          order: {
            id: order.id,
            status: order.status,
            paymentMethod: order.paymentMethod,
            totalPesewas: order.totalPesewas,
            currency: order.currency,
            paystackReference,
          },
        });
      }

      return res.status(201).json({
        order: {
          id: order.id,
          status: order.status,
          paymentMethod: order.paymentMethod,
          totalPesewas: order.totalPesewas,
          currency: order.currency,
          paystackReference,
        },
        authorizationUrl: init.authorization_url,
        authorization_url: init.authorization_url,
        access_code: init.access_code,
        reference: init.reference,
      });
    } catch (err) {
      console.error("[paystack] initialize error", err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : "Paystack initialize failed",
        order: {
          id: order.id,
          status: order.status,
          paymentMethod: order.paymentMethod,
          totalPesewas: order.totalPesewas,
          currency: order.currency,
          paystackReference,
        },
      });
    }
  }

  res.status(201).json({
    order: {
      id: order.id,
      status: order.status,
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

    if (verified.amount < order.totalPesewas) {
      return res.status(402).json({ error: "Paid amount mismatch" });
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
