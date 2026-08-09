import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import {
  categories,
  products,
  repairServices,
  users,
} from "./schema.js";
import { slugify } from "../lib/utils.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const downloadsDir = path.resolve(__dirname, "../../storage/downloads");
  fs.mkdirSync(downloadsDir, { recursive: true });
  const sampleDigital = path.join(downloadsDir, "cinematic-lut-pack.txt");
  if (!fs.existsSync(sampleDigital)) {
    fs.writeFileSync(
      sampleDigital,
      "Media Extensions — Cinematic LUT Pack\nThank you for your purchase.\n",
    );
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@mediaextensions.gh";
  const managerEmail = process.env.SEED_MANAGER_EMAIL ?? "manager@mediaextensions.gh";
  const consumerEmail = process.env.SEED_CONSUMER_EMAIL ?? "consumer@mediaextensions.gh";

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });
  if (existingAdmin) {
    console.log("Seed already applied (admin exists). Skipping.");
    return;
  }

  const [adminHash, managerHash, consumerHash] = await Promise.all([
    bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "Admin123!", 10),
    bcrypt.hash(process.env.SEED_MANAGER_PASSWORD ?? "Manager123!", 10),
    bcrypt.hash(process.env.SEED_CONSUMER_PASSWORD ?? "Consumer123!", 10),
  ]);

  await db.insert(users).values([
    {
      email: adminEmail,
      name: "Admin",
      phone: "+233240000001",
      passwordHash: adminHash,
      role: "admin",
    },
    {
      email: managerEmail,
      name: "Shop Manager",
      phone: "+233240000002",
      passwordHash: managerHash,
      role: "manager",
    },
    {
      email: consumerEmail,
      name: "Ama Consumer",
      phone: "+233240000003",
      passwordHash: consumerHash,
      role: "consumer",
    },
  ]);

  const categoryData = [
    { name: "LUTs & Presets", description: "Color grades and editing presets", sortOrder: 1 },
    { name: "Plugins", description: "Creative tools and extensions", sortOrder: 2 },
    { name: "Camera Gear", description: "Physical accessories for creators", sortOrder: 3 },
    { name: "Storage", description: "Drives and cases", sortOrder: 4 },
    { name: "GSM Repairs", description: "Phone and device repair services", sortOrder: 5 },
  ];

  const insertedCategories = await db
    .insert(categories)
    .values(
      categoryData.map((c) => ({
        ...c,
        slug: slugify(c.name),
        active: true,
      })),
    )
    .returning();

  const bySlug = Object.fromEntries(insertedCategories.map((c) => [c.slug, c]));

  await db.insert(products).values([
    {
      categoryId: bySlug["luts-presets"].id,
      name: "Cinematic LUT Pack",
      slug: "cinematic-lut-pack",
      description:
        "Twenty film-inspired LUTs for DaVinci Resolve and Premiere. Instant download after payment is confirmed.",
      pricePesewas: 14900,
      images: ["/images/products/lut-pack.svg"],
      fulfillment: "digital",
      stock: 999,
      digitalAssetPath: "cinematic-lut-pack.txt",
      featured: true,
      active: true,
    },
    {
      categoryId: bySlug["luts-presets"].id,
      name: "Accra Golden Hour Presets",
      slug: "accra-golden-hour-presets",
      description: "Lightroom presets tuned for warm West African light.",
      pricePesewas: 9900,
      images: ["/images/products/presets.svg"],
      fulfillment: "digital",
      stock: 999,
      digitalAssetPath: "cinematic-lut-pack.txt",
      featured: true,
      active: true,
    },
    {
      categoryId: bySlug.plugins.id,
      name: "Media Noise Reducer Plugin",
      slug: "media-noise-reducer",
      description: "Clean dialogue tracks with a lightweight desktop plugin.",
      pricePesewas: 24900,
      images: ["/images/products/plugin.svg"],
      fulfillment: "digital",
      stock: 999,
      digitalAssetPath: "cinematic-lut-pack.txt",
      featured: false,
      active: true,
    },
    {
      categoryId: bySlug["camera-gear"].id,
      name: "Leather Camera Strap",
      slug: "leather-camera-strap",
      description: "Hand-finished strap with solid brass hardware. Ships across Ghana.",
      pricePesewas: 32000,
      images: ["/images/products/strap.svg"],
      fulfillment: "physical",
      stock: 24,
      featured: true,
      active: true,
    },
    {
      categoryId: bySlug["camera-gear"].id,
      name: "Compact Tripod Kit",
      slug: "compact-tripod-kit",
      description: "Travel tripod with phone mount — ready for street shoots in Accra.",
      pricePesewas: 45000,
      images: ["/images/products/tripod.svg"],
      fulfillment: "physical",
      stock: 15,
      featured: false,
      active: true,
    },
    {
      categoryId: bySlug.storage.id,
      name: "SSD Field Case",
      slug: "ssd-field-case",
      description: "Shock-resistant case for 2.5\" drives. Pickup or delivery.",
      pricePesewas: 18000,
      images: ["/images/products/ssd-case.svg"],
      fulfillment: "physical",
      stock: 40,
      featured: false,
      active: true,
    },
    {
      categoryId: bySlug["luts-presets"].id,
      name: "Creator Starter Bundle",
      slug: "creator-starter-bundle",
      description: "Digital LUT pack plus a physical lens cloth kit shipped to you.",
      pricePesewas: 27900,
      images: ["/images/products/bundle.svg"],
      fulfillment: "both",
      stock: 20,
      digitalAssetPath: "cinematic-lut-pack.txt",
      featured: true,
      active: true,
    },
    {
      categoryId: bySlug.plugins.id,
      name: "Timeline Template Pack",
      slug: "timeline-template-pack",
      description: "Editable Premiere and CapCut templates for reels and ads.",
      pricePesewas: 7900,
      images: ["/images/products/templates.svg"],
      fulfillment: "digital",
      stock: 999,
      digitalAssetPath: "cinematic-lut-pack.txt",
      featured: false,
      active: true,
    },
  ]);

  await db.insert(repairServices).values([
    {
      categoryId: bySlug["gsm-repairs"].id,
      name: "Screen Replacement",
      slug: "screen-replacement",
      description: "OEM-quality display replacement for popular Android and iPhone models.",
      pricePesewas: 35000,
      active: true,
    },
    {
      categoryId: bySlug["gsm-repairs"].id,
      name: "Battery Replacement",
      slug: "battery-replacement",
      description: "Restore all-day battery life with a genuine-capacity cell.",
      pricePesewas: 18000,
      active: true,
    },
    {
      categoryId: bySlug["gsm-repairs"].id,
      name: "Charging Port Repair",
      slug: "charging-port-repair",
      description: "Fix loose or dead charging ports and water damage cleaning.",
      pricePesewas: 15000,
      active: true,
    },
    {
      categoryId: bySlug["gsm-repairs"].id,
      name: "Software Diagnostics",
      slug: "software-diagnostics",
      description: "Unlock, flash, and stabilize software issues.",
      pricePesewas: 8000,
      active: true,
    },
    {
      categoryId: bySlug["gsm-repairs"].id,
      name: "General Diagnosis",
      slug: "general-diagnosis",
      description: "Bring any device — we diagnose and quote before repair.",
      pricePesewas: null,
      active: true,
    },
  ]);

  console.log("Seed complete.");
  console.log(`Admin: ${adminEmail}`);
  console.log(`Manager: ${managerEmail}`);
  console.log(`Consumer: ${consumerEmail}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
