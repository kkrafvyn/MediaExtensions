# Media Extensions

Ghana storefront for digital products, physical gear, and GSM repairs.

## Stack

- **server/** — Express + TypeScript + Neon Postgres (Drizzle)
- **client/** — Vite + React + React Router
- Payments: Mobile Money, bank transfer, pay on pickup, and optional **Paystack**

## Roles

| Role | Access |
|------|--------|
| Guest | Browse, bag, checkout, book repairs, track order by email |
| Consumer | Account, order & repair history, downloads |
| Manager | Products, orders, repair queue, analytics, uploads |
| Admin | Everything + categories & users |

## Setup

```bash
npm install
cp .env.example server/.env
# put your Neon DATABASE_URL in server/.env
npm run db:setup
npm run dev
```

- Storefront: http://localhost:5173  
- API: http://localhost:4000  

### Seed logins

- Admin: `admin@mediaextensions.gh` / `Admin123!`
- Manager: `manager@mediaextensions.gh` / `Manager123!`
- Consumer: `consumer@mediaextensions.gh` / `Consumer123!`

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

## Password reset

- `POST /api/auth/forgot-password` `{ email }` — creates a token and logs a reset link (`CLIENT_URL/reset-password?token=…`) into the `notifications` table (and console in non-production). If SMTP vars are set, the channel is stored as `email` for a future mailer.
- `POST /api/auth/reset-password` `{ token, password }`

## Deploy on Vercel

1. Push to GitHub (this repo).
2. Import the project in Vercel (Framework Preset: Other).
3. Set env vars from `.env.example` (at least `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL` = your Vercel URL, payment/store keys).
4. Build uses root `vercel.json`: client → static, `/api/*` → Express via `api/index.mjs`.
5. After first deploy, set `CLIENT_URL` and `PAYSTACK_CALLBACK_URL` to `https://YOUR_PROJECT.vercel.app` (and `/checkout/paystack-return`).

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
