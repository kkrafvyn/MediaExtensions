import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { RepairService } from "../types";

export function RepairsPage() {
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ services: RepairService[] }>("/api/repairs/services")
      .then((d) => setServices(d.services))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page container">
      <div className="page-header" style={{ maxWidth: "720px" }}>
        <p className="eyebrow page-eyebrow">
          <span className="pulse-dot" />
          Certified GSM Hardware Studio · Accra
        </p>
        <h1>Precision device repair & diagnostics.</h1>
        <p className="lede">
          From screen replacements and battery upgrades to water damage treatment, micro-soldering, and camera repairs. Book ahead online or drop into our Accra studio.
        </p>
      </div>

      {/* 4 Process Cards */}
      <div className="repair-steps-grid" style={{ margin: "2rem 0 3.5rem" }}>
        <div className="panel" style={{ background: "var(--surface)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, color: "var(--accent)" }}>01</span>
          <h4 style={{ margin: "0.4rem 0 0.2rem" }}>Book Online</h4>
          <p className="meta" style={{ fontSize: "0.85rem" }}>Specify your device and issue to receive an immediate estimate.</p>
        </div>
        <div className="panel" style={{ background: "var(--surface)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, color: "var(--accent)" }}>02</span>
          <h4 style={{ margin: "0.4rem 0 0.2rem" }}>Drop Off / Courier</h4>
          <p className="meta" style={{ fontSize: "0.85rem" }}>Bring to our Accra hub or request swift delivery rider pickup.</p>
        </div>
        <div className="panel" style={{ background: "var(--surface)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, color: "var(--accent)" }}>03</span>
          <h4 style={{ margin: "0.4rem 0 0.2rem" }}>Lab Repair & QA</h4>
          <p className="meta" style={{ fontSize: "0.85rem" }}>OEM components, precision testing, and data preservation.</p>
        </div>
        <div className="panel" style={{ background: "var(--surface)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800, color: "var(--accent)" }}>04</span>
          <h4 style={{ margin: "0.4rem 0 0.2rem" }}>90-Day Warranty</h4>
          <p className="meta" style={{ fontSize: "0.85rem" }}>Track progress online and collect your restored hardware.</p>
        </div>
      </div>

      {/* IMEI Check Banner */}
      <div
        className="panel"
        style={{
          background: "linear-gradient(135deg, #0d1713 0%, #16261f 100%)",
          color: "white",
          padding: "2rem 2.25rem",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          marginBottom: "3.5rem",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        <div>
          <span className="badge badge-repair" style={{ marginBottom: "0.5rem" }}>⚡ Diagnostic Utility</span>
          <h3 style={{ color: "white", fontSize: "1.35rem", margin: "0.25rem 0 0.4rem" }}>
            Validate IMEI Format Before Booking
          </h3>
          <p style={{ color: "rgba(255, 255, 255, 0.75)", margin: 0, fontSize: "0.92rem", maxWidth: "540px" }}>
            Run a quick Luhn checksum check on your 15-digit IMEI before you drop off a device or share it with our repair desk.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to="/imei-check" className="btn btn-primary">
            Run IMEI Check →
          </Link>
        </div>
      </div>

      <div className="section-head">
        <h2>Available Repair Services</h2>
        <p>Select a specialized service or book general diagnostics if you're unsure.</p>
      </div>

      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="product-skeleton" key={i} />
          ))}
        </div>
      ) : (
        <div className="product-grid">
          {services.map((s) => (
            <div key={s.id} className="panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <span className="badge badge-repair" style={{ width: "fit-content", marginBottom: "0.75rem" }}>
                Hardware Service
              </span>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>{s.name}</h3>
              <p className="meta" style={{ flex: 1, marginBottom: "1.25rem", lineHeight: 1.5 }}>
                {s.description}
              </p>
              <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block" }}>Price</span>
                  <strong style={{ fontSize: "1.15rem", color: "var(--ink)" }}>
                    {s.pricePesewas != null ? formatGhs(s.pricePesewas) : "Quote on diagnosis"}
                  </strong>
                </div>
                <Link to={`/repairs/book?service=${s.id}`} className="btn btn-primary btn-sm">
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "3.5rem" }}>
        <Link to="/repairs/book" className="btn btn-dark">
          Book Custom Diagnostic
        </Link>
      </div>
    </div>
  );
}

export function RepairBookPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [services, setServices] = useState<RepairService[]>([]);
  const [serviceId, setServiceId] = useState(params.get("service") ?? "");
  const [deviceCategory, setDeviceCategory] = useState("iPhone");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "+233 ");
  const [deviceBrand, setDeviceBrand] = useState("Apple");
  const [deviceModel, setDeviceModel] = useState("");
  const [issue, setIssue] = useState(params.get("issue") ?? "");
  const [dropOffNotes, setDropOffNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<{ services: RepairService[] }>("/api/repairs/services")
      .then((d) => setServices(d.services))
      .catch(() => undefined);
  }, []);

  function handleCategorySelect(cat: string, defaultBrand: string) {
    setDeviceCategory(cat);
    if (defaultBrand) {
      setDeviceBrand(defaultBrand);
    }
  }

  function appendIssueTag(tag: string) {
    if (!issue.includes(tag)) {
      setIssue((prev) => (prev ? `${prev}, ${tag}` : tag));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api<{ repair: { id: string } }>("/api/repairs/book", {
        method: "POST",
        body: JSON.stringify({
          serviceId: serviceId || undefined,
          name,
          email,
          phone,
          deviceBrand: `${deviceCategory ? `[${deviceCategory}] ` : ""}${deviceBrand}`.trim(),
          deviceModel,
          issue,
          dropOffNotes,
          paymentMethod: "pickup",
        }),
      });
      navigate(`/repairs/status/${res.repair.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 700 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        GSM Studio Intake
      </p>
      <h1>Book a device repair</h1>
      <p className="lede">
        Drop off at our Accra hub or arrange courier delivery. Settle online or upon pickup.
      </p>

      <form className="panel stack" onSubmit={onSubmit}>
        <div>
          <label style={{ marginBottom: "0.6rem" }}>Select Device Category</label>
          <div className="device-select-grid">
            {[
              { label: "iPhone", brand: "Apple", icon: "📱" },
              { label: "Samsung", brand: "Samsung", icon: "📱" },
              { label: "MacBook", brand: "Apple", icon: "💻" },
              { label: "iPad / Tablet", brand: "Apple", icon: "📱" },
              { label: "Camera / Gear", brand: "Sony", icon: "📷" },
              { label: "Other Device", brand: "", icon: "🛠️" },
            ].map((d) => (
              <div
                key={d.label}
                className={`device-chip ${deviceCategory === d.label ? "selected" : ""}`}
                onClick={() => handleCategorySelect(d.label, d.brand)}
              >
                <span>{d.icon}</span>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <label>
          Repair Service Requested
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">General Diagnosis & Upfront Quote</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.pricePesewas != null ? `(${formatGhs(s.pricePesewas)})` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="form-grid two">
          <label>
            Brand / Manufacturer
            <input
              value={deviceBrand}
              onChange={(e) => setDeviceBrand(e.target.value)}
              placeholder="e.g. Apple, Samsung, Sony"
              required
            />
          </label>
          <label>
            Device Model
            <input
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              placeholder="e.g. iPhone 15 Pro, S24 Ultra, A7IV"
              required
            />
          </label>
        </div>

        <div>
          <label>
            Describe the Fault / Symptoms
            <textarea
              rows={3}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="Describe what happened (e.g. cracked display, battery drains fast, water spill)"
              required
              minLength={4}
            />
          </label>

          {/* Common issue tags */}
          <div style={{ marginTop: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>
              Quick Issue Tags:
            </span>
            <div className="issue-tags-row">
              {[
                "Cracked Screen",
                "Battery Replacement",
                "Water Damage",
                "Charging Port",
                "Camera / Lens Issue",
                "No Power / Dead",
                "Back Glass",
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="issue-tag-chip"
                  onClick={() => appendIssueTag(tag)}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-grid two">
          <label>
            Your Full Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          </label>
          <label>
            Contact Phone (MoMo / WhatsApp)
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 XX XXX XXXX" required minLength={8} />
          </label>
        </div>

        <label>
          Email Address (For ticket tracker & invoice)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" required />
        </label>

        <label>
          Drop-off / Courier Notes <span className="meta">(optional)</span>
          <textarea
            rows={2}
            value={dropOffNotes}
            onChange={(e) => setDropOffNotes(e.target.value)}
            placeholder="e.g. Will drop off at Accra hub tomorrow morning at 10 AM"
          />
        </label>

        {error && <div className="alert-banner">{error}</div>}

        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ height: "3.2rem", fontSize: "1.05rem" }}>
          {submitting ? "Booking Repair Ticket…" : "Confirm Repair Booking →"}
        </button>
      </form>
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
};

export function RepairStatusPage() {
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
      <div className="page container" style={{ maxWidth: 640 }}>
        <div className="alert-banner">{error}</div>
        <Link to="/repairs" className="btn btn-dark" style={{ marginTop: "1rem" }}>
          Back to Repairs
        </Link>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="page container" style={{ maxWidth: 640 }}>
        <div className="product-skeleton" style={{ minHeight: "350px" }} />
      </div>
    );
  }

  const steps = ["booked", "received", "in_progress", "ready", "completed"];
  const currentStepIdx = steps.indexOf(repair.status.toLowerCase());
  const activeIdx = currentStepIdx >= 0 ? currentStepIdx : 0;

  const waText = encodeURIComponent(`Hello Media Extensions, I am checking the status of my repair ticket #${repair.id.slice(0, 8)} (${repair.deviceBrand} ${repair.deviceModel}).`);

  return (
    <div className="page container" style={{ maxWidth: 700 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Live Repair Ticket
      </p>
      <h1>Ticket #{repair.id.slice(0, 8)}</h1>
      <p className="lede">
        Thanks, {repair.name}. Our master technicians have your ticket logged. We will contact you via WhatsApp / SMS on <strong>{repair.phone}</strong>.
      </p>

      {/* Progress Timeline */}
      <div className="panel" style={{ marginBottom: "1.75rem" }}>
        <h4 style={{ marginBottom: "1.5rem" }}>Live Repair Stage</h4>
        <div className="tracking-timeline">
          {[
            { label: "Booked", step: 0 },
            { label: "Received", step: 1 },
            { label: "In Repair", step: 2 },
            { label: "Ready", step: 3 },
            { label: "Collected", step: 4 },
          ].map((item) => {
            const isCompleted = activeIdx > item.step;
            const isCurrent = activeIdx === item.step;
            return (
              <div
                key={item.label}
                className={`timeline-step ${isCompleted ? "completed" : ""} ${
                  isCurrent ? "current" : ""
                }`}
              >
                <div className="timeline-icon">
                  {isCompleted ? "✓" : item.step + 1}
                </div>
                <span className="timeline-label">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel stack">
        <div className="line-item">
          <span>Current Status</span>
          <span className="status-chip status-paid">
            {repair.status.replaceAll("_", " ")}
          </span>
        </div>
        <div className="line-item">
          <span>Service Type</span>
          <strong>{repair.service?.name ?? "General Diagnostics"}</strong>
        </div>
        <div className="line-item">
          <span>Device Info</span>
          <span>
            {repair.deviceBrand} {repair.deviceModel}
          </span>
        </div>
        <div className="line-item">
          <span>Reported Issue</span>
          <span style={{ maxWidth: "340px", textAlign: "right" }}>{repair.issue}</span>
        </div>
        <div className="line-item">
          <span>Official Quote</span>
          <strong style={{ fontSize: "1.2rem", color: "var(--accent)" }}>
            {repair.quotePesewas != null ? formatGhs(repair.quotePesewas) : "Pending Technician Inspection"}
          </strong>
        </div>
        <div className="line-item">
          <span>Payment Status</span>
          <span className="status-chip">{repair.paymentStatus}</span>
        </div>

        {/* WhatsApp Direct Support */}
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem 1.25rem",
            background: "var(--emerald-soft)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <strong style={{ color: "var(--emerald)", display: "block" }}>Need quick assistance?</strong>
            <span style={{ fontSize: "0.85rem", color: "var(--ink)" }}>Chat directly with our Accra hardware technician on WhatsApp.</span>
          </div>
          <a
            href={`https://wa.me/233240000000?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
            style={{ background: "#25D366", color: "white", borderRadius: "var(--radius-full)" }}
          >
            💬 Chat on WhatsApp
          </a>
        </div>

        <div className="cta-row" style={{ marginTop: "1rem" }}>
          <Link
            to={`/repairs/status/${repair.id}/receipt`}
            className="btn btn-light"
            style={{ flex: 1 }}
          >
            Print Service Receipt
          </Link>
          <Link to="/repairs" className="btn btn-dark" style={{ flex: 1 }}>
            Repair Studio Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
