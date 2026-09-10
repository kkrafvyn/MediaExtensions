import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [path.join(serverDir, "src", "vercel-entry.ts")],
  outfile: path.join(serverDir, "api", "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "bundle",
  sourcemap: false,
  logLevel: "info",
  // Keep native/optional packages external if they break bundling
  external: ["pg-native"],
  banner: {
    js: `import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);`,
  },
});

console.log("Bundled serverless API -> api/index.mjs");
