// Overwritten during `vercel-build` by scripts/bundle-api.mjs (esbuild bundle).
// This stub keeps the /api route detected before the full bundle is generated.
export default function handler(_req, res) {
  res.statusCode = 503;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: "API bundle not built. Run server vercel-build." }));
}
