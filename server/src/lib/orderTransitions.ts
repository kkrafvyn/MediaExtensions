export type ManagedOrderStatus =
  | "pending_payment"
  | "awaiting_pickup"
  | "paid"
  | "fulfilled"
  | "cancelled";
export type FulfillmentStatus =
  | "not_required"
  | "unfulfilled"
  | "preparing"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "ready_for_pickup"
  | "collected";
export type ReturnRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "refund_pending"
  | "refund_processing"
  | "refund_needs_attention"
  | "refund_failed"
  | "refunded";

const allowedTransitions: Record<ManagedOrderStatus, readonly ManagedOrderStatus[]> = {
  pending_payment: ["cancelled"],
  awaiting_pickup: ["cancelled"],
  paid: ["fulfilled"],
  fulfilled: [],
  cancelled: [],
};

export function canTransitionOrderStatus(current: string, next: ManagedOrderStatus): boolean {
  return current in allowedTransitions && allowedTransitions[current as ManagedOrderStatus].includes(next);
}

export function canTransitionFulfillmentStatus(
  method: string,
  current: string,
  next: FulfillmentStatus,
): boolean {
  const allowed = method === "delivery"
    ? {
        unfulfilled: ["preparing"],
        preparing: ["ready_to_ship"],
        ready_to_ship: ["shipped"],
        shipped: ["delivered"],
      }
    : method === "pickup"
      ? {
          unfulfilled: ["preparing"],
          preparing: ["ready_for_pickup"],
          ready_for_pickup: ["collected"],
        }
      : {};
  return current in allowed && (allowed as Record<string, string[]>)[current].includes(next);
}

export type RepairStatus =
  | "submitted"
  | "diagnosing"
  | "quoted"
  | "in_progress"
  | "ready"
  | "completed"
  | "cancelled";

const repairTransitions: Record<RepairStatus, readonly RepairStatus[]> = {
  submitted: ["diagnosing", "cancelled"],
  diagnosing: ["quoted", "cancelled"],
  quoted: ["in_progress", "cancelled"],
  in_progress: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionRepairStatus(current: string, next: RepairStatus): boolean {
  return current in repairTransitions && repairTransitions[current as RepairStatus].includes(next);
}

export function canTransitionReturnStatus(current: string, next: ReturnRequestStatus): boolean {
  const allowed: Record<string, ReturnRequestStatus[]> = {
    requested: ["approved", "rejected"],
    approved: ["refund_pending", "refunded"],
    rejected: [],
    refund_pending: ["refund_processing", "refund_needs_attention", "refund_failed", "refunded"],
    refund_processing: ["refund_needs_attention", "refund_failed", "refunded"],
    refund_needs_attention: ["refund_pending", "refund_failed", "refunded"],
    refund_failed: ["refund_pending"],
    refunded: [],
  };
  return current in allowed && allowed[current].includes(next);
}

export function isPhysicalReturnEligible(order: {
  status: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  fulfilledAt: Date | null;
  updatedAt: Date;
}, now = new Date()): boolean {
  if (
    order.status !== "fulfilled"
    || order.fulfillmentMethod === "digital"
    || (order.fulfillmentStatus !== "delivered" && order.fulfillmentStatus !== "collected")
  ) return false;
  const completedAt = order.fulfilledAt ?? order.updatedAt;
  const elapsed = now.getTime() - completedAt.getTime();
  return elapsed >= 0 && elapsed <= 7 * 24 * 60 * 60 * 1000;
}

export function paystackRefundStatusForEvent(event: string): ReturnRequestStatus | null {
  const statuses: Record<string, ReturnRequestStatus> = {
    "refund.pending": "refund_pending",
    "refund.processing": "refund_processing",
    "refund.needs-attention": "refund_needs_attention",
    "refund.failed": "refund_failed",
    "refund.processed": "refunded",
  };
  return statuses[event] ?? null;
}

/** Terminal statuses: markOrderPaid skips stock/token side effects when already paid. */
export function isOrderAlreadyPaid(status: string): boolean {
  return status === "paid" || status === "fulfilled";
}

export function shouldFinalizeStockOnPaid(status: string): boolean {
  return status === "pending_payment" || status === "awaiting_pickup";
}