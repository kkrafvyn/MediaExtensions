import { Router } from "express";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories, products } from "../db/schema.js";

const router = Router();

router.get("/categories", async (_req, res) => {
  const rows = await db.query.categories.findMany({
    where: eq(categories.active, true),
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
  });
  res.json({ categories: rows });
});

router.get("/", async (req, res) => {
  const { category, fulfillment, q, featured } = req.query;
  const conditions = [eq(products.active, true)];

  if (typeof category === "string" && category) {
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, category),
    });
    if (cat) conditions.push(eq(products.categoryId, cat.id));
  }
  if (typeof fulfillment === "string" && ["digital", "physical", "both"].includes(fulfillment)) {
    conditions.push(eq(products.fulfillment, fulfillment as "digital" | "physical" | "both"));
  }
  if (featured === "true") {
    conditions.push(eq(products.featured, true));
  }
  if (typeof q === "string" && q.trim()) {
    conditions.push(
      or(ilike(products.name, `%${q}%`), ilike(products.description, `%${q}%`))!,
    );
  }

  const rows = await db.query.products.findMany({
    where: and(...conditions),
    with: { category: true },
    orderBy: [asc(products.name)],
  });

  res.json({ products: rows });
});

router.get("/:slug", async (req, res) => {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, req.params.slug), eq(products.active, true)),
    with: { category: true },
  });
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json({ product });
});

export default router;
