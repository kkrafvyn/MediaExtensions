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
          <Link to="/" className="brand-link">
            Media Extensions
          </Link>

          <nav className="nav-links">
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
              aria-label="Search"
              type="button"
            >
              Search
            </button>
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="bag-pill"
              aria-label="Shopping bag"
              type="button"
            >
              Bag
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
