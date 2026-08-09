import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
      <div className="page container">
        <h1>Staff</h1>
        <p className="lede">Welcome, {user?.name}. Manage orders, products, and repairs.</p>
        <div className="staff-nav">
          <NavLink to="/staff" end className="btn btn-light">
            Dashboard
          </NavLink>
          <NavLink to="/staff/orders" className="btn btn-light">
            Orders
          </NavLink>
          <NavLink to="/staff/products" className="btn btn-light">
            Products
          </NavLink>
          <NavLink to="/staff/repairs" className="btn btn-light">
            Repairs
          </NavLink>
          <NavLink to="/staff/services" className="btn btn-light">
            Services
          </NavLink>
          <NavLink to="/staff/messages" className="btn btn-light">
            Messages
          </NavLink>
          {user?.role === "admin" && (
            <>
              <NavLink to="/staff/categories" className="btn btn-light">
                Categories
              </NavLink>
              <NavLink to="/staff/users" className="btn btn-light">
                Users
              </NavLink>
            </>
          )}
          <Link to="/" className="btn btn-dark">
            Storefront
          </Link>
        </div>
        <Outlet />
      </div>
    </StaffGuard>
  );
}

export function StaffDashboard() {
  const [dash, setDash] = useState<{
    stats: { orders: number; repairs: number; products: number };
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

  return (
    <div className="stack">
      {lowStock.length > 0 && (
        <div className="alert-banner" role="alert">
          <strong>Low stock:</strong>{" "}
          {lowStock.map((p) => `${p.name} (${p.stock})`).join(", ")}
        </div>
      )}

      <div className="product-grid">
        <div className="panel">
          <div className="meta">Orders</div>
          <h2 style={{ margin: "0.25rem 0 0" }}>{dash.stats.orders}</h2>
        </div>
        <div className="panel">
          <div className="meta">Repairs</div>
          <h2 style={{ margin: "0.25rem 0 0" }}>{dash.stats.repairs}</h2>
        </div>
        <div className="panel">
          <div className="meta">Products</div>
          <h2 style={{ margin: "0.25rem 0 0" }}>{dash.stats.products}</h2>
        </div>
        {revenue != null && (
          <div className="panel">
            <div className="meta">Paid revenue</div>
            <h2 style={{ margin: "0.25rem 0 0" }}>{formatGhs(revenue)}</h2>
          </div>
        )}
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
  const [orders, setOrders] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      paymentMethod: string;
      totalPesewas: number;
    }>
  >([]);

  async function load() {
    const d = await api<{ orders: typeof orders }>("/api/staff/orders");
    setOrders(d.orders);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    await api(`/api/staff/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
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
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.name}</strong>
                <div className="meta">
                  {o.email} · {o.paymentMethod}
                </div>
              </td>
              <td>{formatGhs(o.totalPesewas)}</td>
              <td>{o.status.replaceAll("_", " ")}</td>
              <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                <button className="btn btn-light" onClick={() => setStatus(o.id, "paid")}>
                  Mark paid
                </button>
                <button className="btn btn-light" onClick={() => setStatus(o.id, "fulfilled")}>
                  Fulfill
                </button>
                <button className="btn btn-light" onClick={() => setStatus(o.id, "cancelled")}>
                  Cancel
                </button>
                <Link to={`/order/${o.id}/receipt`} className="btn btn-light">
                  Print receipt
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function uploadStaffImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiUpload<{ url: string }>("/api/staff/uploads", fd);
  return res.url;
}

export function StaffProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    pricePesewas: number;
    fulfillment: "digital" | "physical" | "both";
    stock: number;
    categoryId: string;
    imageUrl: string;
  }>({
    name: "",
    description: "",
    pricePesewas: 10000,
    fulfillment: "physical",
    stock: 10,
    categoryId: "",
    imageUrl: "",
  });

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

  async function create(e: FormEvent) {
    e.preventDefault();
    await api("/api/staff/products", {
      method: "POST",
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        pricePesewas: form.pricePesewas,
        fulfillment: form.fulfillment,
        stock: form.stock,
        categoryId: form.categoryId || null,
        images: [form.imageUrl || "/images/products/lut-pack.svg"],
      }),
    });
    setForm({ ...form, name: "", description: "", imageUrl: "" });
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
            Price (pesewas)
            <input
              type="number"
              value={form.pricePesewas}
              onChange={(e) => setForm({ ...form, pricePesewas: Number(e.target.value) })}
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
              <option value="digital">digital</option>
              <option value="physical">physical</option>
              <option value="both">both</option>
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
        <button className="btn btn-primary" type="submit">
          Create
        </button>
      </form>

      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price (pesewas)</th>
              <th>Stock</th>
              <th>Image</th>
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
                    defaultValue={p.pricePesewas}
                    onBlur={(e) => {
                      const pricePesewas = Number(e.target.value);
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
      deviceBrand: string;
      deviceModel: string;
      status: string;
      paymentStatus: string;
      quotePesewas: number | null;
      issue: string;
    }>
  >([]);

  async function load() {
    const d = await api<{ repairs: typeof repairs }>("/api/staff/repairs");
    setRepairs(d.repairs);
  }

  useEffect(() => {
    load();
  }, []);

  async function update(id: string, body: Record<string, unknown>) {
    await api(`/api/staff/repairs/${id}`, { method: "PATCH", body: JSON.stringify(body) });
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
            <tr key={r.id}>
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
              <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-light"
                  onClick={() => update(r.id, { status: "diagnosing" })}
                >
                  Diagnose
                </button>
                <button
                  className="btn btn-light"
                  onClick={() => update(r.id, { status: "in_progress" })}
                >
                  In progress
                </button>
                <button className="btn btn-light" onClick={() => update(r.id, { status: "ready" })}>
                  Ready
                </button>
                <button
                  className="btn btn-light"
                  onClick={() => update(r.id, { paymentStatus: "paid" })}
                >
                  Mark paid
                </button>
              </td>
            </tr>
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
    pricePesewas: 15000,
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
    await api("/api/staff/repair-services", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setForm({ name: "", description: "", pricePesewas: 15000 });
    await load();
  }

  return (
    <div className="stack">
      <form className="panel stack" onSubmit={create}>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Add repair service</h2>
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
            Price (pesewas)
            <input
              type="number"
              value={form.pricePesewas}
              onChange={(e) => setForm({ ...form, pricePesewas: Number(e.target.value) })}
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
              <th>Price (pesewas)</th>
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
                    defaultValue={s.pricePesewas ?? ""}
                    placeholder="Quote"
                    onBlur={(e) => {
                      const raw = e.target.value;
                      const pricePesewas = raw === "" ? null : Number(raw);
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
