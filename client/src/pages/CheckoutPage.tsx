import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
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
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "+233 ");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("momo");
  const [shipping, setShipping] = useState({
    fullName: user?.name ?? "",
    phone: user?.phone ?? "+233 ",
    street: "",
    city: "Accra",
    region: "Greater Accra",
    landmark: "",
  });

  useEffect(() => {
    api<PaymentInfo>("/api/checkout/payment-info").then(setPaymentInfo).catch(() => undefined);
    api<SiteMeta>("/api/meta").then(setMeta).catch(() => undefined);
  }, []);

  const shippingPesewas = useMemo(() => {
    if (!cart?.needsShipping || paymentMethod === "pickup" || !meta) return 0;
    return shipping.region.toLowerCase().includes("accra")
      ? meta.shipping.accraPesewas
      : meta.shipping.otherPesewas;
  }, [cart, paymentMethod, shipping.region, meta]);

  const methods: Array<{ value: PaymentMethod; title: string; badge: string; detail: string }> = [
    {
      value: "momo",
      title: "Mobile Money (MTN / Telecel / AT)",
      badge: "🇬🇭 Most Popular",
      detail: paymentInfo
        ? `${paymentInfo.momo.network} · ${paymentInfo.momo.number} · ${paymentInfo.momo.name}`
        : "Pay instantly from your Ghana mobile money wallet",
    },
    {
      value: "bank",
      title: "Direct Bank Transfer",
      badge: "Bank Wire",
      detail: paymentInfo
        ? `${paymentInfo.bank.bankName} · ${paymentInfo.bank.accountNumber} · ${paymentInfo.bank.accountName}`
        : "Direct transfer via your mobile banking app or branch",
    },
    ...(meta?.paystackEnabled
      ? [
          {
            value: "paystack" as const,
            title: "Paystack (Debit / Credit Card & MoMo)",
            badge: "⚡ Instant Verify",
            detail: "Visa, Mastercard, or Mobile Money securely processed online",
          },
        ]
      : []),
    ...(cart?.needsShipping
      ? [
          {
            value: "pickup" as const,
            title: "Pay On In-Store Pickup",
            badge: "📍 Accra Studio",
            detail: "Collect from our Accra location and settle in cash or MoMo",
          },
        ]
      : []),
  ];

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page container" style={{ maxWidth: 640 }}>
        <h1>Checkout</h1>
        <div className="empty">
          <p>Your shopping bag is empty.</p>
          <Link to="/shop" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Return to Shop
          </Link>
        </div>
      </div>
    );
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast(`Copied ${label} to clipboard!`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setError("Please accept the terms and conditions before placing your order.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        email,
        name,
        phone,
        paymentMethod,
        paymentNote: paymentNote || undefined,
      };
      if (cart?.needsShipping && paymentMethod !== "pickup") {
        body.shipping = shipping;
      }
      const res = await api<{ order: { id: string }; authorizationUrl?: string }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.authorizationUrl) {
        window.location.assign(res.authorizationUrl);
        return;
      }
      await refreshCart();
      navigate(`/order/${res.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container checkout-page">
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Encrypted Checkout
      </p>
      <h1>Complete your order</h1>
      <p className="lede">Orders are protected from confirmation through to download & dispatch.</p>

      <form onSubmit={onSubmit} className="split split-2">
        <div className="stack">
          {/* Step 1: Contact Details */}
          <section className="panel stack">
            <div className="checkout-step-header">
              <span className="checkout-step-badge">01</span>
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Contact Details</h2>
            </div>
            <div className="form-grid two">
              <label>
                Full Name
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </label>
              <label>
                Email Address (For downloads & invoice)
                <input
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  required
                />
              </label>
            </div>
            <label>
              Mobile Number (MoMo / WhatsApp)
              <input
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233 XX XXX XXXX"
                required
                minLength={8}
              />
            </label>
          </section>

          {/* Step 2: Shipping (Only if physical goods) */}
          {cart.needsShipping && paymentMethod !== "pickup" && (
            <section className="panel stack">
              <div className="checkout-step-header">
                <span className="checkout-step-badge">02</span>
                <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Ghana Shipping Address</h2>
              </div>
              <div className="form-grid two">
                <label>
                  Recipient Full Name
                  <input
                    value={shipping.fullName}
                    onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                    placeholder="Recipient name"
                    required
                  />
                </label>
                <label>
                  Recipient Phone
                  <input
                    inputMode="tel"
                    value={shipping.phone}
                    onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                    placeholder="Recipient phone"
                    required
                    minLength={8}
                  />
                </label>
              </div>
              <label>
                Street / Area Address
                <input
                  autoComplete="street-address"
                  value={shipping.street}
                  onChange={(e) => setShipping({ ...shipping, street: e.target.value })}
                  placeholder="Street address, digital GhanaPost GPS, or neighborhood"
                  required
                />
              </label>
              <div className="form-grid two">
                <label>
                  City / Town
                  <input
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    placeholder="City / Town"
                    required
                  />
                </label>
                <label>
                  Region
                  <select
                    value={shipping.region}
                    onChange={(e) => setShipping({ ...shipping, region: e.target.value })}
                  >
                    {(meta?.regions?.length ? meta.regions : REGIONS).map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Notable Landmark <span className="meta">(optional)</span>
                <input
                  value={shipping.landmark}
                  onChange={(e) => setShipping({ ...shipping, landmark: e.target.value })}
                  placeholder="e.g. Near Shell Station, East Legon"
                />
              </label>
            </section>
          )}

          {/* Step 3: Payment Method */}
          <section className="panel stack">
            <div className="checkout-step-header">
              <span className="checkout-step-badge">{cart.needsShipping ? "03" : "02"}</span>
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Select Payment Method</h2>
            </div>

            <div className="stack" style={{ gap: "0.75rem" }}>
              {methods.map((method) => (
                <label
                  key={method.value}
                  className={`pay-option ${paymentMethod === method.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{method.title}</strong>
                      <span className="badge badge-digital" style={{ fontSize: "0.7rem" }}>
                        {method.badge}
                      </span>
                    </div>
                    <span className="meta payment-detail" style={{ display: "block", marginTop: "0.25rem", fontSize: "0.85rem" }}>
                      {method.detail}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Quick Copy helpers for MoMo & Bank */}
            {paymentMethod === "momo" && paymentInfo && (
              <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: "var(--radius-sm)", marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{paymentInfo.momo.network} MoMo Number:</span>
                  <button
                    type="button"
                    className="copy-badge-btn"
                    onClick={() => copyToClipboard(paymentInfo.momo.number, "MoMo Number")}
                  >
                    Copy Number
                  </button>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)" }}>
                  {paymentInfo.momo.number} ({paymentInfo.momo.name})
                </div>
              </div>
            )}

            {paymentMethod === "bank" && paymentInfo && (
              <div style={{ background: "var(--bg)", padding: "1rem", borderRadius: "var(--radius-sm)", marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{paymentInfo.bank.bankName} Account:</span>
                  <button
                    type="button"
                    className="copy-badge-btn"
                    onClick={() => copyToClipboard(paymentInfo.bank.accountNumber, "Account Number")}
                  >
                    Copy Account #
                  </button>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)" }}>
                  {paymentInfo.bank.accountNumber} ({paymentInfo.bank.accountName})
                </div>
              </div>
            )}

            {(paymentMethod === "momo" || paymentMethod === "bank") && (
              <label style={{ marginTop: "0.5rem" }}>
                Payment Reference / Transaction ID <span className="meta">(optional)</span>
                <input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Enter Transaction ID or sender phone number"
                />
              </label>
            )}
          </section>
        </div>

        {/* Right Aside: Summary */}
        <aside className="panel stack checkout-summary">
          <h2 style={{ fontSize: "1.25rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.75rem" }}>
            Order Summary
          </h2>

          <div className="stack" style={{ gap: "0.5rem" }}>
            {cart.items.map((line) => (
              <div key={line.id} className="line-item" style={{ padding: "0.6rem 0" }}>
                <div>
                  <strong style={{ fontSize: "0.95rem" }}>{line.product.name}</strong>
                  <div className="meta" style={{ fontSize: "0.8rem" }}>
                    {line.product.fulfillment} · Qty {line.quantity}
                  </div>
                </div>
                <span>{formatGhs(line.lineTotalPesewas)}</span>
              </div>
            ))}
          </div>

          <div className="line-item" style={{ borderTop: "1px solid var(--line)", paddingTop: "0.75rem" }}>
            <span>Shipping</span>
            <span>
              {shippingPesewas
                ? formatGhs(shippingPesewas)
                : cart.needsShipping && paymentMethod === "pickup"
                ? "Free In-Store Pickup"
                : "⚡ Free Digital Delivery"}
            </span>
          </div>

          <div className="line-item order-total-hero">
            <span>Total</span>
            <span style={{ color: "var(--accent)" }}>
              {formatGhs(cart.subtotalPesewas + shippingPesewas)}
            </span>
          </div>

          <label className="terms-check" style={{ marginTop: "0.5rem", display: "flex", flexDirection: "row", alignItems: "center", gap: "0.6rem" }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{ width: "1.15rem", height: "1.15rem", accentColor: "var(--accent)" }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 500 }}>
              I agree to the <Link to="/terms" target="_blank" style={{ color: "var(--ink)", textDecoration: "underline" }}>terms</Link> and{" "}
              <Link to="/returns" target="_blank" style={{ color: "var(--ink)", textDecoration: "underline" }}>return policy</Link>.
            </span>
          </label>

          {error && <div className="alert-banner">{error}</div>}

          <button
            className="btn btn-primary checkout-submit"
            disabled={submitting}
            type="submit"
            style={{ height: "3.2rem", fontSize: "1.05rem" }}
          >
            {submitting
              ? "Processing Order…"
              : paymentMethod === "paystack"
              ? "Continue to Paystack Payment →"
              : "Place Order Now →"}
          </button>

          <p className="meta checkout-reassurance" style={{ fontSize: "0.8rem", textAlign: "center", marginTop: "0.5rem" }}>
            🔒 Bank-grade SSL encryption · Receipts and download keys emailed instantly.
          </p>
        </aside>
      </form>
    </div>
  );
}
