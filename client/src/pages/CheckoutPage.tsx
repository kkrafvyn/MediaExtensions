import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { PaymentInfo, SiteMeta } from "../types";

const REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Eastern",
  "Central",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Western North",
  "Oti",
  "Savannah",
  "North East",
];

type PaymentMethod = "momo" | "bank" | "pickup" | "paystack";

export function CheckoutPage() {
  const { cart, user, refreshCart } = useAuth();
  const navigate = useNavigate();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [meta, setMeta] = useState<SiteMeta | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "+233");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("momo");
  const [shipping, setShipping] = useState({
    fullName: user?.name ?? "",
    phone: user?.phone ?? "+233",
    street: "",
    city: "Accra",
    region: "Greater Accra",
    landmark: "",
  });

  useEffect(() => {
    api<PaymentInfo>("/api/checkout/payment-info").then(setPaymentInfo);
    api<SiteMeta>("/api/meta").then(setMeta);
  }, []);

  const shippingPesewas = useMemo(() => {
    if (!cart?.needsShipping || paymentMethod === "pickup" || !meta) return 0;
    const region = shipping.region.toLowerCase();
    if (region.includes("accra")) return meta.shipping.accraPesewas;
    return meta.shipping.otherPesewas;
  }, [cart, paymentMethod, shipping.region, meta]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page container">
        <h1>Checkout</h1>
        <div className="empty">
          Nothing to check out. <Link to="/shop">Shop</Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cart) return;
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        email,
        name,
        phone,
        paymentMethod,
      };
      if (cart.needsShipping && paymentMethod !== "pickup") {
        body.shipping = shipping;
      }
      const res = await api<{
        order: { id: string };
        authorizationUrl?: string;
      }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refreshCart();
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
        return;
      }
      navigate(`/order/${res.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  const payOptions: Array<[PaymentMethod, string, string?]> = [
    ["momo", "Mobile Money"],
    ["bank", "Bank transfer"],
    ["paystack", "Paystack (card / MoMo)"],
    ["pickup", "Pay on pickup / cash"],
  ];

  return (
    <div className="page container">
      <h1>Checkout</h1>
      <p className="lede">Guest checkout is welcome — no account required.</p>

      <form onSubmit={onSubmit} className="split split-2">
        <div className="stack">
          <div className="panel stack">
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Contact</h2>
            <div className="form-grid two">
              <label>
                Full name
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233…" />
            </label>
          </div>

          {cart.needsShipping && paymentMethod !== "pickup" && (
            <div className="panel stack">
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Shipping</h2>
              <div className="form-grid two">
                <label>
                  Recipient
                  <input
                    value={shipping.fullName}
                    onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={shipping.phone}
                    onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                    required
                  />
                </label>
              </div>
              <label>
                Street address
                <input
                  value={shipping.street}
                  onChange={(e) => setShipping({ ...shipping, street: e.target.value })}
                  required
                />
              </label>
              <div className="form-grid two">
                <label>
                  City
                  <input
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Region
                  <select
                    value={shipping.region}
                    onChange={(e) => setShipping({ ...shipping, region: e.target.value })}
                  >
                    {(meta?.regions?.length ? meta.regions : REGIONS).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Landmark (optional)
                <input
                  value={shipping.landmark}
                  onChange={(e) => setShipping({ ...shipping, landmark: e.target.value })}
                />
              </label>
            </div>
          )}

          <div className="panel stack">
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Payment</h2>
            {payOptions.map(([value, label]) => (
              <label
                key={value}
                className={`pay-option ${paymentMethod === value ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === value}
                  onChange={() => setPaymentMethod(value)}
                />
                <span>
                  <strong>{label}</strong>
                  {value === "momo" && paymentInfo && (
                    <div className="meta">
                      {paymentInfo.momo.network} · {paymentInfo.momo.number} · {paymentInfo.momo.name}
                    </div>
                  )}
                  {value === "bank" && paymentInfo && (
                    <div className="meta">
                      {paymentInfo.bank.bankName} · {paymentInfo.bank.accountNumber} ·{" "}
                      {paymentInfo.bank.accountName}
                    </div>
                  )}
                  {value === "paystack" && (
                    <div className="meta">
                      Pay securely online
                      {meta?.paystackPublicKey ? " with Paystack." : " (redirects after order)."}
                    </div>
                  )}
                  {value === "pickup" && (
                    <div className="meta">Pay when you collect in Accra.</div>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Order summary</h2>
          {cart.items.map((line) => (
            <div key={line.id} className="line-item">
              <span>
                {line.product.name} × {line.quantity}
              </span>
              <span>{formatGhs(line.lineTotalPesewas)}</span>
            </div>
          ))}
          <div className="line-item">
            <span>Shipping</span>
            <span>{shippingPesewas ? formatGhs(shippingPesewas) : "—"}</span>
          </div>
          <div className="line-item">
            <strong>Total</strong>
            <strong>{formatGhs(cart.subtotalPesewas + shippingPesewas)}</strong>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={submitting} type="submit">
            {submitting
              ? paymentMethod === "paystack"
                ? "Redirecting…"
                : "Placing order…"
              : paymentMethod === "paystack"
                ? "Pay with Paystack"
                : "Place order"}
          </button>
        </div>
      </form>
    </div>
  );
}
