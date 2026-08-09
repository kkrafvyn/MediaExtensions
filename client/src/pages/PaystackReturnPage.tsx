import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function PaystackReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference) {
      setError("Missing Paystack reference.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ order: { id: string } }>("/api/checkout/paystack/verify", {
          method: "POST",
          body: JSON.stringify({ reference }),
        });
        await refreshCart();
        if (!cancelled) navigate(`/order/${res.order.id}`, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Payment verification failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate, refreshCart]);

  if (error) {
    return (
      <div className="page container" style={{ maxWidth: 480 }}>
        <h1>Payment</h1>
        <p className="error">{error}</p>
        <div className="cta-row">
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
    <div className="page container">
      <p className="meta">Confirming Paystack payment…</p>
    </div>
  );
}
