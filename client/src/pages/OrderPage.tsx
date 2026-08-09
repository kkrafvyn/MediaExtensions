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
    api<PaymentInfo>("/api/checkout/payment-info").then(setPaymentInfo);
  }, [id]);

  if (error) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page container">
        <p className="meta">Loading order…</p>
      </div>
    );
  }

  const { order, downloads } = data;

  return (
    <div className="page container">
      <h1>Order confirmed</h1>
      <p className="lede">
        Thanks, {order.name}. We emailed instructions to {order.email}. Status:{" "}
        <strong>{order.status.replaceAll("_", " ")}</strong>
      </p>

      <div className="split split-2">
        <div className="panel stack">
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
        </div>

        <div className="panel stack">
          {(order.status === "pending_payment" || order.status === "awaiting_pickup") && (
            <>
              <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Complete payment</h2>
              {order.paymentMethod === "momo" && paymentInfo && (
                <p className="meta">
                  Send {formatGhs(order.totalPesewas)} via {paymentInfo.momo.network} to{" "}
                  {paymentInfo.momo.number} ({paymentInfo.momo.name}). Use your name as reference.
                </p>
              )}
              {order.paymentMethod === "bank" && paymentInfo && (
                <p className="meta">
                  Transfer {formatGhs(order.totalPesewas)} to {paymentInfo.bank.bankName} ·{" "}
                  {paymentInfo.bank.accountNumber} · {paymentInfo.bank.accountName}.
                </p>
              )}
              {order.paymentMethod === "pickup" && (
                <p className="meta">Pay cash when you pick up your order in Accra.</p>
              )}
              {order.paymentMethod === "paystack" && (
                <p className="meta">
                  If Paystack didn’t finish, use Track order with your email and order ID, or contact
                  support.
                </p>
              )}
              <p className="meta">Our team will mark the order paid once funds are confirmed.</p>
            </>
          )}

          {downloads.length > 0 && (
            <>
              <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Downloads</h2>
              {downloads.map((d) => (
                <a
                  key={d.token}
                  className="btn btn-light"
                  href={`/api/downloads/${d.token}`}
                  style={{ textAlign: "center" }}
                >
                  Download {d.productName}
                </a>
              ))}
            </>
          )}

          <Link
            to={`/order/${order.id}/receipt`}
            className="btn btn-light"
            style={{ textAlign: "center" }}
          >
            Print receipt
          </Link>
          <Link to="/track" className="btn btn-light" style={{ textAlign: "center" }}>
            Track order later
          </Link>
          <Link to="/shop" className="btn btn-dark" style={{ textAlign: "center" }}>
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
