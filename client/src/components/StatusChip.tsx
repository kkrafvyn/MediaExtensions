const LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  awaiting_pickup: "Awaiting pickup",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  submitted: "Submitted",
  diagnosing: "Diagnosing",
  quoted: "Quoted",
  in_progress: "In progress",
  ready: "Ready",
  completed: "Completed",
};

export function StatusChip({ status, className = "" }: { status: string; className?: string }) {
  const label = LABELS[status] ?? status.replaceAll("_", " ");
  return <span className={`status-chip status-${status} ${className}`.trim()}>{label}</span>;
}
