import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types";
import { IconMail } from "../components/Icons";
import { BrandLogo } from "../components/BrandLogo";

export function LoginPage() {
  const { refresh, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api<{ user?: User; mfaRequired?: boolean }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(mfaRequired ? useRecoveryCode ? { recoveryCode } : { totpCode } : {}),
        }),
      });
      if (res.mfaRequired) {
        setMfaRequired(true);
        return;
      }
      if (!res.user) throw new Error("Sign in could not be completed");
      setMfaRequired(false);
      setUser(res.user);
      await refresh();
      if (
        res.user.role === "admin" ||
        res.user.role === "manager" ||
        res.user.role === "technician"
      ) {
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
    <div className="auth-shell">
      <div className="page container auth-panel" style={{ maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Link to="/" style={{ display: "inline-block", marginBottom: "1rem" }} aria-label="Home">
            <BrandLogo size={52} badgeOnly />
          </Link>
          <h1 style={{ fontSize: "1.9rem", letterSpacing: "-0.035em", margin: "0 0 0.4rem" }}>Sign in</h1>
          <p className="lede" style={{ margin: "0 auto", fontSize: "0.95rem", color: "var(--muted)", maxWidth: "340px" }}>
            Access downloads, active orders, and repair tickets.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", background: "var(--surface-hover)", padding: "0.35rem", borderRadius: "var(--radius-full)", border: "1px solid var(--line)" }}>
          <Link
            to="/login"
            className="btn btn-sm"
            style={{ flex: 1, background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--radius-full)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
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

        <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Email Address
          <input
            type="email"
            autoComplete="email"
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
              autoComplete="current-password"
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

        {mfaRequired && (
          <label>
            {useRecoveryCode ? "Admin recovery code" : "Admin authenticator code"}
            <input
              inputMode={useRecoveryCode ? "text" : "numeric"}
              autoComplete={useRecoveryCode ? "off" : "one-time-code"}
              pattern={useRecoveryCode ? "[A-Fa-f0-9]{8}-?[A-Fa-f0-9]{8}" : "[0-9]{6}"}
              maxLength={useRecoveryCode ? 17 : 6}
              value={useRecoveryCode ? recoveryCode : totpCode}
              onChange={(e) => useRecoveryCode
                ? setRecoveryCode(e.target.value.replace(/[^a-fA-F0-9-]/g, "").slice(0, 17))
                : setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={useRecoveryCode ? "16-character code" : "6-digit code"}
              required
            />
          </label>
        )}
        {mfaRequired && (
          <button type="button" className="shop-clear-link" onClick={() => setUseRecoveryCode((value) => !value)}>
            {useRecoveryCode ? "Use authenticator code instead" : "Use a recovery code"}
          </button>
        )}

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
    <div className="auth-shell">
      <div className="page container auth-panel" style={{ maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Link to="/" style={{ display: "inline-block", marginBottom: "1rem" }} aria-label="Home">
            <BrandLogo size={52} badgeOnly />
          </Link>
          <h1 style={{ fontSize: "1.9rem", letterSpacing: "-0.035em", margin: "0 0 0.4rem" }}>Create account</h1>
          <p className="lede" style={{ margin: "0 auto", fontSize: "0.95rem", color: "var(--muted)", maxWidth: "340px" }}>
            Access your downloads, track repairs, and manage your orders.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", background: "var(--surface-hover)", padding: "0.35rem", borderRadius: "var(--radius-full)", border: "1px solid var(--line)" }}>
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
            style={{ flex: 1, background: "var(--surface)", color: "var(--ink)", borderRadius: "var(--radius-full)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
          >
            Create Account
          </Link>
        </div>

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
            autoComplete="email"
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
              placeholder="Minimum 12 characters"
              autoComplete="new-password"
              required
              minLength={12}
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
    <div className="auth-shell">
      <div className="page container auth-panel" style={{ maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Link to="/" style={{ display: "inline-block", marginBottom: "1rem" }} aria-label="Home">
            <BrandLogo size={52} badgeOnly />
          </Link>
          <h1 style={{ fontSize: "1.9rem", letterSpacing: "-0.035em", margin: "0 0 0.4rem" }}>Reset password</h1>
          <p className="lede" style={{ margin: "0 auto", fontSize: "0.95rem", color: "var(--muted)", maxWidth: "340px" }}>
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

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
                autoComplete="email"
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
    <div className="auth-shell">
      <div className="page container auth-panel" style={{ maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Link to="/" style={{ display: "inline-block", marginBottom: "1rem" }} aria-label="Home">
            <BrandLogo size={52} badgeOnly />
          </Link>
          <h1 style={{ fontSize: "1.9rem", letterSpacing: "-0.035em", margin: "0 0 0.4rem" }}>Set new password</h1>
          <p className="lede" style={{ margin: "0 auto", fontSize: "0.95rem", color: "var(--muted)", maxWidth: "340px" }}>
            Choose a password with at least 12 characters.
          </p>
        </div>

        <form className="panel stack" onSubmit={onSubmit}>
          <label>
            New Password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={12}
            />
          </label>

          {error && <div className="alert-banner">{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ height: "3.2rem" }}>
            {submitting ? "Updating Password…" : "Update Password →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"ready" | "verified" | "error">(token ? "ready" : "error");
  const [message, setMessage] = useState(token ? "Confirm to verify your email address." : "This verification link is invalid or incomplete.");

  async function verifyEmail(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    api<{ ok: boolean; email: string }>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((result) => {
        setState("verified");
        setMessage(`Email verified for ${result.email}.`);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "This verification link is invalid or expired.");
      });
  }

  return (
    <div className="auth-shell">
      <div className="page container auth-panel" style={{ maxWidth: 460 }}>
        <form className="panel stack" onSubmit={verifyEmail} role={state === "error" ? "alert" : "status"}>
          <h1 style={{ fontSize: "1.6rem", margin: 0 }}>Email verification</h1>
          <p className="meta">{message}</p>
          {state === "ready" && <button className="btn btn-primary" type="submit">Verify email</button>}
          <Link className="btn btn-primary" to={state === "verified" ? "/account" : "/login"}>
            {state === "verified" ? "Continue to account" : "Return to sign in"}
          </Link>
        </form>
      </div>
    </div>
  );
}
