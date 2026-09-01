import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
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
      <section className="hero">
        <div className="container hero-copy">
          <p className="eyebrow">Media Extensions · Ghana</p>
          <h1>
            Creator tools.
            <br />
            Camera gear.
            <br />
            Device repairs.
          </h1>
          <p className="lede">
            Digital downloads, physical equipment, and GSM servicing — priced in Ghana cedis, built for makers.
          </p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link to="/shop" className="btn btn-primary">
              Shop the store
            </Link>
            <Link to="/repairs" className="btn btn-light">
              Book a repair
            </Link>
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="container trust-grid-modern">
          <div className="trust-card">
            <strong>Instant downloads</strong>
            <p>LUTs, presets, and templates delivered after payment is confirmed.</p>
          </div>
          <div className="trust-card">
            <strong>Nationwide delivery</strong>
            <p>Express courier across all 16 regions. Accra pickup available.</p>
          </div>
          <div className="trust-card">
            <strong>GSM repair studio</strong>
            <p>Screen, battery, and board-level repairs with a 90-day warranty.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center", alignItems: "center" }}>
            <p className="eyebrow">Featured</p>
            <h2>Popular right now.</h2>
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
            <div className="empty">
              <p>Products will appear here once added in the staff console.</p>
              <Link to="/shop" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                Browse shop
              </Link>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link to="/shop" className="btn btn-light">
              View all products
            </Link>
          </div>
        </div>
      </section>

      <section className="section repair-section-dark">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center", alignItems: "center" }}>
            <p className="eyebrow">GSM Repairs</p>
            <h2>Expert device service in Accra.</h2>
            <p>Book online, drop off at our studio, and track progress from your account.</p>
          </div>

          <div className="repair-steps-grid">
            {[
              { n: "1", h: "Book", p: "Choose a service and describe the issue." },
              { n: "2", h: "Drop off", p: "Visit our Accra studio or arrange courier pickup." },
              { n: "3", h: "Repair", p: "OEM parts, diagnostics, and quality checks." },
              { n: "4", h: "Collect", p: "Pick up your device with warranty coverage." },
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
                <div key={s.id} className="service-card-modern panel">
                  <h3>{s.name}</h3>
                  <p className="service-desc">{s.description}</p>
                  <div className="service-card-price-row">
                    <span className="service-price-tag">
                      {s.pricePesewas != null ? formatGhs(s.pricePesewas) : "Quote on request"}
                    </span>
                    <Link to={`/repairs/book?service=${s.id}`} className="btn btn-primary btn-sm">
                      Book
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

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
