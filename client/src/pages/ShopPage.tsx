import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { IconClose, IconPackage } from "../components/Icons";
import type { Category, Product } from "../types";

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";

const FORMAT_OPTIONS = [
  { value: "", label: "All" },
  { value: "digital", label: "Digital" },
  { value: "physical", label: "Physical" },
  { value: "both", label: "Bundles" },
] as const;

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

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === "featured") {
      list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
    } else if (sortBy === "price-asc") {
      list.sort((a, b) => a.pricePesewas - b.pricePesewas);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.pricePesewas - a.pricePesewas);
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [products, sortBy]);

  const activeCategoryName = categories.find((c) => c.slug === category)?.name;
  const hasFilters = Boolean(category || fulfillment || q);

  return (
    <div className="shop-page">
      <header className="shop-hero">
        <div className="container shop-hero-inner">
          <p className="eyebrow">Media Extensions · Store</p>
          <h1>Shop.</h1>
          <p className="lede">
            Digital downloads and physical gear for creators — priced in Ghana cedis.
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
                onChange={(e) => setSortBy(e.target.value as SortOption)}
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
          <div className="shop-filter-group" role="group" aria-label="Product format">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                className={`shop-chip ${fulfillment === opt.value ? "active" : ""}`}
                onClick={() => updateParam("fulfillment", opt.value)}
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
              >
                All categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`shop-chip ${category === c.slug ? "active" : ""}`}
                  onClick={() => updateParam("category", c.slug)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shop-results-meta">
          {!loading && !error && (
            <p>
              {pagination.total === 0
                ? "No products"
                : (
                  <>
                    <strong>{sortedProducts.length}</strong>
                    {pagination.total > sortedProducts.length
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
          <div className="alert-banner">{error}</div>
        ) : loading ? (
          <div className="product-grid shop-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div className="product-skeleton" key={i} />
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <>
            <div className="product-grid shop-grid">
              {sortedProducts.map((p, index) => (
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="shop-empty">
            <div className="shop-empty-icon">
              <IconPackage size={40} />
            </div>
            <h2>{hasFilters ? "No matches" : "Store is empty"}</h2>
            <p>
              {hasFilters
                ? "Try a different search or clear filters to see everything."
                : "Products added in the staff console will appear here."}
            </p>
            {hasFilters ? (
              <button className="btn btn-dark" type="button" onClick={resetFilters}>
                Clear filters
              </button>
            ) : (
              <Link to="/" className="btn btn-light">
                Back home
              </Link>
            )}
          </div>
        )}
      </div>

      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
