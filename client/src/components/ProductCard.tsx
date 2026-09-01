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
      ? "Digital"
      : product.fulfillment === "physical"
        ? "Physical"
        : "Bundle";

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
      toast(`Added ${product.name} to bag`);
      onOpenCart?.();
    } catch {
      toast("Could not add to bag");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link to={`/product/${product.slug}`} className="product-tile">
      <div className="thumb">
        <div className="product-badge-overlay">
          <span className={`badge ${fulfillmentClass}`}>{fulfillmentLabel}</span>
        </div>
        <img
          src={product.images?.[0] || "/images/product-placeholder.svg"}
          alt={product.name}
        />
        <div className="product-quick-actions">
          {onQuickView && (
            <button
              className="product-quick-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              aria-label={`Quick view ${product.name}`}
            >
              View
            </button>
          )}
          <button
            className="product-quick-btn"
            type="button"
            disabled={adding}
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to bag`}
          >
            {adding ? "…" : "Add"}
          </button>
        </div>
      </div>
      <div className="body">
        <h3>{product.name}</h3>
        {product.description && <p className="desc">{product.description}</p>}
        <div className="product-card-footer">
          <div className="product-price">{formatGhs(product.pricePesewas)}</div>
          <span className="product-cta-badge">Learn more</span>
        </div>
      </div>
    </Link>
  );
}
