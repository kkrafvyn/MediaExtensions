import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import type { Product, RepairService } from "../types";

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "digital" | "physical">("all");
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    Promise.all([
      api<{ products: Product[] }>("/api/products?featured=true").catch(() => ({ products: [] })),
      api<{ services: RepairService[] }>("/api/repairs/services").catch(() => ({ services: [] })),
    ])
      .then(([prodRes, servRes]) => {
        setFeatured(prodRes.products || []);
        setServices(servRes.services?.slice(0, 4) || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = featured.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "digital") return p.fulfillment === "digital" || p.fulfillment === "both";
    if (activeTab === "physical") return p.fulfillment === "physical" || p.fulfillment === "both";
    return true;
  });

  const faqs = [
    {
      q: "How do instant digital downloads work?",
      a: "As soon as your payment is confirmed (via MTN MoMo, Telecel Cash, or Paystack), your digital .ZIP download keys are generated instantly. You receive direct links on screen, in your email receipt, and stored in your Account Downloads Vault forever.",
    },
    {
      q: "What payment methods are supported in Ghana?",
      a: "We accept MTN Mobile Money, Telecel Cash, AT Money, Debit/Credit cards (Visa & Mastercard via Paystack), Direct Bank Transfer, and In-Store Cash or MoMo on Accra pickup.",
    },
    {
      q: "How fast is physical gear delivery across Ghana?",
      a: "Accra deliveries are dispatched same-day or within 24 hours. Deliveries to Kumasi, Takoradi, Tamale, and all 16 regions take 24–48 hours via registered express courier.",
    },
    {
      q: "What is included with your GSM hardware repairs?",
      a: "All repairs use genuine OEM components, undergo multi-point quality assurance diagnostics, and include our full 90-day parts and labor warranty.",
    },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-media" aria-hidden="true" />

        <div className="container hero-copy">
          <div className="eyebrow eyebrow-pill" style={{ marginBottom: "1.25rem" }}>
            <span className="pulse-dot" />
            <span>Built for the craft behind the work</span>
          </div>

          <h1>
            Media
            <span className="hero-word-accent">Extensions</span>
          </h1>

          <p>
            Curated creator tools, cinematic presets, camera accessories, and expert smartphone &amp; hardware repairs — crafted for makers across Ghana.
          </p>

          <div className="cta-row">
            <Link to="/shop" className="btn btn-primary" style={{ fontSize: "1rem", padding: ".9rem 2rem" }}>
              Explore Store <span>→</span>
            </Link>
            <Link to="/repairs" className="btn btn-ghost">
              Book Device Repair
            </Link>
          </div>

        </div>

        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      </section>

      {/* ── Trust Strip ── */}
      <section className="trust-section">
        <div className="container trust-grid-modern">
          <div className="trust-card">
            <div className="trust-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="trust-content">
              <strong>Instant Digital Delivery</strong>
              <p>LUTs, sound packs &amp; templates delivered immediately post-payment.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="trust-content">
              <strong>Express Ghana Delivery</strong>
              <p>Same-day dispatch in Accra and fast couriers to all 16 regions.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div className="trust-content">
              <strong>Certified GSM Studio</strong>
              <p>Genuine parts for iPhone, Samsung, Mac &amp; camera gear with 90-day warranty.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div className="trust-content">
              <strong>MoMo &amp; Paystack</strong>
              <p>Safe payments via MTN MoMo, Telecel Cash, Bank Wire &amp; Cards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="section">
        <div className="container">
          <div className="section-head-row">
            <div className="section-head" style={{ marginBottom: "1rem" }}>
              <p className="eyebrow">
                <span className="pulse-dot" />
                Featured Creator Drops
              </p>
              <h2>Selected for your next idea.</h2>
              <p>Tested on real commercial sets, music videos, and YouTube productions.</p>
            </div>

            <div className="category-pills-scroll" style={{ marginBottom: "1rem" }}>
              <button
                className={`filter-pill ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All Curations ({featured.length})
              </button>
              <button
                className={`filter-pill ${activeTab === "digital" ? "active" : ""}`}
                onClick={() => setActiveTab("digital")}
              >
                ⚡ Digital Downloads
              </button>
              <button
                className={`filter-pill ${activeTab === "physical" ? "active" : ""}`}
                onClick={() => setActiveTab("physical")}
              >
                📦 Physical Gear
              </button>
            </div>
          </div>

          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 4 }, (_, i) => (
                <div className="product-skeleton" key={i} />
              ))}
            </div>
          ) : filteredProducts.length ? (
            <div className="product-grid">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickView={(prod) => setQuickViewProduct(prod)}
                />
              ))}
            </div>
          ) : (
            <div className="empty">
              <p>No products found in this filter right now.</p>
              <Link to="/shop" className="btn btn-dark" style={{ marginTop: "1rem" }}>
                Browse Full Catalog
              </Link>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "3.5rem" }}>
            <Link to="/shop" className="btn btn-dark">
              View All Products <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── GSM Repair Studio ── */}
      <section className="section repair-section-dark">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow" style={{ color: "#f6c258" }}>
              <span className="pulse-dot" style={{ background: "#f6c258" }} />
              Certified GSM &amp; Hardware Studio
            </p>
            <h2>Precision device recovery.</h2>
            <p>From cracked displays and exhausted batteries to water damage treatment and logic board diagnostics.</p>
          </div>

          <div className="repair-steps-grid">
            {[
              { n: "01", h: "Book Online or Walk In", p: "Select your service, describe your device fault, and get an upfront price estimate." },
              { n: "02", h: "Drop Off or Dispatch", p: "Bring your device to our Accra studio or request courier pickup from your location." },
              { n: "03", h: "Master Tech Repair", p: "Trained technicians perform micro-soldering, OEM component replacement, and rigorous QA." },
              { n: "04", h: "Collect & Create", p: "Get notified by SMS/WhatsApp, track real-time progress, and collect with a 90-day warranty." },
            ].map((step) => (
              <div className="repair-step-card" key={step.n}>
                <span className="repair-step-num">{step.n}</span>
                <h4>{step.h}</h4>
                <p>{step.p}</p>
              </div>
            ))}
          </div>

          {services.length > 0 && (
            <div className="service-grid-modern">
              {services.map((s) => (
                <div key={s.id} className="service-card-modern">
                  <span className="badge badge-repair">Certified Service</span>
                  <h3>{s.name}</h3>
                  <p className="service-desc">{s.description}</p>
                  <div className="service-card-price-row">
                    <div>
                      <span style={{ fontSize: ".73rem", color: "rgba(255,255,255,.55)", display: "block" }}>Starting from</span>
                      <span className="service-price-tag">
                        {s.pricePesewas != null ? formatGhs(s.pricePesewas) : "Custom Quote"}
                      </span>
                    </div>
                    <Link to={`/repairs/book?service=${s.id}`} className="btn btn-primary btn-sm">
                      Book Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* IMEI Banner */}
          <div
            style={{
              marginTop: "3rem",
              padding: "1.75rem 2rem",
              background: "rgba(255,255,255,.05)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid rgba(255,255,255,.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1.25rem",
            }}
          >
            <div>
              <h4 style={{ color: "#fff", fontSize: "1.15rem", marginBottom: ".25rem" }}>
                ⚡ Have a device with unknown specs or locked IMEI?
              </h4>
              <p style={{ color: "rgba(255,255,255,.65)", fontSize: ".88rem", margin: 0 }}>
                Run your 15-digit IMEI through our diagnostic tool for instant carrier, model &amp; blacklist checks.
              </p>
            </div>
            <Link to="/imei-check" className="btn btn-ghost">Check IMEI Now →</Link>
          </div>

          <div style={{ marginTop: "2.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link to="/repairs/book" className="btn btn-primary">Book a Repair Now</Link>
            <Link to="/repairs" className="btn btn-ghost">Explore All Repair Services</Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section">
        <div className="container" style={{ maxWidth: "800px" }}>
          <div className="section-head" style={{ textAlign: "center", alignItems: "center" }}>
            <p className="eyebrow">
              <span className="pulse-dot" />
              Frequently Asked Questions
            </p>
            <h2>Everything you need to know</h2>
            <p>Answers to common questions about downloads, dispatch, and repairs.</p>
          </div>

          <div className="stack" style={{ gap: ".6rem" }}>
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className={`faq-item${isOpen ? " open" : ""}`}
                >
                  <button
                    className="faq-trigger"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <strong>{faq.q}</strong>
                    <span className="faq-icon">+</span>
                  </button>
                  {isOpen && (
                    <p className="faq-answer">{faq.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </>
  );
}
