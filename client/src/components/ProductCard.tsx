import { useState } from "react";
import { Link } from "react-router-dom";
import { formatGhs, api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "./Toast";
import type { Product } from "../types";

type ProductCardProps = {
  product: Product;
  onQuickView?: (product: Product) => void;
  onOpenCart?: () => void;
};

export function ProductCard({ product, onQuickView, onOpenCart }: ProductCardProps) {
  const { refreshCart } = useAuth();
  const [adding, setAdding] = useState(false);

  const fulfillmentClass =
    product.fulfillment === "digital"
      ? "badge-digital"
      : product.fulfillment === "physical"
      ? "badge-physical"
      : "badge-both";

  const fulfillmentLabel =
    product.fulfillment === "digital"
      ? "⚡ Digital Download"
      : product.fulfillment === "physical"
      ? "📦 Physical Gear"
      : "🎁 Creator Bundle";

  async function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      await api("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      await refreshCart();
      toast(`Added 1 × ${product.name} to bag`);
      if (onOpenCart) {
        onOpenCart();
      }
    } catch {
      toast("Could not add to bag. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function handleQuickViewClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  }

  return (
    <Link to={`/product/${product.slug}`} className="product-tile">
      <div className="thumb">
        <div className="product-badge-overlay">
          <span className={`badge ${fulfillmentClass}`}>{fulfillmentLabel}</span>
        </div>

        {/* Quick Action Floating Buttons */}
        <div className="product-quick-actions">
          {onQuickView && (
            <button
              className="product-quick-btn"
              onClick={handleQuickViewClick}
              title="Quick preview"
              aria-label={`Quick view ${product.name}`}
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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          )}

          <button
            className="product-quick-btn"
            onClick={handleQuickAdd}
            disabled={adding}
            title="Quick add to bag"
            aria-label={`Add ${product.name} to bag`}
          >
            {adding ? (
              <span style={{ fontSize: "0.75rem" }}>…</span>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            )}
          </button>
        </div>

        <img
          src={product.images?.[0] || "/images/product-placeholder.svg"}
          alt={product.name}
          loading="lazy"
        />
      </div>

      <div className="body">
        <div className="product-card-meta">
          <span>{product.category?.name || "Creator Asset"}</span>
        </div>

        <h3>{product.name}</h3>
        {product.description && <p className="desc">{product.description}</p>}

        <div className="product-card-footer">
          <div className="product-price">{formatGhs(product.pricePesewas)}</div>
          <span className="product-cta-badge">
            Explore <span>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
