# API overview

Base URL: same origin as the storefront (`/api/...`). Session cookie auth for account and staff routes.

## Public — catalog & cart

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/products` | List/search products (`q`, `category`, `page`, `sort`) |
| GET | `/api/products/categories` | Active categories |
| GET | `/api/products/:slug` | Product detail |
| GET | `/api/cart` | Current bag |
| POST | `/api/cart/items` | Add line |
| PATCH | `/api/cart/items/:id` | Update quantity |
| DELETE | `/api/cart/items/:id` | Remove line |

## Public — checkout & orders

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/checkout/payment-info` | MoMo/bank numbers for offline pay |
| POST | `/api/checkout` | Place order |
| POST | `/api/checkout/paystack/verify` | Confirm Paystack payment |
| POST | `/api/orders/track` | Lookup order by email + id (returns `shareUrl`) |
| GET | `/api/orders/:id` | Order detail (session grant) |
| GET | `/api/orders/:id/receipt` | Printable receipt JSON |
| GET | `/api/downloads/:token` | Download digital asset |

## Public — repairs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/repairs/services` | Repair service menu |
| POST | `/api/repairs/book` | Create repair ticket |
| POST | `/api/repairs/track` | Lookup repair by email + id |
| GET | `/api/repairs/:id` | Repair detail + payments |
| PATCH | `/api/repairs/:id/quote-decision` | Customer approve/decline quote |

## Public — tracking & meta

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/track/:token` | Signed share link (order or repair) |
| GET | `/api/meta` | Store branding, shipping, pickup |
| POST | `/api/contact` | Contact / wholesale / newsletter |
| GET | `/sitemap.xml` | SEO sitemap |
| GET | `/api/health` | Liveness |

## Auth

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Session login (+ MFA when enabled) |
| POST | `/api/auth/logout` | End session |
| POST | `/api/auth/forgot-password` | Reset email |
| POST | `/api/auth/reset-password` | Set new password |
| PATCH | `/api/auth/profile` | Update profile |

## Staff (role: admin, manager, and/or technician)

Mounted at `/api/staff`. Technicians: repairs + messages only. Managers/admins: catalog, orders, exports, settings (admin-only: users, audit, POS).

Notable routes: `GET /orders`, `PATCH /orders/:id`, `PATCH /orders/:id/notes`, `POST /orders/:id/payments`, `GET /export/orders`, `GET /export/repairs`, `GET /export/payments`, `GET /analytics`, repair PATCH with status notifications.

## Webhooks

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/webhooks/paystack` | Paystack charge success (signature verified) |

See [ARCHITECTURE.md](../ARCHITECTURE.md) and [SECURITY.md](../SECURITY.md) for session, Paystack, and upload flow.
