import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { RepairService } from "../types";

export function RepairsPage() {
  const [services, setServices] = useState<RepairService[]>([]);

  useEffect(() => {
    api<{ services: RepairService[] }>("/api/repairs/services").then((d) => setServices(d.services));
  }, []);

  return (
    <div className="page container">
      <h1>GSM Repairs</h1>
      <p className="lede">
        Screens, batteries, ports, and software — drop off in Accra or book ahead as a guest.
      </p>
      <div className="product-grid">
        {services.map((s) => (
          <div key={s.id} className="product-tile">
            <div className="body">
              <span className="badge">Repair</span>
              <h3>{s.name}</h3>
              <p className="meta">{s.description}</p>
              <p style={{ fontWeight: 600 }}>
                {s.pricePesewas != null ? formatGhs(s.pricePesewas) : "Quote on diagnosis"}
              </p>
              <Link
                to={`/repairs/book?service=${s.id}`}
                className="btn btn-light"
                style={{ marginTop: "0.75rem", display: "inline-block" }}
              >
                Book
              </Link>
            </div>
          </div>
        ))}
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
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "+233");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [issue, setIssue] = useState("");
  const [dropOffNotes, setDropOffNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ services: RepairService[] }>("/api/repairs/services").then((d) => setServices(d.services));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api<{ repair: { id: string } }>("/api/repairs/book", {
        method: "POST",
        body: JSON.stringify({
          serviceId: serviceId || undefined,
          name,
          email,
          phone,
          deviceBrand,
          deviceModel,
          issue,
          dropOffNotes,
          paymentMethod: "pickup",
        }),
      });
      navigate(`/repairs/status/${res.repair.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 640 }}>
      <h1>Book a repair</h1>
      <p className="lede">Guests welcome — leave your contact and device details.</p>
      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Service
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">General / not sure</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid two">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
        </div>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <div className="form-grid two">
          <label>
            Device brand
            <input value={deviceBrand} onChange={(e) => setDeviceBrand(e.target.value)} required />
          </label>
          <label>
            Model
            <input value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} required />
          </label>
        </div>
        <label>
          Issue
          <textarea
            rows={4}
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            required
            minLength={5}
          />
        </label>
        <label>
          Drop-off notes
          <textarea
            rows={2}
            value={dropOffNotes}
            onChange={(e) => setDropOffNotes(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit">
          Submit booking
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
      <div className="page container">
        <p className="error">{error}</p>
        <Link to="/repairs">Back to repairs</Link>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="page container">
        <p className="meta">Loading booking…</p>
      </div>
    );
  }

  return (
    <div className="page container" style={{ maxWidth: 640 }}>
      <h1>Repair booked</h1>
      <p className="lede">
        Thanks, {repair.name}. We’ll reach you on {repair.phone} when your device is ready.
      </p>
      <div className="panel stack">
        <div className="line-item">
          <span>Status</span>
          <strong>{repair.status.replaceAll("_", " ")}</strong>
        </div>
        <div className="line-item">
          <span>Service</span>
          <span>{repair.service?.name ?? "General diagnosis"}</span>
        </div>
        <div className="line-item">
          <span>Device</span>
          <span>
            {repair.deviceBrand} {repair.deviceModel}
          </span>
        </div>
        <div className="line-item">
          <span>Issue</span>
          <span>{repair.issue}</span>
        </div>
        <div className="line-item">
          <span>Quote</span>
          <span>{repair.quotePesewas != null ? formatGhs(repair.quotePesewas) : "Pending"}</span>
        </div>
        <div className="line-item">
          <span>Payment</span>
          <span>{repair.paymentStatus}</span>
        </div>
        <Link
          to={`/repairs/status/${repair.id}/receipt`}
          className="btn btn-light"
          style={{ textAlign: "center" }}
        >
          Print receipt
        </Link>
        <Link to="/repairs" className="btn btn-dark" style={{ textAlign: "center" }}>
          Back to repairs
        </Link>
      </div>
    </div>
  );
}
