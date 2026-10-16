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
