import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types";
import { IconMail } from "../components/Icons";

export function LoginPage() {
  const { refresh, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setUser(res.user);
      await refresh();
      if (res.user.role === "admin" || res.user.role === "manager") {
        navigate("/staff");
      } else {
        navigate("/account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 460 }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", background: "var(--bg-alt)", padding: "0.35rem", borderRadius: "var(--radius-full)" }}>
        <Link
          to="/login"
          className="btn btn-sm"
          style={{ flex: 1, background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--radius-full)", boxShadow: "var(--shadow-xs)" }}
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="btn btn-sm"
          style={{ flex: 1, color: "var(--muted)", borderRadius: "var(--radius-full)" }}
        >
          Create Account
        </Link>
      </div>

      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Account Access
      </p>
      <h1>Welcome back</h1>
      <p className="lede">Sign in to manage downloads, active orders, and repair tickets.</p>

      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Email Address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            required
          />
        </label>
        <label>
          Password
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "0.75rem",
                fontSize: "0.85rem",
                color: "var(--muted)",
                padding: "0.25rem",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error && <div className="alert-banner">{error}</div>}

        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ height: "3.2rem", fontSize: "1.02rem" }}>
          {submitting ? "Signing In…" : "Sign In →"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          <Link to="/forgot-password" style={{ color: "var(--muted)" }}>
            Forgot password?
          </Link>
          <Link to="/shop" style={{ color: "var(--muted)" }}>
            Continue as guest
          </Link>
        </div>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const { refresh, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+233 ");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email: email.trim(), phone, password }),
      });
      setUser(res.user);
      await refresh();
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Email may already be in use.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 460 }}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", background: "var(--bg-alt)", padding: "0.35rem", borderRadius: "var(--radius-full)" }}>
        <Link
          to="/login"
          className="btn btn-sm"
          style={{ flex: 1, color: "var(--muted)", borderRadius: "var(--radius-full)" }}
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="btn btn-sm"
          style={{ flex: 1, background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--radius-full)", boxShadow: "var(--shadow-xs)" }}
        >
          Create Account
        </Link>
      </div>

      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Join Media Extensions
      </p>
      <h1>Create an account</h1>
      <p className="lede">Unlock your digital downloads vault, repair tracking, and fast checkout.</p>

      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Full Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
          />
        </label>
        <label>
          Email Address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            required
          />
        </label>
        <label>
          Mobile Number (MoMo / WhatsApp)
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233 XX XXX XXXX"
            required
          />
        </label>
        <label>
          Password
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "0.75rem",
                fontSize: "0.85rem",
                color: "var(--muted)",
                padding: "0.25rem",
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error && <div className="alert-banner">{error}</div>}

        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ height: "3.2rem", fontSize: "1.02rem" }}>
          {submitting ? "Creating Account…" : "Create Account →"}
        </button>
      </form>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // Don't leak whether email exists
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 460 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Password Recovery
      </p>
      <h1>Reset password</h1>
      <p className="lede">Enter your registered email address to receive password reset instructions.</p>

      {submitted ? (
        <div className="panel stack" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
          <div className="empty-icon">
            <IconMail size={40} />
          </div>
          <h3 style={{ fontSize: "1.2rem" }}>Check your inbox</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.5 }}>
            If an account exists for <strong>{email}</strong>, we've dispatched password reset instructions.
          </p>
          <Link to="/login" className="btn btn-dark" style={{ marginTop: "1rem" }}>
            Return to Sign In
          </Link>
        </div>
      ) : (
        <form className="panel stack" onSubmit={onSubmit}>
          <label>
            Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              required
            />
          </label>

          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ height: "3.2rem" }}>
            {submitting ? "Sending Link…" : "Send Reset Link →"}
          </button>

          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            <Link to="/login" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              ← Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed or token has expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 460 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Create New Password
      </p>
      <h1>Set new password</h1>
      <p className="lede">Choose a strong password with at least 6 characters.</p>

      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          New Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </label>

        {error && <div className="alert-banner">{error}</div>}

        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ height: "3.2rem" }}>
          {submitting ? "Updating Password…" : "Update Password →"}
        </button>
      </form>
    </div>
  );
}
