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
import type { Product, RepairService } from "../types";

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ products: Product[] }>("/api/products?featured=true").catch(() => ({ products: [] })),
      api<{ services: RepairService[] }>("/api/repairs/services").catch(() => ({ services: [] })),
    ])
      .then(([prodRes, servRes]) => {
        setFeatured(prodRes.products || []);
        setServices(servRes.services?.slice(0, 3) || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-copy">
          <p className="eyebrow">
            Media Extensions · Accra, Ghana
          </p>
          <h1>
            Creator equipment, digital assets,
            <br />
            and certified device repairs.
          </h1>
          <p className="lede">
            The dedicated store for filmmakers, photographers, and audio engineers in Ghana. Production-ready hardware, instant downloads, and component-level repairs — priced in Ghana Cedis (GH₵).
          </p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link to="/shop" className="btn btn-primary">
              Explore catalog
            </Link>
            <Link to="/repairs" className="btn btn-light">
              Book a repair
            </Link>
          </div>
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
                <strong>Verified Hardware</strong>
                <p>Camera rigs, wireless microphones, studio lights, and cables inspected before dispatch.</p>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <IconWrench size={20} />
              </div>
              <div className="trust-content">
                <strong>Certified Repairs</strong>
                <p>Logic board micro-soldering, OEM screens, and battery replacements with a 90-day warranty.</p>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon">
                <IconPin size={20} />
              </div>
              <div className="trust-content">
                <strong>Accra Studio & Delivery</strong>
                <p>Drop off at our Accra studio or request tracked motorcycle dispatch across Greater Accra.</p>
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
            <h2>Device repairs in Accra</h2>
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
              <h4>Studio Intake</h4>
              <p>Bring it to our Accra studio or arrange motorcycle courier dispatch.</p>
            </div>

            <div className="repair-step-card">
              <div className="repair-step-num">04</div>
              <h4>Track & Collect</h4>
              <p>Follow status updates online and collect with a 90-day service warranty.</p>
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
