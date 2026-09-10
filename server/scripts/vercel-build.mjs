import { accessSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(serverDir, "..");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureServerDependency(pkgScope, pkgName) {
  const fromCandidates = [
    path.join(serverDir, "vendor", "neondatabase-serverless"),
    path.join(serverDir, "node_modules", pkgScope, pkgName),
    path.join(root, "node_modules", pkgScope, pkgName),
  ];
  const from = fromCandidates.find((candidate) => existsSync(candidate));
  if (!from) {
    console.warn(`Missing ${pkgScope}/${pkgName} — skip copy`);
    console.warn("Looked in:", fromCandidates.join(" | "));
    return;
  }

  const targets = [
    path.join(serverDir, "node_modules", pkgScope, pkgName),
    path.join(serverDir, "node_modules", "drizzle-orm", "node_modules", pkgScope, pkgName),
    path.join(root, "node_modules", "drizzle-orm", "node_modules", pkgScope, pkgName),
  ];

  for (const to of targets) {
    if (path.resolve(to) === path.resolve(from)) continue;
    mkdirSync(path.dirname(to), { recursive: true });
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
    console.log(`Copied ${pkgScope}/${pkgName} -> ${to}`);
  }
}

console.log("Monorepo root:", root);
run("npm", ["install", "--include=dev"], root);
run("npm", ["run", "build", "-w", "client"], root);
run("npm", ["run", "build", "-w", "server"], root);

// Vercel packs server/ as the function root; workspace hoisting leaves some
// packages only in the monorepo root node_modules. Copy what the API needs.
ensureServerDependency("@neondatabase", "serverless");

const dist = path.join(root, "client", "dist");
const www = path.join(serverDir, "www");
accessSync(path.join(dist, "index.html"));
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
cpSync(dist, www, { recursive: true });
console.log("Copied client/dist -> server/www");

if (process.env.RUN_DB_MIGRATE === "1" && process.env.DATABASE_URL) {
  console.log("Running database migrations…");
  run("npm", ["run", "db:migrate", "-w", "server"], root);
} else {
  console.log("Skipping db:migrate (set RUN_DB_MIGRATE=1 to enable during build)");
}
