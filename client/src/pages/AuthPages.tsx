import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types";

export function LoginPage() {
  const { refresh, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(res.user);
      await refresh();
      if (res.user.role === "admin" || res.user.role === "manager") {
        navigate("/staff");
      } else {
        navigate("/account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 480 }}>
      <h1>Sign in</h1>
      <p className="lede">
        Consumers, managers, and admins use the same door. Guests can still{" "}
        <Link to="/shop">shop without an account</Link>.
      </p>
      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-dark" type="submit">
          Sign in
        </button>
      </form>
      <p className="meta" style={{ marginTop: "1rem" }}>
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p className="meta" style={{ marginTop: "0.5rem" }}>
        New here? <Link to="/register">Create a consumer account</Link>
      </p>
    </div>
  );
}

export function RegisterPage() {
  const { refresh, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+233");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password }),
      });
      setUser(res.user);
      await refresh();
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 480 }}>
      <h1>Create account</h1>
      <p className="lede">Register as a consumer to track orders and downloads.</p>
      <form className="panel stack" onSubmit={onSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-dark" type="submit">
          Create account
        </button>
      </form>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 480 }}>
      <h1>Forgot password</h1>
      <p className="lede">We’ll email a reset link if that address has an account.</p>
      {done ? (
        <div className="panel stack">
          <p className="success">If an account exists, a reset email is on its way.</p>
          <Link to="/login" className="btn btn-dark" style={{ textAlign: "center" }}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="panel stack" onSubmit={onSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-dark" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 480 }}>
      <h1>Reset password</h1>
      <p className="lede">Choose a new password for your Media Extensions account.</p>
      <form className="panel stack" onSubmit={onSubmit}>
        {!params.get("token") && (
          <label>
            Reset token
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </label>
        )}
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-dark" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
