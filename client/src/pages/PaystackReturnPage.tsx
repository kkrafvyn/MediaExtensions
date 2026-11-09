import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function PaystackReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  const reference = params.get("reference") ?? params.get("trxref") ?? "";

  const verify = useCallback(async () => {
    if (!reference) {
      setError("Missing Paystack reference.");
      setBusy(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api<{ order: { id: string } }>("/api/checkout/paystack/verify", {
        method: "POST",
        body: JSON.stringify({ reference }),
      });
      await refreshCart();
      navigate(`/order/${res.order.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed");
      setBusy(false);
    }
  }, [reference, navigate, refreshCart]);

  useEffect(() => {
    void verify();
  }, [verify]);

  if (error) {
    return (
      <div className="page container" style={{ maxWidth: 480 }}>
        <h1>Payment</h1>
        <p className="error">{error}</p>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={() => void verify()} disabled={busy}>
            Try again
          </button>
          <Link to="/track" className="btn btn-light">
            Track order
          </Link>
          <Link to="/cart" className="btn btn-dark">
            Back to bag
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page container" style={{ maxWidth: 480, textAlign: "center" }}>
      <div className="product-skeleton" style={{ width: 48, height: 48, borderRadius: "50%", margin: "2rem auto" }} aria-hidden />
      <p className="meta">Confirming Paystack payment…</p>
    </div>
  );
}

export function RepairPaystackReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  const reference = params.get("reference") ?? params.get("trxref") ?? "";

  const verify = useCallback(async () => {
    if (!reference) {
      setError("Missing Paystack reference.");
      setBusy(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api<{ repair: { id: string } }>("/api/repairs/paystack/verify", {
        method: "POST",
        body: JSON.stringify({ reference }),
      });
      navigate(`/repairs/status/${res.repair.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed");
      setBusy(false);
    }
  }, [reference, navigate]);

  useEffect(() => {
    void verify();
  }, [verify]);

  if (error) {
    return (
      <div className="page container" style={{ maxWidth: 480 }}>
        <h1>Repair payment</h1>
        <p className="error">{error}</p>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={() => void verify()} disabled={busy}>
            Try again
          </button>
          <Link to="/track" className="btn btn-light">
            Track repair
          </Link>
          <Link to="/repairs" className="btn btn-dark">
            Repairs home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page container" style={{ maxWidth: 480, textAlign: "center" }}>
      <div className="product-skeleton" style={{ width: 48, height: 48, borderRadius: "50%", margin: "2rem auto" }} aria-hidden />
      <p className="meta">Confirming repair payment…</p>
    </div>
  );
}
