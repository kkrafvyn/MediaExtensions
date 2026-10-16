import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { ApiError, api, apiUpload, formatGhs } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { BrandLogo } from "../../components/BrandLogo";
import type { Category, Product, StaffAnalytics } from "../../types";
import { GhsInput } from "./GhsInput";
import { StaffListControls } from "./StaffListControls";
import { staffListPath } from "./useStaffResource";

function isStaffRole(role: string | undefined) {
  return role === "admin" || role === "manager" || role === "technician";
}

function StaffGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page container">Loading…</div>;
  if (!user || !isStaffRole(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function StaffLayout() {
  const { user } = useAuth();
  const isTechnician = user?.role === "technician";
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const catalogStaff = isAdmin || isManager;
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    if (!catalogStaff) return;
    api<StaffAnalytics>("/api/staff/analytics")
      .then((a) => setLowStockCount(a.lowStock?.length ?? 0))
      .catch(() => setLowStockCount(0));
  }, [catalogStaff]);

  return (
    <StaffGuard>
      <div className="page container staff-shell">
        <div className="staff-header">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <BrandLogo size={44} badgeOnly />
            <div>
              <p className="eyebrow page-eyebrow">Staff Console · Media Extensions</p>
              <h1>Control center</h1>
              <p className="lede staff-lede" style={{ marginBottom: 0 }}>
                Hello {user?.name}.{" "}
                {isTechnician
                  ? "Update repair tickets and message customers from here."
                  : "Manage the storefront, orders, repairs, and store settings from here."}
              </p>
            </div>
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
            {!isTechnician && (
              <>
                <NavLink to="/staff/orders" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
                  Orders
                </NavLink>
                <NavLink to="/staff/returns" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
                  Returns
                </NavLink>
              </>
            )}
            {isAdmin && (
              <NavLink to="/staff/pos" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
                In-store POS
              </NavLink>
            )}
            <NavLink to="/staff/repairs" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Repairs
            </NavLink>
            <NavLink to="/staff/messages" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Messages
            </NavLink>
          </div>
          {catalogStaff && (
          <div className="staff-nav-group">
            <span className="staff-nav-label">Catalog</span>
            <NavLink to="/staff/products" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Products
              {lowStockCount > 0 ? (
                <span className="staff-nav-badge" title="Low stock SKUs">
                  {lowStockCount}
                </span>
              ) : null}
            </NavLink>
            <NavLink to="/staff/services" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Repair services
            </NavLink>
            {isAdmin && (
              <NavLink to="/staff/categories" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
                Categories
              </NavLink>
            )}
          </div>
          )}
          {!isTechnician && (
          <div className="staff-nav-group">
            <span className="staff-nav-label">Admin</span>
            <NavLink to="/staff/settings" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
              Store settings
            </NavLink>
            {isAdmin && (
              <NavLink to="/staff/users" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
                Users
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/staff/audit" className={({ isActive }) => `staff-nav-link ${isActive ? "active" : ""}`}>
                Audit log
              </NavLink>
            )}
          </div>
          )}
        </nav>
        <Outlet />
      </div>
    </StaffGuard>
  );
}

export function StaffDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState<{
    stats: { orders: number; repairs: number; products: number };
    recentOrders?: Array<{ id: string; name: string; status: string; totalPesewas: number; createdAt: string }>;
    recentRepairs?: Array<{ id: string; name: string; status: string; deviceBrand: string; deviceModel: string }>;
  } | null>(null);
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  async function loadDashboard() {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const result = await api<typeof dash>("/api/staff/dashboard");
      setDash(result);
      api<StaffAnalytics>("/api/staff/analytics").then(setAnalytics).catch(() => setAnalytics(null));
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : "Could not load the staff dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (dashboardLoading && !dash) return <p className="meta" role="status">Loading dashboard…</p>;
  if (dashboardError && !dash) {
    return (
      <div className="alert-banner" role="alert">
        {dashboardError} <button className="shop-clear-link" type="button" onClick={() => void loadDashboard()}>Retry</button>
      </div>
    );
  }
  if (!dash) return null;

  const revenue =
    analytics?.paidRevenuePesewas ?? analytics?.revenuePesewas ?? null;
  const lowStock = analytics?.lowStock ?? [];
  const orderCounts = analytics?.orderStatusCounts ?? {};
  const repairCounts = analytics?.repairStatusCounts ?? {};
  const topProducts = analytics?.topProducts ?? [];

  const smtpConfigured = (analytics as { smtpConfigured?: boolean } | null)?.smtpConfigured;

  return (
    <div className="stack">
      {smtpConfigured === false && (
        <div className="alert-banner" role="status">
          SMTP is not configured. Password reset and verification emails will not send until you set SMTP env vars on the server.
        </div>
      )}
      {dashboardError && (
        <div className="alert-banner" role="alert">
          {dashboardError} <button className="shop-clear-link" type="button" onClick={() => void loadDashboard()}>Retry</button>
        </div>
      )}
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
        {user?.role === "admin" && <Link to="/staff/pos" className="btn btn-primary btn-sm">In-store POS</Link>}
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

export function StaffPos() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "momo" | "bank" | "paystack">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      api<{ products: Product[] }>("/api/staff/products").then((d) => setProducts(d.products.filter((p) => p.active !== false)));
    }
  }, [user?.role]);

  if (user?.role !== "admin") return <Navigate to="/staff" replace />;

  const visibleProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const lines = products
    .filter((product) => basket[product.id])
    .map((product) => ({ product, quantity: basket[product.id] }));
  const totalPesewas = lines.reduce((sum, line) => sum + line.product.pricePesewas * line.quantity, 0);

  function setQuantity(productId: string, quantity: number) {
    setBasket((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  }

  async function completeSale(e: FormEvent) {
    e.preventDefault();
    if (!lines.length) {
      setError("Add at least one product to this sale.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await api<{ order: { id: string } }>("/api/staff/pos/orders", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          customerEmail: customerEmail || undefined,
          paymentMethod,
          paymentReference: paymentReference || undefined,
        }),
      });
      setCompletedOrderId(result.order.id);
      setBasket({});
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setPaymentReference("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete this sale");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <form className="stack" onSubmit={completeSale}>
      <div className="panel stack">
        <div className="panel-header" style={{ marginBottom: 0 }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>In-store checkout</p>
            <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Counter sale / POS</h2>
          </div>
          <span className="badge badge-digital">Admin only</span>
        </div>
        <p className="meta">Select items, receive payment, and print a receipt. Stock is deducted immediately after the sale is recorded.</p>
      </div>

      {completedOrderId && (
        <div className="alert-banner" style={{ borderColor: "rgba(16, 185, 129, 0.5)" }}>
          Sale recorded successfully. <Link to={`/order/${completedOrderId}/receipt`} target="_blank">Open printable receipt</Link>
        </div>
      )}
      {error && <div className="alert-banner">{error}</div>}

      <div className="split split-2">
        <section className="panel stack">
          <label>
            Find a product
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name" autoFocus />
          </label>
          <div className="stack" style={{ maxHeight: "30rem", overflowY: "auto", gap: "0.5rem" }}>
            {visibleProducts.map((product) => {
              const quantity = basket[product.id] ?? 0;
              return (
                <div className="line-item" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <div className="meta">{formatGhs(product.pricePesewas)} · {product.fulfillment === "digital" ? "Digital" : `${product.stock} in stock`}</div>
                  </div>
                  <button className="btn btn-light btn-sm" type="button" onClick={() => setQuantity(product.id, quantity + 1)}>
                    {quantity ? `Add another (${quantity})` : "Add"}
                  </button>
                </div>
              );
            })}
            {!visibleProducts.length && <p className="meta">No matching products.</p>}
          </div>
        </section>

        <aside className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Current sale</h2>
          {!lines.length ? <p className="meta">No items added yet.</p> : lines.map(({ product, quantity }) => (
            <div className="line-item" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <div className="meta">{formatGhs(product.pricePesewas)} each</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button className="btn btn-light btn-sm" type="button" onClick={() => setQuantity(product.id, quantity - 1)}>−</button>
                <strong>{quantity}</strong>
                <button className="btn btn-light btn-sm" type="button" onClick={() => setQuantity(product.id, quantity + 1)}>+</button>
              </div>
            </div>
          ))}
          <div className="line-item" style={{ borderTop: "1px solid var(--line)", paddingTop: "0.8rem" }}>
            <strong>Total</strong><strong style={{ color: "var(--accent)", fontSize: "1.3rem" }}>{formatGhs(totalPesewas)}</strong>
          </div>

          <label>Customer name <span className="meta">(optional)</span><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in customer" /></label>
          <label>Phone <span className="meta">(optional)</span><input inputMode="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Customer phone" /></label>
          <label>Email <span className="meta">(only needed for digital items)</span><input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@email.com" /></label>
          <label>Payment received
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
              <option value="cash">Cash</option><option value="momo">Mobile Money</option><option value="bank">Bank transfer</option><option value="paystack">Paystack card / terminal</option>
            </select>
          </label>
          <label>Reference <span className="meta">(optional)</span><input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="MoMo, bank, or terminal reference" /></label>
          <button className="btn btn-primary" type="submit" disabled={saving || !lines.length} style={{ minHeight: "3rem" }}>
            {saving ? "Recording sale…" : `Take ${formatGhs(totalPesewas)} & print receipt`}
          </button>
        </aside>
      </div>
    </form>
    <StaffPosRepair />
    </>
  );
}

function StaffPosRepair() {
  const [services, setServices] = useState<Array<{ id: string; name: string; pricePesewas: number | null }>>([]);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", deviceBrand: "", deviceModel: "", issue: "", serviceId: "",
    quoteGhs: "", paymentMethod: "cash", paymentStatus: "unpaid", staffNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [repairId, setRepairId] = useState<string | null>(null);

  useEffect(() => {
    api<{ services: typeof services }>("/api/staff/repair-services").then((d) => setServices(d.services));
  }, []);

  function chooseService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    setForm({ ...form, serviceId, quoteGhs: service?.pricePesewas != null ? (service.pricePesewas / 100).toFixed(2) : form.quoteGhs });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const quotePesewas = form.quoteGhs.trim() === "" ? null : Math.round(Number(form.quoteGhs) * 100);
    if (quotePesewas != null && (!Number.isFinite(quotePesewas) || quotePesewas < 0)) {
      setError("Enter a valid quoted price.");
      return;
    }
    setSaving(true); setError("");
    try {
      const result = await api<{ repair: { id: string } }>("/api/staff/pos/repairs", {
        method: "POST",
        body: JSON.stringify({ ...form, serviceId: form.serviceId || null, quotePesewas }),
      });
      setRepairId(result.repair.id);
      setForm({ name: "", phone: "", email: "", deviceBrand: "", deviceModel: "", issue: "", serviceId: "", quoteGhs: "", paymentMethod: "cash", paymentStatus: "unpaid", staffNotes: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record this GSM intake");
    } finally { setSaving(false); }
  }

  return (
    <form className="panel stack" onSubmit={submit} style={{ marginTop: "1.5rem" }}>
      <div className="panel-header" style={{ marginBottom: 0 }}>
        <div><p className="eyebrow" style={{ marginBottom: "0.25rem" }}>GSM walk-in intake</p><h2 style={{ margin: 0, fontSize: "1.3rem" }}>Record an in-store repair</h2></div>
        <span className="badge badge-repair">POS</span>
      </div>
      <p className="meta">Use this for customers who bring a phone or device to the shop. Set the quote only after you have agreed it with the customer.</p>
      {repairId && <div className="alert-banner" style={{ borderColor: "rgba(16, 185, 129, 0.5)" }}>GSM ticket recorded. <Link target="_blank" to={`/repairs/status/${repairId}/receipt`}>Open printable intake receipt</Link></div>}
      {error && <div className="alert-banner">{error}</div>}
      <div className="form-grid two">
        <label>Customer name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Customer phone<input required inputMode="tel" minLength={8} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Email <span className="meta">(optional)</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Repair service<select value={form.serviceId} onChange={(e) => chooseService(e.target.value)}><option value="">General diagnosis</option>{services.map((service) => <option value={service.id} key={service.id}>{service.name}{service.pricePesewas != null ? ` (${formatGhs(service.pricePesewas)})` : ""}</option>)}</select></label>
        <label>Device brand<input required value={form.deviceBrand} onChange={(e) => setForm({ ...form, deviceBrand: e.target.value })} placeholder="e.g. Apple or Samsung" /></label>
        <label>Device model<input required value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} placeholder="e.g. iPhone 13" /></label>
      </div>
      <label>Fault / issue<textarea required minLength={4} rows={3} value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="Describe the fault and visible condition" /></label>
      <div className="form-grid two">
        <label>Approved quote (GHS) <span className="meta">(leave blank until diagnosed)</span><input type="number" min="0" step="0.01" value={form.quoteGhs} onChange={(e) => setForm({ ...form, quoteGhs: e.target.value })} placeholder="0.00" /></label>
        <label>Payment received<select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}><option value="unpaid">Not paid yet</option><option value="paid">Paid at counter</option></select></label>
        <label>Payment method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="cash">Cash</option><option value="momo">Mobile Money</option><option value="bank">Bank transfer</option><option value="paystack">Paystack card / terminal</option></select></label>
        <label>Staff notes <span className="meta">(optional)</span><input value={form.staffNotes} onChange={(e) => setForm({ ...form, staffNotes: e.target.value })} placeholder="Accessories received, customer instruction, etc." /></label>
      </div>
      <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Recording intake…" : "Create GSM repair ticket"}</button>
    </form>
  );
}

export function StaffOrders() {
  const { user } = useAuth();
  if (user?.role === "technician") return <Navigate to="/staff/repairs" replace />;

  type Payment = { id: string; method: string; amountPesewas: number; reference: string | null; receivedAt: string; recordedBy?: { name: string } | null };
  type StaffOrder = {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    fulfillmentMethod?: string;
    fulfillmentStatus?: string;
    paymentMethod: string;
    paymentNote?: string | null;
    totalPesewas: number;
    shippingPesewas?: number;
    trackingCarrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    createdAt?: string;
    shipping?: { fullName?: string; street?: string; city?: string; region?: string; phone?: string } | null;
    items?: Array<{ name: string; quantity: number; unitPricePesewas: number; fulfillment: string }>;
    payments: Payment[];
    staffNotes?: string | null;
  };
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [notesError, setNotesError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [fulfillmentError, setFulfillmentError] = useState("");
  const [payment, setPayment] = useState({ method: "cash", amount: "", reference: "", notes: "" });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  async function load(nextPage = page, query = q) {
    const d = await api<{ orders: StaffOrder[]; total: number; page: number }>(
      staffListPath("/api/staff/orders", query, nextPage, limit),
    );
    setOrders(d.orders);
    setTotal(d.total);
    setPage(d.page);
  }

  useEffect(() => {
    void load(1, q);
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
      reference: order.paymentNote ?? "",
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

  async function saveStaffNotes(orderId: string) {
    setNotesError("");
    try {
      await api(`/api/staff/orders/${orderId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ staffNotes: notesDraft[orderId] ?? "" }),
      });
      await load();
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Could not save notes");
    }
  }

  async function saveFulfillment(e: FormEvent<HTMLFormElement>, order: StaffOrder) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setFulfillmentError("");
    try {
      await api(`/api/staff/orders/${order.id}/fulfillment`, {
        method: "PATCH",
        body: JSON.stringify({
          fulfillmentStatus: values.get("fulfillmentStatus"),
          trackingCarrier: values.get("trackingCarrier") || null,
          trackingNumber: values.get("trackingNumber") || null,
          trackingUrl: values.get("trackingUrl") || null,
        }),
      });
      await load();
    } catch (err) {
      setFulfillmentError(err instanceof Error ? err.message : "Could not update fulfillment");
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
      <StaffListControls
        q={q}
        onQChange={setQ}
        page={page}
        total={total}
        limit={limit}
        onPageChange={(p) => void load(p, q)}
        exportHref={staffListPath("/api/staff/export/orders", q, 1, 5000)}
        exportPaymentsHref={
          user?.role === "admin" || user?.role === "manager" ? "/api/staff/export/payments" : undefined
        }
        onSearch={() => void load(1, q)}
      />
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
              const canPay = o.status === "pending_payment" || o.status === "awaiting_pickup";
              const canFulfill = o.status === "paid" && o.fulfillmentMethod === "digital";
              const canCancel = o.status === "pending_payment" || o.status === "awaiting_pickup";
              return (
                <Fragment key={o.id}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className="staff-expand-btn"
                        onClick={() => {
                          const next = expandedId === o.id ? null : o.id;
                          setExpandedId(next);
                          if (next === o.id) {
                            setNotesDraft((prev) => ({
                              ...prev,
                              [o.id]: prev[o.id] ?? o.staffNotes ?? "",
                            }));
                          }
                        }}
                      >
                        <strong>{o.name}</strong>
                      </button>
                      <div className="meta">
                        {o.email} · {o.fulfillmentMethod ?? o.paymentMethod} · {o.paymentMethod} · #{o.id.slice(0, 8)}
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
                            {o.paymentNote && <div className="meta">Customer reference · {o.paymentNote}</div>}
                            {o.payments.length === 0 && <div className="meta">No payments recorded yet.</div>}
                            {o.payments.map((p) => (
                              <div key={p.id} className="meta">
                                {p.method} · {formatGhs(p.amountPesewas)}
                                {p.reference ? ` · ${p.reference}` : ""}
                              </div>
                            ))}
                          </div>
                          <div>
                            <strong>Internal notes</strong>
                            <textarea
                              rows={3}
                              value={notesDraft[o.id] ?? o.staffNotes ?? ""}
                              onChange={(e) => setNotesDraft({ ...notesDraft, [o.id]: e.target.value })}
                              placeholder="Visible to staff only — pickup instructions, fraud flags, etc."
                              style={{ width: "100%", marginTop: "0.35rem" }}
                            />
                            {notesError && expandedId === o.id && (
                              <p className="error" role="alert">
                                {notesError}
                              </p>
                            )}
                            <button
                              type="button"
                              className="btn btn-light btn-sm"
                              style={{ marginTop: "0.35rem" }}
                              onClick={() => void saveStaffNotes(o.id)}
                            >
                              Save notes
                            </button>
                          </div>
                        </div>
                        {o.fulfillmentMethod && o.fulfillmentMethod !== "digital" && (
                          o.status === "paid" || o.status === "fulfilled" ? (
                            <form className="offline-payment-form" onSubmit={(e) => saveFulfillment(e, o)}>
                              <strong>Delivery and pickup progress</strong>
                              <label>
                                Status
                                <select name="fulfillmentStatus" defaultValue={o.fulfillmentStatus ?? "unfulfilled"}>
                                  {(o.fulfillmentMethod === "delivery"
                                    ? ["unfulfilled", "preparing", "ready_to_ship", "shipped", "delivered"]
                                    : ["unfulfilled", "preparing", "ready_for_pickup", "collected"]
                                  ).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                                </select>
                              </label>
                              {o.fulfillmentMethod === "delivery" && (
                                <>
                                  <label>Carrier<input name="trackingCarrier" defaultValue={o.trackingCarrier ?? ""} placeholder="Courier name" /></label>
                                  <label>Tracking number<input name="trackingNumber" defaultValue={o.trackingNumber ?? ""} /></label>
                                  <label>Tracking link<input name="trackingUrl" type="url" defaultValue={o.trackingUrl ?? ""} placeholder="https://…" /></label>
                                </>
                              )}
                              {fulfillmentError && <p className="error" role="alert">{fulfillmentError}</p>}
                              <button className="btn btn-primary" type="submit">Save fulfillment</button>
                            </form>
                          ) : <p className="meta">Fulfillment updates are available after payment is confirmed.</p>
                        )}
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

type StaffReturn = {
  id: string;
  status: string;
  reason: string;
  details: string;
  decisionNotes?: string | null;
  refundPesewas?: number | null;
  refundReference?: string | null;
  requestedAt: string;
  order: { id: string; name: string; email: string; totalPesewas: number; paymentMethod: string };
};

export function StaffReturns() {
  const { user } = useAuth();
  if (user?.role === "technician") return <Navigate to="/staff/repairs" replace />;
  const isAdmin = user?.role === "admin";
  const [returns, setReturns] = useState<StaffReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refunds, setRefunds] = useState<Record<string, { amount: string; reference: string }>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await api<{ returns: StaffReturn[] }>("/api/staff/returns");
      setReturns(response.returns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load return requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateReturn(item: StaffReturn, status: "approved" | "rejected" | "refund_pending" | "refunded") {
    setBusyId(item.id);
    setError("");
    const refund = refunds[item.id] ?? { amount: "", reference: "" };
    try {
      await api(`/api/staff/returns/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          decisionNotes: notes[item.id] || undefined,
          ...(status === "refunded" ? {
            refundPesewas: Math.round(Number(refund.amount) * 100),
            refundReference: refund.reference,
          } : {}),
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update return request");
    } finally {
      setBusyId(null);
    }
  }

  const isProviderPending = (status: string) => ["refund_pending", "refund_processing", "refund_needs_attention"].includes(status);

  return (
    <div className="panel stack">
      <div className="panel-header">
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Returns and refunds</h2>
          <p className="meta" style={{ margin: 0 }}>Review requests. Paystack refunds are confirmed by webhook; other refunds are recorded after external processing.</p>
        </div>
        <button type="button" className="btn btn-light btn-sm" onClick={() => void load()} disabled={loading}>Refresh</button>
      </div>
      {error && <div className="alert-banner" role="alert">{error}</div>}
      {loading ? <div className="product-skeleton" style={{ minHeight: "100px" }} /> : returns.length === 0 ? (
        <p className="meta">No return requests yet.</p>
      ) : returns.map((item) => (
        <article key={item.id} className="stack" style={{ padding: "1rem 0", borderTop: "1px solid var(--line)" }}>
          <div className="line-item">
            <div>
              <strong>{item.order.name}</strong>
              <div className="meta">{item.order.email} · Order #{item.order.id.slice(0, 8)} · {item.reason.replaceAll("_", " ")}</div>
            </div>
            <span className={`status-chip ${item.status === "refunded" ? "status-paid" : item.status === "rejected" || item.status === "refund_failed" ? "status-cancelled" : "status-pending"}`}>{item.status.replaceAll("_", " ")}</span>
          </div>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{item.details}</p>
          {item.refundPesewas != null && <p className="meta" style={{ margin: 0 }}>Refund {formatGhs(item.refundPesewas)} · {item.refundReference}</p>}
          {isProviderPending(item.status) && <p className="meta">Paystack has {item.status.replaceAll("_", " ")}. This request will show refunded after provider confirmation.</p>}
          {(item.status === "requested" || item.status === "approved" || (item.status === "refund_failed" && isAdmin)) && (
            <form className="offline-payment-form" onSubmit={(e) => {
              e.preventDefault();
              void updateReturn(item, item.status === "requested" ? "approved" : item.order.paymentMethod === "paystack" ? "refund_pending" : "refunded");
            }}>
              <label>Decision notes<textarea rows={2} maxLength={1000} value={notes[item.id] ?? item.decisionNotes ?? ""} onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })} /></label>
              {item.status === "requested" ? (
                <div className="cta-row">
                  <button className="btn btn-primary" type="submit" disabled={busyId === item.id}>Approve request</button>
                  <button className="btn btn-light" type="button" disabled={busyId === item.id} onClick={() => void updateReturn(item, "rejected")}>Reject request</button>
                </div>
              ) : item.order.paymentMethod === "paystack" ? (
                <>
                  <label>Refund amount (GHS)<input type="number" min="0.01" max={(item.order.totalPesewas / 100).toFixed(2)} step="0.01" required value={refunds[item.id]?.amount ?? ""} onChange={(e) => setRefunds({ ...refunds, [item.id]: { ...refunds[item.id], amount: e.target.value, reference: refunds[item.id]?.reference ?? "" } })} /></label>
                  <button className="btn btn-primary" type="submit" disabled={busyId === item.id || !isAdmin}>{item.status === "refund_failed" ? "Retry Paystack refund" : "Queue Paystack refund"}</button>
                  {!isAdmin && <p className="meta">Only an admin can queue provider refunds.</p>}
                </>
              ) : (
                <>
                  <label>Refund amount (GHS)<input type="number" min="0.01" max={(item.order.totalPesewas / 100).toFixed(2)} step="0.01" required value={refunds[item.id]?.amount ?? ""} onChange={(e) => setRefunds({ ...refunds, [item.id]: { ...refunds[item.id], amount: e.target.value, reference: refunds[item.id]?.reference ?? "" } })} /></label>
                  <label>Refund transaction reference<input required value={refunds[item.id]?.reference ?? ""} onChange={(e) => setRefunds({ ...refunds, [item.id]: { ...refunds[item.id], amount: refunds[item.id]?.amount ?? "" , reference: e.target.value } })} /></label>
                  <button className="btn btn-primary" type="submit" disabled={busyId === item.id || !isAdmin}>Record refund completed</button>
                  {!isAdmin && <p className="meta">Only an admin can record completed refunds.</p>}
                </>
              )}
            </form>
          )}
          {item.decisionNotes && item.status !== "requested" && <p className="meta" style={{ margin: 0 }}>Staff note: {item.decisionNotes}</p>}
        </article>
      ))}
    </div>
  );
}

export function StaffAuditLogs() {
  type AuditEntry = {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: Record<string, unknown>;
    createdAt: string;
    actor?: { name: string; email: string } | null;
  };
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ auditLogs: AuditEntry[] }>("/api/staff/audit-logs")
      .then((data) => setEntries(data.auditLogs))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load audit log"));
  }, []);

  return (
    <div className="panel stack">
      <div>
        <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Admin audit log</h2>
        <p className="meta" style={{ margin: 0 }}>Latest 200 sensitive staff actions.</p>
      </div>
      {error && <div className="alert-banner" role="alert">{error}</div>}
      {!error && entries.length === 0 ? <p className="meta">No audit events recorded yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString("en-GH")}</td>
                  <td>{entry.actor?.name ?? "Former staff"}<div className="meta">{entry.actor?.email}</div></td>
                  <td>{entry.action.replaceAll("_", " ")}</td>
                  <td>{entry.entityType} · {entry.entityId.slice(0, 8)}</td>
                  <td><code>{JSON.stringify(entry.details)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const { user } = useAuth();
  if (user?.role === "technician") return <Navigate to="/staff/repairs" replace />;
  const isAdmin = user?.role === "admin";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", description: "", priceGhs: "", stock: 0 });
  const limit = 25;
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

  async function load(nextPage = page, query = q) {
    const [p, c] = await Promise.all([
      api<{ products: Product[]; total: number; page: number }>(
        staffListPath("/api/staff/products", query, nextPage, limit),
      ),
      api<{ categories: Category[] }>("/api/staff/categories"),
    ]);
    setProducts(p.products);
    setTotal(p.total);
    setPage(p.page);
    setCategories(c.categories);
  }

  useEffect(() => {
    void load(1, q);
  }, []);

  function openProductEdit(p: Product) {
    setEditingProductId(p.id);
    setEditDraft({
      name: p.name,
      description: p.description,
      priceGhs: (p.pricePesewas / 100).toFixed(2),
      stock: p.stock,
    });
  }

  async function saveProductEdit(e: FormEvent, productId: string) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      name: editDraft.name,
      description: editDraft.description,
      stock: editDraft.stock,
    };
    if (isAdmin) {
      body.pricePesewas = Math.round(Number(editDraft.priceGhs) * 100);
    }
    await api(`/api/staff/products/${productId}`, { method: "PATCH", body: JSON.stringify(body) });
    setEditingProductId(null);
    await load(page, q);
  }

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
      <StaffListControls
        q={q}
        onQChange={setQ}
        page={page}
        total={total}
        limit={limit}
        onPageChange={(p) => void load(p, q)}
        onSearch={() => void load(1, q)}
      />
      {!isAdmin && <div className="alert-banner">Only an admin can add products or set their prices. You can still update stock and product files.</div>}
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
        <button className="btn btn-primary" type="submit" disabled={!isAdmin}>
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
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <Fragment key={p.id}>
              <tr>
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
                    disabled={!isAdmin}
                    defaultValue={(p.pricePesewas / 100).toFixed(2)}
                    key={`price-${p.id}-${p.pricePesewas}`}
                    onBlur={(e) => {
                      const pricePesewas = Math.round(Number(e.target.value) * 100);
                      if (!pricePesewas || pricePesewas === p.pricePesewas) return;
                      api(`/api/staff/products/${p.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ pricePesewas }),
                      }).then(() => load(page, q));
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
                      }).then(() => load(page, q));
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
                      }).then(() => load(page, q))
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
                      }).then(() => load(page, q))
                    }
                  >
                    {p.active === false ? "Inactive · Activate" : "Active · Hide"}
                  </button>
                </td>
                <td>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openProductEdit(p)}>
                    Edit
                  </button>
                </td>
              </tr>
              {editingProductId === p.id && (
                <tr className="staff-detail-row">
                  <td colSpan={8}>
                    <form className="staff-ticket-form" onSubmit={(e) => saveProductEdit(e, p.id)}>
                      <label>
                        Name
                        <input
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          rows={3}
                          value={editDraft.description}
                          onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                          required
                        />
                      </label>
                      <div className="form-grid two">
                        <label>
                          Price (GHS)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!isAdmin}
                            value={editDraft.priceGhs}
                            onChange={(e) => setEditDraft({ ...editDraft, priceGhs: e.target.value })}
                          />
                        </label>
                        <label>
                          Stock
                          <input
                            type="number"
                            min="0"
                            value={editDraft.stock}
                            onChange={(e) => setEditDraft({ ...editDraft, stock: Number(e.target.value) })}
                          />
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn btn-primary" type="submit">
                          Save product
                        </button>
                        <button className="btn btn-light" type="button" onClick={() => setEditingProductId(null)}>
                          Cancel
                        </button>
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
    </div>
  );
}

export function StaffRepairs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  type RepairRow = {
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
    imei?: string | null;
    payments?: Array<{ amountPesewas: number }>;
  };
  const [repairs, setRepairs] = useState<RepairRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ status: "", quoteGhs: "", notes: "" });
  const [repairPayment, setRepairPayment] = useState({ method: "cash", amount: "", reference: "" });
  const [repairPaymentError, setRepairPaymentError] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  async function load(nextPage = page, query = q) {
    const d = await api<{ repairs: RepairRow[]; total: number; page: number }>(
      staffListPath("/api/staff/repairs", query, nextPage, limit),
    );
    setRepairs(d.repairs);
    setTotal(d.total);
    setPage(d.page);
  }

  useEffect(() => {
    void load(1, q);
  }, []);

  function openEdit(r: (typeof repairs)[number]) {
    setEditingId(r.id);
    const paid = (r.payments ?? []).reduce((sum, p) => sum + p.amountPesewas, 0);
    const remaining = r.quotePesewas != null ? Math.max(0, r.quotePesewas - paid) : 0;
    setRepairPayment({
      method: "cash",
      amount: remaining > 0 ? (remaining / 100).toFixed(2) : "",
      reference: "",
    });
    setRepairPaymentError("");
    setDraft({
      status: r.status,
      quoteGhs: r.quotePesewas != null ? (r.quotePesewas / 100).toFixed(2) : "",
      notes: r.staffNotes ?? "",
    });
  }

  async function saveEdit(e: FormEvent, id: string) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      status: draft.status,
      staffNotes: draft.notes,
    };
    if (isAdmin && draft.quoteGhs.trim() !== "") {
      body.quotePesewas = Math.round(Number(draft.quoteGhs) * 100);
    }
    await api(`/api/staff/repairs/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setEditingId(null);
    await load(page, q);
  }

  async function recordRepairPayment(e: { preventDefault?: () => void }, r: RepairRow) {
    e.preventDefault?.();
    const amountPesewas = Math.round(Number(repairPayment.amount) * 100);
    if (!Number.isInteger(amountPesewas) || amountPesewas <= 0) {
      setRepairPaymentError("Enter a valid payment amount.");
      return;
    }
    setRepairPaymentError("");
    try {
      await api(`/api/staff/repairs/${r.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          method: repairPayment.method,
          amountPesewas,
          reference: repairPayment.reference || undefined,
        }),
      });
      await load(page, q);
    } catch (err) {
      setRepairPaymentError(err instanceof Error ? err.message : "Could not record payment");
    }
  }

  return (
    <div className="stack">
      <StaffListControls
        q={q}
        onQChange={setQ}
        page={page}
        total={total}
        limit={limit}
        onPageChange={(p) => void load(p, q)}
        exportHref={staffListPath("/api/staff/export/repairs", q, 1, 5000)}
        onSearch={() => void load(1, q)}
      />
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
                  {r.imei ? <div className="meta">IMEI {r.imei}</div> : null}
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
                          disabled={!isAdmin}
                          value={draft.quoteGhs}
                          onChange={(e) => setDraft({ ...draft, quoteGhs: e.target.value })}
                          placeholder="0.00"
                        />
                      </label>
                      <label>
                        Staff notes
                        <textarea
                          value={draft.notes}
                          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                          rows={2}
                        />
                      </label>
                      {r.quotePesewas != null && r.quotePesewas > 0 && (
                        <div className="stack">
                          <strong>Record counter payment</strong>
                          {repairPaymentError && <div className="alert-banner">{repairPaymentError}</div>}
                          <div className="form-grid two">
                            <label>
                              Method
                              <select
                                value={repairPayment.method}
                                onChange={(e) => setRepairPayment({ ...repairPayment, method: e.target.value })}
                              >
                                <option value="cash">Cash</option>
                                <option value="momo">MoMo</option>
                                <option value="bank">Bank</option>
                                <option value="other">Other</option>
                              </select>
                            </label>
                            <label>
                              Amount (GHS)
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={repairPayment.amount}
                                onChange={(e) => setRepairPayment({ ...repairPayment, amount: e.target.value })}
                              />
                            </label>
                          </div>
                          <label>
                            Reference
                            <input
                              value={repairPayment.reference}
                              onChange={(e) => setRepairPayment({ ...repairPayment, reference: e.target.value })}
                            />
                          </label>
                          <button
                            className="btn btn-light btn-sm"
                            type="button"
                            onClick={(e) => void recordRepairPayment(e, r)}
                          >
                            Record payment
                          </button>
                        </div>
                      )}
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
                {(["consumer", "manager", "technician", "admin"] as const).map((role) => (
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
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
      {!isAdmin && <div className="alert-banner">Only an admin can add repair services or change their prices.</div>}
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
        <button className="btn btn-primary" type="submit" disabled={!isAdmin}>
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
                    disabled={!isAdmin}
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
  if (user?.role === "technician") return <Navigate to="/staff/repairs" replace />;
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState<StoreSettingsForm | null>(null);
  const [paystackEnabled, setPaystackEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string>("");
  const [uploadsWarning, setUploadsWarning] = useState<string | null>(null);

  useEffect(() => {
    api<{
      settings: StoreSettingsForm;
      paystackEnabled?: boolean;
      uploadsWarning?: string | null;
    }>("/api/staff/settings")
      .then((d) => {
        setForm(d.settings);
        setPaystackEnabled(Boolean(d.paystackEnabled));
        setUploadsWarning(d.uploadsWarning ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings"));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!form || !isAdmin) return;
    setSaving(true);
    setError("");
    setFieldErrors("");
    setMessage("");
    try {
      const res = await api<{ settings: StoreSettingsForm }>("/api/staff/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setForm(res.settings);
      setMessage("Store settings saved. Changes apply to checkout and storefront immediately.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        const detailText =
          typeof err.details === "object" && err.details
            ? Object.entries(
                (err.details as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {},
              )
                .flatMap(([key, msgs]) => msgs.map((m) => `${key}: ${m}`))
                .join(" · ")
            : "";
        setFieldErrors(detailText);
      } else {
        setError(err instanceof Error ? err.message : "Could not save settings");
      }
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
      {fieldErrors && <div className="alert-banner meta">{fieldErrors}</div>}
      {uploadsWarning && (
        <div className="alert-banner" role="status">
          {uploadsWarning}
        </div>
      )}

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
        <p className="meta">Greater Accra zone is a delivery rate band; the shop is based in Koforidua.</p>
        <div className="form-grid two">
          <label>
            Greater Accra zone
            <GhsInput
              disabled={!isAdmin}
              pesewas={form.shipping.accraPesewas}
              onPesewasChange={(accraPesewas) =>
                setForm({ ...form, shipping: { ...form.shipping, accraPesewas } })
              }
            />
          </label>
          <label>
            Other regions
            <GhsInput
              disabled={!isAdmin}
              pesewas={form.shipping.otherPesewas}
              onPesewasChange={(otherPesewas) =>
                setForm({ ...form, shipping: { ...form.shipping, otherPesewas } })
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
