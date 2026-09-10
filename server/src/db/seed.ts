import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { users } from "./schema.js";

async function ensureUser(opts: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "manager" | "consumer";
  minPasswordLength?: number;
}) {
  const email = opts.email.trim().toLowerCase();
  const minLen = opts.minPasswordLength ?? 8;
  if (opts.password.length < minLen) {
    throw new Error(`Password for ${email} must be at least ${minLen} characters.`);
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    console.log(`${opts.role} already exists (${email}). Skipping.`);
    return;
  }

  await db.insert(users).values({
    email,
    name: opts.name,
    passwordHash: await bcrypt.hash(opts.password, 12),
    role: opts.role,
  });
  console.log(`${opts.role} created for ${email}.`);
}

/** Bootstrap staff/demo users only — catalog is managed in the staff console. */
async function seed() {
  const adminEmail =
    process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
  const adminName =
    process.env.BOOTSTRAP_ADMIN_NAME?.trim() ||
    process.env.SEED_ADMIN_NAME?.trim() ||
    "Store administrator";

  if (adminEmail && adminPassword) {
    await ensureUser({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: "admin",
      minPasswordLength: process.env.BOOTSTRAP_ADMIN_PASSWORD ? 12 : 8,
    });
  } else {
    console.log(
      "No administrator created. Set BOOTSTRAP_ADMIN_EMAIL/PASSWORD or SEED_ADMIN_EMAIL/PASSWORD.",
    );
  }

  const managerEmail = process.env.SEED_MANAGER_EMAIL?.trim();
  const managerPassword = process.env.SEED_MANAGER_PASSWORD;
  if (managerEmail && managerPassword) {
    await ensureUser({
      email: managerEmail,
      password: managerPassword,
      name: "Store manager",
      role: "manager",
    });
  }

  const consumerEmail = process.env.SEED_CONSUMER_EMAIL?.trim();
  const consumerPassword = process.env.SEED_CONSUMER_PASSWORD;
  if (consumerEmail && consumerPassword) {
    await ensureUser({
      email: consumerEmail,
      password: consumerPassword,
      name: "Demo customer",
      role: "consumer",
    });
  }

  console.log("Seed complete. Add products from the staff console.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
