# Vercel

This project works with **Root Directory = `server`** (your current Vercel setting) or repo root.

## Recommended (matches your project now)

| Setting | Value |
|--------|--------|
| Root Directory | `server` |
| Framework Preset | Other |
| Build Command | `npm run vercel-build` (or leave default from `server/vercel.json`) |
| Output Directory | `www` |

`vercel-build` installs the monorepo, builds the Vite client + API, then copies the SPA into `server/www`. Set `RUN_DB_MIGRATE=1` to run `db:migrate` during build when `DATABASE_URL` is available.

**Note:** Product image uploads and digital download files use local disk (`storage/uploads`, `storage/downloads`). On Vercel this storage is ephemeral — use Docker/Render with persistent volumes, or migrate to S3/R2/Blob for production file storage.

## Env vars

Set from `.env.example` / `server/.env` (at least `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL`).
