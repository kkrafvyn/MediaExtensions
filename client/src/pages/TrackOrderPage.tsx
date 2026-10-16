import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { IconCheck } from "../components/Icons";
import { CopyButton } from "../components/CopyButton";
import {
  REPAIR_TRACK_STEPS,
  orderTimelineIndex,
  orderTimelineLabels,
  repairTimelineIndex,
} from "../lib/trackingSteps";
import type { OrderSummary, TrackDownload } from "../types";

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
  const [downloads, setDownloads] = useState<TrackDownload[]>([]);
  const [repair, setRepair] = useState<RepairTrack | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    setDownloads([]);
    setRepair(null);
    setShareUrl("");
    try {
      if (mode === "order") {
        const res = await api<{
          order: OrderSummary;
          downloads?: TrackDownload[];
          shareUrl?: string;
        }>("/api/orders/track", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), orderId: referenceId.trim() }),
        });
        setOrder(res.order);
        setDownloads(res.downloads ?? []);
        setShareUrl(res.shareUrl ?? "");
      } else {
        const res = await api<{ repair: RepairTrack; shareUrl?: string }>("/api/repairs/track", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), repairId: referenceId.trim() }),
        });
        setRepair(res.repair);
        setShareUrl(res.shareUrl ?? "");
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

  const orderTrack = order ? orderTimelineIndex(order) : { index: 0, cancelled: false };
  const orderLabels = order ? orderTimelineLabels(order) : ["Placed", "Paid", "Shipped", "Delivered"];
  const repairTrack = repair ? repairTimelineIndex(repair.status) : { index: 0, cancelled: false };

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
            setDownloads([]);
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
            setDownloads([]);
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
            placeholder={
              mode === "order"
                ? "Full order UUID from your confirmation email"
                : "Full repair ticket UUID from your booking email"
            }
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

          {orderTrack.cancelled && (
            <p className="alert-banner" style={{ marginBottom: "1rem" }}>
              This order was cancelled.
            </p>
          )}

          <div className="tracking-timeline">
            {orderLabels.map((label, step) => {
              const activeIdx = orderTrack.cancelled ? -1 : orderTrack.index;
              const isCompleted = activeIdx > step;
              const isCurrent = activeIdx === step;
              return (
                <div
                  key={label}
                  className={`timeline-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                >
                  <div className="timeline-icon">{isCompleted ? <IconCheck size={14} /> : step + 1}</div>
                  <span className="timeline-label">{label}</span>
                </div>
              );
            })}
          </div>

          <div className="line-item">
            <span>Status</span>
            <span className={`status-chip ${order.status === "paid" || order.status === "fulfilled" ? "status-paid" : order.status === "cancelled" ? "status-cancelled" : "status-pending"}`}>{order.status.replaceAll("_", " ")}</span>
          </div>

          <div className="line-item">
            <span>Payment Method</span>
            <strong style={{ textTransform: "capitalize" }}>{order.paymentMethod}</strong>
          </div>

          <div className="line-item">
            <span>Fulfillment</span>
            <strong style={{ textTransform: "capitalize" }}>
              {order.fulfillmentMethod ?? (order.paymentMethod === "pickup" ? "pickup" : order.shipping ? "delivery" : "digital")}
            </strong>
          </div>
          {order.fulfillmentStatus && order.fulfillmentStatus !== "not_required" && (
            <div className="line-item">
              <span>Fulfillment progress</span>
              <strong style={{ textTransform: "capitalize" }}>{order.fulfillmentStatus.replaceAll("_", " ")}</strong>
            </div>
          )}
          {order.fulfillmentMethod === "delivery" && (order.trackingNumber || order.trackingUrl) && (
            <p className="meta">
              {order.trackingCarrier ? `${order.trackingCarrier} · ` : ""}
              {order.trackingNumber ? `Tracking ${order.trackingNumber}` : ""}
              {order.trackingUrl && <> · <a href={order.trackingUrl} target="_blank" rel="noreferrer">Track shipment</a></>}
            </p>
          )}

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
            <span>Order Total</span>
            <span style={{ color: "var(--accent)" }}>{formatGhs(order.totalPesewas)}</span>
          </div>

          {downloads.length > 0 && (
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
              <strong style={{ display: "block", marginBottom: "0.75rem" }}>Digital downloads</strong>
              <div className="stack" style={{ gap: "0.65rem" }}>
                {downloads.map((d) => (
                  <div
                    key={d.token}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{d.productName}</div>
                      <div className="meta" style={{ fontSize: "0.8rem" }}>
                        {d.downloadCount}/{d.maxDownloads} used · expires{" "}
                        {new Date(d.expiresAt).toLocaleString()}
                      </div>
                    </div>
                    <a className="btn btn-primary btn-sm" href={`/api/downloads/${d.token}`} download>
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shareUrl && (
            <div className="stack" style={{ gap: "0.5rem" }}>
              <span className="meta">Share this status (no email required for recipients who have the link)</span>
              <CopyButton text={shareUrl} label="Copy tracking link" className="btn btn-light btn-sm" />
            </div>
          )}

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

          {repairTrack.cancelled && (
            <p className="alert-banner" style={{ marginBottom: "1rem" }}>
              This repair ticket was cancelled.
            </p>
          )}

          <div className="tracking-timeline">
            {REPAIR_TRACK_STEPS.map((item, step) => {
              const activeIdx = repairTrack.cancelled ? -1 : repairTrack.index;
              const isCompleted = activeIdx > step;
              const isCurrent = activeIdx === step;
              return (
                <div
                  key={item.key}
                  className={`timeline-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                >
                  <div className="timeline-icon">{isCompleted ? <IconCheck size={14} /> : step + 1}</div>
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

          {shareUrl && (
            <div className="stack" style={{ gap: "0.5rem" }}>
              <span className="meta">Share repair progress with family or colleagues</span>
              <CopyButton text={shareUrl} label="Copy tracking link" className="btn btn-light btn-sm" />
            </div>
          )}

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
