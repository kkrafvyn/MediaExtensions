# Runbook — Media Extensions

## Go-live checklist (manual ops)

1. **Migrations** — On production Neon: `npm run db:migrate` (includes 0014 security + 0015 roles/GSM).
2. **Verify** — `npm run production-check` (from `server/` with `DATABASE_URL` in `.env`).
3. **Catalog** — Staff → Categories → Products → Repair services (not seeded by default).
4. **Store settings** — Staff → Settings: MoMo, bank, pickup (Koforidua), contact phone/WhatsApp/email.
5. **Vercel env** — `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL`, `PAYSTACK_*`, `STORAGE_DRIVER=s3` + R2 vars.
6. **Paystack webhook** — `https://YOUR_DOMAIN/api/checkout/paystack/webhook`.
7. **Backup** — `npm run backup` before `PURGE_CATALOG_CONFIRM=1 npm run db:purge-catalog`.

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
