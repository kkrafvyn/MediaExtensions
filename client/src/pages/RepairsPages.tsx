import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSiteMeta } from "../context/SiteMetaContext";
import { REPAIR_TRACK_STEPS, repairTimelineIndex } from "../lib/trackingSteps";
import { whatsappUrl } from "../lib/whatsapp";
import type { RepairService } from "../types";
import {
  IconBolt,
  IconCheck,
  IconChat,
  IconPhone,
  IconLaptop,
  IconCamera,
  IconWrench,
} from "../components/Icons";

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
    <div className="page repairs-page">
      <header className="repairs-hero">
        <div className="container repairs-hero-inner">
          <p className="eyebrow page-eyebrow">
            Media Extensions · Device repairs
          </p>
          <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 3.75rem)", letterSpacing: "-0.04em" }}>
            Device repairs in Koforidua.
          </h1>
          <p className="lede" style={{ maxWidth: "38rem" }}>
            Screen replacements, battery servicing, liquid damage assessment, and board repairs. Choose a service or book diagnostics to get started.
          </p>
        </div>
      </header>

      <div className="container">

      {/* IMEI Check Banner */}
      <div
        className="panel"
        style={{
          background: "var(--surface)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          color: "var(--ink)",
          padding: "1.75rem 2rem",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          marginBottom: "3rem",
          border: "1px solid var(--line)",
          boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        <div>
          <span className="badge badge-digital inline-icon-label" style={{ marginBottom: "0.4rem" }}>
            <IconBolt size={12} /> IMEI Tool
          </span>
          <h3 style={{ color: "var(--ink)", fontSize: "1.25rem", margin: "0.2rem 0 0.35rem" }}>
            Validate IMEI Format
          </h3>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.88rem", maxWidth: "520px" }}>
            Verify your 15-digit IMEI checksum before dropping off your device or booking intake.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to="/imei-check" className="btn btn-primary">
            Check IMEI format
          </Link>
        </div>
      </div>

      <div className="section-head">
        <h2>Choose a repair service</h2>
        <p>Not sure what’s wrong? Book a diagnostic assessment.</p>
      </div>

      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="product-skeleton" key={i} />
          ))}
        </div>
      ) : services.length ? (
        <div className="product-grid">
          {services.map((s) => (
            <div key={s.id} className="panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>{s.name}</h3>
              <p className="meta" style={{ flex: 1, marginBottom: "1.25rem", lineHeight: 1.5 }}>
                {s.description}
              </p>
              <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block" }}>Price</span>
                  <strong style={{ fontSize: "1.15rem", color: "var(--ink)" }}>
                    {s.pricePesewas != null ? formatGhs(s.pricePesewas) : "Price set on diagnosis"}
                  </strong>
                </div>
                <Link to={`/repairs/book?service=${s.id}`} className="btn btn-primary btn-sm">
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>No repair services are listed yet. Book a diagnostic and we will confirm pricing after inspection.</p>
          <Link to="/repairs/book" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Request a diagnosis
          </Link>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "3.5rem" }}>
        <Link to="/repairs/book" className="btn btn-dark">
          Book Custom Diagnostic
        </Link>
      </div>
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
  const [deviceCategory, setDeviceCategory] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "+233 ");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [issue, setIssue] = useState(params.get("issue") ?? "");
  const issueParam = params.get("issue") ?? "";
  const imeiFromIssue = issueParam.match(/IMEI Check:\s*(\d{15})/i)?.[1] ?? "";
  const [imei, setImei] = useState(imeiFromIssue);
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
    setDeviceBrand(defaultBrand);
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
          imei: imei.replace(/\D/g, "").length === 15 ? imei.replace(/\D/g, "") : undefined,
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
        Book your device in a few simple steps. Our admin will inspect it and confirm the final price before any work begins.
      </p>

      <form className="panel stack" onSubmit={onSubmit}>
        <div>
          <div id="device-category-label" style={{ marginBottom: "0.6rem", fontWeight: 600 }}>Select Device Category</div>
          <div className="device-select-grid" role="group" aria-labelledby="device-category-label">
            {[
              { label: "iPhone", brand: "Apple", Icon: IconPhone },
              { label: "Samsung", brand: "Samsung", Icon: IconPhone },
              { label: "MacBook", brand: "Apple", Icon: IconLaptop },
              { label: "iPad / Tablet", brand: "Apple", Icon: IconPhone },
              { label: "Camera / Gear", brand: "Sony", Icon: IconCamera },
              { label: "Other Device", brand: "", Icon: IconWrench },
            ].map((d) => (
              <button
                key={d.label}
                type="button"
                className={`device-chip ${deviceCategory === d.label ? "selected" : ""}`}
                aria-pressed={deviceCategory === d.label}
                onClick={() => handleCategorySelect(d.label, d.brand)}
              >
                <d.Icon size={22} />
                <span>{d.label}</span>
              </button>
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
              minLength={5}
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
          Device IMEI <span className="meta">(optional, 15 digits)</span>
          <input
            inputMode="numeric"
            pattern="\d{15}"
            maxLength={15}
            value={imei}
            onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
            placeholder="From Settings or *#06#"
          />
        </label>

        <label>
          Drop-off / Courier Notes <span className="meta">(optional)</span>
          <textarea
            rows={2}
            value={dropOffNotes}
            onChange={(e) => setDropOffNotes(e.target.value)}
            placeholder="e.g. I will drop off at Kumasi Station tomorrow morning"
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
  quoteDecision?: string;
  name: string;
  email: string;
  phone: string;
  deviceBrand: string;
  deviceModel: string;
  issue: string;
  imei?: string | null;
  quotePesewas: number | null;
  service?: { name: string } | null;
};

export function RepairStatusPage() {
  const { id } = useParams();
  const { meta } = useSiteMeta();
  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [error, setError] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);

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

  const repairTrack = repairTimelineIndex(repair.status);
  const waMessage = `Hello Media Extensions, I am checking the status of my repair ticket #${repair.id.slice(0, 8)} (${repair.deviceBrand} ${repair.deviceModel}).`;
  const waHref = whatsappUrl(meta?.storeWhatsApp ?? meta?.store?.whatsapp, waMessage);

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
        {repairTrack.cancelled && (
          <p className="alert-banner" style={{ marginBottom: "1rem" }}>
            This repair ticket was cancelled.
          </p>
        )}
        <div className="tracking-timeline">
          {REPAIR_TRACK_STEPS.map((item, step) => {
            const activeIdx = repairTrack.cancelled ? -1 : repairTrack.index;
            const isCompleted = activeIdx > step;
            const isCurrent = activeIdx === step;
            return (
              <div
                key={item.key}
                className={`timeline-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
              >
                <div className="timeline-icon">
                  {isCompleted ? <IconCheck size={14} /> : step + 1}
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
        {repair.imei && (
          <div className="line-item">
            <span>IMEI</span>
            <span>{repair.imei}</span>
          </div>
        )}
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

        {repair.status === "quoted" && repair.quoteDecision === "pending" && repair.quotePesewas != null && (
          <div className="panel stack" style={{ marginTop: "0.5rem" }}>
            <p className="meta" style={{ margin: 0 }}>
              Approve this quote so we can start billable repair work, or decline to cancel the ticket.
            </p>
            <div className="cta-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={quoteBusy}
                onClick={async () => {
                  setQuoteBusy(true);
                  try {
                    const res = await api<{ repair: RepairDetail }>(`/api/repairs/${repair.id}/quote-decision`, {
                      method: "POST",
                      body: JSON.stringify({ decision: "approved" }),
                    });
                    setRepair(res.repair);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not save decision");
                  } finally {
                    setQuoteBusy(false);
                  }
                }}
              >
                Approve quote
              </button>
              <button
                type="button"
                className="btn btn-light"
                disabled={quoteBusy}
                onClick={async () => {
                  if (!window.confirm("Decline this quote and cancel the repair ticket?")) return;
                  setQuoteBusy(true);
                  try {
                    const res = await api<{ repair: RepairDetail }>(`/api/repairs/${repair.id}/quote-decision`, {
                      method: "POST",
                      body: JSON.stringify({ decision: "declined" }),
                    });
                    setRepair(res.repair);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not save decision");
                  } finally {
                    setQuoteBusy(false);
                  }
                }}
              >
                Decline quote
              </button>
            </div>
          </div>
        )}

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
            <span style={{ fontSize: "0.85rem", color: "var(--ink)" }}>Contact our technician if you need help with your repair ticket.</span>
          </div>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm inline-icon-label"
              style={{ background: "#25D366", color: "#072514", borderRadius: "var(--radius-full)" }}
            >
              <IconChat size={16} /> Chat on WhatsApp
            </a>
          ) : (
            <span className="meta">WhatsApp contact is not configured yet.</span>
          )}
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
