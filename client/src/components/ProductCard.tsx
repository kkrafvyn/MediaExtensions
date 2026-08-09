import { Link } from "react-router-dom";
import { formatGhs } from "../lib/api";
import type { Product } from "../types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.slug}`} className="product-tile">
      <div className="thumb">
        <img src={product.images[0] ?? "/images/products/lut-pack.svg"} alt="" />
      </div>
      <div className="body">
        <span className="badge">{product.fulfillment}</span>
        <h3>{product.name}</h3>
        <div className="meta">{formatGhs(product.pricePesewas)}</div>
      </div>
    </Link>
  );
}
