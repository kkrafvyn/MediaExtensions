import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSiteMeta } from "../context/SiteMetaContext";
import { REPAIR_TRACK_STEPS, repairTimelineIndex } from "../lib/trackingSteps";
import { whatsappUrl } from "../lib/whatsapp";
import type { RepairService } from "../types";
import { IconBolt, IconCheck, IconChat } from "../components/Icons";

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
            Tell us your name, your phone, and what is wrong. We inspect and quote before any billable work.
          </p>
          <p className="meta" style={{ marginTop: "0.75rem" }}>
            <Link to="/repairs/how-we-quote">How we quote</Link>
            {" · "}
            <Link to="/repairs/warranty">Repair warranty</Link>
          </p>
        </div>
      </header>

      <div className="container">
      <div
        className="panel"
        style={{
          background: "var(--surface)",
          color: "var(--ink)",
          padding: "1.75rem 2rem",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          marginBottom: "2rem",
          border: "1px solid var(--line)",
        }}
      >
        <div>
          <span className="badge badge-digital inline-icon-label" style={{ marginBottom: "0.4rem" }}>
            <IconBolt size={12} /> Quick booking
          </span>
          <h3 style={{ color: "var(--ink)", fontSize: "1.25rem", margin: "0.2rem 0 0.35rem" }}>
            Book in under a minute
          </h3>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.88rem", maxWidth: "520px" }}>
            Name, phone model, and the issue — that is all we need to open a ticket.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link to="/repairs/book" className="btn btn-primary">
            Book a repair
          </Link>
          <Link to="/imei-check" className="btn btn-light">
            Check IMEI
          </Link>
        </div>
      </div>

      <section className="panel stack" style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>How we quote</h2>
        <p className="meta" style={{ margin: 0 }}>
          From drop-off to pickup — you approve the quote before billable work starts.{" "}
          <Link to="/repairs/how-we-quote">Full guide</Link>
        </p>
        <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          {REPAIR_TRACK_STEPS.map((step, i) => (
            <li key={step.key}>
              <strong>{step.label}</strong>
              {i === 2 ? " — we send a GHS quote; you approve or decline online." : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="section-head">
        <h2>Popular services</h2>
        <p>Optional menu — or skip and describe the issue on the booking form.</p>
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
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "block" }}>From</span>
                  <strong style={{ fontSize: "1.15rem", color: "var(--ink)" }}>
                    {s.pricePesewas != null ? formatGhs(s.pricePesewas) : "Quoted after diagnosis"}
                  </strong>
                </div>
                <Link to={`/repairs/book?service=${s.id}`} className="btn btn-primary btn-sm">
                  Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>No listed services yet — you can still book with your name, phone, and issue.</p>
          <Link to="/repairs/book" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Book a repair
          </Link>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "3.5rem" }}>
        <Link to="/repairs/book" className="btn btn-dark">
          Book a repair
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
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "+233");
  const [deviceName, setDeviceName] = useState("");
  const [issue, setIssue] = useState(params.get("issue") ?? "");
  const [serviceId] = useState(params.get("service") ?? "");
  const imeiFromQuery = (params.get("imei") ?? "").replace(/\D/g, "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          name: name.trim(),
          phone: phone.trim(),
          deviceName: deviceName.trim(),
          issue: issue.trim(),
          imei: imeiFromQuery.length === 15 ? imeiFromQuery : undefined,
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
    <div className="page container" style={{ maxWidth: 560 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Quick repair intake
      </p>
      <h1>Book a repair</h1>
      <p className="lede">
        Your name, the phone, and what is wrong. We will call or WhatsApp you with a quote before any paid work.
      </p>

      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            required
          />
        </label>

        <label>
          WhatsApp / phone number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233 XX XXX XXXX"
            inputMode="tel"
            autoComplete="tel"
            required
            minLength={8}
          />
        </label>

        <label>
          Name of the phone / device
          <input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. iPhone 13, Samsung A54, Tecno Spark"
            required
            minLength={2}
          />
        </label>

        <div>
          <label>
            What is wrong?
            <textarea
              rows={4}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g. cracked screen, no charge, water damage"
              required
              minLength={5}
            />
          </label>
          <div className="issue-tags-row" style={{ marginTop: "0.5rem" }}>
            {["Cracked screen", "Battery", "No power", "Charging port", "Water damage"].map((tag) => (
              <button key={tag} type="button" className="issue-tag-chip" onClick={() => appendIssueTag(tag)}>
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {imeiFromQuery.length === 15 && (
          <p className="meta">IMEI from checker will be saved: {imeiFromQuery}</p>
        )}

        {error && <div className="alert-banner">{error}</div>}

        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ height: "3.2rem" }}>
          {submitting ? "Submitting…" : "Submit repair ticket →"}
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
  const [payBusy, setPayBusy] = useState(false);

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
  const waHref = whatsappUrl(meta?.storeWhatsApp ?? meta?.store?.whatsapp ?? undefined, waMessage);
  const deviceLabel =
    repair.deviceBrand === repair.deviceModel
      ? repair.deviceModel
      : `${repair.deviceBrand} ${repair.deviceModel}`.trim();

  return (
    <div className="page container" style={{ maxWidth: 700 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Live Repair Ticket
      </p>
      <h1>Ticket #{repair.id.slice(0, 8)}</h1>
      <p className="lede">
        Thanks, {repair.name}. Save this ticket ID. We will reach you on <strong>{repair.phone}</strong>.
      </p>

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
          <strong>{repair.service?.name ?? "General diagnosis"}</strong>
        </div>
        <div className="line-item">
          <span>Device</span>
          <span>{deviceLabel}</span>
        </div>
        {repair.imei && (
          <div className="line-item">
            <span>IMEI</span>
            <span>{repair.imei}</span>
          </div>
        )}
        <div className="line-item">
          <span>Issue</span>
          <span style={{ maxWidth: "340px", textAlign: "right" }}>{repair.issue}</span>
        </div>
        <div className="line-item">
          <span>Official Quote</span>
          <strong style={{ fontSize: "1.2rem", color: "var(--accent)" }}>
            {repair.quotePesewas != null ? formatGhs(repair.quotePesewas) : "Pending inspection"}
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

        {meta?.paystackEnabled &&
          repair.paymentStatus === "unpaid" &&
          repair.quotePesewas != null &&
          repair.quotePesewas > 0 &&
          repair.quoteDecision !== "declined" &&
          repair.status !== "cancelled" &&
          (repair.quoteDecision === "approved" || repair.status !== "quoted") && (
            <div className="panel stack" style={{ marginTop: "0.5rem" }}>
              <p className="meta" style={{ margin: 0 }}>
                Pay the approved quote securely with Paystack (card / MoMo). Settles to our repairs account.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={payBusy}
                onClick={async () => {
                  setPayBusy(true);
                  setError("");
                  try {
                    const res = await api<{ authorizationUrl?: string; authorization_url?: string }>(
                      `/api/repairs/${repair.id}/paystack`,
                      { method: "POST", body: "{}" },
                    );
                    const url = res.authorizationUrl ?? res.authorization_url;
                    if (!url) throw new Error("No Paystack URL returned");
                    window.location.href = url;
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not start Paystack payment");
                    setPayBusy(false);
                  }
                }}
              >
                {payBusy ? "Redirecting…" : `Pay ${formatGhs(repair.quotePesewas)} with Paystack`}
              </button>
            </div>
          )}

        <div
          style={{
            marginTop: "1rem",
            padding: "1rem 1.25rem",
            background: "var(--emerald-soft)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong style={{ display: "block", marginBottom: "0.2rem" }}>Need help?</strong>
            <span className="meta">Message us on WhatsApp with your ticket ID.</span>
          </div>
          {waHref ? (
            <a href={waHref} className="btn btn-dark btn-sm" target="_blank" rel="noreferrer">
              <span className="inline-icon-label">
                <IconChat size={14} /> WhatsApp
              </span>
            </a>
          ) : (
            <Link to="/contact" className="btn btn-dark btn-sm">
              Contact
            </Link>
          )}
        </div>

        <div className="cta-row" style={{ marginTop: "0.5rem" }}>
          <Link to={`/repairs/status/${repair.id}/receipt`} className="btn btn-light">
            Receipt
          </Link>
          <Link to="/track" className="btn btn-light">
            Track another
          </Link>
        </div>
      </div>
    </div>
  );
}
