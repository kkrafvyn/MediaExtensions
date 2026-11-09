# Runbook — Media Extensions

## Go-live checklist (manual ops)

1. **Migrations** — On production Neon: `npm run db:migrate` (includes 0014 security + 0015 roles/GSM).
2. **Verify** — `npm run production-check` (from repo root with `server/.env` loaded). While rebuilding catalog after a purge, use `SKIP_CATALOG_CHECK=1` so migration/env checks still run without failing on empty products.
3. **Catalog** — Staff → Categories → Products → Repair services (not seeded by default).
4. **Store settings** — Staff → Settings: MoMo, bank, pickup (Koforidua), contact phone/WhatsApp/email.
5. **Vercel env** — `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL=https://www.mediaextensions.org`, `PAYSTACK_*`, `STORAGE_DRIVER=s3` + R2 vars.
6. **Paystack webhook** — `https://www.mediaextensions.org/api/checkout/paystack/webhook` (callback: `https://www.mediaextensions.org/checkout/paystack-return`).
7. **Backup** — `npm run backup` before `PURGE_CATALOG_CONFIRM=1 npm run db:purge-catalog`.

## Production domain

Live storefront: **https://www.mediaextensions.org/**

Confirm in Vercel that `CLIENT_URL` matches this origin (CORS, session cookies, share links, Paystack callback).

## Common symptoms

| Symptom | Likely cause |
|---------|----------------|
| Uploads 503 on staff | `STORAGE_DRIVER` not `s3` on Vercel or missing R2 credentials |
| Sessions drop on deploy | `SESSION_SECRET` changed; users re-login |
| Empty shop | Catalog purged or no products; add in staff |
| Rate limit 429 everywhere | Postgres `rate_limit_buckets` missing — run migration 0014 |
| Digital downloads 404 | `digitalAssetPath` wrong or file not on R2 |

## Scripts

- `npm run db:migrate` — apply Drizzle SQL
- `npm run db:purge-catalog` — delete all products/categories/repair services (requires confirm flag)
- `npm run production-check` — env + DB sanity checks
