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
import pg from "pg";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import type { AuthedRequest } from "./middleware/auth.js";
import { GH_REGIONS, paymentInstructions } from "./lib/utils.js";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import checkoutRoutes from "./routes/checkout.js";
import orderRoutes from "./routes/orders.js";
import downloadRoutes from "./routes/downloads.js";
import repairRoutes from "./routes/repairs.js";
import staffRoutes from "./routes/staff.js";
import contactRoutes from "./routes/contact.js";
import { handlePaystackWebhook } from "./routes/paystackWebhook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../storage/uploads");
const downloadsDir = path.resolve(__dirname, "../storage/downloads");
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

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(downloadsDir, { recursive: true });

export const app = express();
const PgSession = connectPgSimple(session);

const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      // Allow preview deployments on vercel.app
      if (origin.endsWith(".vercel.app")) {
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
app.use(
  session({
    store: new PgSession({
      pool: sessionPool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? "dev-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  }),
);

app.use("/uploads", express.static(uploadsDir));

app.use(async (req: AuthedRequest, _res, next) => {
  req.user = null;
  if (req.session.userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId),
    });
    req.user = user ?? null;
    if (!user) delete req.session.userId;
  }
  next();
});

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, brand: "Media Extensions" });
});

app.get("/api/meta", (_req, res) => {
  const payments = paymentInstructions();
  res.json({
    brand: "Media Extensions",
    currency: "GHS",
    regions: GH_REGIONS,
    shipping: {
      accraPesewas: Number(process.env.SHIPPING_ACCRA_PESEWAS ?? 2500),
      otherPesewas: Number(process.env.SHIPPING_OTHER_PESEWAS ?? 4500),
    },
    pickup: payments.pickup,
    store: payments.store,
    storePhone: payments.store.phone,
    storeWhatsApp: payments.store.whatsapp,
    storeEmail: payments.store.email,
    paystackEnabled: payments.paystackEnabled,
    paystackPublicKey: payments.paystackPublicKey,
    lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? 5),
  });
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/contact", contactLimiter);
app.use("/api/checkout", checkoutLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/contact", contactRoutes);

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
