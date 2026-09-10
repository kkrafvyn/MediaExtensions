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

**Note:** Product image uploads and digital download files use `STORAGE_DRIVER=local` by default (`storage/uploads`, `storage/downloads`). On Vercel that disk is ephemeral — set `STORAGE_DRIVER=s3` with S3/R2 credentials (`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL`) for durable production media. See `.env.example`.

## Env vars

Set from `.env.example` / `server/.env` (at least `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL`). For paid digital sales on Vercel also configure SMTP and S3/R2 storage.
