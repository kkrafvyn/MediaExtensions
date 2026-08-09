import { db } from "../db/index.js";
import { notifications, type Order } from "../db/schema.js";
import { formatGhs } from "./utils.js";

function storeWhatsAppDigits(): string {
  return (process.env.STORE_WHATSAPP ?? "").replace(/\D/g, "");
}

export function whatsappLink(message: string, phone?: string): string {
  const digits = (phone ?? storeWhatsAppDigits()).replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export async function notifyWhatsApp(opts: {
  phone: string;
  message: string;
  subject?: string;
  meta?: Record<string, unknown>;
}) {
  const link = whatsappLink(opts.message, opts.phone);
  const [row] = await db
    .insert(notifications)
    .values({
      channel: "whatsapp",
      recipient: opts.phone,
      subject: opts.subject ?? null,
      body: opts.message,
      meta: { ...opts.meta, waLink: link },
    })
    .returning();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[notify:whatsapp] ${opts.phone}: ${opts.message}`);
    console.log(`[notify:whatsapp] link: ${link}`);
  }

  return { notification: row, waLink: link };
}

export type OrderEvent = "created" | "paid" | "fulfilled" | "cancelled";

export async function notifyOrderEvent(
  order: Pick<
    Order,
    | "id"
    | "email"
    | "name"
    | "phone"
    | "status"
    | "paymentMethod"
    | "totalPesewas"
    | "currency"
  >,
  event: OrderEvent,
) {
  const total = formatGhs(order.totalPesewas);
  const shortId = order.id.slice(0, 8);

  const customerMessage =
    event === "created"
      ? `Hi ${order.name}, your Media Extensions order #${shortId} (${total}) was placed. Payment: ${order.paymentMethod}. Status: ${order.status}.`
      : event === "paid"
        ? `Hi ${order.name}, payment received for order #${shortId} (${total}). Thank you!`
        : event === "fulfilled"
          ? `Hi ${order.name}, order #${shortId} has been fulfilled.`
          : `Hi ${order.name}, order #${shortId} was cancelled.`;

  const staffMessage = `[Media Extensions] Order ${event}: #${shortId} | ${order.name} <${order.email}> | ${total} | ${order.paymentMethod} | ${order.status}`;

  const staffPhone = storeWhatsAppDigits();
  const staffWa = await notifyWhatsApp({
    phone: staffPhone || "staff",
    message: staffMessage,
    subject: `Order ${event}`,
    meta: { orderId: order.id, event, role: "staff" },
  });

  if (order.phone) {
    await notifyWhatsApp({
      phone: order.phone,
      message: customerMessage,
      subject: `Order ${event}`,
      meta: { orderId: order.id, event, role: "customer" },
    });
  }

  await db.insert(notifications).values({
    channel: "log",
    recipient: order.email,
    subject: `Order ${event}`,
    body: customerMessage,
    meta: {
      orderId: order.id,
      event,
      staffWaLink: staffWa.waLink,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[notify:order:${event}]`, customerMessage);
  }

  return { staffWaLink: staffWa.waLink };
}
