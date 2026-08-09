# Vercel settings (required)

Your last failed log built commit **f0e7814** and only ran `server` `tsc`.
That means either an old deployment was redeployed, or **Root Directory** is set to `server`.

## Fix in Vercel Dashboard

**Project → Settings → General**

| Field | Must be |
|--------|---------|
| Root Directory | **Empty** (`.`) — not `server`, not `client` |
| Framework Preset | **Other** |
| Build Command | Override **OFF** (uses `npm run vercel-build`) |
| Output Directory | Override **OFF** or `client/dist` |
| Install Command | Override **OFF** (uses `npm install`) |

Then **Deployments → Redeploy** the latest commit on `main` (**d6c4ba4** or newer).  
Do not redeploy the old failed deployment (that stays on `f0e7814`).

## Env vars

Copy from `.env.example` — at least `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL` (your `*.vercel.app` URL).
