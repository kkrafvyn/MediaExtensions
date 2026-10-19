import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { IconClose, IconPackage } from "../components/Icons";
import { EmptyState } from "../components/EmptyState";
import type { Category, Product } from "../types";

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";

const FORMAT_OPTIONS = [
  { value: "", label: "All" },
  { value: "digital", label: "Downloads" },
  { value: "physical", label: "Equipment" },
  { value: "both", label: "Bundles" },
] as const;

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qInput, setQInput] = useState(params.get("q") ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const parsedPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const category = params.get("category") ?? "";
  const fulfillment = params.get("fulfillment") ?? "";
  const q = params.get("q") ?? "";
  const sortParam = params.get("sort");
  const sortBy: SortOption = sortParam === "price-asc" || sortParam === "price-desc" || sortParam === "name-asc"
    ? sortParam
    : "featured";

  useEffect(() => {
    setQInput(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setFilterError(false);
    api<{ categories: Category[] }>("/api/products/categories")
      .then((d) => { if (!cancelled) setCategories(d.categories.filter((c) => c.slug !== "gsm-repairs")); })
      .catch(() => { if (!cancelled) setFilterError(true); });
    return () => { cancelled = true; };
  }, [retryCount]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        const nextQ = qInput.trim();
        if (nextQ === (prev.get("q") ?? "")) return prev;
        if (nextQ) next.set("q", nextQ);
        else next.delete("q");
        next.delete("page");
        return next;
      }, { replace: true });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [qInput, setParams]);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (fulfillment) qs.set("fulfillment", fulfillment);
    if (q) qs.set("q", q);
    qs.set("sort", sortBy);
    qs.set("page", String(page));
    qs.set("limit", "12");

    setLoading(true);
    setError("");

    api<{ products: Product[]; pagination?: typeof pagination }>(`/api/products?${qs}`)
      .then((d) => {
        if (cancelled) return;
        setProducts(d.products);
        setPagination(d.pagination ?? { page: 1, limit: 12, total: d.products.length, totalPages: 1 });
      })
      .catch(() => { if (!cancelled) setError("We couldn’t load products right now. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category, fulfillment, q, sortBy, page, retryCount]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }

  function resetFilters() {
    setQInput("");
    setParams(new URLSearchParams());
  }

  const activeCategoryName = categories.find((c) => c.slug === category)?.name;
  const hasFilters = Boolean(category || fulfillment || q);

  return (
    <div className="shop-page">
      <header className="shop-hero">
        <div className="container shop-hero-inner">
          <p className="eyebrow">Media Extensions · Store</p>
          <h1 style={{ fontSize: "clamp(2.4rem, 5.5vw, 3.75rem)", letterSpacing: "-0.04em" }}>
            Find your next tool.
          </h1>
          <p className="lede" style={{ maxWidth: "36rem", marginTop: "0.5rem" }}>
            Browse digital assets, camera equipment, and audio gear. All prices in Ghana cedis.
          </p>
        </div>
      </header>

      <div className="container shop-body">
        <div className="shop-toolbar">
          <div className="shop-search">
            <svg className="shop-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search the store"
              aria-label="Search products"
            />
            {qInput && (
              <button
                className="shop-search-clear"
                onClick={() => setQInput("")}
                aria-label="Clear search"
                type="button"
              >
                <IconClose size={14} />
              </button>
            )}
          </div>

          <div className="shop-toolbar-aside">
            <label className="shop-sort">
              <span className="shop-sort-label">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => updateParam("sort", e.target.value === "featured" ? "" : e.target.value)}
                aria-label="Sort products"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </label>
          </div>
        </div>

        <div className="shop-filters">
          {filterError && <p className="meta" role="status">Category filters are unavailable. <button type="button" className="shop-clear-link" onClick={() => setRetryCount((value) => value + 1)}>Try again</button></p>}
          <div className="shop-filter-group" role="group" aria-label="Product format">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                className={`shop-chip ${fulfillment === opt.value ? "active" : ""}`}
                onClick={() => updateParam("fulfillment", opt.value)}
                aria-pressed={fulfillment === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {categories.length > 0 && (
            <div className="shop-filter-group shop-filter-scroll" role="group" aria-label="Categories">
              <button
                type="button"
                className={`shop-chip ${!category ? "active" : ""}`}
                onClick={() => updateParam("category", "")}
                aria-pressed={!category}
              >
                All categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`shop-chip ${category === c.slug ? "active" : ""}`}
                  onClick={() => updateParam("category", c.slug)}
                  aria-pressed={category === c.slug}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shop-results-meta" role="status" aria-live="polite">
          {loading && <p>Loading products…</p>}
          {!loading && !error && (
            <p>
              {pagination.total === 0
                ? "No products"
                : (
                  <>
                    <strong>{products.length}</strong>
                    {pagination.total > products.length
                      ? ` of ${pagination.total}`
                      : ""}{" "}
                    product{pagination.total === 1 ? "" : "s"}
                    {activeCategoryName ? ` in ${activeCategoryName}` : ""}
                    {q ? ` for “${q}”` : ""}
                  </>
                )}
            </p>
          )}
          {hasFilters && (
            <button type="button" className="shop-clear-link" onClick={resetFilters}>
              Clear filters <IconClose size={12} />
            </button>
          )}
        </div>

        {error ? (
          <div className="shop-empty" role="alert"><h2>Unable to load the catalog</h2><p>{error}</p><button type="button" className="btn btn-primary" onClick={() => setRetryCount((value) => value + 1)}>Try again</button></div>
        ) : loading ? (
          <div className="product-grid shop-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div className="product-skeleton" key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="product-grid shop-grid">
              {products.map((p, index) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickView={(prod) => setQuickViewProduct(prod)}
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                />
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="shop-pagination">
                <button
                  className="btn btn-light btn-sm"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateParam("page", String(Math.max(1, page - 1)))}
                >
                  Previous
                </button>
                <span className="meta">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className="btn btn-light btn-sm"
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => updateParam("page", String(page + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : hasFilters ? (
          <EmptyState title="No matches" description="Try a different search or clear filters to see everything.">
            <button type="button" className="btn btn-dark" onClick={resetFilters}>
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <EmptyState
            title="Store is empty"
            description="The catalog is being updated. You can still book GSM repairs or contact us for wholesale."
            actionLabel="View repair services"
            actionTo="/repairs"
          >
            <div className="shop-empty-icon" style={{ marginInline: "auto" }}>
              <IconPackage size={40} />
            </div>
          </EmptyState>
        )}
      </div>

      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
