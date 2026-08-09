import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import type { Product } from "../types";

export function ProductPage() {
  const { slug } = useParams();
  const { refreshCart } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api<{ product: Product }>(`/api/products/${slug}`)
      .then((d) => setProduct(d.product))
      .catch((e) => setError(e.message));
  }, [slug]);

  async function addToBag() {
    if (!product) return;
    setAdding(true);
    setError("");
    try {
      await api("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      await refreshCart();
      toast("Added to bag");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
    } finally {
      setAdding(false);
    }
  }

  if (error && !product) {
    return (
      <div className="page container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page container">
        <p className="meta">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page container">
      <div className="split product-detail">
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <img
            src={product.images[0] ?? "/images/products/lut-pack.svg"}
            alt={product.name}
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <span className="badge">{product.fulfillment}</span>
          <h1>{product.name}</h1>
          <p className="lede">{product.description}</p>
          <p style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "1.25rem" }}>
            {formatGhs(product.pricePesewas)}
          </p>
          {error && <p className="error">{error}</p>}
          <div className="sticky-buy">
            <button className="btn btn-dark" disabled={adding} onClick={addToBag}>
              {adding ? "Adding…" : "Add to Bag"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
