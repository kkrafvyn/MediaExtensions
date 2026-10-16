export const REPAIR_TRACK_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "diagnosing", label: "Diagnosing" },
  { key: "quoted", label: "Quoted" },
  { key: "in_progress", label: "In repair" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
] as const;

export function repairTimelineIndex(status: string): { index: number; cancelled: boolean } {
  const normalized = status.toLowerCase();
  if (normalized === "cancelled") return { index: -1, cancelled: true };
  const idx = REPAIR_TRACK_STEPS.findIndex((s) => s.key === normalized);
  return { index: idx >= 0 ? idx : 0, cancelled: false };
}

export type OrderTrackFields = {
  status: string;
  fulfillmentMethod?: string | null;
  fulfillmentStatus?: string | null;
  paymentMethod?: string;
  shipping?: unknown;
};

function resolveFulfillmentMethod(order: OrderTrackFields): "digital" | "delivery" | "pickup" {
  if (order.fulfillmentMethod === "digital" || order.fulfillmentMethod === "delivery" || order.fulfillmentMethod === "pickup") {
    return order.fulfillmentMethod;
  }
  if (order.paymentMethod === "pickup" || order.paymentMethod === "pay_on_pickup") return "pickup";
  if (order.shipping) return "delivery";
  return "digital";
}

export function orderTimelineLabels(order: OrderTrackFields): [string, string, string, string] {
  const method = resolveFulfillmentMethod(order);
  if (method === "digital") return ["Placed", "Paid", "Downloads ready", "Complete"];
  if (method === "pickup") return ["Placed", "Paid", "Ready for pickup", "Collected"];
  return ["Placed", "Paid", "Shipped", "Delivered"];
}

export function orderTimelineIndex(order: OrderTrackFields): { index: number; cancelled: boolean } {
  const status = order.status.toLowerCase();
  if (status === "cancelled") return { index: -1, cancelled: true };

  const fs = (order.fulfillmentStatus ?? "not_required").toLowerCase();
  const method = resolveFulfillmentMethod(order);

  if (status === "pending_payment" || status === "awaiting_pickup") {
    return { index: 0, cancelled: false };
  }

  if (status === "paid") {
    if (method === "digital") return { index: 1, cancelled: false };
    if (fs === "shipped" || fs === "ready_for_pickup" || fs === "preparing" || fs === "ready_to_ship") {
      return { index: 2, cancelled: false };
    }
    return { index: 1, cancelled: false };
  }

  if (status === "fulfilled") {
    return { index: 3, cancelled: false };
  }

  return { index: 0, cancelled: false };
}
