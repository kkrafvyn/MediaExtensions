import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { IconClose } from "../components/Icons";
import type { Category, Product } from "../types";

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qInput, setQInput] = useState(params.get("q") ?? "");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const category = params.get("category") ?? "";
  const fulfillment = params.get("fulfillment") ?? "";
  const q = params.get("q") ?? "";

  useEffect(() => {
    setPage(1);
  }, [category, fulfillment, q]);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/products/categories")
      .then((d) => setCategories(d.categories.filter((c) => c.slug !== "gsm-repairs")))
      .catch(() => setError("We couldn’t load the shop filters. Please refresh and try again."));
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        const nextQ = qInput.trim();
        if (nextQ === (prev.get("q") ?? "")) return prev;
        if (nextQ) next.set("q", nextQ);
        else next.delete("q");
        return next;
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [qInput, setParams]);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (fulfillment) qs.set("fulfillment", fulfillment);
    if (q) qs.set("q", q);
    qs.set("page", String(page));
    qs.set("limit", "12");

    setLoading(true);
    setError("");

    api<{ products: Product[]; pagination?: typeof pagination }>(`/api/products?${qs}`)
      .then((d) => {
        setProducts(d.products);
        if (d.pagination) setPagination(d.pagination);
      })
      .catch(() => setError("We couldn’t load products right now. Please try again."))
      .finally(() => setLoading(false));
  }, [category, fulfillment, q, page]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  function resetFilters() {
    setQInput("");
    setParams(new URLSearchParams());
  }

  // Sorted product list
  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === "price-asc") {
      list.sort((a, b) => a.pricePesewas - b.pricePesewas);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.pricePesewas - a.pricePesewas);
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [products, sortBy]);

  return (
    <div className="page container">
      <div className="page-header">
        <p className="eyebrow page-eyebrow">Shop</p>
        <h1>All products.</h1>
        <p className="lede">
          Digital downloads and physical gear, priced in Ghana cedis.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="shop-filter-bar">
        <div className="shop-filter-top">
          <div className="search-input-wrapper">
            <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search LUTs, presets, mics, batteries, rigs..."
            />
            {qInput && (
              <button
                className="search-clear-btn"
                onClick={() => setQInput("")}
                aria-label="Clear search"
              >
                <IconClose size={16} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <select
              value={fulfillment}
              onChange={(e) => updateParam("fulfillment", e.target.value)}
              style={{
                borderRadius: "var(--radius-full)",
                padding: "0.6rem 1.1rem",
                width: "auto",
                fontWeight: 600,
                fontSize: "0.88rem",
              }}
            >
              <option value="">All Formats</option>
              <option value="digital">Digital Only</option>
              <option value="physical">Physical Only</option>
              <option value="both">Bundles</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                borderRadius: "var(--radius-full)",
                padding: "0.6rem 1.1rem",
                width: "auto",
                fontWeight: 600,
                fontSize: "0.88rem",
              }}
            >
              <option value="featured">Featured Order</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="category-pills-scroll">
          <button
            className={`filter-pill ${!category ? "active" : ""}`}
            onClick={() => updateParam("category", "")}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`filter-pill ${category === c.slug ? "active" : ""}`}
              onClick={() => updateParam("category", c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="alert-banner">{error}</div>
      ) : loading ? (
        <div className="product-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="product-skeleton" key={i} />
          ))}
        </div>
      ) : sortedProducts.length > 0 ? (
        <div>
          <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
            <span>
              Showing <strong>{sortedProducts.length}</strong> of <strong>{pagination.total}</strong> product{pagination.total === 1 ? "" : "s"}
              {category && ` in ${categories.find((c) => c.slug === category)?.name || category}`}
            </span>
            {(category || fulfillment || q) && (
              <button
                onClick={resetFilters}
                style={{ fontSize: "0.82rem", color: "var(--accent)", fontWeight: 600 }}
              >
                Clear all filters <IconClose size={12} />
              </button>
            )}
          </div>

          <div className="product-grid">
            {sortedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onQuickView={(prod) => setQuickViewProduct(prod)}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="btn btn-light btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className="meta">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-light btn-sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty">
          <p style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--ink)" }}>
            No tools matched your filters
          </p>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
            Try adjusting your search query or reset the category filters.
          </p>
          <button className="btn btn-dark" onClick={resetFilters}>
            Reset All Filters
          </button>
        </div>
      )}

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
