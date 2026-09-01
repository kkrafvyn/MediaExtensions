import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function CartPage() {
  const { cart, refreshCart } = useAuth();

  async function updateQty(id: string, quantity: number) {
    await api(`/api/cart/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    await refreshCart();
  }

  async function remove(id: string) {
    await api(`/api/cart/items/${id}`, { method: "DELETE" });
    await refreshCart();
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page container" style={{ maxWidth: 640 }}>
        <p className="eyebrow page-eyebrow">
          <span className="pulse-dot" />
          Shopping Bag
        </p>
        <h1>Your bag is empty</h1>
        <p className="lede">Discover cinematic LUTs, sound effects, camera rigs, and accessories.</p>

        <div className="empty" style={{ padding: "3.5rem 2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛍️</div>
          <p style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Nothing added to your bag yet
          </p>
          <p style={{ color: "var(--muted)", marginBottom: "1.75rem", maxWidth: "380px", marginInline: "auto" }}>
            Explore our curated catalog of digital creator assets and physical filmmaker hardware.
          </p>
          <Link to="/shop" className="btn btn-primary">
            Explore Creator Store →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page container">
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Shopping Bag
      </p>
      <h1>Review your bag ({cart.itemCount})</h1>

      <div className="split split-2" style={{ marginTop: "2rem" }}>
        {/* Left: Items list */}
        <div className="panel stack" style={{ padding: "1.5rem" }}>
          {cart.items.map((line) => {
            const isDigital = line.product.fulfillment === "digital";
            return (
              <div
                key={line.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "84px 1fr auto",
                  gap: "1.25rem",
                  alignItems: "center",
                  paddingBottom: "1.25rem",
                  borderBottom: "1px solid var(--line-subtle)",
                }}
              >
                <div
                  style={{
                    width: "84px",
                    height: "84px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg)",
                    display: "grid",
                    placeItems: "center",
                    padding: "0.5rem",
                  }}
                >
                  <img
                    src={line.product.images?.[0] || "/images/product-placeholder.svg"}
                    alt={line.product.name}
                    style={{ maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
                <div>
                  <h4 style={{ fontSize: "1.05rem", marginBottom: "0.25rem" }}>
                    <Link to={`/product/${line.product.slug}`}>{line.product.name}</Link>
                  </h4>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem" }}>
                    <span className={`badge ${isDigital ? "badge-digital" : "badge-physical"}`}>
                      {isDigital ? "⚡ Digital Download" : "📦 Physical Gear"}
                    </span>
                    <span className="meta">{formatGhs(line.product.pricePesewas)}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="qty-control">
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(line.id, Math.max(1, line.quantity - 1))}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span className="qty-val">{line.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(line.id, line.quantity + 1)}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="btn btn-light btn-sm"
                      onClick={() => remove(line.id)}
                      style={{ color: "var(--danger)", padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: "right", alignSelf: "center" }}>
                  <strong style={{ fontSize: "1.2rem", fontFamily: "var(--font-display)", color: "var(--ink)" }}>
                    {formatGhs(line.lineTotalPesewas)}
                  </strong>
                </div>
              </div>
            );
          })}

          <div
            style={{
              marginTop: "1rem",
              background: "var(--bg)",
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>🔒</span>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5 }}>
              All digital asset downloads are saved directly into your customer account downloads vault and can be accessed anytime post-checkout.
            </p>
          </div>
        </div>

        {/* Right: Summary */}
        <aside className="panel stack" style={{ position: "sticky", top: "5.5rem" }}>
          <h3 style={{ fontSize: "1.25rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.75rem" }}>
            Order Summary
          </h3>

          <div className="line-item">
            <span>Subtotal</span>
            <strong style={{ fontSize: "1.1rem" }}>{formatGhs(cart.subtotalPesewas)}</strong>
          </div>

          <div className="line-item">
            <span>Digital Delivery</span>
            <span className="badge badge-digital">⚡ Free & Instant</span>
          </div>

          {cart.needsShipping && (
            <p className="meta" style={{ fontSize: "0.82rem", background: "var(--bg)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
              📦 Physical gear included. Accra courier and nationwide delivery options calculated next.
            </p>
          )}

          <div className="line-item order-total-hero">
            <span>Total</span>
            <span style={{ color: "var(--accent)" }}>{formatGhs(cart.subtotalPesewas)}</span>
          </div>

          <Link to="/checkout" className="btn btn-primary" style={{ width: "100%", height: "3.2rem", fontSize: "1.05rem", marginTop: "0.5rem" }}>
            Proceed to Checkout →
          </Link>

          <Link to="/shop" className="btn btn-light" style={{ width: "100%" }}>
            Continue Shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
