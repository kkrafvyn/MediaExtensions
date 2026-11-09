# Media Extensions

![CI](https://github.com/kkrafvyn/MediaExtensions/actions/workflows/ci.yml/badge.svg)

Ghana storefront for digital products, physical gear, and GSM repairs.

Docs: [ARCHITECTURE.md](./ARCHITECTURE.md) · [RUNBOOK.md](./RUNBOOK.md) · [SECURITY.md](./SECURITY.md) · [DEMO.md](./DEMO.md) · [CASE_STUDY.md](./CASE_STUDY.md) · [docs/API.md](./docs/API.md) · [design/branding/UI.md](./design/branding/UI.md)

## Live site

**https://www.mediaextensions.org/**

Set Vercel env `CLIENT_URL=https://www.mediaextensions.org` (and `PAYSTACK_CALLBACK_URL` to match). Record a short demo using [DEMO.md](./DEMO.md); add screenshots under [design/branding/screenshots/](./design/branding/screenshots/).

## Stack

- **server/** — Express + TypeScript + Neon Postgres (Drizzle)
- **client/** — Vite + React + React Router
- Payments: Mobile Money, bank transfer, pay on pickup, and optional **Paystack**

## Roles

| Role | Access |
|------|--------|
| Guest | Browse, bag, checkout, book repairs, track order by email |
| Consumer | Account, order & repair history, downloads |
| Technician | Repair queue and customer messages (no catalog or orders admin) |
| Manager | Products, orders, repair queue, analytics, uploads (no price/settings write) |
| Admin | Everything + categories, users, store settings, POS |

## Setup

```bash
npm install
cp .env.example server/.env
# put your Neon DATABASE_URL in server/.env
npm run db:migrate
# Optional: create the first administrator (no sample catalog data is inserted)
$env:BOOTSTRAP_ADMIN_EMAIL="owner@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="a-unique-password-with-12-or-more-characters"
npm run db:seed
npm run dev
```

- Storefront: http://localhost:5173  
- API: http://localhost:4000  

### First administrator

Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters), then run `npm run db:seed`. Products, services, categories, prices, and staff users are created in the staff console. No sample catalog, orders, or repair tickets are inserted by seed.

### Reset catalog (remove all products/services/categories)

Orders and repair history are kept. Take a backup first (`npm run backup`).

```bash
# PowerShell
$env:PURGE_CATALOG_CONFIRM="1"
npm run db:purge-catalog
```

Then re-add categories, products, and repair services in the staff console.

### Production checklist

After deploying or purging the catalog, run from the repo root (with `server/.env` loaded):

```bash
npm run production-check
```

See [RUNBOOK.md](./RUNBOOK.md) for migrations on Neon, Vercel env vars, R2 uploads, and repopulating the catalog in Staff.

## Flow

1. Add digital + physical items to bag (guest OK)
2. Checkout → MoMo / bank / pickup / Paystack
3. Staff marks order **paid** (or Paystack verify) → digital download links unlock
4. Book GSM repairs from `/repairs`

## Paystack

Set in `server/.env`:

- `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` (leave empty to disable)
- `PAYSTACK_CALLBACK_URL` — client callback page after payment

Checkout with `paymentMethod: "paystack"` creates a pending order, initializes Paystack, and returns `authorization_url`. After payment, call `POST /api/checkout/paystack/verify` with `{ reference }`.

## WhatsApp agent alerts

Staff agents receive WhatsApp messages when customers place orders, book repairs, submit contact forms, or join the newsletter.

Set in `server/.env` (Meta [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)):

- `WHATSAPP_ACCESS_TOKEN` — permanent token from Meta Business
- `WHATSAPP_PHONE_NUMBER_ID` — from WhatsApp → API Setup
- `WHATSAPP_AGENT_NUMBERS` — comma-separated staff numbers (e.g. `233240000000,233501234567`). Falls back to `STORE_WHATSAPP` if empty.
- `WHATSAPP_NOTIFY_CUSTOMERS=1` — also message customers (requires approved message templates in production)

Without API credentials, alerts are logged to the `notifications` table with `wa.me` links as a manual fallback.

## Password reset

- `POST /api/auth/forgot-password` `{ email }` — creates a token and logs a reset link (`CLIENT_URL/reset-password?token=…`) into the `notifications` table. If SMTP vars are set, an email is sent via nodemailer.
- `POST /api/auth/reset-password` `{ token, password }`
- `PATCH /api/auth/profile` — update name, phone, or password (authenticated)

## Deploy on Vercel

See **[VERCEL.md](./VERCEL.md)** for the current setup.

1. Push to GitHub (this repo).
2. Import the project in Vercel with **Root Directory = `server`**, **Output Directory = `www`**.
3. Set env vars from `.env.example` (at least `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL`).
4. Optionally set `RUN_DB_MIGRATE=1` on the build to run migrations automatically (requires `DATABASE_URL` at build time).
5. Set Paystack dashboard webhook to `https://www.mediaextensions.org/api/checkout/paystack/webhook`.
6. Set `CLIENT_URL=https://www.mediaextensions.org` and `PAYSTACK_CALLBACK_URL=https://www.mediaextensions.org/checkout/paystack-return`.

Local Docker / Render remain supported via `Dockerfile` and `render.yaml`.

## Backup

```bash
npm run backup
# or
npm run backup -w server -- --dry-run
```

Uses `pg_dump` when available; otherwise prints restore instructions. See `server/scripts/backup.mjs`.

## Tests

```bash
npm test
# unit utils always run; health integration skips if API is down
```

## Useful staff APIs

- `GET /api/staff/analytics` — paid revenue, order/repair status counts, top products, low stock
- `POST /api/staff/uploads` — multipart `file` → `/uploads/<filename>`
- `POST /api/orders/track` — `{ email, orderId }` guest order lookup
- `GET /api/orders/:id/receipt` — print-friendly JSON receipt
