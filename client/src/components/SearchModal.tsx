import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useFocusTrap } from "../lib/useFocusTrap";
import { IconClose, IconBolt, IconWrench } from "./Icons";
import type { Product } from "../types";

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useFocusTrap(cardRef, isOpen);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      api<{ products: Product[] }>(`/api/products?q=${encodeURIComponent(query.trim())}`)
        .then((data) => {
          setResults(data.products || []);
          setSelectedIndex(0);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation within results
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      goToProduct(results[selectedIndex].slug);
    }
  }

  function goToProduct(slug: string) {
    onClose();
    navigate(`/product/${slug}`);
  }

  function handleQuickSearch(term: string) {
    setQuery(term);
  }

  if (!isOpen) return null;

  return (
    <div
      className={`search-modal-overlay ${isOpen ? "open" : ""}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={cardRef}
        className="search-modal-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="search-modal-input-row">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tools, LUTs, cameras, mics, repairs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <IconClose size={16} />
            </button>
          )}
        </div>

        {/* Results or Quick Links */}
        <div className="search-modal-results">
          {loading && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
              Searching catalog…
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {results.map((product, idx) => {
                const isDigital = product.fulfillment === "digital";
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={product.id}
                    className={`search-result-row ${isSelected ? "selected" : ""}`}
                    onClick={() => goToProduct(product.slug)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="search-result-thumb">
                      <img
                        src={product.images?.[0] || "/images/product-placeholder.svg"}
                        alt={product.name}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.15rem",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: "0.95rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {product.name}
                        </strong>
                        <span
                          className={`badge ${isDigital ? "badge-digital" : "badge-physical"}`}
                          style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem" }}
                        >
                          {isDigital ? "Digital" : "Gear"}
                        </span>
                      </div>
                      <span className="meta" style={{ fontSize: "0.78rem" }}>
                        {product.category?.name || "Product"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        color: "var(--ink)",
                        fontSize: "0.95rem",
                      }}
                    >
                      {formatGhs(product.pricePesewas)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
              <p style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
                No matching creator tools found for "{query}"
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Try searching for "LUT", "Microphone", "Screen", or "Camera".
              </p>
            </div>
          )}

          {!query && (
            <div style={{ padding: "1.25rem 1rem" }}>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--muted)",
                  marginBottom: "0.75rem",
                }}
              >
                Suggested Searches
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {[
                  "Cinematic LUTs",
                  "Sound FX Library",
                  "Creator Presets",
                  "Camera Rigs",
                  "Wireless Mic",
                  "iPhone Screen Swap",
                  "MacBook Battery",
                ].map((tag) => (
                  <button
                    key={tag}
                    className="issue-tag-chip"
                    onClick={() => handleQuickSearch(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div
                style={{
                  marginTop: "1.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  className="btn btn-light btn-sm"
                  onClick={() => {
                    onClose();
                    navigate("/imei-check");
                  }}
                  style={{ gap: "0.4rem" }}
                >
                  <IconBolt size={14} /> Run IMEI Diagnostic
                </button>
                <button
                  className="btn btn-light btn-sm"
                  onClick={() => {
                    onClose();
                    navigate("/repairs/book");
                  }}
                  style={{ gap: "0.4rem" }}
                >
                  <IconWrench size={14} /> Book a Repair
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="search-modal-footer">
          <span>Navigate with <kbd className="nav-search-kbd">↑</kbd> <kbd className="nav-search-kbd">↓</kbd> · Select with <kbd className="nav-search-kbd">Enter</kbd></span>
          <span>Close with <kbd className="nav-search-kbd">Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
