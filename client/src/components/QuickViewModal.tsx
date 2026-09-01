import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { formatGhs, api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "./Toast";
import { IconClose, FulfillmentBadge, IconBolt, IconPackage } from "./Icons";
import { useFocusTrap } from "../lib/useFocusTrap";
import type { Product } from "../types";

type QuickViewModalProps = {
  product: Product | null;
  onClose: () => void;
  onOpenCart?: () => void;
};

export function QuickViewModal({ product, onClose, onOpenCart }: QuickViewModalProps) {
  const { refreshCart } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useFocusTrap(cardRef, Boolean(product));

  useEffect(() => {
    setQuantity(1);
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && product) {
        onClose();
      }
    }
    if (product) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const isDigital = product.fulfillment === "digital";
  const isPhysical = product.fulfillment === "physical";

  async function handleAddToBag() {
    if (!product) return;
    setAdding(true);
    try {
      await api("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      await refreshCart();
      toast(`Added ${quantity} × ${product.name} to bag`);
      onClose();
      if (onOpenCart) {
        onOpenCart();
      }
    } catch {
      toast("Could not add to bag. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="quick-view-overlay open"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={cardRef}
        className="quick-view-card"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <button
          className="quick-view-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <IconClose size={18} />
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem", padding: "2.5rem" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #eff2eb 0%, #e3e7dc 100%)",
              borderRadius: "var(--radius-lg)",
              display: "grid",
              placeItems: "center",
              padding: "2rem",
              minHeight: "260px",
            }}
          >
            <img
              src={product.images?.[0] || "/images/product-placeholder.svg"}
              alt={product.name}
              style={{ maxHeight: "240px", objectFit: "contain" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <span
                className={`badge ${
                  isDigital ? "badge-digital" : isPhysical ? "badge-physical" : "badge-both"
                }`}
                style={{ marginBottom: "0.5rem" }}
              >
                <FulfillmentBadge fulfillment={product.fulfillment} />
              </span>
              <h2 style={{ fontSize: "1.5rem", margin: "0.25rem 0 0.5rem" }}>
                {product.name}
              </h2>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "var(--ink)",
                }}
              >
                {formatGhs(product.pricePesewas)}
              </div>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.55 }}>
              {product.description}
            </p>

            <div className="inline-icon-label" style={{ background: "var(--bg)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "var(--muted)" }}>
              {isDigital ? (
                <>
                  <IconBolt size={14} />
                  <span>Delivered instantly after payment + stored in your account vault.</span>
                </>
              ) : (
                <>
                  <IconPackage size={14} />
                  <span>Ships via express courier across all 16 Ghana regions.</span>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "auto", flexWrap: "wrap" }}>
              <div className="qty-control">
                <button
                  className="qty-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="qty-val">{quantity}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                className="btn btn-primary"
                style={{ flex: 1, height: "2.85rem" }}
                disabled={adding}
                onClick={handleAddToBag}
              >
                {adding ? "Adding…" : "Add to Bag"}
              </button>
            </div>

            <div style={{ marginTop: "0.25rem" }}>
              <Link
                to={`/product/${product.slug}`}
                onClick={onClose}
                style={{ fontSize: "0.85rem", color: "var(--muted)", textDecoration: "underline" }}
              >
                View full product specifications & license details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
