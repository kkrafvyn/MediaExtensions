import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import type { OrderSummary } from "../types";

type RepairTrack = {
  id: string;
  status: string;
  deviceBrand: string;
  deviceModel: string;
  quotePesewas: number | null;
  service?: { name: string } | null;
};

export function TrackOrderPage() {
  const [mode, setMode] = useState<"order" | "repair">("order");
  const [email, setEmail] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [repair, setRepair] = useState<RepairTrack | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    setRepair(null);
    try {
      if (mode === "order") {
        const res = await api<{ order: OrderSummary }>("/api/orders/track", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), orderId: referenceId.trim() }),
        });
        setOrder(res.order);
      } else {
        const res = await api<{ repair: RepairTrack }>("/api/repairs/track", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), repairId: referenceId.trim() }),
        });
        setRepair(res.repair);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "order"
            ? "We couldn't find an order matching that email and Order ID."
            : "We couldn't find a repair ticket matching that email and Ticket ID.",
      );
    } finally {
      setLoading(false);
    }
  }

  const orderSteps = ["pending_payment", "paid", "fulfilled", "completed"];
  const currentStepIdx = order ? orderSteps.indexOf(order.status.toLowerCase()) : 0;
  const activeIdx = currentStepIdx >= 0 ? currentStepIdx : 0;

  const repairSteps = ["submitted", "diagnosing", "quoted", "in_progress", "ready", "completed"];
  const repairIdx = repair ? repairSteps.indexOf(repair.status.toLowerCase()) : 0;
  const repairActiveIdx = repairIdx >= 0 ? repairIdx : 0;

  return (
    <div className="page container" style={{ maxWidth: 680 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Self-Service Tracking
      </p>
      <h1>Track your order or repair</h1>
      <p className="lede">
        Enter the email used at checkout or booking, plus your Order ID or Repair Ticket ID.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <button
          type="button"
          className={`btn btn-sm ${mode === "order" ? "btn-primary" : "btn-light"}`}
          onClick={() => {
            setMode("order");
            setError("");
            setOrder(null);
            setRepair(null);
          }}
        >
          Store Order
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "repair" ? "btn-primary" : "btn-light"}`}
          onClick={() => {
            setMode("repair");
            setError("");
            setOrder(null);
            setRepair(null);
          }}
        >
          GSM Repair
        </button>
      </div>

      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Email Address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            required
          />
        </label>
        <label>
          {mode === "order" ? "Order ID" : "Repair Ticket ID"}
          <input
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            placeholder={mode === "order" ? "e.g. 7f9a1b2c" : "e.g. repair ticket ID"}
            required
          />
        </label>

        {error && <div className="alert-banner">{error}</div>}

        <button className="btn btn-dark" type="submit" disabled={loading} style={{ height: "3.2rem" }}>
          {loading ? "Searching…" : mode === "order" ? "Track Order Status →" : "Track Repair Status →"}
        </button>
      </form>

      {order && (
        <div className="panel stack" style={{ marginTop: "2rem", animation: "rise 0.4s ease" }}>
          <h3 style={{ fontSize: "1.25rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.75rem" }}>
            Order #{order.id.slice(0, 8)} Details
          </h3>

          <div className="tracking-timeline">
            {[
              { label: "Placed", step: 0 },
              { label: "Paid", step: 1 },
              { label: "Dispatched", step: 2 },
              { label: "Delivered", step: 3 },
            ].map((item) => {
              const isCompleted = activeIdx > item.step;
              const isCurrent = activeIdx === item.step;
              return (
                <div
                  key={item.label}
                  className={`timeline-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                >
                  <div className="timeline-icon">{isCompleted ? "✓" : item.step + 1}</div>
                  <span className="timeline-label">{item.label}</span>
                </div>
              );
            })}
          </div>

          <div className="line-item">
            <span>Status</span>
            <span className="status-chip status-paid">{order.status.replaceAll("_", " ")}</span>
          </div>

          <div className="line-item">
            <span>Payment Method</span>
            <strong style={{ textTransform: "capitalize" }}>{order.paymentMethod}</strong>
          </div>

          <div style={{ borderTop: "1px solid var(--line-subtle)", paddingTop: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>Items in Order:</span>
            {order.items.map((item, i) => (
              <div key={i} className="line-item" style={{ marginTop: "0.4rem" }}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <strong>{formatGhs(item.unitPricePesewas * item.quantity)}</strong>
              </div>
            ))}
          </div>

          <div className="line-item order-total-hero">
            <span>Total Paid</span>
            <span style={{ color: "var(--accent)" }}>{formatGhs(order.totalPesewas)}</span>
          </div>

          <div className="cta-row" style={{ marginTop: "1rem" }}>
            <Link to={`/order/${order.id}`} className="btn btn-primary" style={{ flex: 1 }}>
              View Full Order & Downloads
            </Link>
            <Link to={`/order/${order.id}/receipt`} className="btn btn-light" style={{ flex: 1 }}>
              Print Receipt
            </Link>
          </div>
        </div>
      )}

      {repair && (
        <div className="panel stack" style={{ marginTop: "2rem", animation: "rise 0.4s ease" }}>
          <h3 style={{ fontSize: "1.25rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.75rem" }}>
            Repair #{repair.id.slice(0, 8)} · {repair.deviceBrand} {repair.deviceModel}
          </h3>

          <div className="tracking-timeline">
            {[
              { label: "Submitted", step: 0 },
              { label: "Diagnosing", step: 1 },
              { label: "Quoted", step: 2 },
              { label: "In Progress", step: 3 },
              { label: "Ready", step: 4 },
              { label: "Completed", step: 5 },
            ].map((item) => {
              const isCompleted = repairActiveIdx > item.step;
              const isCurrent = repairActiveIdx === item.step;
              return (
                <div
                  key={item.label}
                  className={`timeline-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                >
                  <div className="timeline-icon">{isCompleted ? "✓" : item.step + 1}</div>
                  <span className="timeline-label">{item.label}</span>
                </div>
              );
            })}
          </div>

          <div className="line-item">
            <span>Status</span>
            <span className="status-chip status-pending">{repair.status.replaceAll("_", " ")}</span>
          </div>

          <div className="line-item">
            <span>Service</span>
            <strong>{repair.service?.name ?? "Hardware diagnosis"}</strong>
          </div>

          <div className="line-item order-total-hero">
            <span>Quote</span>
            <span style={{ color: "var(--accent)" }}>
              {repair.quotePesewas != null ? formatGhs(repair.quotePesewas) : "Pending quote"}
            </span>
          </div>

          <div className="cta-row" style={{ marginTop: "1rem" }}>
            <Link to={`/repairs/status/${repair.id}`} className="btn btn-primary" style={{ flex: 1 }}>
              View Repair Details
            </Link>
            <Link to={`/repairs/status/${repair.id}/receipt`} className="btn btn-light" style={{ flex: 1 }}>
              Print Receipt
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
