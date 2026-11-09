# Case study: Media Extensions

## Problem

A Koforidua shop selling digital presets, physical creator gear, and GSM repairs needed one storefront where customers pay in Ghana cedis (MoMo, bank, pickup, Paystack), staff run orders and repairs from a single console, and technicians see only the repair queue — without dummy catalog data in production.

## Approach

- **Monorepo** — Vite/React client and Express/Drizzle API on Neon Postgres, deployable to Vercel with session-backed staff auth and role-based routes.
- **Honest catalog** — Seed creates only the first admin; products and services are added in Staff. A guarded purge script clears catalog tables while keeping order and repair history.
- **Access without leaking PII** — Order and repair views use session grants after email track or signed share links (`/track/t/:token`), not `?email=` on detail URLs.
- **Repair workflow** — Quote approval, IMEI capture, offline payment ledger, customer notifications on status change, and CSV exports for ops.

## Outcomes

- Live at [https://www.mediaextensions.org/](https://www.mediaextensions.org/) — shop, checkout, repair booking, and self-service tracking.
- Staff roles: admin, manager, technician, with pagination and exports on high-volume lists.
- Production runbook, CI build/tests, sitemap, and structured data for discoverability.

## Stack (summary)

React · Express · Drizzle · Neon · Paystack · optional R2/S3 for uploads · WhatsApp agent alerts.
