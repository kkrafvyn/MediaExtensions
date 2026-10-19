import { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../lib/usePageTitle";
import { getRouteMeta } from "../lib/routeMeta";
import { PageMeta } from "./PageMeta";
import { ToastHost } from "./Toast";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { SearchModal } from "./SearchModal";
import { BrandLogo } from "./BrandLogo";
import { IconClose, IconMenu } from "./Icons";
import { useFocusTrap } from "../lib/useFocusTrap";
import { ThemePicker } from "./ThemePicker";
import { APP_CAROUSEL, BackgroundCarousel } from "./BackgroundCarousel";

export function Layout() {
  const { user, cart } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  useFocusTrap(menuRef, mobileOpen);
  const staff =
    user?.role === "admin" || user?.role === "manager" || user?.role === "technician";
  const onStaffRoute = location.pathname.startsWith("/staff");
  const showMediaBackground = !onStaffRoute;

  usePageTitle(location.pathname);
  const routeMeta = getRouteMeta(location.pathname);

  useEffect(() => {
    setMobileOpen(false);
    setCartDrawerOpen(false);
    setSearchModalOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

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
    <div className={`shell${showMediaBackground ? " shell-on-media" : ""}`}>
      {routeMeta && <PageMeta title={routeMeta.title} description={routeMeta.description} />}
      {showMediaBackground && (
        <BackgroundCarousel slides={APP_CAROUSEL} fixed showDots={false} />
      )}
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand-link" aria-label="Media Extensions Home">
            <BrandLogo size="md" />
          </Link>

          <nav className="nav-links" aria-label="Primary Navigation">
            <NavLink to="/shop" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              Shop
            </NavLink>
            <NavLink to="/repairs" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              Repairs
            </NavLink>
            <NavLink to="/track" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              Track order
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
            <ThemePicker />
            <button
              className="nav-search-btn"
              onClick={() => setSearchModalOpen(true)}
              aria-label="Search store (Ctrl+K)"
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search</span>
              <kbd className="nav-search-kbd">Ctrl K</kbd>
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
              aria-controls="mobile-menu"
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
      <aside ref={menuRef} id="mobile-menu" className={`mobile-drawer ${mobileOpen ? "open" : ""}`} aria-label="Menu" role="dialog" aria-modal={mobileOpen || undefined} inert={!mobileOpen} tabIndex={-1}>
        <div className="mobile-drawer-header">
          <BrandLogo size="sm" />
          <button
            className="mobile-drawer-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            type="button"
          >
            <IconClose size={20} />
          </button>
        </div>
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
        <ThemePicker mobile />
      </aside>

      <main className="main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
      <Footer />
      <ToastHost />
    </div>
  );
}
