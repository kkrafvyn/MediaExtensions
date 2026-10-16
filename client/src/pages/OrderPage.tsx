import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { FulfillmentBadge } from "../components/Icons";
import type { PaymentInfo } from "../types";

type OrderResponse = {
  order: {
    id: string;
    status: string;
    fulfillmentMethod?: "digital" | "delivery" | "pickup";
    fulfillmentStatus?: string;
    paymentMethod: string;
    trackingCarrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    fulfilledAt?: string | null;
    totalPesewas: number;
    email: string;
    name: string;
    shipping?: { fullName?: string; street?: string; city?: string; region?: string } | null;
    returns?: Array<{
      id: string;
      status: string;
      reason: string;
      decisionNotes?: string | null;
      refundPesewas?: number | null;
      refundReference?: string | null;
    }>;
    items: Array<{ name: string; quantity: number; unitPricePesewas: number }>;
  };
  downloads: Array<{ token: string; productName: string }>;
};

export function OrderPage() {
  const { id } = useParams();
  const [data, setData] = useState<OrderResponse | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState("");
  const [returnReason, setReturnReason] = useState("damaged");
  const [returnDetails, setReturnDetails] = useState("");
  const [returnError, setReturnError] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnRequest, setReturnRequest] = useState<OrderResponse["order"]["returns"] extends (infer T)[] | undefined ? T | null : null>(null);

  useEffect(() => {
    if (!id) return;
    function loadOrder() {
      return api<OrderResponse>(`/api/orders/${id}`)
        .then(setData)
        .catch((e) => setError(e.message));
    }

    void loadOrder();
    api<PaymentInfo>("/api/checkout/payment-info").then(setPaymentInfo).catch(() => undefined);

    const poll = window.setInterval(() => {
      void api<OrderResponse>(`/api/orders/${id}`)
        .then((next) => {
          setData(next);
          const s = next.order.status;
          if (s !== "pending_payment" && s !== "awaiting_pickup") {
            window.clearInterval(poll);
          }
        })
        .catch(() => undefined);
    }, 8000);

    return () => window.clearInterval(poll);
  }, [id]);

  if (error) {
    return (
      <div className="page container" style={{ maxWidth: 600 }}>
        <div className="alert-banner">{error}</div>
        <Link to="/shop" className="btn btn-dark">
          Back to Shop
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page container" style={{ maxWidth: 600 }}>
        <div className="product-skeleton" style={{ minHeight: "300px" }} />
      </div>
    );
  }

  const { order, downloads } = data;
  const isPaid = order.status === "paid" || order.status === "fulfilled";
  const fulfillmentMethod = order.fulfillmentMethod ?? (
    order.paymentMethod === "pickup" ? "pickup" : order.shipping ? "delivery" : "digital"
  );
  const existingReturn = returnRequest ?? order.returns?.[0] ?? null;
  const returnEligible = order.status === "fulfilled"
    && fulfillmentMethod !== "digital"
    && (order.fulfillmentStatus === "delivered" || order.fulfillmentStatus === "collected")
    && Boolean(order.fulfilledAt)
    && Date.now() <= new Date(order.fulfilledAt!).getTime() + 7 * 24 * 60 * 60 * 1000
    && !existingReturn;

  async function submitReturn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReturnSubmitting(true);
    setReturnError("");
    try {
      const response = await api<{ returnRequest: NonNullable<OrderResponse["order"]["returns"]>[number] }>(`/api/orders/${order.id}/returns`, {
        method: "POST",
        body: JSON.stringify({ email: order.email, reason: returnReason, details: returnDetails }),
      });
      setReturnRequest(response.returnRequest);
      setReturnDetails("");
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Could not submit return request");
    } finally {
      setReturnSubmitting(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 840 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Order #{order.id.slice(0, 8)}
      </p>
      <h1>Order Confirmed</h1>
      <p className="lede">
        Thank you, {order.name}!{" "}
        {isPaid ? (
          <>
            Confirmation and any download links were sent to <strong>{order.email}</strong>.
          </>
        ) : (
          <>
            We will email confirmation to <strong>{order.email}</strong> after payment is confirmed.
          </>
        )}
      </p>

      {/* Downloads Section (If digital tools exist) */}
      {downloads.length > 0 && (
        <div
          className="panel"
          style={{
            background: "var(--emerald-soft)",
            color: "var(--ink)",
            marginBottom: "2rem",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
            <span className="badge badge-digital">
              <FulfillmentBadge fulfillment="digital" variant="downloads" />
            </span>
          </div>
          <h3 style={{ color: "var(--ink)", fontSize: "1.3rem", margin: "0.25rem 0 1rem" }}>
            Your Digital Creator Assets
          </h3>
          <p style={{ color: "var(--ink-sec)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
            Click below to download your packs (.zip files containing presets, LUTs, and licenses).
          </p>

          <div className="stack" style={{ gap: "0.75rem" }}>
            {downloads.map((d) => (
              <div
                key={d.token}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--surface-hover)",
                  padding: "0.85rem 1.2rem",
                  borderRadius: "var(--radius-sm)",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <strong style={{ color: "var(--ink)", display: "block" }}>{d.productName}</strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    Direct secure download key active
                  </span>
                </div>
                <a
                  className="btn btn-primary btn-sm"
                  href={`/api/downloads/${d.token}`}
                  download
                  style={{ gap: "0.4rem" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download .ZIP
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {existingReturn ? (
        <div className="panel stack" style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", margin: 0 }}>Return request · {existingReturn.status.replaceAll("_", " ")}</h2>
          <p className="meta" style={{ margin: 0 }}>Reason: {existingReturn.reason.replaceAll("_", " ")}</p>
          {existingReturn.decisionNotes && <p className="meta" style={{ margin: 0 }}>{existingReturn.decisionNotes}</p>}
          {existingReturn.status === "refunded" && existingReturn.refundPesewas != null && (
            <p className="meta" style={{ margin: 0 }}>Refund recorded: {formatGhs(existingReturn.refundPesewas)}{existingReturn.refundReference ? ` · ${existingReturn.refundReference}` : ""}</p>
          )}
        </div>
      ) : returnEligible ? (
        <form className="panel stack" style={{ marginBottom: "2rem" }} onSubmit={submitReturn}>
          <h2 style={{ fontSize: "1.15rem", margin: 0 }}>Request a return</h2>
          <p className="meta" style={{ margin: 0 }}>Eligible unused physical items may be returned within 7 days of delivery or pickup. Staff will review your request.</p>
          <label>
            Reason
            <select value={returnReason} onChange={(event) => setReturnReason(event.target.value)}>
              <option value="damaged">Arrived damaged</option>
              <option value="incorrect_item">Incorrect item</option>
              <option value="not_as_described">Not as described</option>
              <option value="changed_mind">Changed my mind</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Details
            <textarea rows={3} minLength={10} maxLength={2000} required value={returnDetails} onChange={(event) => setReturnDetails(event.target.value)} placeholder="Describe the item condition and what outcome you are requesting." />
          </label>
          {returnError && <div className="alert-banner" role="alert">{returnError}</div>}
          <button className="btn btn-primary" type="submit" disabled={returnSubmitting}>{returnSubmitting ? "Sending request…" : "Submit return request"}</button>
        </form>
      ) : null}

      <div className="split split-2">
        {/* Left: Purchased Items */}
        <div className="panel stack">
          <h3 style={{ fontSize: "1.15rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.5rem" }}>
            Purchased Items
          </h3>
          {order.items.map((item, i) => (
            <div key={i} className="line-item">
              <div>
                <strong>{item.name}</strong>
                <div className="meta">Qty {item.quantity}</div>
              </div>
              <strong>{formatGhs(item.unitPricePesewas * item.quantity)}</strong>
            </div>
          ))}
          <div className="line-item order-total-hero">
            <span>Total Amount</span>
            <span style={{ color: "var(--accent)" }}>{formatGhs(order.totalPesewas)}</span>
          </div>
        </div>

        {/* Right: Payment instructions & Actions */}
        <div className="panel stack">
          <h3 style={{ fontSize: "1.15rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.5rem" }}>
            Status & Instructions
          </h3>

          <div className="line-item">
            <span>Current Status</span>
            <span className={`status-chip ${isPaid ? "status-paid" : "status-pending"}`}>
              {order.status.replaceAll("_", " ")}
            </span>
          </div>

          <div className="line-item">
            <span>Payment Method</span>
            <strong style={{ textTransform: "capitalize" }}>{order.paymentMethod}</strong>
          </div>
          <div className="line-item">
            <span>Fulfillment</span>
            <strong style={{ textTransform: "capitalize" }}>{fulfillmentMethod}</strong>
          </div>
          {order.fulfillmentStatus && order.fulfillmentStatus !== "not_required" && (
            <div className="line-item">
              <span>Fulfillment progress</span>
              <strong style={{ textTransform: "capitalize" }}>{order.fulfillmentStatus.replaceAll("_", " ")}</strong>
            </div>
          )}
          {order.fulfillmentMethod === "delivery" && (order.trackingNumber || order.trackingUrl) && (
            <div className="meta">
              {order.trackingCarrier ? `${order.trackingCarrier} · ` : ""}
              {order.trackingNumber ? `Tracking ${order.trackingNumber}` : ""}
              {order.trackingUrl && <> · <a href={order.trackingUrl} target="_blank" rel="noreferrer">Track shipment</a></>}
            </div>
          )}
          {fulfillmentMethod === "pickup" && paymentInfo?.pickup && (
            <div className="meta">
              Pickup at <strong>{paymentInfo.pickup.name}</strong>, {paymentInfo.pickup.address}
              {paymentInfo.pickup.landmark ? ` · ${paymentInfo.pickup.landmark}` : ""}
              {paymentInfo.pickup.hours ? ` · ${paymentInfo.pickup.hours}` : ""}
            </div>
          )}

          {(order.status === "pending_payment" || order.status === "awaiting_pickup") && (
            <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: "var(--radius-sm)", marginTop: "0.5rem" }}>
              <strong style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem" }}>
                How to finalize payment:
              </strong>
              {order.paymentMethod === "momo" && paymentInfo && (
                <p className="meta" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                  Send <strong>{formatGhs(order.totalPesewas)}</strong> via <strong>{paymentInfo.momo.network}</strong> to{" "}
                  <strong>{paymentInfo.momo.number}</strong> ({paymentInfo.momo.name}). Use <strong>{order.name}</strong> as reference.
                </p>
              )}
              {order.paymentMethod === "bank" && paymentInfo && (
                <p className="meta" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                  Transfer <strong>{formatGhs(order.totalPesewas)}</strong> to <strong>{paymentInfo.bank.bankName}</strong> · Acc:{" "}
                  <strong>{paymentInfo.bank.accountNumber}</strong> ({paymentInfo.bank.accountName}).
                </p>
              )}
              {order.paymentMethod === "pay_on_pickup" && fulfillmentMethod === "pickup" && (
                <p className="meta" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                  Pay by cash or MoMo when you collect your order.
                </p>
              )}
            </div>
          )}

          <div className="cta-row" style={{ marginTop: "1rem" }}>
            <Link to={`/order/${order.id}/receipt`} className="btn btn-light" style={{ flex: 1 }}>
              Print Receipt
            </Link>
            <Link to="/track" className="btn btn-light" style={{ flex: 1 }}>
              Track Order
            </Link>
          </div>

          <Link to="/shop" className="btn btn-dark" style={{ width: "100%", marginTop: "0.5rem" }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
