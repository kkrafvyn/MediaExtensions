import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { users } from "./schema.js";

/** Production-safe bootstrap; catalog content is created in the staff console. */
async function seed() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Store administrator";

  if (!email || !password) {
    console.log("No bootstrap administrator created. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to create one.");
    return;
  }
  if (password.length < 12) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    console.log("Bootstrap administrator already exists. Skipping.");
    return;
  }
  await db.insert(users).values({ email, name, passwordHash: await bcrypt.hash(password, 12), role: "admin" });
  console.log(`Bootstrap administrator created for ${email}.`);
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
