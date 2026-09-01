import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import type { PaymentInfo } from "../types";

type OrderResponse = {
  order: {
    id: string;
    status: string;
    paymentMethod: string;
    totalPesewas: number;
    email: string;
    name: string;
    items: Array<{ name: string; quantity: number; unitPricePesewas: number }>;
  };
  downloads: Array<{ token: string; productName: string }>;
};

export function OrderPage() {
  const { id } = useParams();
  const [data, setData] = useState<OrderResponse | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api<OrderResponse>(`/api/orders/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
    api<PaymentInfo>("/api/checkout/payment-info").then(setPaymentInfo).catch(() => undefined);
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

  return (
    <div className="page container" style={{ maxWidth: 840 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Order #{order.id.slice(0, 8)}
      </p>
      <h1>Order Confirmed</h1>
      <p className="lede">
        Thank you, {order.name}! We have sent your order details and invoice to{" "}
        <strong>{order.email}</strong>.
      </p>

      {/* Downloads Section (If digital tools exist) */}
      {downloads.length > 0 && (
        <div
          className="panel"
          style={{
            background: "linear-gradient(135deg, #0d1713 0%, #172a22 100%)",
            color: "white",
            marginBottom: "2rem",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
            <span className="badge badge-digital">⚡ Instant Downloads Ready</span>
          </div>
          <h3 style={{ color: "white", fontSize: "1.3rem", margin: "0.25rem 0 1rem" }}>
            Your Digital Creator Assets
          </h3>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
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
                  background: "rgba(255, 255, 255, 0.08)",
                  padding: "0.85rem 1.2rem",
                  borderRadius: "var(--radius-sm)",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <strong style={{ color: "#ffffff", display: "block" }}>{d.productName}</strong>
                  <span style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.6)" }}>
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
              {order.paymentMethod === "pickup" && (
                <p className="meta" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                  Pay cash or MoMo upon collection at our Accra hub.
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
