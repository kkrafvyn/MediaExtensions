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
      toast("Subscribed for creator drops & discounts!");
      setNewsletterEmail("");
    } catch {
      toast("Could not subscribe right now. Please try again.");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand-link" style={{ color: "#ffffff" }}>
            <span style={{ color: "#ffffff", fontWeight: 800 }}>Media Extensions</span>
          </Link>
          <p>
            The creator workspace for Ghana — digital color grades, audio tools, camera gear, and certified GSM device repairs.
          </p>

          <form onSubmit={onSubscribe} style={{ marginTop: "1.5rem", maxWidth: "22rem" }}>
            <label style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.7)", marginBottom: "0.4rem" }}>
              Get creator assets & gear updates:
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  padding: "0.65rem 0.95rem",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-full)",
                }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ padding: "0.65rem 1.2rem", borderRadius: "var(--radius-full)" }}
                disabled={subscribing}
              >
                {subscribing ? "…" : "Join"}
              </button>
            </div>
          </form>

          {(meta?.storePhone || meta?.storeEmail || meta?.storeWhatsApp) && (
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
              {meta.storePhone && (
                <div style={{ display: "flex", gap: "0.5rem", color: "rgba(255,255,255,0.8)" }}>
                  <span>📞</span> <span>{meta.storePhone}</span>
                </div>
              )}
              {meta.storeWhatsApp && (
                <div style={{ display: "flex", gap: "0.5rem", color: "rgba(255,255,255,0.8)" }}>
                  <span>💬</span> <span>WhatsApp: {meta.storeWhatsApp}</span>
                </div>
              )}
              {meta.storeEmail && (
                <div style={{ display: "flex", gap: "0.5rem", color: "rgba(255,255,255,0.8)" }}>
                  <span>✉️</span> <span>{meta.storeEmail}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h3>Store & Gear</h3>
          <Link to="/shop">All Products</Link>
          <Link to="/shop?fulfillment=digital">Digital Downloads</Link>
          <Link to="/shop?fulfillment=physical">Camera & Rig Gear</Link>
          <Link to="/shop?fulfillment=both">Creator Bundles</Link>
          <Link to="/cart">My Shopping Bag</Link>
        </div>

        <div>
          <h3>GSM Repairs</h3>
          <Link to="/repairs">Repair Studio Overview</Link>
          <Link to="/imei-check">IMEI Device Checker</Link>
          <Link to="/repairs/book">Book a Repair</Link>
          <Link to="/track">Track Repair / Order</Link>
          <Link to="/pickup">Accra Pickup Station</Link>
          <Link to="/shipping">Delivery Across Ghana</Link>
        </div>

        <div>
          <h3>Support & Info</h3>
          <Link to="/track">Track Order Status</Link>
          <Link to="/faq">Frequently Asked Questions</Link>
          <Link to="/about">About Media Extensions</Link>
          <Link to="/contact">Contact Support</Link>
          <Link to="/returns">Returns & Warranty</Link>
        </div>

        <div>
          <h3>Account & Legal</h3>
          <Link to="/account">Customer Account</Link>
          <Link to="/login">Sign In</Link>
          <Link to="/register">Create Account</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {year} Media Extensions Ltd. · Accra, Ghana</span>
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>
          MTN MoMo · Telecel Cash · AT Money · Paystack · Visa/MC
        </span>
      </div>
    </footer>
  );
}
