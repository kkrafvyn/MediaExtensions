import { nanoid } from "nanoid";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  downloadTokens,
  orderItems,
  orders,
  products,
} from "../db/schema.js";
import { availableStock } from "../lib/inventory.js";
import { notifyOrderEvent } from "../lib/notify.js";
import { sendDownloadLinks, sendOrderConfirmation } from "../lib/mailer.js";
import { formatGhs } from "../lib/utils.js";

function needsPhysicalStock(fulfillment: string): boolean {
  return fulfillment === "physical" || fulfillment === "both";
}

export async function mintDownloadTokensForOrder(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  for (const item of items) {
    if (
      (item.fulfillment === "digital" || item.fulfillment === "both") &&
      item.digitalAssetPath
    ) {
      const existing = await db.query.downloadTokens.findFirst({
        where: eq(downloadTokens.orderItemId, item.id),
      });
      if (existing) continue;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);
      await db.insert(downloadTokens).values({
        orderItemId: item.id,
        token: nanoid(32),
        expiresAt,
        maxDownloads: 5,
      });
    }
  }
}

/** Hold physical stock for a newly placed unpaid/pending order. */
export async function reserveStockForOrder(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  for (const item of items) {
    if (!item.productId || !needsPhysicalStock(item.fulfillment)) continue;

    const product = await db.query.products.findFirst({
      where: eq(products.id, item.productId),
    });
    if (!product) continue;
    if (availableStock(product) < item.quantity) {
      throw new Error(`Insufficient stock for ${item.name}`);
    }

    await db
      .update(products)
      .set({ reserved: sql`${products.reserved} + ${item.quantity}` })
      .where(eq(products.id, product.id));
  }
}

/** Release holds when an unpaid order is cancelled. */
export async function releaseStockReservation(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  for (const item of items) {
    if (!item.productId || !needsPhysicalStock(item.fulfillment)) continue;
    await db
      .update(products)
      .set({
        reserved: sql`GREATEST(0, ${products.reserved} - ${item.quantity})`,
      })
      .where(eq(products.id, item.productId));
  }
}

/**
 * Convert reservation into sold units after payment.
 * Decrements both stock and reserved so available stays consistent.
 */
export async function finalizeStockReservation(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  for (const item of items) {
    if (!item.productId || !needsPhysicalStock(item.fulfillment)) continue;
    await db
      .update(products)
      .set({
        stock: sql`GREATEST(0, ${products.stock} - ${item.quantity})`,
        reserved: sql`GREATEST(0, ${products.reserved} - ${item.quantity})`,
      })
      .where(eq(products.id, item.productId));
  }
}

/** Restock units when a paid order is cancelled. */
export async function restockPaidOrder(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  for (const item of items) {
    if (!item.productId || !needsPhysicalStock(item.fulfillment)) continue;
    await db
      .update(products)
      .set({ stock: sql`${products.stock} + ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }
}

export async function getOrderDownloads(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
    with: { downloadTokens: true },
  });
  return items.flatMap((item) =>
    item.downloadTokens.map((t) => ({
      token: t.token,
      productName: item.name,
      expiresAt: t.expiresAt,
      downloadCount: t.downloadCount,
      maxDownloads: t.maxDownloads,
    })),
  );
}

async function emailOrderPaid(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) return;

  const downloads = await getOrderDownloads(orderId);
  const clientUrl = (process.env.CLIENT_URL ?? "http://localhost:5173").replace(/\/+$/, "");
  const apiBase = (process.env.API_PUBLIC_URL ?? process.env.CLIENT_URL ?? "http://localhost:4000").replace(
    /\/+$/,
    "",
  );

  const itemLines = order.items
    .map((item) => `• ${item.name} × ${item.quantity} — ${formatGhs(item.unitPricePesewas * item.quantity)}`)
    .join("\n");

  await sendOrderConfirmation({
    to: order.email,
    name: order.name,
    orderId: order.id,
    totalFormatted: formatGhs(order.totalPesewas),
    paymentMethod: order.paymentMethod,
    itemLines,
    trackUrl: `${clientUrl}/track`,
  });

  if (downloads.length > 0) {
    await sendDownloadLinks({
      to: order.email,
      name: order.name,
      orderId: order.id,
      links: downloads.map((d) => ({
        productName: d.productName,
        url: `${apiBase}/api/downloads/${d.token}`,
        expiresAt: d.expiresAt,
      })),
      vaultUrl: `${clientUrl}/account`,
    });
  }
}

export async function markOrderPaid(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) return null;

  if (order.status === "paid" || order.status === "fulfilled") {
    return order;
  }

  const wasHolding =
    order.status === "pending_payment" || order.status === "awaiting_pickup";

  await db
    .update(orders)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  if (wasHolding) {
    await finalizeStockReservation(orderId);
  } else {
    // Legacy path: no reservation existed — decrement stock only.
    for (const item of order.items) {
      if (!item.productId || !needsPhysicalStock(item.fulfillment)) continue;
      await db
        .update(products)
        .set({ stock: sql`GREATEST(0, ${products.stock} - ${item.quantity})` })
        .where(eq(products.id, item.productId));
    }
  }

  await mintDownloadTokensForOrder(orderId);
  const updated = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { with: { downloadTokens: true } } },
  });
  if (updated) {
    await notifyOrderEvent(updated, "paid");
    try {
      await emailOrderPaid(orderId);
    } catch (err) {
      console.error("[orders] paid email failed", err);
    }
  }
  return updated;
}

export async function cancelOrder(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) return null;
  if (order.status === "cancelled") return order;

  const previous = order.status;

  await db
    .update(orders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  if (previous === "pending_payment" || previous === "awaiting_pickup") {
    await releaseStockReservation(orderId);
  } else if (previous === "paid" || previous === "fulfilled") {
    await restockPaidOrder(orderId);
  }

  const updated = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (updated) {
    await notifyOrderEvent(updated, "cancelled");
  }
  return updated;
}

export async function fulfillOrder(orderId: string) {
  await db
    .update(orders)
    .set({ status: "fulfilled", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["paid", "awaiting_pickup"])));
}
