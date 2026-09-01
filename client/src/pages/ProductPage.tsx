import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../types";

export function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { refreshCart } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "guarantee">("overview");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setProduct(null);
    setError("");
    api<{ product: Product }>(`/api/products/${slug}`)
      .then((d) => {
        setProduct(d.product);
        setSelectedImage(d.product.images?.[0] || "/images/product-placeholder.svg");
        // Fetch related products
        api<{ products: Product[] }>(`/api/products?limit=4`)
          .then((res) => setRelated(res.products.filter((p) => p.slug !== slug).slice(0, 3)))
          .catch(() => setRelated([]));
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  async function addToBag(directCheckout = false) {
    if (!product) return;
    setAdding(true);
    setError("");
    try {
      await api("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      await refreshCart();
      toast(`Added ${quantity} × ${product.name} to bag`);
      if (directCheckout) {
        navigate("/checkout");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to bag");
    } finally {
      setAdding(false);
    }
  }

  if (error && !product) {
    return (
      <div className="page container">
        <div className="alert-banner">{error}</div>
        <Link to="/shop" className="btn btn-dark" style={{ marginTop: "1rem" }}>
          ← Back to Shop
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page container">
        <div className="product-skeleton" style={{ minHeight: "480px" }} />
      </div>
    );
  }

  const isDigital = product.fulfillment === "digital";
  const isPhysical = product.fulfillment === "physical";
  const images = product.images?.length ? product.images : ["/images/product-placeholder.svg"];
  const inStock = isDigital || product.stock > 0;
  const lowStock = isPhysical && product.stock > 0 && product.stock <= 5;
  const maxQty = isDigital ? 99 : Math.max(1, product.stock);

  return (
    <div className="page container">
      {/* Breadcrumbs */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.75rem", fontSize: "0.88rem", color: "var(--muted)" }}>
        <Link to="/shop" style={{ color: "var(--muted)" }}>Store</Link>
        <span>/</span>
        <span>{product.category?.name || "Products"}</span>
        <span>/</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{product.name}</span>
      </div>

      <div className="product-detail-layout">
        {/* Left Column: Gallery Card */}
        <div>
          <div className="product-gallery-card">
            <img
              src={selectedImage || images[0]}
              alt={product.name}
            />
          </div>

          {images.length > 1 && (
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", justifyContent: "center" }}>
              {images.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(imgUrl)}
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface)",
                    border: `2px solid ${selectedImage === imgUrl ? "var(--accent)" : "var(--line)"}`,
                    padding: "0.3rem",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <img src={imgUrl} alt={`Thumbnail ${i + 1}`} style={{ maxHeight: "100%", objectFit: "contain" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Actions */}
        <div className="product-info-panel">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <span
                className={`badge ${
                  isDigital ? "badge-digital" : isPhysical ? "badge-physical" : "badge-both"
                }`}
              >
                {isDigital ? "⚡ Instant Download" : isPhysical ? "📦 Physical Gear" : "🎁 Complete Bundle"}
              </span>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: inStock ? (lowStock ? "var(--gold)" : "var(--emerald)") : "var(--danger)",
                  fontWeight: 700,
                }}
              >
                {isDigital
                  ? "● Instant Digital Delivery"
                  : inStock
                    ? lowStock
                      ? `● Only ${product.stock} left in stock`
                      : `● In Stock (${product.stock} available)`
                    : "● Out of Stock"}
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(2rem, 3.8vw, 2.9rem)", marginBottom: "0.5rem" }}>
              {product.name}
            </h1>

            <div className="product-price-hero">{formatGhs(product.pricePesewas)}</div>
          </div>

          <p className="lede" style={{ marginBottom: "0.5rem" }}>
            {product.description}
          </p>

          {/* Key Feature Highlights */}
          <div className="feature-pill-list">
            {isDigital && (
              <>
                <div className="feature-pill-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Instant .ZIP key delivered to your email + saved in your Account Vault</span>
                </div>
                <div className="feature-pill-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Full commercial royalty-free license for client videos & social media</span>
                </div>
                <div className="feature-pill-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Compatible with Premiere Pro, DaVinci Resolve, Final Cut Pro & CapCut</span>
                </div>
              </>
            )}

            {isPhysical && (
              <>
                <div className="feature-pill-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Accra pickup available or nationwide courier delivery (24–48h)</span>
                </div>
                <div className="feature-pill-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>100% Genuine product tested by Media Extensions technical staff</span>
                </div>
              </>
            )}

            <div className="feature-pill-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Protected checkout via MTN Mobile Money, Telecel Cash & Paystack</span>
            </div>
          </div>

          {error && <div className="alert-banner">{error}</div>}

          {/* Action Row */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap" }}>
            <div className="qty-control" style={{ height: "3.2rem" }}>
              <button
                className="qty-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="qty-val" style={{ minWidth: "2.2rem", textAlign: "center" }}>
                {quantity}
              </span>
              <button
                className="qty-btn"
                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                aria-label="Increase quantity"
                disabled={!inStock || quantity >= maxQty}
              >
                +
              </button>
            </div>

            <button
              className="btn btn-primary"
              style={{ flex: 1, minWidth: "180px", height: "3.2rem", fontSize: "1.05rem" }}
              disabled={adding || !inStock}
              onClick={() => addToBag(false)}
            >
              {adding ? "Adding to Bag…" : "Add to Bag"}
            </button>

            <button
              className="btn btn-dark"
              style={{ height: "3.2rem" }}
              disabled={adding || !inStock}
              onClick={() => addToBag(true)}
            >
              Buy Now
            </button>
          </div>

          {/* Tabs Details Section */}
          <div style={{ marginTop: "1.5rem" }}>
            <div className="pdp-tabs">
              <button
                className={`pdp-tab-btn ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                What's Included
              </button>
              <button
                className={`pdp-tab-btn ${activeTab === "specs" ? "active" : ""}`}
                onClick={() => setActiveTab("specs")}
              >
                Compatibility
              </button>
              <button
                className={`pdp-tab-btn ${activeTab === "guarantee" ? "active" : ""}`}
                onClick={() => setActiveTab("guarantee")}
              >
                Warranty & Returns
              </button>
            </div>

            <div className="pdp-tab-content">
              {activeTab === "overview" && (
                <div>
                  <p style={{ marginBottom: "0.75rem" }}>
                    When you purchase <strong>{product.name}</strong>, you receive:
                  </p>
                  <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                    <li>Full high-resolution master asset files (.CUBE / .WAV / Hardware component).</li>
                    <li>Step-by-step setup and installation guide PDF.</li>
                    <li>Lifetime access from your Media Extensions account downloads vault.</li>
                    <li>Direct customer support via WhatsApp and email.</li>
                  </ul>
                </div>
              )}

              {activeTab === "specs" && (
                <div>
                  <p style={{ marginBottom: "0.75rem" }}>
                    Engineered for professional production environments:
                  </p>
                  <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                    <li><strong>Video Editors:</strong> Adobe Premiere Pro, DaVinci Resolve Studio, Final Cut Pro X, Avid, CapCut Desktop.</li>
                    <li><strong>Audio / Music:</strong> Logic Pro, FL Studio, Ableton Live, Adobe Audition.</li>
                    <li><strong>OS Platforms:</strong> macOS (Apple Silicon M1/M2/M3/M4 & Intel), Windows 10/11, iPadOS.</li>
                  </ul>
                </div>
              )}

              {activeTab === "guarantee" && (
                <div>
                  <p style={{ marginBottom: "0.75rem" }}>
                    Our satisfaction and reliability commitment:
                  </p>
                  <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                    <li><strong>Digital Products:</strong> If a file is defective or incompatible, our support team will replace or resolve it immediately.</li>
                    <li><strong>Physical Gear:</strong> 7-day hassle-free replacement on manufacturer defects + manufacturer warranty.</li>
                    <li><strong>Repairs:</strong> 90-day comprehensive guarantee on all replacement displays, batteries, and logic board services.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {related.length > 0 && (
        <div style={{ marginTop: "5rem", paddingTop: "3rem", borderTop: "1px solid var(--line)" }}>
          <div className="section-head" style={{ marginBottom: "2rem" }}>
            <p className="eyebrow">
              <span className="pulse-dot" />
              Frequently Paired
            </p>
            <h2>Complementary Tools for Your Kit</h2>
          </div>

          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Sticky Mobile Purchase Bar */}
      <div className="sticky-buy-bar">
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>{product.name}</div>
          <div style={{ color: "var(--accent)", fontWeight: 800, fontSize: "1.1rem", fontFamily: "var(--font-display)" }}>
            {formatGhs(product.pricePesewas)}
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          disabled={adding || !inStock}
          onClick={() => addToBag(false)}
          style={{ padding: "0.6rem 1.4rem" }}
        >
          {adding ? "Adding…" : "Add to Bag"}
        </button>
      </div>
    </div>
  );
}
