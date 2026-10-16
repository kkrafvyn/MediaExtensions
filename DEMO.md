# Demo script (~2 minutes)

1. **Storefront** — Home → Shop (featured products) → product → add to cart.
2. **Guest checkout** — MoMo or Paystack path; show order status page.
3. **Track** — `/track` with email + order UUID; copy share link (track token).
4. **GSM** — `/repairs` → book → status page; staff `/staff/repairs` → update status.
5. **Staff payment** — Record MoMo on pending order; digital downloads unlock when paid.
6. **Security** — Admin login with MFA if enabled.

Use a disposable Neon branch or local `npm run dev` with seed admin from `BOOTSTRAP_ADMIN_*`.
