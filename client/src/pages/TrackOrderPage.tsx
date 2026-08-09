import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import type { OrderSummary } from "../types";

export function TrackOrderPage() {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await api<{ order: OrderSummary }>("/api/orders/track", {
        method: "POST",
        body: JSON.stringify({ email, orderId }),
      });
      setOrder(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 560 }}>
      <h1>Track order</h1>
      <p className="lede">Enter the email used at checkout and your order ID.</p>

      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Order ID
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-dark" type="submit" disabled={loading}>
          {loading ? "Looking up…" : "Track order"}
        </button>
      </form>

      {order && (
        <div className="panel stack" style={{ marginTop: "1.25rem" }}>
          <div className="line-item">
            <span>Status</span>
            <strong>{order.status.replaceAll("_", " ")}</strong>
          </div>
          <div className="line-item">
            <span>Payment</span>
            <span>{order.paymentMethod}</span>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="line-item">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatGhs(item.unitPricePesewas * item.quantity)}</span>
            </div>
          ))}
          <div className="line-item">
            <strong>Total</strong>
            <strong>{formatGhs(order.totalPesewas)}</strong>
          </div>
          <div className="cta-row">
            <Link to={`/order/${order.id}`} className="btn btn-light">
              View order
            </Link>
            <Link to={`/order/${order.id}/receipt`} className="btn btn-light">
              Receipt
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
