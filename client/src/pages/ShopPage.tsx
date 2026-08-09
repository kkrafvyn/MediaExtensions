import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import type { Category, Product } from "../types";

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qInput, setQInput] = useState(params.get("q") ?? "");

  const category = params.get("category") ?? "";
  const fulfillment = params.get("fulfillment") ?? "";
  const q = params.get("q") ?? "";

  useEffect(() => {
    api<{ categories: Category[] }>("/api/products/categories").then((d) =>
      setCategories(d.categories.filter((c) => c.slug !== "gsm-repairs")),
    );
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        const current = prev.get("q") ?? "";
        const nextQ = qInput.trim();
        if (nextQ === current) return prev;
        if (nextQ) next.set("q", nextQ);
        else next.delete("q");
        return next;
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [qInput, setParams]);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (fulfillment) qs.set("fulfillment", fulfillment);
    if (q) qs.set("q", q);
    api<{ products: Product[] }>(`/api/products?${qs}`).then((d) => setProducts(d.products));
  }, [category, fulfillment, q]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="page container">
      <h1>Shop</h1>
      <p className="lede">Browse LUTs, plugins, gear, and bundles — priced in Ghana cedis.</p>

      <div className="form-grid" style={{ marginBottom: "1rem" }}>
        <label>
          Search
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="LUTs, strap, plugin…"
          />
        </label>
      </div>

      <div className="form-grid two" style={{ marginBottom: "1.5rem" }}>
        <label>
          Category
          <select value={category} onChange={(e) => updateParam("category", e.target.value)}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={fulfillment} onChange={(e) => updateParam("fulfillment", e.target.value)}>
            <option value="">All</option>
            <option value="digital">Digital</option>
            <option value="physical">Physical</option>
            <option value="both">Both</option>
          </select>
        </label>
      </div>

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {!products.length && <div className="empty">No products match these filters.</div>}
    </div>
  );
}
