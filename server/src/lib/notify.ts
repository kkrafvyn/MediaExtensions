import { db } from "../db/index.js";
import { notifications, type Order, type RepairOrder } from "../db/schema.js";
import { formatGhs } from "./utils.js";
import {
  agentPhoneNumbers,
  isWhatsAppConfigured,
  normalizeWhatsAppPhone,
  sendWhatsAppText,
  shouldNotifyCustomers,
  whatsappLink,
} from "./whatsapp.js";

export { whatsappLink } from "./whatsapp.js";

function storeWhatsAppDigits(): string {
  return normalizeWhatsAppPhone(process.env.STORE_WHATSAPP ?? "");
}

export async function notifyWhatsApp(opts: {
  phone: string;
  message: string;
  subject?: string;
  meta?: Record<string, unknown>;
  /** When false, only logs / wa.me link — no API send. */
  send?: boolean;
}) {
  const link = whatsappLink(opts.message, opts.phone);
  const shouldSend = opts.send !== false && isWhatsAppConfigured();

  let sendResult: Awaited<ReturnType<typeof sendWhatsAppText>> | null = null;
  if (shouldSend && opts.phone && opts.phone !== "staff") {
    sendResult = await sendWhatsAppText(opts.phone, opts.message);
    if (!sendResult.ok && process.env.NODE_ENV !== "production") {
      console.warn(`[notify:whatsapp] send failed → ${opts.phone}:`, sendResult.error);
    }
  }

  const [row] = await db
    .insert(notifications)
    .values({
      channel: "whatsapp",
      recipient: opts.phone,
      subject: opts.subject ?? null,
      body: opts.message,
      meta: {
        ...opts.meta,
        waLink: link,
        sent: sendResult?.ok ?? false,
        messageId: sendResult?.messageId,
        sendError: sendResult?.error,
      },
    })
    .returning();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[notify:whatsapp] ${opts.phone}: ${opts.message}`);
    if (!sendResult?.ok) {
      console.log(`[notify:whatsapp] link: ${link}`);
    }
  }

  return { notification: row, waLink: link, sendResult };
}

async function alertStaffAgents(
  message: string,
  subject: string,
  meta: Record<string, unknown>,
) {
  const agents = agentPhoneNumbers();

  if (!agents.length) {
    await notifyWhatsApp({
      phone: storeWhatsAppDigits() || "staff",
      message,
      subject,
      meta: { ...meta, role: "staff", note: "no WHATSAPP_AGENT_NUMBERS configured" },
      send: false,
    });
    return [];
  }

  const results = [];
  for (const agent of agents) {
    const result = await notifyWhatsApp({
      phone: agent,
      message,
      subject,
      meta: { ...meta, role: "staff_agent" },
      send: true,
    });
    results.push(result.sendResult);
  }
  return results;
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

  const staffMessage = `🛒 *New order ${event}*\n#${shortId}\n${order.name}\n${order.email}\n${order.phone ?? "—"}\n${total} · ${order.paymentMethod}\nStatus: ${order.status}`;

  await alertStaffAgents(staffMessage, `Order ${event}`, {
    orderId: order.id,
    event,
    type: "order",
  });

  if (order.phone && shouldNotifyCustomers()) {
    await notifyWhatsApp({
      phone: order.phone,
      message: customerMessage,
      subject: `Order ${event}`,
      meta: { orderId: order.id, event, role: "customer" },
      send: true,
    });
  }

  await db.insert(notifications).values({
    channel: "log",
    recipient: order.email,
    subject: `Order ${event}`,
    body: customerMessage,
    meta: { orderId: order.id, event },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[notify:order:${event}]`, customerMessage);
  }
}

export async function notifyRepairBooked(
  repair: Pick<
    RepairOrder,
    | "id"
    | "email"
    | "phone"
    | "name"
    | "deviceBrand"
    | "deviceModel"
    | "issue"
    | "status"
    | "quotePesewas"
  > & { serviceName?: string | null },
) {
  const shortId = repair.id.slice(0, 8);
  const quote =
    repair.quotePesewas != null ? formatGhs(repair.quotePesewas) : "Quote pending";

  const staffMessage = `🛠️ *New repair booking*\n#${shortId}\n${repair.name}\n${repair.email}\n${repair.phone}\n${repair.deviceBrand} ${repair.deviceModel}\n${repair.serviceName ?? "General repair"}\n${quote}\nIssue: ${repair.issue.slice(0, 120)}`;

  const customerMessage = `Hi ${repair.name}, your Media Extensions repair ticket #${shortId} for ${repair.deviceBrand} ${repair.deviceModel} was received. We'll update you as we diagnose the device.`;

  await alertStaffAgents(staffMessage, "Repair booked", {
    repairId: repair.id,
    type: "repair",
  });

  if (shouldNotifyCustomers()) {
    await notifyWhatsApp({
      phone: repair.phone,
      message: customerMessage,
      subject: "Repair booked",
      meta: { repairId: repair.id, role: "customer" },
      send: true,
    });
  }

  await db.insert(notifications).values({
    channel: "log",
    recipient: repair.email,
    subject: "Repair booked",
    body: customerMessage,
    meta: { repairId: repair.id },
  });
}

export async function notifyContactMessage(opts: {
  name: string;
  email: string;
  phone?: string | null;
  topic: string;
  message: string;
  id: string;
}) {
  const staffMessage = `💬 *Contact form*\n${opts.topic}\n${opts.name}\n${opts.email}\n${opts.phone ?? "—"}\n${opts.message.slice(0, 200)}`;

  await alertStaffAgents(staffMessage, "Contact message", {
    contactId: opts.id,
    type: "contact",
  });
}

export async function notifyNewsletterSignup(email: string) {
  const staffMessage = `📧 *Newsletter signup*\n${email}`;
  await alertStaffAgents(staffMessage, "Newsletter signup", {
    email,
    type: "newsletter",
  });
}
