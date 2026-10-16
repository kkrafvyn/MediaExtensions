import { db } from "../db/index.js";
import { notifications, type Order, type RepairOrder } from "../db/schema.js";
import { formatGhs } from "./utils.js";
import { sendEmail } from "./mailer.js";
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

async function notifyCustomerUpdate(opts: {
  email: string;
  name: string;
  phone: string | null;
  subject: string;
  message: string;
  meta: Record<string, unknown>;
}) {
  try {
    await sendEmail({ to: opts.email, subject: opts.subject, text: opts.message });
  } catch (err) {
    console.error(`[notify:${String(opts.meta.type)}] email failed`, err);
  }
  if (opts.phone && shouldNotifyCustomers()) {
    try {
      await notifyWhatsApp({
        phone: opts.phone,
        message: opts.message,
        subject: opts.subject,
        meta: { ...opts.meta, role: "customer" },
        send: true,
      });
    } catch (err) {
      console.error(`[notify:${String(opts.meta.type)}] WhatsApp failed`, err);
    }
  }
  await db.insert(notifications).values({
    channel: "log",
    recipient: opts.email,
    subject: opts.subject,
    body: opts.message,
    meta: opts.meta,
  });
}

export async function notifyOrderFulfillment(opts: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}) {
  const labels: Record<string, string> = {
    preparing: "Your order is being prepared.",
    ready_to_ship: "Your order is ready to ship.",
    shipped: "Your order has shipped.",
    delivered: "Your order was marked delivered.",
    ready_for_pickup: "Your order is ready for pickup.",
    collected: "Your order was collected. Thank you!",
  };
  const message = [
    `Hi ${opts.name},`,
    `Update for order #${opts.id.slice(0, 8)}: ${labels[opts.fulfillmentStatus] ?? opts.fulfillmentStatus.replaceAll("_", " ")}.`,
    opts.trackingCarrier ? `Courier: ${opts.trackingCarrier}.` : "",
    opts.trackingNumber ? `Tracking number: ${opts.trackingNumber}.` : "",
    opts.trackingUrl ? `Track shipment: ${opts.trackingUrl}` : "",
  ].filter(Boolean).join("\n");
  await notifyCustomerUpdate({
    email: opts.email,
    name: opts.name,
    phone: opts.phone,
    subject: `Order #${opts.id.slice(0, 8)} ${opts.fulfillmentStatus.replaceAll("_", " ")}`,
    message,
    meta: { type: "order_fulfillment", orderId: opts.id, fulfillmentMethod: opts.fulfillmentMethod, fulfillmentStatus: opts.fulfillmentStatus },
  });
}

export async function notifyReturnUpdate(opts: {
  id: string;
  orderId: string;
  email: string;
  name: string;
  phone: string | null;
  reason: string;
  details: string;
  status: string;
  decisionNotes?: string | null;
  refundPesewas?: number | null;
  refundReference?: string | null;
}) {
  const shortId = opts.id.slice(0, 8);
  const statusMessage: Record<string, string> = {
    requested: "Your return request has been received and is awaiting review.",
    approved: "Your return request was approved. Please contact the store to arrange the return inspection.",
    rejected: "Your return request was not approved.",
    refunded: `A refund of ${formatGhs(opts.refundPesewas ?? 0)} has been processed for order #${opts.orderId.slice(0, 8)}.`,
  };
  const message = [
    `Hi ${opts.name},`,
    `Return request #${shortId}: ${statusMessage[opts.status] ?? opts.status}.`,
    opts.status === "requested" ? `Request details: ${opts.details}` : "",
    opts.decisionNotes ? `Staff note: ${opts.decisionNotes}` : "",
    opts.refundReference ? `Refund reference: ${opts.refundReference}` : "",
  ].filter(Boolean).join("\n");

  if (opts.status === "requested") {
    await alertStaffAgents(
      `Return request\nOrder #${opts.orderId.slice(0, 8)}\n${opts.name}\n${opts.email}\n${opts.reason}\n${opts.details}`,
      "Return requested",
      { returnId: opts.id, orderId: opts.orderId, type: "return" },
    );
  }
  await notifyCustomerUpdate({
    email: opts.email,
    name: opts.name,
    phone: opts.phone,
    subject: `Return request #${shortId} ${opts.status}`,
    message,
    meta: { type: "return_update", returnId: opts.id, orderId: opts.orderId, status: opts.status },
  });
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

export async function notifyRepairStatusUpdate(
  repair: Pick<
    RepairOrder,
    "id" | "email" | "phone" | "name" | "deviceBrand" | "deviceModel" | "status"
  >,
  previousStatus: string,
) {
  if (repair.status === previousStatus) return;
  const shortId = repair.id.slice(0, 8);
  const customerMessage = `Hi ${repair.name}, your Media Extensions repair #${shortId} (${repair.deviceBrand} ${repair.deviceModel}) is now: ${repair.status.replaceAll("_", " ")}.`;
  const staffMessage = `🛠️ Repair #${shortId} → ${repair.status.replaceAll("_", " ")}\n${repair.name} · ${repair.deviceBrand} ${repair.deviceModel}`;

  await alertStaffAgents(staffMessage, "Repair status update", {
    repairId: repair.id,
    status: repair.status,
    type: "repair_status",
  });

  if (shouldNotifyCustomers()) {
    await notifyWhatsApp({
      phone: repair.phone,
      message: customerMessage,
      subject: "Repair status update",
      meta: { repairId: repair.id, status: repair.status, role: "customer" },
      send: true,
    });
  }

  await db.insert(notifications).values({
    channel: "log",
    recipient: repair.email,
    subject: "Repair status update",
    body: customerMessage,
    meta: { repairId: repair.id, from: previousStatus, to: repair.status },
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
