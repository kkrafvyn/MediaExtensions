import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import type { OrderSummary } from "../types";

type ReceiptResponse = {
  order: OrderSummary;
  store?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
};

export function OrderReceiptPage() {
  const { id } = useParams();
  const [data, setData] = useState<ReceiptResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api<ReceiptResponse>(`/api/orders/${id}/receipt`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
        <Link to={id ? `/order/${id}` : "/track"}>Back</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page container">
        <p className="meta">Loading receipt…</p>
      </div>
    );
  }

  const { order, store } = data;

  return (
    <div className="page container receipt-page">
      <div className="receipt-actions no-print">
        <button className="btn btn-dark" type="button" onClick={() => window.print()}>
          Print receipt
        </button>
        <Link to={`/order/${order.id}`} className="btn btn-light">
          Back to order
        </Link>
      </div>

      <article className="receipt panel stack">
        <header className="receipt-head">
          <strong style={{ fontSize: "1.3rem", fontFamily: "var(--font-display)", fontWeight: 800 }}>Media Extensions</strong>
          <div className="meta">
            {store?.address ?? "Accra, Ghana"}
            {store?.phone ? ` · ${store.phone}` : ""}
            {store?.email ? ` · ${store.email}` : ""}
          </div>
        </header>

        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Receipt</h1>
        <div className="line-item">
          <span>Order</span>
          <span>{order.id}</span>
        </div>
        <div className="line-item">
          <span>Customer</span>
          <span>
            {order.name}
            <br />
            {order.email}
          </span>
        </div>
        <div className="line-item">
          <span>Status</span>
          <span>{order.status.replaceAll("_", " ")}</span>
        </div>
        <div className="line-item">
          <span>Payment</span>
          <span>{order.paymentMethod}</span>
        </div>
        {order.createdAt && (
          <div className="line-item">
            <span>Date</span>
            <span>{new Date(order.createdAt).toLocaleString("en-GH")}</span>
          </div>
        )}

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

        {order.shipping && (
          <p className="meta">
            Ship to: {order.shipping.fullName}, {order.shipping.street}, {order.shipping.city},{" "}
            {order.shipping.region}
          </p>
        )}
      </article>
    </div>
  );
}

type RepairDetail = {
  id: string;
  status: string;
  paymentStatus: string;
  name: string;
  email: string;
  phone: string;
  deviceBrand: string;
  deviceModel: string;
  issue: string;
  quotePesewas: number | null;
  service?: { name: string } | null;
  createdAt?: string;
};

export function RepairReceiptPage() {
  const { id } = useParams();
  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api<{ repair: RepairDetail }>(`/api/repairs/${id}`)
      .then((d) => setRepair(d.repair))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
        <Link to={id ? `/repairs/status/${id}` : "/repairs"}>Back</Link>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="page container">
        <p className="meta">Loading receipt…</p>
      </div>
    );
  }

  return (
    <div className="page container receipt-page">
      <div className="receipt-actions no-print">
        <button className="btn btn-dark" type="button" onClick={() => window.print()}>
          Print receipt
        </button>
        <Link to={`/repairs/status/${repair.id}`} className="btn btn-light">
          Back to status
        </Link>
      </div>

      <article className="receipt panel stack">
        <header className="receipt-head">
          <strong style={{ fontSize: "1.3rem", fontFamily: "var(--font-display)", fontWeight: 800 }}>Media Extensions</strong>
          <div className="meta">GSM repair receipt · Accra, Ghana</div>
        </header>

        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Repair receipt</h1>
        <div className="line-item">
          <span>Booking</span>
          <span>{repair.id}</span>
        </div>
        <div className="line-item">
          <span>Customer</span>
          <span>
            {repair.name}
            <br />
            {repair.phone} · {repair.email}
          </span>
        </div>
        <div className="line-item">
          <span>Device</span>
          <span>
            {repair.deviceBrand} {repair.deviceModel}
          </span>
        </div>
        <div className="line-item">
          <span>Service</span>
          <span>{repair.service?.name ?? "General diagnosis"}</span>
        </div>
        <div className="line-item">
          <span>Issue</span>
          <span>{repair.issue}</span>
        </div>
        <div className="line-item">
          <span>Status</span>
          <span>{repair.status.replaceAll("_", " ")}</span>
        </div>
        <div className="line-item">
          <span>Payment</span>
          <span>{repair.paymentStatus}</span>
        </div>
        <div className="line-item">
          <strong>Quote</strong>
          <strong>
            {repair.quotePesewas != null ? formatGhs(repair.quotePesewas) : "Pending"}
          </strong>
        </div>
      </article>
    </div>
  );
}
