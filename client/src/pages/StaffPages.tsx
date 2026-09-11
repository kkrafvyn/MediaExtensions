import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { api, apiUpload, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Category, Product, StaffAnalytics } from "../types";

function StaffGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page container">Loading…</div>;
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function StaffLayout() {
  const { user } = useAuth();
  return (
    <StaffGuard>
      <div className="page container staff-shell">
        <div className="staff-header">
          <div>
            <p className="eyebrow page-eyebrow">Staff Console</p>
            <h1>Control center</h1>
            <p className="lede staff-lede">
              Hello {user?.name}. Manage the storefront, orders, repairs, and store settings from here.
            </p>
          </div>
          <Link to="/" className="btn btn-light btn-sm">
            View storefront
          </Link>
        </div>

        <nav className="staff-nav" aria-label="Staff sections">
          <div className="staff-nav-group">
            <span className="staff-nav-label">Overview</span>
            <NavLink to="/staff" end className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Dashboard
            </NavLink>
            <NavLink to="/staff/orders" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Orders
            </NavLink>
            <NavLink to="/staff/repairs" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Repairs
            </NavLink>
            <NavLink to="/staff/messages" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Messages
            </NavLink>
          </div>
          <div className="staff-nav-group">
            <span className="staff-nav-label">Catalog</span>
            <NavLink to="/staff/products" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Products
            </NavLink>
            <NavLink to="/staff/services" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Repair services
            </NavLink>
            {user?.role === "admin" && (
              <NavLink to="/staff/categories" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
                Categories
              </NavLink>
            )}
          </div>
          <div className="staff-nav-group">
            <span className="staff-nav-label">Admin</span>
            <NavLink to="/staff/settings" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Store settings
            </NavLink>
            {user?.role === "admin" && (
              <NavLink to="/staff/users" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
                Users
              </NavLink>
            )}
          </div>
        </nav>
        <Outlet />
      </div>
    </StaffGuard>
  );
}

export function StaffDashboard() {
  const [dash, setDash] = useState<{
    stats: { orders: number; repairs: number; products: number };
    recentOrders?: Array<{ id: string; name: string; status: string; totalPesewas: number; createdAt: string }>;
    recentRepairs?: Array<{ id: string; name: string; status: string; deviceBrand: string; deviceModel: string }>;
  } | null>(null);
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null);

  useEffect(() => {
    api<typeof dash>("/api/staff/dashboard").then(setDash);
    api<StaffAnalytics>("/api/staff/analytics")
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, []);

  if (!dash) return <p className="meta">Loading…</p>;

  const revenue =
    analytics?.paidRevenuePesewas ?? analytics?.revenuePesewas ?? null;
  const lowStock = analytics?.lowStock ?? [];
  const orderCounts = analytics?.orderStatusCounts ?? {};
  const repairCounts = analytics?.repairStatusCounts ?? {};
  const topProducts = analytics?.topProducts ?? [];

  return (
    <div className="stack">
      {lowStock.length > 0 && (
        <div className="alert-banner" role="alert">
          <strong>Low stock:</strong>{" "}
          {lowStock.map((p) => `${p.name} (${p.stock})`).join(", ")}{" "}
          <Link to="/staff/products" style={{ marginLeft: "0.5rem", fontWeight: 600 }}>
            Manage products →
          </Link>
        </div>
      )}

      <div className="staff-stats-grid">
        <Link to="/staff/orders" className="stat-widget">
          <span className="stat-title">Orders</span>
          <span className="stat-number">{dash.stats.orders}</span>
        </Link>
        <Link to="/staff/repairs" className="stat-widget">
          <span className="stat-title">Repairs</span>
          <span className="stat-number">{dash.stats.repairs}</span>
        </Link>
        <Link to="/staff/products" className="stat-widget">
          <span className="stat-title">Products</span>
          <span className="stat-number">{dash.stats.products}</span>
        </Link>
        {revenue != null && (
          <div className="stat-widget stat-widget-accent">
            <span className="stat-title">Paid revenue</span>
            <span className="stat-number">{formatGhs(revenue)}</span>
          </div>
        )}
      </div>

      <div className="staff-quick-actions">
        <Link to="/staff/orders" className="btn btn-primary btn-sm">Review orders</Link>
        <Link to="/staff/products" className="btn btn-light btn-sm">Edit catalog</Link>
        <Link to="/staff/settings" className="btn btn-light btn-sm">Store settings</Link>
        <Link to="/staff/repairs" className="btn btn-light btn-sm">Repair tickets</Link>
      </div>

      {(Object.keys(orderCounts).length > 0 || Object.keys(repairCounts).length > 0) && (
        <div className="split split-2">
          {Object.keys(orderCounts).length > 0 && (
            <div className="panel stack">
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Orders by status</h2>
              {Object.entries(orderCounts).map(([status, count]) => (
                <div key={status} className="line-item">
                  <span>{status.replaceAll("_", " ")}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
          {Object.keys(repairCounts).length > 0 && (
            <div className="panel stack">
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Repairs by status</h2>
              {Object.entries(repairCounts).map(([status, count]) => (
                <div key={status} className="line-item">
                  <span>{status.replaceAll("_", " ")}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="split split-2">
        <div className="panel stack">
          <div className="panel-header" style={{ marginBottom: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Recent orders</h2>
            <Link to="/staff/orders" className="meta">View all</Link>
          </div>
          {(dash.recentOrders ?? []).length === 0 && <p className="meta">No orders yet.</p>}
          {(dash.recentOrders ?? []).map((o) => (
            <div key={o.id} className="line-item">
              <span>
                <strong>{o.name}</strong>
                <div className="meta">{o.status.replaceAll("_", " ")}</div>
              </span>
              <strong>{formatGhs(o.totalPesewas)}</strong>
            </div>
          ))}
        </div>
        <div className="panel stack">
          <div className="panel-header" style={{ marginBottom: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Recent repairs</h2>
            <Link to="/staff/repairs" className="meta">View all</Link>
          </div>
          {(dash.recentRepairs ?? []).length === 0 && <p className="meta">No repair tickets yet.</p>}
          {(dash.recentRepairs ?? []).map((r) => (
            <div key={r.id} className="line-item">
              <span>
                <strong>
                  {r.deviceBrand} {r.deviceModel}
                </strong>
                <div className="meta">
                  {r.name} · {r.status.replaceAll("_", " ")}
                </div>
              </span>
            </div>
          ))}
        </div>
      </div>

      {topProducts.length > 0 && (
        <div className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Top selling products</h2>
          {topProducts.slice(0, 5).map((p) => (
            <div key={`${p.productId ?? p.name}`} className="line-item">
              <span>{p.name}</span>
              <strong>
                {p.quantitySold} sold · {formatGhs(p.revenuePesewas)}
              </strong>
            </div>
          ))}
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Low stock products</h2>
          {lowStock.map((p) => (
            <div key={p.id} className="line-item">
              <span>{p.name}</span>
              <strong>{p.stock} left</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StaffOrders() {
  type Payment = { id: string; method: string; amountPesewas: number; reference: string | null; receivedAt: string; recordedBy?: { name: string } | null };
  type StaffOrder = {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    paymentMethod: string;
    totalPesewas: number;
    shippingPesewas?: number;
    createdAt?: string;
    shipping?: { fullName?: string; street?: string; city?: string; region?: string; phone?: string } | null;
    items?: Array<{ name: string; quantity: number; unitPricePesewas: number; fulfillment: string }>;
    payments: Payment[];
  };
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [payment, setPayment] = useState({ method: "cash", amount: "", reference: "", notes: "" });

  async function load() {
    const d = await api<{ orders: StaffOrder[] }>("/api/staff/orders");
    setOrders(d.orders);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    if (status === "cancelled" && !window.confirm("Cancel this order? Reserved stock will be released.")) {
      return;
    }
    await api(`/api/staff/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  function openPayment(order: StaffOrder) {
    const paid = order.payments.reduce((sum, item) => sum + item.amountPesewas, 0);
    setRecordingFor(order.id);
    setExpandedId(order.id);
    setPayment({
      method: order.paymentMethod === "momo" || order.paymentMethod === "bank" ? order.paymentMethod : "cash",
      amount: String(Math.max(0, (order.totalPesewas - paid) / 100)),
      reference: "",
      notes: "",
    });
    setPaymentError("");
  }

  async function recordPayment(e: FormEvent, order: StaffOrder) {
    e.preventDefault();
    const amountPesewas = Math.round(Number(payment.amount) * 100);
    if (!Number.isInteger(amountPesewas) || amountPesewas <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }
    setPaymentError("");
    try {
      await api(`/api/staff/orders/${order.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          method: payment.method,
          amountPesewas,
          reference: payment.reference || undefined,
          notes: payment.notes || undefined,
        }),
      });
      setRecordingFor(null);
      await load();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Could not record payment");
    }
  }

  const filtered = orders.filter((o) => statusFilter === "all" || o.status === statusFilter);
  const filters = [
    { value: "all", label: "All" },
    { value: "pending_payment", label: "Pending" },
    { value: "awaiting_pickup", label: "Pickup" },
    { value: "paid", label: "Paid" },
    { value: "fulfilled", label: "Fulfilled" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="stack">
      <div className="staff-filter-row">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`shop-chip ${statusFilter === f.value ? "active" : ""}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const paidTotal = o.payments.reduce((sum, item) => sum + item.amountPesewas, 0);
              const canPay = o.status !== "cancelled" && o.status !== "paid" && o.status !== "fulfilled";
              const canFulfill = o.status === "paid" || o.status === "awaiting_pickup";
              const canCancel = o.status !== "cancelled" && o.status !== "fulfilled";
              return (
                <Fragment key={o.id}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className="staff-expand-btn"
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                      >
                        <strong>{o.name}</strong>
                      </button>
                      <div className="meta">
                        {o.email} · {o.paymentMethod} · #{o.id.slice(0, 8)}
                      </div>
                    </td>
                    <td>{formatGhs(o.totalPesewas)}</td>
                    <td>
                      <span className={`status-chip status-${o.status}`}>{o.status.replaceAll("_", " ")}</span>
                      {paidTotal > 0 && <div className="payment-total">Paid {formatGhs(paidTotal)}</div>}
                    </td>
                    <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      {canPay && (
                        <button className="btn btn-dark btn-sm" type="button" onClick={() => openPayment(o)}>
                          Record payment
                        </button>
                      )}
                      {canPay && (
                        <button className="btn btn-light btn-sm" type="button" onClick={() => setStatus(o.id, "paid")}>
                          Mark paid
                        </button>
                      )}
                      {o.status === "pending_payment" && (
                        <button className="btn btn-light btn-sm" type="button" onClick={() => setStatus(o.id, "awaiting_pickup")}>
                          Ready for pickup
                        </button>
                      )}
                      {canFulfill && (
                        <button className="btn btn-light btn-sm" type="button" onClick={() => setStatus(o.id, "fulfilled")}>
                          Fulfill
                        </button>
                      )}
                      {canCancel && (
                        <button className="btn btn-light btn-sm" type="button" onClick={() => setStatus(o.id, "cancelled")}>
                          Cancel
                        </button>
                      )}
                      <Link to={`/order/${o.id}/receipt`} className="btn btn-light btn-sm">
                        Receipt
                      </Link>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr className="staff-detail-row">
                      <td colSpan={4}>
                        <div className="staff-order-detail">
                          <div>
                            <strong>Items</strong>
                            {(o.items ?? []).map((item, idx) => (
                              <div key={idx} className="meta">
                                {item.name} × {item.quantity} · {formatGhs(item.unitPricePesewas * item.quantity)} · {item.fulfillment}
                              </div>
                            ))}
                            {o.shipping && (
                              <div style={{ marginTop: "0.75rem" }}>
                                <strong>Shipping</strong>
                                <div className="meta">
                                  {o.shipping.fullName}, {o.shipping.street}, {o.shipping.city}, {o.shipping.region}
                                  {o.shipping.phone ? ` · ${o.shipping.phone}` : ""}
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <strong>Payments</strong>
                            {o.payments.length === 0 && <div className="meta">No payments recorded yet.</div>}
                            {o.payments.map((p) => (
                              <div key={p.id} className="meta">
                                {p.method} · {formatGhs(p.amountPesewas)}
                                {p.reference ? ` · ${p.reference}` : ""}
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {recordingFor === o.id && (
                    <tr className="payment-entry-row">
                      <td colSpan={4}>
                        <form className="offline-payment-form" onSubmit={(e) => recordPayment(e, o)}>
                          <strong>Record an offline payment</strong>
                          <label>
                            Method
                            <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                              <option value="cash">Cash at counter</option>
                              <option value="momo">Mobile Money</option>
                              <option value="bank">Bank transfer</option>
                              <option value="other">Other</option>
                            </select>
                          </label>
                          <label>
                            Amount (GHS)
                            <input
                              value={payment.amount}
                              onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                            />
                          </label>
                          <label>
                            Reference <span className="meta">(optional)</span>
                            <input
                              value={payment.reference}
                              onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                              placeholder="Receipt or transaction ID"
                            />
                          </label>
                          <label>
                            Notes <span className="meta">(optional)</span>
                            <input value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
                          </label>
                          {paymentError && <p className="error">{paymentError}</p>}
                          <button className="btn btn-primary" type="submit">
                            Save payment
                          </button>
                          <button className="btn btn-light" type="button" onClick={() => setRecordingFor(null)}>
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="meta" style={{ padding: "1rem" }}>No orders in this filter.</p>}
      </div>
    </div>
  );
}

async function uploadStaffImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiUpload<{ url: string }>("/api/staff/uploads", fd);
  return res.url;
}

async function uploadDigitalAsset(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiUpload<{ path: string }>("/api/staff/uploads/digital", fd);
  return res.path;
}

export function StaffProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    priceGhs: string;
    fulfillment: "digital" | "physical" | "both";
    stock: number;
    categoryId: string;
    imageUrl: string;
    digitalAssetPath: string;
  }>({
    name: "",
    description: "",
    priceGhs: "100",
    fulfillment: "physical",
    stock: 10,
    categoryId: "",
    imageUrl: "",
    digitalAssetPath: "",
  });
  const [uploadingDigitalId, setUploadingDigitalId] = useState<string | null>(null);

  async function load() {
    const [p, c] = await Promise.all([
      api<{ products: Product[] }>("/api/staff/products"),
      api<{ categories: Category[] }>("/api/staff/categories"),
    ]);
    setProducts(p.products);
    setCategories(c.categories);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreateImage(file: File | null) {
    if (!file) return;
    try {
      const url = await uploadStaffImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch {
      /* ignore — create still works with default */
    }
  }

  async function onProductImage(product: Product, file: File | null) {
    if (!file) return;
    setUploadingId(product.id);
    try {
      const url = await uploadStaffImage(file);
      const images = [...(product.images ?? []), url];
      await api(`/api/staff/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ images }),
      });
      await load();
    } finally {
      setUploadingId(null);
    }
  }

  async function onCreateDigital(file: File | null) {
    if (!file) return;
    try {
      const assetPath = await uploadDigitalAsset(file);
      setForm((f) => ({ ...f, digitalAssetPath: assetPath }));
    } catch {
      /* ignore */
    }
  }

  async function onProductDigital(product: Product, file: File | null) {
    if (!file) return;
    setUploadingDigitalId(product.id);
    try {
      const assetPath = await uploadDigitalAsset(file);
      await api(`/api/staff/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ digitalAssetPath: assetPath }),
      });
      await load();
    } finally {
      setUploadingDigitalId(null);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const pricePesewas = Math.round(Number(form.priceGhs) * 100);
    if (!Number.isFinite(pricePesewas) || pricePesewas <= 0) return;
    await api("/api/staff/products", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        pricePesewas,
        fulfillment: form.fulfillment,
        stock: form.fulfillment === "digital" ? 0 : form.stock,
        categoryId: form.categoryId || null,
        images: form.imageUrl ? [form.imageUrl] : [],
        digitalAssetPath: form.digitalAssetPath || null,
      }),
    });
    setForm({ ...form, name: "", description: "", imageUrl: "", digitalAssetPath: "", priceGhs: "100" });
    await load();
  }

  return (
    <div className="stack">
      <form className="panel stack" onSubmit={create}>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Add product</h2>
        <div className="form-grid two">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Price (GHS)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.priceGhs}
              onChange={(e) => setForm({ ...form, priceGhs: e.target.value })}
              required
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </label>
        <div className="form-grid two">
          <label>
            Fulfillment
            <select
              value={form.fulfillment}
              onChange={(e) =>
                setForm({ ...form, fulfillment: e.target.value as typeof form.fulfillment })
              }
            >
              <option value="digital">Digital download</option>
              <option value="physical">Physical product</option>
              <option value="both">Bundle (digital + physical)</option>
            </select>
          </label>
          <label>
            Category
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {form.fulfillment !== "digital" && (
          <label>
            Stock quantity
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            />
          </label>
        )}
        <label>
          Product image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onCreateImage(e.target.files?.[0] ?? null)}
          />
          {form.imageUrl && (
            <span className="meta">Uploaded: {form.imageUrl}</span>
          )}
        </label>
        {(form.fulfillment === "digital" || form.fulfillment === "both") && (
          <label>
            Digital download file (.zip, etc.)
            <input
              type="file"
              onChange={(e) => onCreateDigital(e.target.files?.[0] ?? null)}
            />
            {form.digitalAssetPath && (
              <span className="meta">Asset: {form.digitalAssetPath}</span>
            )}
          </label>
        )}
        <button className="btn btn-primary" type="submit">
          Create
        </button>
      </form>

      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price (GHS)</th>
              <th>Stock</th>
              <th>Image</th>
              <th>Digital file</th>
              <th>Featured</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <div className="meta">{p.fulfillment}</div>
                  {p.images?.[0] && (
                    <img
                      src={p.images[0]}
                      alt=""
                      style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6, marginTop: 6 }}
                    />
                  )}
                </td>
                <td>
                  <input
                    className="inline-edit"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={(p.pricePesewas / 100).toFixed(2)}
                    key={`price-${p.id}-${p.pricePesewas}`}
                    onBlur={(e) => {
                      const pricePesewas = Math.round(Number(e.target.value) * 100);
                      if (!pricePesewas || pricePesewas === p.pricePesewas) return;
                      api(`/api/staff/products/${p.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ pricePesewas }),
                      }).then(load);
                    }}
                  />
                </td>
                <td>
                  <input
                    className="inline-edit"
                    type="number"
                    defaultValue={p.stock}
                    onBlur={(e) => {
                      const stock = Number(e.target.value);
                      if (Number.isNaN(stock) || stock === p.stock) return;
                      api(`/api/staff/products/${p.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ stock }),
                      }).then(load);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingId === p.id}
                    onChange={(e) => {
                      void onProductImage(p, e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  {uploadingId === p.id && <div className="meta">Uploading…</div>}
                </td>
                <td>
                  {(p.fulfillment === "digital" || p.fulfillment === "both") ? (
                    <>
                      <input
                        type="file"
                        disabled={uploadingDigitalId === p.id}
                        onChange={(e) => {
                          void onProductDigital(p, e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                      {p.digitalAssetPath && (
                        <div className="meta">{p.digitalAssetPath}</div>
                      )}
                      {uploadingDigitalId === p.id && <div className="meta">Uploading…</div>}
                    </>
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-light"
                    onClick={() =>
                      api(`/api/staff/products/${p.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ featured: !p.featured }),
                      }).then(load)
                    }
                  >
                    {p.featured ? "Featured" : "Not featured"}
                  </button>
                </td>
                <td>
                  <button
                    className="btn btn-light"
                    onClick={() =>
                      api(`/api/staff/products/${p.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ active: !p.active }),
                      }).then(load)
                    }
                  >
                    {p.active === false ? "Inactive · Activate" : "Active · Hide"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StaffRepairs() {
  const [repairs, setRepairs] = useState<
    Array<{
      id: string;
      name: string;
      phone: string;
      email?: string;
      deviceBrand: string;
      deviceModel: string;
      status: string;
      paymentStatus: string;
      quotePesewas: number | null;
      staffNotes?: string | null;
      issue: string;
    }>
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ status: "", quoteGhs: "", notes: "", paymentStatus: "" });

  async function load() {
    const d = await api<{ repairs: typeof repairs }>("/api/staff/repairs");
    setRepairs(d.repairs);
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(r: (typeof repairs)[number]) {
    setEditingId(r.id);
    setDraft({
      status: r.status,
      quoteGhs: r.quotePesewas != null ? (r.quotePesewas / 100).toFixed(2) : "",
      notes: r.staffNotes ?? "",
      paymentStatus: r.paymentStatus,
    });
  }

  async function saveEdit(e: FormEvent, id: string) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      status: draft.status,
      paymentStatus: draft.paymentStatus,
      staffNotes: draft.notes,
    };
    if (draft.quoteGhs.trim() !== "") {
      body.quotePesewas = Math.round(Number(draft.quoteGhs) * 100);
    }
    await api(`/api/staff/repairs/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setEditingId(null);
    await load();
  }

  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {repairs.map((r) => (
            <Fragment key={r.id}>
              <tr>
                <td>
                  <strong>
                    {r.deviceBrand} {r.deviceModel}
                  </strong>
                  <div className="meta">{r.issue}</div>
                </td>
                <td>
                  {r.name}
                  <div className="meta">{r.phone}</div>
                </td>
                <td>
                  {r.status.replaceAll("_", " ")}
                  <div className="meta">
                    {r.paymentStatus}
                    {r.quotePesewas != null ? ` · ${formatGhs(r.quotePesewas)}` : ""}
                  </div>
                </td>
                <td>
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => openEdit(r)}>
                    Update ticket
                  </button>
                </td>
              </tr>
              {editingId === r.id && (
                <tr className="staff-detail-row">
                  <td colSpan={4}>
                    <form className="staff-ticket-form" onSubmit={(e) => saveEdit(e, r.id)}>
                      <label>
                        Status
                        <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                          <option value="submitted">Submitted</option>
                          <option value="diagnosing">Diagnosing</option>
                          <option value="quoted">Quoted</option>
                          <option value="in_progress">In progress</option>
                          <option value="ready">Ready</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </label>
                      <label>
                        Quote (GHS)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.quoteGhs}
                          onChange={(e) => setDraft({ ...draft, quoteGhs: e.target.value })}
                          placeholder="0.00"
                        />
                      </label>
                      <label>
                        Payment
                        <select
                          value={draft.paymentStatus}
                          onChange={(e) => setDraft({ ...draft, paymentStatus: e.target.value })}
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </select>
                      </label>
                      <label>
                        Staff notes
                        <textarea
                          value={draft.notes}
                          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                          rows={2}
                        />
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn btn-primary" type="submit">
                          Save
                        </button>
                        <button className="btn btn-light" type="button" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                        <a
                          className="btn btn-light"
                          href={`https://wa.me/${r.phone.replace(/\D/g, "").replace(/^0/, "233")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </form>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StaffCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    const d = await api<{ categories: Category[] }>("/api/staff/categories");
    setCategories(d.categories);
  }

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user?.role]);

  if (user?.role !== "admin") return <Navigate to="/staff" replace />;

  async function create(e: FormEvent) {
    e.preventDefault();
    await api("/api/staff/categories", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    setName("");
    setDescription("");
    await load();
  }

  async function remove(id: string) {
    await api(`/api/staff/categories/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="stack">
      <form className="panel stack" onSubmit={create}>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Add category</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit">
          Create category
        </button>
      </form>
      <div className="panel">
        {categories.map((c) => (
          <div key={c.id} className="line-item">
            <div>
              <strong>{c.name}</strong>
              <div className="meta">{c.slug}</div>
            </div>
            <button className="btn btn-light" onClick={() => remove(c.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<
    Array<{ id: string; name: string; email: string; role: string }>
  >([]);

  async function load() {
    const d = await api<{ users: typeof users }>("/api/staff/users");
    setUsers(d.users);
  }

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user?.role]);

  if (user?.role !== "admin") return <Navigate to="/staff" replace />;

  async function setRole(id: string, role: string) {
    await api(`/api/staff/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    await load();
  }

  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
                <div className="meta">{u.email}</div>
              </td>
              <td>{u.role}</td>
              <td style={{ display: "flex", gap: "0.35rem" }}>
                {(["consumer", "manager", "admin"] as const).map((role) => (
                  <button
                    key={role}
                    className="btn btn-light"
                    disabled={u.role === role}
                    onClick={() => setRole(u.id, role)}
                  >
                    {role}
                  </button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StaffRepairServices() {
  const [services, setServices] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      pricePesewas: number | null;
      active: boolean;
    }>
  >([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceGhs: "",
  });

  async function load() {
    const d = await api<{ services: typeof services }>("/api/staff/repair-services");
    setServices(d.services);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    const pricePesewas =
      form.priceGhs.trim() === "" ? null : Math.round(Number(form.priceGhs) * 100);
    if (form.priceGhs.trim() !== "" && (!Number.isFinite(pricePesewas) || (pricePesewas ?? 0) < 0)) {
      return;
    }
    await api("/api/staff/repair-services", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        pricePesewas,
      }),
    });
    setForm({ name: "", description: "", priceGhs: "" });
    await load();
  }

  return (
    <div className="stack">
      <form className="panel stack" onSubmit={create}>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Add repair service</h2>
        <p className="meta" style={{ margin: 0 }}>
          Prices you set here show on the storefront. Leave blank only if the quote is set after diagnosis.
        </p>
        <div className="form-grid two">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Price (GHS)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.priceGhs}
              onChange={(e) => setForm({ ...form, priceGhs: e.target.value })}
              placeholder="e.g. 180.00"
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Create service
        </button>
      </form>

      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Price (GHS)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                  <div className="meta">{s.description}</div>
                </td>
                <td>
                  <input
                    className="inline-edit"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={s.pricePesewas != null ? (s.pricePesewas / 100).toFixed(2) : ""}
                    key={`svc-price-${s.id}-${s.pricePesewas}`}
                    placeholder="Set price"
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const pricePesewas = raw === "" ? null : Math.round(Number(raw) * 100);
                      if (raw !== "" && (!Number.isFinite(pricePesewas) || (pricePesewas ?? 0) < 0)) return;
                      if (pricePesewas === s.pricePesewas) return;
                      api(`/api/staff/repair-services/${s.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ pricePesewas }),
                      }).then(load);
                    }}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-light"
                    onClick={() =>
                      api(`/api/staff/repair-services/${s.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ active: !s.active }),
                      }).then(load)
                    }
                  >
                    {s.active ? "Active · Hide" : "Inactive · Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StaffMessages() {
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      topic: string;
      message: string;
      createdAt: string;
    }>
  >([]);

  useEffect(() => {
    api<{ messages: typeof messages }>("/api/contact").then((d) => setMessages(d.messages));
  }, []);

  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      {!messages.length && <p className="meta">No contact messages yet.</p>}
      <table className="table">
        <thead>
          <tr>
            <th>From</th>
            <th>Topic</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((m) => (
            <tr key={m.id}>
              <td>
                <strong>{m.name}</strong>
                <div className="meta">
                  {m.email}
                  {m.phone ? ` · ${m.phone}` : ""}
                </div>
                <div className="meta">{new Date(m.createdAt).toLocaleString("en-GH")}</div>
              </td>
              <td>{m.topic}</td>
              <td>{m.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type StoreSettingsForm = {
  shipping: { accraPesewas: number; otherPesewas: number };
  momo: { network: string; number: string; name: string };
  bank: { bankName: string; accountNumber: string; accountName: string };
  pickup: { name: string; address: string; landmark: string; hours: string; mapUrl: string };
  store: { phone: string; whatsapp: string; email: string };
  lowStockThreshold: number;
};

export function StaffSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState<StoreSettingsForm | null>(null);
  const [paystackEnabled, setPaystackEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ settings: StoreSettingsForm; paystackEnabled?: boolean }>("/api/staff/settings")
      .then((d) => {
        setForm(d.settings);
        setPaystackEnabled(Boolean(d.paystackEnabled));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings"));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form || !isAdmin) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await api<{ settings: StoreSettingsForm }>("/api/staff/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setForm(res.settings);
      setMessage("Store settings saved. Changes apply to checkout and storefront immediately.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return <p className="meta">{error || "Loading settings…"}</p>;
  }

  return (
    <form className="stack staff-settings" onSubmit={onSave}>
      {!isAdmin && (
        <div className="alert-banner">Managers can view settings. Only admins can save changes.</div>
      )}
      {message && (
        <div className="alert-banner" style={{ borderColor: "rgba(0,113,227,0.25)" }}>
          {message}
        </div>
      )}
      {error && <div className="alert-banner">{error}</div>}

      <div className="panel stack">
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Store contact</h2>
        <p className="meta">Shown on checkout, contact pages, and receipts.</p>
        <div className="form-grid two">
          <label>
            Phone
            <input
              value={form.store.phone}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, store: { ...form.store, phone: e.target.value } })}
            />
          </label>
          <label>
            WhatsApp
            <input
              value={form.store.whatsapp}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, store: { ...form.store, whatsapp: e.target.value } })}
            />
          </label>
        </div>
        <label>
          Email
          <input
            type="email"
            value={form.store.email}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, store: { ...form.store, email: e.target.value } })}
          />
        </label>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Shipping rates (GHS)</h2>
        <div className="form-grid two">
          <label>
            Accra / Greater Accra
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={!isAdmin}
              value={(form.shipping.accraPesewas / 100).toFixed(2)}
              onChange={(e) =>
                setForm({
                  ...form,
                  shipping: { ...form.shipping, accraPesewas: Math.round(Number(e.target.value) * 100) },
                })
              }
            />
          </label>
          <label>
            Other regions
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={!isAdmin}
              value={(form.shipping.otherPesewas / 100).toFixed(2)}
              onChange={(e) =>
                setForm({
                  ...form,
                  shipping: { ...form.shipping, otherPesewas: Math.round(Number(e.target.value) * 100) },
                })
              }
            />
          </label>
        </div>
        <label>
          Low-stock alert threshold
          <input
            type="number"
            min="0"
            disabled={!isAdmin}
            value={form.lowStockThreshold}
            onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Mobile Money details</h2>
        <div className="form-grid two">
          <label>
            Network
            <input
              value={form.momo.network}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, momo: { ...form.momo, network: e.target.value } })}
            />
          </label>
          <label>
            Number
            <input
              value={form.momo.number}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, momo: { ...form.momo, number: e.target.value } })}
            />
          </label>
        </div>
        <label>
          Account name
          <input
            value={form.momo.name}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, momo: { ...form.momo, name: e.target.value } })}
          />
        </label>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Bank transfer details</h2>
        <div className="form-grid two">
          <label>
            Bank name
            <input
              value={form.bank.bankName}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, bank: { ...form.bank, bankName: e.target.value } })}
            />
          </label>
          <label>
            Account number
            <input
              value={form.bank.accountNumber}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountNumber: e.target.value } })}
            />
          </label>
        </div>
        <label>
          Account name
          <input
            value={form.bank.accountName}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountName: e.target.value } })}
          />
        </label>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Pickup location</h2>
        <label>
          Name
          <input
            value={form.pickup.name}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, pickup: { ...form.pickup, name: e.target.value } })}
          />
        </label>
        <label>
          Address
          <input
            value={form.pickup.address}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, pickup: { ...form.pickup, address: e.target.value } })}
          />
        </label>
        <div className="form-grid two">
          <label>
            Landmark
            <input
              value={form.pickup.landmark}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, pickup: { ...form.pickup, landmark: e.target.value } })}
            />
          </label>
          <label>
            Hours
            <input
              value={form.pickup.hours}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, pickup: { ...form.pickup, hours: e.target.value } })}
            />
          </label>
        </div>
        <label>
          Map URL
          <input
            value={form.pickup.mapUrl}
            disabled={!isAdmin}
            onChange={(e) => setForm({ ...form, pickup: { ...form.pickup, mapUrl: e.target.value } })}
          />
        </label>
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Integrations</h2>
        <p className="meta">
          Paystack online payments: <strong>{paystackEnabled ? "Enabled" : "Not configured"}</strong>.
          API keys stay in server environment variables for security.
        </p>
      </div>

      {isAdmin && (
        <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf: "flex-start" }}>
          {saving ? "Saving…" : "Save store settings"}
        </button>
      )}
    </form>
  );
}
