import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "./Toast";
import type { SiteMeta } from "../types";

export function Footer() {
  const year = new Date().getFullYear();
  const [meta, setMeta] = useState<SiteMeta | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    api<SiteMeta>("/api/meta")
      .then(setMeta)
      .catch(() => undefined);
  }, []);

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
          <Link to="/" className="brand-link">
            Media Extensions
          </Link>
          <p>Digital tools, camera gear, and GSM repairs for creators in Ghana.</p>
          {(meta?.storePhone || meta?.storeEmail) && (
            <p className="meta" style={{ marginTop: "0.75rem" }}>
              {meta.storePhone && <span>{meta.storePhone}</span>}
              {meta.storePhone && meta.storeEmail && " · "}
              {meta.storeEmail && <span>{meta.storeEmail}</span>}
            </p>
          )}
          <form onSubmit={onSubscribe} style={{ marginTop: "1.25rem", maxWidth: "20rem" }}>
            <label className="meta" style={{ marginBottom: "0.35rem" }}>
              Updates
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="email"
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
        <span>© {year} Media Extensions · Accra, Ghana</span>
        <span className="meta">MoMo · Bank transfer · Paystack</span>
      </div>
    </footer>
  );
}
