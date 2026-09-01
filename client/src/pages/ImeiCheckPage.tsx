import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "../components/Toast";
import { IconCheck, IconWarning } from "../components/Icons";

export function ImeiCheckPage() {
  const [imei, setImei] = useState("");
  const [result, setResult] = useState<{
    valid: boolean;
    tac?: string;
    serial?: string;
    cd?: string;
    message?: string;
  } | null>(null);

  // Luhn algorithm check for 15-digit IMEI
  function validateImei(input: string) {
    const clean = input.replace(/\D/g, "");
    if (clean.length !== 15) {
      return { valid: false, message: "An IMEI must be exactly 15 digits long." };
    }

    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(clean[i], 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const actualCheck = parseInt(clean[14], 10);

    const tac = clean.slice(0, 8);
    const serial = clean.slice(8, 14);

    if (checkDigit === actualCheck) {
      return {
        valid: true,
        tac,
        serial,
        cd: String(actualCheck),
        message: "Valid IMEI format (Luhn checksum passed).",
      };
    } else {
      return {
        valid: false,
        tac,
        serial,
        cd: String(actualCheck),
        message: `Invalid checksum digit. Expected ${checkDigit}, but got ${actualCheck}.`,
      };
    }
  }

  function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    const res = validateImei(imei);
    setResult(res);
  }

  function copyImei(text: string) {
    navigator.clipboard.writeText(text);
    toast("IMEI copied to clipboard!");
  }

  const cleanImei = imei.replace(/\D/g, "");

  return (
    <div className="page container" style={{ maxWidth: 760 }}>
      <p className="eyebrow page-eyebrow">
        <span className="pulse-dot" />
        Official IMEI Format Check
      </p>
      <h1>IMEI Format Checker</h1>
      <p className="lede">
        Validate that a 15-digit IMEI is correctly formatted using the Luhn checksum before you book a repair or share the number with our team. This tool does not query carrier blacklist, iCloud lock, or manufacturer warranty databases.
      </p>

      {/* Main Check Panel */}
      <div className="panel stack" style={{ padding: "2rem" }}>
        <form onSubmit={handleCheck} className="stack" style={{ gap: "1.25rem" }}>
          <label>
            Enter 15-Digit IMEI Number
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.35rem" }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={18}
                value={imei}
                onChange={(e) => {
                  setImei(e.target.value);
                  setResult(null);
                }}
                placeholder="Enter the IMEI from your device"
                required
                style={{
                  fontSize: "1.15rem",
                  fontFamily: "monospace",
                  letterSpacing: "0.08em",
                  padding: "0.85rem 1.2rem",
                  borderRadius: "var(--radius-sm)",
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ paddingInline: "1.75rem", height: "3.2rem" }}
              >
                Validate IMEI
              </button>
            </div>
          </label>

          <div
            style={{
              background: "var(--bg)",
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.88rem",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            <strong>How to find your IMEI:</strong> Dial <code>*#06#</code> on your phone’s keypad, or go to <em>Settings → General → About</em> (iOS) or <em>Settings → About Phone</em> (Android).
          </div>
        </form>

        {/* Check Results */}
        {result && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.5rem",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${result.valid ? "rgba(16, 185, 129, 0.3)" : "rgba(225, 29, 72, 0.3)"}`,
              background: result.valid ? "var(--emerald-soft)" : "var(--danger-soft)",
              animation: "rise 0.3s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ display: "grid", placeItems: "center" }}>
                  {result.valid ? <IconCheck size={20} /> : <IconWarning size={20} />}
                </span>
                <strong style={{ fontSize: "1.1rem", color: result.valid ? "var(--emerald)" : "var(--danger)" }}>
                  {result.valid ? "Checksum Verified" : "IMEI Formatting Warning"}
                </strong>
              </div>
              {cleanImei && (
                <button
                  type="button"
                  className="copy-badge-btn"
                  onClick={() => copyImei(cleanImei)}
                >
                  Copy Clean IMEI
                </button>
              )}
            </div>
            <p style={{ color: "var(--ink)", marginBottom: "1rem", fontSize: "0.95rem" }}>
              {result.message}
            </p>

            {result.tac && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ background: "var(--surface)", padding: "0.6rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                  <span className="meta" style={{ fontSize: "0.75rem" }}>TAC (Allocation Code)</span>
                  <div style={{ fontWeight: 700, fontFamily: "monospace" }}>{result.tac}</div>
                </div>
                <div style={{ background: "var(--surface)", padding: "0.6rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                  <span className="meta" style={{ fontSize: "0.75rem" }}>Serial Identifier</span>
                  <div style={{ fontWeight: 700, fontFamily: "monospace" }}>{result.serial}</div>
                </div>
                <div style={{ background: "var(--surface)", padding: "0.6rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                  <span className="meta" style={{ fontSize: "0.75rem" }}>Check Digit</span>
                  <div style={{ fontWeight: 700, fontFamily: "monospace" }}>{result.cd}</div>
                </div>
              </div>
            )}

            {/* Direct Link / Action to IMEICheck.com */}
            <div
              style={{
                background: "var(--surface)",
                padding: "1.25rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
              }}
            >
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>
                Need carrier blacklist or warranty lookup?
              </h4>
              <p className="meta" style={{ marginBottom: "1rem", fontSize: "0.88rem" }}>
                This page only validates IMEI format locally. For carrier lock, blacklist, iCloud, or manufacturer warranty checks, use a third-party service such as <strong>IMEICheck.com</strong>.
              </p>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <a
                  href={`https://imeicheck.com/imei-check?imei=${cleanImei}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-dark"
                  style={{ gap: "0.5rem" }}
                >
                  <span>Query on IMEICheck.com</span>
                  <span>↗</span>
                </a>

                <Link
                  to={`/repairs/book?issue=IMEI Check: ${cleanImei}`}
                  className="btn btn-primary"
                >
                  Book GSM Repair with this IMEI
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="panel" style={{ marginTop: "2rem" }}>
        <h3 style={{ fontSize: "1.15rem", marginBottom: "0.75rem" }}>Why Check Your IMEI?</h3>
        <ul style={{ paddingLeft: "1.2rem", fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.6 }}>
          <li>Verify if a secondhand phone is blacklisted or reported lost.</li>
          <li>Confirm official Apple Care / Samsung manufacturer warranty status.</li>
          <li>Check network SIM unlock status before traveling or switching networks.</li>
          <li>Accurate part matching for logic board and screen repairs.</li>
        </ul>
      </div>
    </div>
  );
}
