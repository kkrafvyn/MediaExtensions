import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { StatusChip } from "../components/StatusChip";
import { CopyButton } from "../components/CopyButton";

export function TrackSharePage() {
  const { token } = useParams();
  const [error, setError] = useState("");
  type TrackPayload =
    | {
        kind: "order";
        order: { id: string; status: string; totalPesewas: number; items: Array<{ name: string; quantity: number }> };
        downloads?: Array<{ token: string; productName: string }>;
      }
    | {
        kind: "repair";
        repair: { id: string; status: string; deviceBrand: string; deviceModel: string; quotePesewas: number | null };
      };
  const [data, setData] = useState<TrackPayload | null>(null);

  useEffect(() => {
    if (!token) return;
    api<TrackPayload>(`/api/track/${token}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="page container">
        <div className="alert-banner">{error}</div>
        <Link to="/track" className="btn btn-dark">Track with email</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page container">
        <p className="meta">Loading…</p>
      </div>
    );
  }

  const shareUrl = window.location.href;

  if (data.kind === "order") {
    return (
      <div className="page container stack" style={{ maxWidth: 640 }}>
        <h1>Order tracking</h1>
        <StatusChip status={data.order.status} />
        <p className="meta">Order {data.order.id.slice(0, 8)} · {formatGhs(data.order.totalPesewas)}</p>
        <CopyButton text={shareUrl} label="Copy share link" />
        <Link to={`/order/${data.order.id}`} className="btn btn-primary">
          View full order
        </Link>
      </div>
    );
  }

  return (
    <div className="page container stack" style={{ maxWidth: 640 }}>
      <h1>Repair tracking</h1>
      <StatusChip status={data.repair.status} />
      <p className="meta">
        {data.repair.deviceBrand} {data.repair.deviceModel}
        {data.repair.quotePesewas != null ? ` · ${formatGhs(data.repair.quotePesewas)}` : ""}
      </p>
      <CopyButton text={shareUrl} label="Copy share link" />
      <Link to={`/repairs/status/${data.repair.id}`} className="btn btn-primary">
        View repair ticket
      </Link>
    </div>
  );
}
