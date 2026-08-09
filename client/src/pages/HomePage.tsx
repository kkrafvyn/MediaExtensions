import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, formatGhs } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import type { Product, RepairService } from "../types";

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);

  useEffect(() => {
    api<{ products: Product[] }>("/api/products?featured=true")
      .then((d) => setFeatured(d.products))
      .catch(() => setFeatured([]));
    api<{ services: RepairService[] }>("/api/repairs/services")
      .then((d) => setServices(d.services.slice(0, 4)))
      .catch(() => setServices([]));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden />
        <div className="container hero-copy">
          <p className="brand-mark">Media Extensions</p>
          <p>Creator tools, camera gear, and GSM repairs — designed for Ghana.</p>
          <div className="cta-row">
            <Link to="/shop" className="btn btn-primary">
              Shop now
            </Link>
            <Link to="/repairs" className="btn btn-ghost">
              Book a repair
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Featured</h2>
            <p>Digital downloads and physical gear, ready for your next shoot.</p>
          </div>
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h2>GSM repairs</h2>
            <p>Screens, batteries, ports, and software — book as a guest or drop in.</p>
          </div>
          <div className="product-grid">
            {services.map((s) => (
              <Link key={s.id} to={`/repairs/book?service=${s.id}`} className="product-tile">
                <div className="body">
                  <span className="badge">Repair</span>
                  <h3>{s.name}</h3>
                  <p className="meta">{s.description}</p>
                  <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>
                    {s.pricePesewas != null ? formatGhs(s.pricePesewas) : "Quote on diagnosis"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <Link to="/repairs" className="btn btn-dark">
              See all repairs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
