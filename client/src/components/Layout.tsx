import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../lib/usePageTitle";
import { ToastHost } from "./Toast";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { SearchModal } from "./SearchModal";
import { IconClose, IconMenu } from "./Icons";

export function Layout() {
  const { user, cart } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const staff = user?.role === "admin" || user?.role === "manager";

  usePageTitle(location.pathname);

  useEffect(() => {
    setMobileOpen(false);
    setCartDrawerOpen(false);
    setSearchModalOpen(false);
  }, [location.pathname]);

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="shell">
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand-link" aria-label="Media Extensions Home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="url(#brand-grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="url(#brand-grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="url(#brand-grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="brand-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38bdf8"/>
                  <stop offset="1" stopColor="#3b82f6"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="brand-name">Media Extensions</span>
          </Link>

          <nav className="nav-links" aria-label="Primary Navigation">
            <NavLink to="/shop" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              Shop
            </NavLink>
            <NavLink to="/repairs" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              Repairs
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

          <div className="nav-actions">
            <button
              className="nav-search-btn hide-sm"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search store (Ctrl+K)"
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search</span>
              <kbd className="nav-search-kbd">⌘K</kbd>
            </button>
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="bag-pill"
              aria-label={`Shopping bag with ${cart?.itemCount || 0} items`}
              type="button"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <span>Bag</span>
              {Boolean(cart?.itemCount) && <span className="bag-count">{cart?.itemCount}</span>}
            </button>
            <button
              className="mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
              type="button"
            >
              {mobileOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div
        className={`mobile-drawer-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside className={`mobile-drawer ${mobileOpen ? "open" : ""}`} aria-label="Menu">
        <nav className="mobile-drawer-links">
          <NavLink to="/shop" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            Shop
          </NavLink>
          <NavLink to="/repairs" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            Repairs
          </NavLink>
          <NavLink to="/track" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            Track order
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            About
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
            Contact
          </NavLink>
          {user ? (
            <NavLink to="/account" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
              Account
            </NavLink>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
              Sign in
            </NavLink>
          )}
          {staff && (
            <NavLink to="/staff" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}>
              Staff console
            </NavLink>
          )}
        </nav>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
      <Footer />
      <ToastHost />
    </div>
  );
}
