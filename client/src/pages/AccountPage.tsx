import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import {
  IconBolt,
  IconPackage,
  IconWrench,
  IconSettings,
  IconStaff,
} from "../components/Icons";

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
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [activeTab, setActiveTab] = useState<"downloads" | "orders" | "repairs" | "settings">(
    location.pathname.includes("/repairs") ? "repairs" : "downloads",
  );
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (location.pathname.includes("/repairs")) {
      setActiveTab("repairs");
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name);
    setProfilePhone(user.phone ?? "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api<{ orders: Order[] }>("/api/orders/mine").then((d) => setOrders(d.orders || [])).catch(() => setOrders([]));
    api<{ repairs: Repair[] }>("/api/repairs/mine").then((d) => setRepairs(d.repairs || [])).catch(() => setRepairs([]));
    api<{ downloads: Download[] }>("/api/orders/mine/downloads")
      .then((d) => setDownloads(d.downloads || []))
      .catch(() => setDownloads([]));
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    await refresh();
  }

  function copyDownloadLink(token: string) {
    const url = `${window.location.origin}/api/downloads/${token}`;
    navigator.clipboard.writeText(url);
    toast("Download link copied to clipboard!");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const body: Record<string, string> = {};
      if (profileName.trim() && profileName !== user?.name) body.name = profileName.trim();
      if (profilePhone !== (user?.phone ?? "")) body.phone = profilePhone.trim();
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await api<{ user: typeof user }>("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.user) setUser(res.user);
      setCurrentPassword("");
      setNewPassword("");
      toast("Profile updated");
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ME";

  return (
    <div className="page container">
      {/* Account User Card */}
      <div
        className="panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          marginBottom: "2.5rem",
          background: "linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div
            style={{
              width: "3.75rem",
              height: "3.75rem",
              borderRadius: "50%",
              background: "var(--ink)",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-display)",
              fontSize: "1.35rem",
              fontWeight: 800,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h1 style={{ fontSize: "1.6rem", margin: 0 }}>{user.name}</h1>
              <span className="badge badge-digital" style={{ textTransform: "capitalize" }}>
                {user.role}
              </span>
            </div>
            <p className="meta" style={{ margin: "0.2rem 0 0" }}>
              {user.email} {user.phone ? `· ${user.phone}` : ""}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {user.role !== "consumer" && (
            <Link to="/staff" className="btn btn-primary btn-sm inline-icon-label">
              <IconStaff size={14} /> Staff Portal
            </Link>
          )}
          <button className="btn btn-light btn-sm" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Account Navigation Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid var(--line)", marginBottom: "2rem" }}>
        <button
          className={`pdp-tab-btn ${activeTab === "downloads" ? "active" : ""}`}
          onClick={() => setActiveTab("downloads")}
        >
          <span className="tab-icon-label">
            <IconBolt size={14} /> Digital Downloads Vault ({downloads.length})
          </span>
        </button>
        <button
          className={`pdp-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          <span className="tab-icon-label">
            <IconPackage size={14} /> Order History ({orders.length})
          </span>
        </button>
        <button
          className={`pdp-tab-btn ${activeTab === "repairs" ? "active" : ""}`}
          onClick={() => setActiveTab("repairs")}
        >
          <span className="tab-icon-label">
            <IconWrench size={14} /> GSM Repair Tickets ({repairs.length})
          </span>
        </button>
        <button
          className={`pdp-tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <span className="tab-icon-label">
            <IconSettings size={14} /> Account Settings
          </span>
        </button>
      </div>

      {/* Tab 1: Downloads */}
      {activeTab === "downloads" && (
        <div className="panel stack">
          <div className="panel-header">
            <div>
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Digital Downloads Vault</h2>
              <p className="meta" style={{ fontSize: "0.85rem", margin: 0 }}>
                Instant access to your purchased LUTs, sound packs & licenses.
              </p>
            </div>
            <span className="badge badge-digital">{downloads.length} active</span>
          </div>

          {!downloads.length ? (
            <div className="empty" style={{ padding: "2.5rem" }}>
              <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No digital downloads active yet</p>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
                Purchased digital tools will appear here immediately after payment is confirmed.
              </p>
              <Link to="/shop?fulfillment=digital" className="btn btn-primary btn-sm">
                Browse Digital Creator Assets →
              </Link>
            </div>
          ) : (
            <div className="stack" style={{ gap: "0.75rem" }}>
              {downloads.map((d) => (
                <div
                  key={d.token}
                  className="line-item"
                  style={{
                    padding: "1.1rem 1.25rem",
                    background: "var(--bg)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line-subtle)",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "1.1rem", display: "block" }}>{d.productName}</strong>
                    <div className="meta" style={{ fontSize: "0.82rem", marginTop: "0.2rem" }}>
                      Order #{d.orderId.slice(0, 8)} · {d.downloadCount}/{d.maxDownloads} downloads used · Active until{" "}
                      {new Date(d.expiresAt).toLocaleDateString("en-GH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => copyDownloadLink(d.token)}
                    >
                      Copy Link
                    </button>
                    <a className="btn btn-primary btn-sm" href={`/api/downloads/${d.token}`} download>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download .ZIP
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Orders */}
      {activeTab === "orders" && (
        <div className="panel stack">
          <div className="panel-header">
            <div>
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Order History</h2>
              <p className="meta" style={{ fontSize: "0.85rem", margin: 0 }}>
                Review past purchases and print formal PDF receipts.
              </p>
            </div>
            <span className="badge badge-physical">{orders.length} orders</span>
          </div>

          {!orders.length ? (
            <div className="empty" style={{ padding: "2rem" }}>
              <p className="meta">No orders placed yet.</p>
              <Link to="/shop" className="btn btn-dark btn-sm" style={{ marginTop: "0.75rem" }}>
                Browse Store
              </Link>
            </div>
          ) : (
            <div className="stack" style={{ gap: "0.75rem" }}>
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="line-item"
                  style={{
                    padding: "1rem 1.25rem",
                    background: "var(--bg)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line-subtle)",
                  }}
                >
                  <div>
                    <Link to={`/order/${o.id}`} style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1.05rem" }}>
                      Order #{o.id.slice(0, 8)} →
                    </Link>
                    <div className="meta" style={{ fontSize: "0.82rem", textTransform: "capitalize", marginTop: "0.2rem" }}>
                      Status: <span className="status-chip status-paid">{o.status.replaceAll("_", " ")}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "1.1rem", fontFamily: "var(--font-display)" }}>
                      {formatGhs(o.totalPesewas)}
                    </strong>
                    <div>
                      <Link to={`/order/${o.id}/receipt`} style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "underline" }}>
                        View Receipt
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Repairs */}
      {activeTab === "repairs" && (
        <div className="panel stack">
          <div className="panel-header">
            <div>
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>GSM Repair Tickets</h2>
              <p className="meta" style={{ fontSize: "0.85rem", margin: 0 }}>
                Live repair status and 90-day warranty service records.
              </p>
            </div>
            <span className="badge badge-repair">{repairs.length} tickets</span>
          </div>

          {!repairs.length ? (
            <div className="empty" style={{ padding: "2rem" }}>
              <p className="meta">No active repair tickets.</p>
              <Link to="/repairs/book" className="btn btn-dark btn-sm" style={{ marginTop: "0.75rem" }}>
                Book a Device Repair
              </Link>
            </div>
          ) : (
            <div className="stack" style={{ gap: "0.75rem" }}>
              {repairs.map((r) => (
                <div
                  key={r.id}
                  className="line-item"
                  style={{
                    padding: "1rem 1.25rem",
                    background: "var(--bg)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line-subtle)",
                  }}
                >
                  <div>
                    <Link to={`/repairs/status/${r.id}`} style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--ink)" }}>
                      {r.deviceBrand} {r.deviceModel} →
                    </Link>
                    <div className="meta" style={{ fontSize: "0.82rem", marginTop: "0.2rem" }}>
                      {r.service?.name ?? "Hardware Diagnosis"} ·{" "}
                      <span className="status-chip status-pending">
                        {r.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "1.1rem", color: "var(--accent)" }}>
                      {r.quotePesewas != null ? formatGhs(r.quotePesewas) : "Pending Quote"}
                    </strong>
                    <div>
                      <Link to={`/repairs/status/${r.id}`} style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "underline" }}>
                        Track Ticket
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <form className="panel stack" onSubmit={saveProfile}>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Account Settings</h2>
          <p className="meta" style={{ margin: 0 }}>
            Update your contact details or change your password.
          </p>
          <label>
            Full name
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
          </label>
          <label>
            Phone (optional)
            <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+233…" />
          </label>
          <label>
            Email
            <input value={user.email} disabled />
          </label>
          <div className="form-grid two">
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required to change password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}
    </div>
  );
}
