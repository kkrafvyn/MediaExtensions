# Security — Media Extensions

## Authentication

- Passwords: bcrypt; registration requires 12+ characters ([security.ts](server/src/lib/security.ts)).
- Admin MFA: TOTP optional at login; secrets encrypted at rest.
- Session invalidation: `session_version` bumped on logout/password change.

## Authorization

| Role | Staff API |
|------|-----------|
| technician | Repairs (+ dashboard) only |
| manager | Orders, catalog edits (no price/settings write) |
| admin | Full access |

Public order/repair detail: owner session, logged-in user, staff, or track token / post-track session grant — not email query alone.

## Payments

- Paystack: HMAC webhook signature; verify amount and GHS on callback.
- `markOrderPaid`: conditional update to avoid double side effects.

## Rate limiting

- Express limiters on auth/checkout/contact; Postgres buckets for login (migration 0014).

## Secrets

Never commit `server/.env`. Rotate `SESSION_SECRET` if leaked (invalidates all sessions).

## Dependency upgrades (deferred)

- **Drizzle ORM 0.45+** — not upgraded in this release; requires regression pass on migrations and `drizzle-kit`.
- **Official `@neondatabase/serverless`** — repo uses a vendored build under `server/vendor/` until pool/WebSocket behavior is verified against all `db.query` + `with:` call sites ([server/src/db/index.ts](server/src/db/index.ts)).
- Run `npm audit` periodically; apply patch/minor fixes. Major bumps need a dedicated sprint and CI green on integration tests with a real `DATABASE_URL`.
- **Known advisory (2026):** `drizzle-orm` &lt;0.45.2 (GHSA-gpj5-g38j-94v9) — fix requires Drizzle 0.45+; deferred per upgrade plan. Dev-only `esbuild` advisories via `drizzle-kit` are acceptable until kit is upgraded with Drizzle.
