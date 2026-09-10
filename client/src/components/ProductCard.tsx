import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { formatGhs, api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "./Toast";
import { FulfillmentBadge } from "./Icons";
import type { Product } from "../types";

type ProductCardProps = {
  product: Product;
  onQuickView?: (product: Product) => void;
  onOpenCart?: () => void;
  style?: CSSProperties;
};

export function ProductCard({ product, onQuickView, onOpenCart, style }: ProductCardProps) {
  const { refreshCart } = useAuth();
  const [adding, setAdding] = useState(false);

  const isDigital = product.fulfillment === "digital";
  const outOfStock = !isDigital && product.stock <= 0;

  async function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
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
    <article className={`product-tile${outOfStock ? " is-sold-out" : ""}`} style={style}>
      <Link to={`/product/${product.slug}`} className="product-tile-link">
        <div className="thumb">
          <div className="product-badge-overlay">
            <span
              className={`badge ${
                product.fulfillment === "digital"
                  ? "badge-digital"
                  : product.fulfillment === "physical"
                    ? "badge-physical"
                    : "badge-both"
              }`}
            >
              <FulfillmentBadge fulfillment={product.fulfillment} variant="short" iconSize={11} />
            </span>
            {product.featured && <span className="badge badge-featured">Featured</span>}
            {outOfStock && <span className="badge badge-sold-out">Sold out</span>}
          </div>
          <img
            src={product.images?.[0] || "/images/product-placeholder.svg"}
            alt={product.name}
            loading="lazy"
          />
        </div>

        <div className="body">
          {product.category?.name && (
            <p className="product-card-category">{product.category.name}</p>
          )}
          <h3>{product.name}</h3>
          <div className="product-card-footer">
            <div className="product-price">{formatGhs(product.pricePesewas)}</div>
            {!isDigital && product.stock > 0 && product.stock <= 5 && (
              <span className="product-stock-hint">Only {product.stock} left</span>
            )}
          </div>
        </div>
      </Link>

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
          className="product-quick-btn product-quick-btn-primary"
          type="button"
          disabled={adding || outOfStock}
          onClick={handleQuickAdd}
          aria-label={`Add ${product.name} to bag`}
        >
          {adding ? "…" : outOfStock ? "Sold out" : "Add"}
        </button>
      </div>
    </article>
  );
}
