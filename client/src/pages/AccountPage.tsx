import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Order = {
  id: string;
  status: string;
  totalPesewas: number;
  createdAt: string;
};

type Repair = {
  id: string;
  status: string;
  deviceBrand: string;
  deviceModel: string;
  quotePesewas: number | null;
  service?: { name: string } | null;
};

type Download = {
  token: string;
  productName: string;
  orderId: string;
  expiresAt: string;
  downloadCount: number;
  maxDownloads: number;
};

export function AccountPage() {
  const { user, refresh, setUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);

  useEffect(() => {
    if (!user) return;
    api<{ orders: Order[] }>("/api/orders/mine").then((d) => setOrders(d.orders));
    api<{ repairs: Repair[] }>("/api/repairs/mine").then((d) => setRepairs(d.repairs));
    api<{ downloads: Download[] }>("/api/orders/mine/downloads")
      .then((d) => setDownloads(d.downloads))
      .catch(() => setDownloads([]));
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    await refresh();
  }

  return (
    <div className="page container">
      <h1>Account</h1>
      <p className="lede">
        Signed in as {user.name} ({user.role}).
      </p>
      <button className="btn btn-light" onClick={logout} style={{ marginBottom: "1.5rem" }}>
        Sign out
      </button>

      <div className="stack" style={{ gap: "1.5rem" }}>
        <div className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Downloads</h2>
          {!downloads.length && (
            <p className="meta">No digital downloads yet. They appear after staff confirms payment.</p>
          )}
          {downloads.map((d) => (
            <div key={d.token} className="line-item">
              <div>
                <strong>{d.productName}</strong>
                <div className="meta">
                  Order {d.orderId.slice(0, 8)}… · {d.downloadCount}/{d.maxDownloads} used · expires{" "}
                  {new Date(d.expiresAt).toLocaleDateString("en-GH")}
                </div>
              </div>
              <a className="btn btn-light" href={`/api/downloads/${d.token}`}>
                Download
              </a>
            </div>
          ))}
        </div>

        <div className="split split-2">
          <div className="panel">
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Orders</h2>
            {!orders.length && <p className="meta">No orders yet.</p>}
            {orders.map((o) => (
              <div key={o.id} className="line-item">
                <div>
                  <Link to={`/order/${o.id}`}>{o.id.slice(0, 8)}…</Link>
                  <div className="meta">{o.status.replaceAll("_", " ")}</div>
                </div>
                <strong>{formatGhs(o.totalPesewas)}</strong>
              </div>
            ))}
          </div>
          <div className="panel">
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Repairs</h2>
            {!repairs.length && (
              <p className="meta">
                No repairs. <Link to="/repairs">Book one</Link>
              </p>
            )}
            {repairs.map((r) => (
              <div key={r.id} className="line-item">
                <div>
                  <Link to={`/repairs/status/${r.id}`}>
                    <strong>
                      {r.deviceBrand} {r.deviceModel}
                    </strong>
                  </Link>
                  <div className="meta">
                    {r.service?.name ?? "General"} · {r.status.replaceAll("_", " ")}
                  </div>
                </div>
                <span>{r.quotePesewas != null ? formatGhs(r.quotePesewas) : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
