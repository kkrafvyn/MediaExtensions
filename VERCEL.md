# Vercel

This project works with **Root Directory = `server`** (your current Vercel setting) or repo root.

## Recommended (matches your project now)

| Setting | Value |
|--------|--------|
| Root Directory | `server` |
| Framework Preset | Other |
| Build Command | `npm run vercel-build` (or leave default from `server/vercel.json`) |
| Output Directory | `www` |

`vercel-build` installs the monorepo, builds the Vite client + API, then copies the SPA into `server/www`.

## Env vars

Set from `.env.example` / `server/.env` (at least `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL`).
