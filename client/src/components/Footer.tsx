import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { SiteMeta } from "../types";

export function Footer() {
  const year = new Date().getFullYear();
  const [meta, setMeta] = useState<SiteMeta | null>(null);

  useEffect(() => {
    api<SiteMeta>("/api/meta")
      .then(setMeta)
      .catch(() => undefined);
  }, []);

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand brand-link">
            <img src="/logo.svg" alt="Media Extensions" className="brand-logo brand-logo-footer" />
          </Link>
          <p>
            Digital tools, camera gear, and GSM repairs for creators in Accra and across Ghana.
          </p>
          {(meta?.storePhone || meta?.storeEmail || meta?.storeWhatsApp) && (
            <p className="meta" style={{ marginTop: "0.75rem" }}>
              {meta.storePhone && <span>{meta.storePhone}</span>}
              {meta.storeWhatsApp && (
                <span>
                  {meta.storePhone ? " · " : ""}
                  WhatsApp {meta.storeWhatsApp}
                </span>
              )}
              {meta.storeEmail && (
                <>
                  <br />
                  {meta.storeEmail}
                </>
              )}
            </p>
          )}
        </div>

        <div>
          <h3>Shop</h3>
          <Link to="/shop">All products</Link>
          <Link to="/shop?fulfillment=digital">Digital downloads</Link>
          <Link to="/shop?fulfillment=physical">Physical gear</Link>
          <Link to="/cart">Bag</Link>
        </div>

        <div>
          <h3>Services</h3>
          <Link to="/repairs">GSM repairs</Link>
          <Link to="/repairs/book">Book a repair</Link>
          <Link to="/pickup">Pickup & location</Link>
          <Link to="/shipping">Shipping</Link>
        </div>

        <div>
          <h3>Help</h3>
          <Link to="/track">Track order</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/returns">Returns</Link>
        </div>

        <div>
          <h3>Legal</h3>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create account</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {year} Media Extensions. Accra, Ghana.</span>
        <span>Payments via Mobile Money, bank transfer, Paystack, or pickup.</span>
      </div>
    </footer>
  );
}
