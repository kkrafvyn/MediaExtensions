import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../lib/usePageTitle";
import { ToastHost } from "./Toast";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { SearchModal } from "./SearchModal";

export function Layout() {
  const { user, cart } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const staff = user?.role === "admin" || user?.role === "manager";

  usePageTitle(location.pathname);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setCartDrawerOpen(false);
    setSearchModalOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else if (!cartDrawerOpen && !searchModalOpen) {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, cartDrawerOpen, searchModalOpen]);

  // Global hotkey: Ctrl+K or Cmd+K or / to open search modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      } else if (e.key === "/" && !searchModalOpen) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchModalOpen]);

  return (
    <div className="shell">
      {/* Top Announcement Bar */}
      <div className="announcement-bar">
        <span>
          <span className="announcement-pill">New</span>
          Instant digital download delivery across Ghana
        </span>
        <span className="hide-sm">⚡ Same-Day Screen & Battery Swaps in Accra</span>
        <span className="hide-sm">🇬🇭 Mobile Money & Paystack Verified</span>
      </div>

      {/* Main Sticky Navigation */}
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand-link">
            <span className="brand-name">Media Extensions</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="nav-links">
            <NavLink to="/shop" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              Shop
            </NavLink>
            <NavLink to="/repairs" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              Repairs
            </NavLink>
            <NavLink to="/imei-check" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              IMEI Check
            </NavLink>
            <NavLink to="/track" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              Track Order
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              About
            </NavLink>
            {user ? (
              <NavLink to="/account" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                Account
              </NavLink>
            ) : (
              <NavLink to="/login" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                Sign In
              </NavLink>
            )}
            {staff && (
              <NavLink to="/staff" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
                Staff
              </NavLink>
            )}
          </nav>

          {/* Nav Actions */}
          <div className="nav-actions">
            {/* Quick Search Button */}
            <button
              className="nav-search-btn"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search store catalog"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span className="hide-sm">Search</span>
              <kbd className="nav-search-kbd hide-sm">⌘K</kbd>
            </button>

            {/* Quick Bag Button */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="bag-pill"
              aria-label="Open Shopping Bag"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <span>Bag</span>
              {Boolean(cart?.itemCount) && <span className="bag-count">{cart?.itemCount}</span>}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              className="mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="7" x2="20" y2="7"></line>
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="17" x2="20" y2="17"></line>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <div
        className={`mobile-drawer-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside className={`mobile-drawer ${mobileOpen ? "open" : ""}`} aria-label="Mobile Navigation">
        <div className="mobile-drawer-head">
          <Link to="/" className="brand-link" onClick={() => setMobileOpen(false)}>
            <span className="brand-name">Media Extensions</span>
          </Link>
          <button className="mobile-toggle" onClick={() => setMobileOpen(false)} aria-label="Close menu" style={{ display: "block" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <button
          className="btn btn-light"
          onClick={() => {
            setMobileOpen(false);
            setSearchModalOpen(true);
          }}
          style={{ width: "100%", justifyContent: "flex-start", marginBottom: "1.25rem", gap: "0.75rem" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Search store catalog…</span>
        </button>

        <nav className="mobile-drawer-links">
          <NavLink to="/shop" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            <span>Shop Store</span>
            <span>→</span>
          </NavLink>
          <NavLink to="/repairs" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            <span>GSM Repairs</span>
            <span>→</span>
          </NavLink>
          <NavLink to="/imei-check" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            <span>IMEI Checker</span>
            <span>⚡</span>
          </NavLink>
          <NavLink to="/repairs/book" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            <span>Book a Repair</span>
            <span>→</span>
          </NavLink>
          <NavLink to="/track" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            <span>Track Order</span>
            <span>→</span>
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            <span>About Us</span>
            <span>→</span>
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            <span>Contact & Pickup</span>
            <span>→</span>
          </NavLink>
          {user ? (
            <NavLink to="/account" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
              <span>My Account</span>
              <span>→</span>
            </NavLink>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
              <span>Sign In / Register</span>
              <span>→</span>
            </NavLink>
          )}
          {staff && (
            <NavLink to="/staff" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
              <span>Staff Portal</span>
              <span>⚡</span>
            </NavLink>
          )}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "1.5rem", borderTop: "1px solid var(--line)" }}>
          <p className="meta" style={{ fontSize: "0.82rem" }}>
            📍 Accra, Ghana · MoMo & Card accepted
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        <Outlet />
      </main>

      {/* Slide-Over Quick Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />

      {/* Spotlight Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      <Footer />
      <ToastHost />
    </div>
  );
}
