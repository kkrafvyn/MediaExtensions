import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ToastHost } from "./Toast";
import { Footer } from "./Footer";

export function Layout() {
  const { user, cart } = useAuth();
  const staff = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="shell">
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand brand-link">
            <img src="/logo.svg" alt="Media Extensions" className="brand-logo" />
          </Link>
          <nav className="nav-links">
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/repairs">Repairs</NavLink>
            <NavLink to="/about" className="hide-sm">
              About
            </NavLink>
            {user ? (
              <NavLink to="/account" className="hide-sm">
                Account
              </NavLink>
            ) : (
              <NavLink to="/login" className="hide-sm">
                Sign in
              </NavLink>
            )}
            {staff && <NavLink to="/staff">Staff</NavLink>}
            <Link to="/cart" className="bag-pill">
              Bag {cart?.itemCount ? `· ${cart.itemCount}` : ""}
            </Link>
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <Footer />
      <ToastHost />
    </div>
  );
}
