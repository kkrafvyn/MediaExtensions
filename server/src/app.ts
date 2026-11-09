import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db, pool } from "./db/index.js";
import { products, users } from "./db/schema.js";
import type { AuthedRequest } from "./middleware/auth.js";
import { GH_REGIONS, paymentInstructions } from "./lib/utils.js";
import { ensureStoreConfig, loadStoreConfig } from "./lib/storeConfig.js";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import checkoutRoutes from "./routes/checkout.js";
import orderRoutes from "./routes/orders.js";
import downloadRoutes from "./routes/downloads.js";
import repairRoutes from "./routes/repairs.js";
import staffRoutes from "./routes/staff.js";
import contactRoutes from "./routes/contact.js";
import trackPublicRoutes from "./routes/trackPublic.js";
import { handlePaystackWebhook } from "./routes/paystackWebhook.js";
import { vercelSession } from "./middleware/vercelSession.js";
import { isAllowedOrigin } from "./lib/security.js";
import { hitRateLimit } from "./lib/postgresRateLimit.js";
import type { NextFunction } from "express";

import {
  ensureLocalStorageDirs,
  getLocalUploadsDir,
  isLocalStorage,
} from "./lib/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
const isProd = process.env.NODE_ENV === "production";
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

if (isProd && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production");
}

const allowedOrigins = new Set(
  [
    CLIENT_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
  ].filter(Boolean) as string[],
);

if (!process.env.VERCEL) {
  ensureLocalStorageDirs();
  void loadStoreConfig();
}

export const app = express();
const PgSession = connectPgSimple(session);

app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for ${origin}`));
    },
    credentials: true,
  }),
);
app.post(
  "/api/checkout/paystack/webhook",
  express.raw({ type: "application/json" }),
  (req: Request, res: Response) => {
    void handlePaystackWebhook(req, res);
  },
);

app.use(express.json());
app.use(cookieParser());

// Liveness before session/DB — used to diagnose cold-start hangs on Vercel
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, brand: "Media Extensions" });
});

if (process.env.VERCEL === "1") {
  app.use(vercelSession(process.env.SESSION_SECRET ?? "dev-secret", isProd));
} else {
  app.use(
    session({
      store: new PgSession({
        pool: pool as never,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET ?? "dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        maxAge: 1000 * 60 * 60 * 24 * 14,
      },
    }),
  );
}

if (isLocalStorage() && process.env.VERCEL !== "1") {
  app.use("/uploads", express.static(getLocalUploadsDir()));
}

app.use(async (req: AuthedRequest, _res, next) => {
  req.user = null;
  try {
    if (req.session?.userId) {
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      const sessionVersion = (req.session as { sessionVersion?: number }).sessionVersion;
      if (user && sessionVersion != null && user.sessionVersion !== sessionVersion) {
        delete req.session.userId;
        req.user = null;
      } else {
        req.user = user ?? null;
        if (!user) delete req.session.userId;
      }
    }
  } catch (err) {
    console.warn("[auth middleware]", err);
  }
  next();
});

function sharedRateLimit(scope: string, max: number, windowMs: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const allowed = await hitRateLimit(`${scope}:${ip}`, max, windowMs);
    if (!allowed) {
      return res.status(429).json({ error: "Too many attempts, try again later" });
    }
    next();
  };
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many contact submissions, try again later" },
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts, try again later" },
});

app.get("/api/meta", async (_req, res) => {
  const config = await ensureStoreConfig();
  const payments = paymentInstructions();
  res.json({
    brand: "Media Extensions",
    currency: "GHS",
    regions: GH_REGIONS,
    shipping: {
      accraPesewas: config.shipping.accraPesewas,
      otherPesewas: config.shipping.otherPesewas,
    },
    pickup: payments.pickup,
    store: payments.store,
    storePhone: payments.store.phone,
    storeWhatsApp: payments.store.whatsapp,
    storeEmail: payments.store.email,
    paystackEnabled: payments.paystackEnabled,
    paystackPublicKey: payments.paystackPublicKey,
    paystackShopSubaccountConfigured: payments.paystackShopSubaccountConfigured,
    paystackRepairSubaccountConfigured: payments.paystackRepairSubaccountConfigured,
    lowStockThreshold: config.lowStockThreshold,
  });
});

app.use("/api/auth/login", sharedRateLimit("auth-login", 30, 15 * 60 * 1000), authLimiter);
app.use("/api/auth/register", sharedRateLimit("auth-register", 30, 15 * 60 * 1000), authLimiter);
app.use("/api/auth/forgot-password", sharedRateLimit("auth-forgot", 20, 15 * 60 * 1000), authLimiter);
app.use("/api/auth/reset-password", sharedRateLimit("auth-reset", 20, 15 * 60 * 1000), authLimiter);
app.use("/api/auth/verify-email", authLimiter);
app.use("/api/auth/email-verification/resend", authLimiter);
app.use("/api/auth/mfa", sharedRateLimit("auth-mfa", 30, 15 * 60 * 1000), authLimiter);
app.use("/api/contact", sharedRateLimit("contact", 20, 15 * 60 * 1000), contactLimiter);
app.use("/api/checkout", sharedRateLimit("checkout", 40, 15 * 60 * 1000), checkoutLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/track", trackPublicRoutes);

app.get("/sitemap.xml", async (_req, res) => {
  const base = CLIENT_URL.replace(/\/$/, "");
  const activeProducts = await db
    .select({ slug: products.slug, createdAt: products.createdAt })
    .from(products)
    .where(eq(products.active, true));
  const staticPaths = [
    "",
    "shop",
    "repairs",
    "repairs/book",
    "repairs/warranty",
    "repairs/how-we-quote",
    "wholesale",
    "track",
    "about",
    "contact",
    "shipping",
    "returns",
    "faq",
    "pickup",
  ];
  const urls = [
    ...staticPaths.map((p) => `${base}/${p}`.replace(/\/$/, "") || base),
    ...activeProducts.map((p) => `${base}/product/${p.slug}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `  <url><loc>${loc}</loc></url>`).join("\n")}
</urlset>`;
  res.type("application/xml").send(xml);
});

// Static SPA is handled by Vercel for production web; keep for Docker/self-host.
if (process.env.VERCEL !== "1" && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

export default app;
