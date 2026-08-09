import { nanoid } from "nanoid";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  downloadTokens,
  orderItems,
  orders,
  products,
} from "../db/schema.js";
import { notifyOrderEvent } from "../lib/notify.js";

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

export async function markOrderPaid(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) return null;

  if (order.status === "paid" || order.status === "fulfilled") {
    return order;
  }

  await db
    .update(orders)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  for (const item of order.items) {
    if (
      item.productId &&
      (item.fulfillment === "physical" || item.fulfillment === "both")
    ) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      if (product) {
        await db
          .update(products)
          .set({ stock: Math.max(0, product.stock - item.quantity) })
          .where(eq(products.id, product.id));
      }
    }
  }

  await mintDownloadTokensForOrder(orderId);
  const updated = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { with: { downloadTokens: true } } },
  });
  if (updated) {
    await notifyOrderEvent(updated, "paid");
  }
  return updated;
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

export async function fulfillOrder(orderId: string) {
  await db
    .update(orders)
    .set({ status: "fulfilled", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["paid", "awaiting_pickup"])));
}
