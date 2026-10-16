import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useSiteMeta } from "../context/SiteMetaContext";
import { whatsappUrl } from "../lib/whatsapp";
import { toast } from "./Toast";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  const year = new Date().getFullYear();
  const { meta } = useSiteMeta();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const waLink = whatsappUrl(meta?.storeWhatsApp ?? meta?.store?.whatsapp);

  async function onSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!newsletterEmail) return;
    setSubscribing(true);
    try {
      await api("/api/contact/newsletter", {
        method: "POST",
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      toast("You're on the list.");
      setNewsletterEmail("");
    } catch {
      toast("Could not subscribe. Try again later.");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand-link" style={{ marginBottom: "0.5rem", display: "inline-flex" }}>
            <BrandLogo size="md" />
          </Link>
          <p>Digital tools, camera gear, and GSM repairs for creators in Ghana.</p>
          {(meta?.storePhone || meta?.storeEmail || waLink) && (
            <p className="meta" style={{ marginTop: "0.75rem" }}>
              {meta?.storePhone && <span>{meta.storePhone}</span>}
              {meta?.storePhone && (meta?.storeEmail || waLink) && " · "}
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              )}
              {waLink && meta?.storeEmail && " · "}
              {meta?.storeEmail && <span>{meta.storeEmail}</span>}
            </p>
          )}
          <form onSubmit={onSubscribe} style={{ marginTop: "1.25rem", maxWidth: "20rem" }}>
            <label htmlFor="newsletter-email" className="meta" style={{ marginBottom: "0.35rem" }}>
              Product and store updates
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                id="newsletter-email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={subscribing}>
                {subscribing ? "…" : "Join"}
              </button>
            </div>
          </form>
        </div>

        <div>
          <h3>Store</h3>
          <Link to="/shop">All products</Link>
          <Link to="/shop?fulfillment=digital">Digital</Link>
          <Link to="/shop?fulfillment=physical">Physical</Link>
          <Link to="/cart">Bag</Link>
        </div>

        <div>
          <h3>Repairs</h3>
          <Link to="/repairs">Overview</Link>
          <Link to="/repairs/book">Book</Link>
          <Link to="/imei-check">IMEI check</Link>
          <Link to="/track">Track</Link>
        </div>

        <div>
          <h3>Help</h3>
          <Link to="/shipping">Shipping</Link>
          <Link to="/returns">Returns</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div>
          <h3>Legal</h3>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/pickup">Pickup</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {year} Media Extensions · Koforidua, Ghana</span>
      </div>
    </footer>
  );
}
