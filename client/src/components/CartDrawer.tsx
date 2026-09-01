import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, formatGhs } from "../lib/api";
import { FulfillmentBadge, IconBolt, IconCart, IconPackage } from "./Icons";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, refreshCart } = useAuth();
  const navigate = useNavigate();

  // Close drawer on Escape key and lock body scroll when open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  async function updateQty(id: string, quantity: number) {
    try {
      await api(`/api/cart/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      await refreshCart();
    } catch {
      // Ignore or let parent handle
    }
  }

  async function removeItem(id: string) {
    try {
      await api(`/api/cart/items/${id}`, { method: "DELETE" });
      await refreshCart();
    } catch {
      // Ignore
    }
  }

  function handleCheckout() {
    onClose();
    navigate("/checkout");
  }

  return (
    <>
      <div
        className={`cart-drawer-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer ${isOpen ? "open" : ""}`}
        aria-label="Shopping Bag Quick View"
      >
        <div className="cart-drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h3>Your Bag</h3>
            <span className="bag-count">{cart?.itemCount || 0}</span>
          </div>
          <button
            className="mobile-toggle"
            onClick={onClose}
            aria-label="Close bag"
            style={{ display: "block" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {!cart || cart.items.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "2rem",
            }}
          >
            <div className="empty-icon">
              <IconCart size={48} />
            </div>
            <h4 style={{ fontSize: "1.15rem", marginBottom: "0.4rem" }}>
              Your bag is empty
            </h4>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.88rem",
                marginBottom: "1.5rem",
              }}
            >
              Explore our curated digital LUTs, audio packs, and filmmaker gear.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                onClose();
                navigate("/shop");
              }}
            >
              Start Shopping →
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items">
              {cart.items.map((line) => {
                const isDigital = line.product.fulfillment === "digital";
                return (
                  <div key={line.id} className="cart-drawer-item">
                    <div className="cart-drawer-thumb">
                      <img
                        src={
                          line.product.images?.[0] ||
                          "/images/product-placeholder.svg"
                        }
                        alt={line.product.name}
                      />
                    </div>
                    <div className="cart-drawer-info">
                      <h4>
                        <Link
                          to={`/product/${line.product.slug}`}
                          onClick={onClose}
                        >
                          {line.product.name}
                        </Link>
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          marginBottom: "0.4rem",
                        }}
                      >
                        <span
                          className={`badge ${
                            isDigital ? "badge-digital" : "badge-physical"
                          }`}
                          style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}
                        >
                          <FulfillmentBadge
                            fulfillment={isDigital ? "digital" : "physical"}
                            variant="short"
                          />
                        </span>
                        <span className="price">
                          {formatGhs(line.lineTotalPesewas)}
                        </span>
                      </div>
                      <div className="qty-control" style={{ transform: "scale(0.85)", transformOrigin: "left center" }}>
                        <button
                          className="qty-btn"
                          onClick={() =>
                            updateQty(line.id, Math.max(1, line.quantity - 1))
                          }
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="qty-val">{line.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(line.id, line.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(line.id)}
                      style={{
                        color: "var(--muted-light)",
                        padding: "0.4rem",
                        borderRadius: "var(--radius-xs)",
                        transition: "color 0.2s ease",
                      }}
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cart-drawer-footer">
              <div
                style={{
                  background: "var(--bg)",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span className="inline-icon-label">
                  {cart.needsShipping ? (
                    <>
                      <IconPackage size={14} />
                      <span>Physical items included. Shipping calculated at checkout.</span>
                    </>
                  ) : (
                    <>
                      <IconBolt size={14} />
                      <span>All digital downloads delivered instantly via email & vault.</span>
                    </>
                  )}
                </span>
              </div>

              <div className="cart-drawer-total">
                <span>Subtotal</span>
                <span style={{ color: "var(--accent)" }}>
                  {formatGhs(cart.subtotalPesewas)}
                </span>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleCheckout}
                style={{ width: "100%", height: "3rem" }}
              >
                Proceed to Checkout →
              </button>

              <button
                className="btn btn-light btn-sm"
                onClick={() => {
                  onClose();
                  navigate("/cart");
                }}
                style={{ width: "100%" }}
              >
                View Full Bag Details
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
