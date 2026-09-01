import { accessSync, cpSync, mkdirSync, rmSync } from "node:fs";
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

console.log("Monorepo root:", root);
run("npm", ["install"], root);
run("npm", ["run", "build", "-w", "client"], root);
run("npm", ["run", "build", "-w", "server"], root);

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
