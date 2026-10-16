import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import {
  IconBolt,
  IconWrench,
  IconCamera,
  IconPin,
  IconArrowRight,
} from "../components/Icons";
import { PageMeta } from "../components/PageMeta";
import type { Product, RepairService } from "../types";

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Media Extensions",
  description: "Digital tools, camera gear, and GSM repairs in Koforidua, Ghana.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Koforidua",
    addressCountry: "GH",
  },
  priceRange: "GHS",
  url: typeof window !== "undefined" ? window.location.origin : "",
};

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(false);
  const [servicesError, setServicesError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFeaturedError(false);
    setServicesError(false);
    Promise.allSettled([
      api<{ products: Product[] }>("/api/products?featured=true"),
      api<{ services: RepairService[] }>("/api/repairs/services"),
    ])
      .then(([prodRes, servRes]) => {
        if (cancelled) return;
        setFeaturedError(prodRes.status === "rejected");
        setServicesError(servRes.status === "rejected");
        setFeatured(prodRes.status === "fulfilled" ? prodRes.value.products || [] : []);
        setServices(servRes.status === "fulfilled" ? servRes.value.services?.slice(0, 3) || [] : []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [retryCount]);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({ ...HOME_JSON_LD, url: window.location.origin });
    script.id = "home-json-ld";
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <>
      <PageMeta
        title="Shop & repairs"
        description="Presets, plugins, camera gear, and GSM repairs in Koforidua. Prices in Ghana cedis."
      />
      <section className="hero">
        <div className="container hero-layout">
        <div className="hero-copy">
          <p className="eyebrow">Media Extensions · Koforidua, Ghana</p>
          <h1 className="hero-title">
            Tools for your<br />next creation.
          </h1>

          <p className="lede hero-lede">
            Digital assets, camera and audio equipment, and device repairs in Koforidua. Shop in Ghana cedis.
          </p>

          <div className="cta-row hero-cta-row">
            <Link to="/shop" className="btn btn-primary">
              Shop the catalog <IconArrowRight size={16} />
            </Link>
            <Link to="/repairs" className="btn btn-light">
              Book a repair
            </Link>
          </div>
          <Link to="/track" className="hero-track-link">Already ordered? Track your order <IconArrowRight size={14} /></Link>
        </div>
        <figure className="hero-visual">
          <img src="/images/carousel/carousel-camera.jpg" alt="Camera and lens on a studio desk" width="1280" height="720" fetchPriority="high" />
          <figcaption><span>From the first frame to the final edit.</span><Link to="/shop?fulfillment=physical">Explore gear <IconArrowRight size={16} /></Link></figcaption>
        </figure>
        </div>
      </section>

      {/* Value Proposition Strip */}
      <section className="trust-section">
        <div className="container">
          <div className="trust-grid-modern">
            <div className="trust-card">
              <div className="trust-icon">
                <IconBolt size={20} />
              </div>
              <div className="trust-content">
                <strong>Instant Downloads</strong>
                <p>Color grading LUTs, Lightroom profiles, and sound effects ready right after checkout.</p>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <IconCamera size={20} />
              </div>
              <div className="trust-content">
                <strong>Camera & Audio Gear</strong>
                <p>Rigs, microphones, lighting, and accessories for your setup.</p>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <IconWrench size={20} />
              </div>
              <div className="trust-content">
                <strong>Device Repairs</strong>
                <p>Screen, battery, and board repairs. Book an assessment online.</p>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <IconPin size={20} />
              </div>
              <div className="trust-content">
                <strong>Koforidua Pickup & Delivery</strong>
                <p>Visit us at Kumasi Station, Koforidua, or arrange delivery across Ghana.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Explorer */}
      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container">
          <div className="section-head" style={{ textAlign: "center", alignItems: "center" }}>
            <p className="eyebrow">Catalog</p>
            <h2>Shop by category</h2>
          </div>

          <div className="category-grid">
            <Link to="/shop?fulfillment=digital" className="category-card">
              <div className="category-card-icon">
                <IconBolt size={22} />
              </div>
              <h3>Digital Assets</h3>
              <p>
                Professional color grading LUTs, Lightroom presets, audio sound libraries, and project templates.
              </p>
              <span className="category-card-cta">
                Browse digital <IconArrowRight size={14} />
              </span>
            </Link>

            <Link to="/shop?fulfillment=physical" className="category-card">
              <div className="category-card-icon">
                <IconCamera size={22} />
              </div>
              <h3>Hardware & Gear</h3>
              <p>
                Camera rigs, wireless microphones, studio monitors, lighting panels, and production accessories.
              </p>
              <span className="category-card-cta">
                Browse gear <IconArrowRight size={14} />
              </span>
            </Link>

            <Link to="/repairs" className="category-card">
              <div className="category-card-icon">
                <IconWrench size={22} />
              </div>
              <h3>Device Repairs</h3>
              <p>
                Screen replacements, battery servicing, liquid damage recovery, and component diagnostics.
              </p>
              <span className="category-card-cta">
                View repair services <IconArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center", alignItems: "center" }}>
            <p className="eyebrow">Storefront</p>
            <h2>Featured products</h2>
          </div>

          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 4 }, (_, i) => (
                <div className="product-skeleton" key={i} />
              ))}
            </div>
          ) : featuredError ? (
            <div className="home-load-error" role="alert"><p>We couldn’t load featured products.</p><button className="btn btn-light btn-sm" type="button" onClick={() => setRetryCount((value) => value + 1)}>Try again</button></div>
          ) : featured.length ? (
            <div className="product-grid">
              {featured.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty panel" style={{ maxWidth: "26rem", margin: "0 auto", textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
                Products will appear here once published.
              </p>
              <Link to="/repairs" className="btn btn-primary">
                Book a repair
              </Link>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link to="/shop" className="btn btn-light">
              Browse full catalog
              <IconArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Repair Service Center */}
      <section className="section repair-section-dark">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center", alignItems: "center" }}>
            <p className="eyebrow">Service Center</p>
            <h2>Device repairs in Koforidua</h2>
            <p style={{ color: "var(--muted)", maxWidth: "34rem" }}>
              Drop off at our studio or book online to track diagnostic and repair progress.
            </p>
          </div>

          {/* 4-Step Repair Process */}
          <div className="repair-steps-grid">
            <div className="repair-step-card">
              <div className="repair-step-num">01</div>
              <h4>Select Device</h4>
              <p>Choose your model and describe the issue you are experiencing.</p>
            </div>

            <div className="repair-step-card">
              <div className="repair-step-num">02</div>
              <h4>Upfront Estimate</h4>
              <p>Receive clear diagnostic pricing before any repair work starts.</p>
            </div>

            <div className="repair-step-card">
              <div className="repair-step-num">03</div>
              <h4>Drop Off or Send</h4>
              <p>Bring it to our Kumasi Station shop or arrange courier delivery.</p>
            </div>

            <div className="repair-step-card">
              <div className="repair-step-num">04</div>
              <h4>Track & Collect</h4>
              <p>Follow status updates online and collect when your device is ready.</p>
            </div>
          </div>

          {services.length > 0 ? (
            <div className="service-grid-modern">
              {services.map((s) => (
                <div key={s.id} className="service-card-modern">
                  <div>
                    <h3>{s.name}</h3>
                    <p className="service-desc">{s.description}</p>
                  </div>
                  <div className="service-card-price-row">
                    <span className="service-price-tag">
                      {s.pricePesewas != null ? formatGhs(s.pricePesewas) : "Diagnosed on intake"}
                    </span>
                    <Link to={`/repairs/book?service=${s.id}`} className="btn btn-primary btn-sm">
                      Book
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && servicesError ? (
            <div className="home-load-error" role="alert"><p>We couldn’t load repair services.</p><button className="btn btn-light btn-sm" type="button" onClick={() => setRetryCount((value) => value + 1)}>Try again</button></div>
          ) : !loading ? (
            <div className="empty" style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ color: "var(--muted)" }}>Repair services will appear here once published.</p>
            </div>
          ) : null}

          <div className="cta-row" style={{ justifyContent: "center", marginTop: "2rem" }}>
            <Link to="/repairs/book" className="btn btn-primary">
              Book a repair
            </Link>
            <Link to="/imei-check" className="btn btn-light">
              Check IMEI format
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
