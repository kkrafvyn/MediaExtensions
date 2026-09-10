import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { storeSettings } from "../db/schema.js";

export type StoreConfig = {
  shipping: { accraPesewas: number; otherPesewas: number };
  momo: { network: string; number: string; name: string };
  bank: { bankName: string; accountNumber: string; accountName: string };
  pickup: {
    name: string;
    address: string;
    landmark: string;
    hours: string;
    mapUrl: string;
  };
  store: { phone: string; whatsapp: string; email: string };
  lowStockThreshold: number;
};

const KEYS = [
  "shipping.accraPesewas",
  "shipping.otherPesewas",
  "momo.network",
  "momo.number",
  "momo.name",
  "bank.bankName",
  "bank.accountNumber",
  "bank.accountName",
  "pickup.name",
  "pickup.address",
  "pickup.landmark",
  "pickup.hours",
  "pickup.mapUrl",
  "store.phone",
  "store.whatsapp",
  "store.email",
  "lowStockThreshold",
] as const;

type SettingKey = (typeof KEYS)[number];

function envDefaults(): StoreConfig {
  return {
    shipping: {
      accraPesewas: Number(process.env.SHIPPING_ACCRA_PESEWAS ?? 2500),
      otherPesewas: Number(process.env.SHIPPING_OTHER_PESEWAS ?? 4500),
    },
    momo: {
      network: process.env.MOMO_NETWORK ?? "MTN",
      number: process.env.MOMO_NUMBER ?? "",
      name: process.env.MOMO_NAME ?? "Media Extensions",
    },
    bank: {
      bankName: process.env.BANK_NAME ?? "",
      accountNumber: process.env.BANK_ACCOUNT ?? "",
      accountName: process.env.BANK_ACCOUNT_NAME ?? "Media Extensions",
    },
    pickup: {
      name: process.env.PICKUP_NAME ?? "Media Extensions Store",
      address: process.env.PICKUP_ADDRESS ?? "",
      landmark: process.env.PICKUP_LANDMARK ?? "",
      hours: process.env.PICKUP_HOURS ?? "",
      mapUrl: process.env.PICKUP_MAP_URL ?? "",
    },
    store: {
      phone: process.env.STORE_PHONE ?? "",
      whatsapp: process.env.STORE_WHATSAPP ?? "",
      email: process.env.STORE_EMAIL ?? "",
    },
    lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? 5),
  };
}

function applyOverrides(base: StoreConfig, map: Record<string, string>): StoreConfig {
  const num = (key: string, fallback: number) => {
    if (map[key] == null || map[key] === "") return fallback;
    const n = Number(map[key]);
    return Number.isFinite(n) ? n : fallback;
  };
  const str = (key: string, fallback: string) =>
    map[key] != null && map[key] !== "" ? map[key] : fallback;

  return {
    shipping: {
      accraPesewas: num("shipping.accraPesewas", base.shipping.accraPesewas),
      otherPesewas: num("shipping.otherPesewas", base.shipping.otherPesewas),
    },
    momo: {
      network: str("momo.network", base.momo.network),
      number: str("momo.number", base.momo.number),
      name: str("momo.name", base.momo.name),
    },
    bank: {
      bankName: str("bank.bankName", base.bank.bankName),
      accountNumber: str("bank.accountNumber", base.bank.accountNumber),
      accountName: str("bank.accountName", base.bank.accountName),
    },
    pickup: {
      name: str("pickup.name", base.pickup.name),
      address: str("pickup.address", base.pickup.address),
      landmark: str("pickup.landmark", base.pickup.landmark),
      hours: str("pickup.hours", base.pickup.hours),
      mapUrl: str("pickup.mapUrl", base.pickup.mapUrl),
    },
    store: {
      phone: str("store.phone", base.store.phone),
      whatsapp: str("store.whatsapp", base.store.whatsapp),
      email: str("store.email", base.store.email),
    },
    lowStockThreshold: Math.max(0, num("lowStockThreshold", base.lowStockThreshold)),
  };
}

function configToMap(config: StoreConfig): Record<SettingKey, string> {
  return {
    "shipping.accraPesewas": String(config.shipping.accraPesewas),
    "shipping.otherPesewas": String(config.shipping.otherPesewas),
    "momo.network": config.momo.network,
    "momo.number": config.momo.number,
    "momo.name": config.momo.name,
    "bank.bankName": config.bank.bankName,
    "bank.accountNumber": config.bank.accountNumber,
    "bank.accountName": config.bank.accountName,
    "pickup.name": config.pickup.name,
    "pickup.address": config.pickup.address,
    "pickup.landmark": config.pickup.landmark,
    "pickup.hours": config.pickup.hours,
    "pickup.mapUrl": config.pickup.mapUrl,
    "store.phone": config.store.phone,
    "store.whatsapp": config.store.whatsapp,
    "store.email": config.store.email,
    lowStockThreshold: String(config.lowStockThreshold),
  };
}

let cache: StoreConfig | null = null;

export function getStoreConfigSync(): StoreConfig {
  return cache ?? envDefaults();
}

export async function loadStoreConfig(): Promise<StoreConfig> {
  try {
    const rows = await db.select().from(storeSettings);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    cache = applyOverrides(envDefaults(), map);
  } catch (err) {
    console.warn("[store-config] falling back to env defaults", err);
    cache = envDefaults();
  }
  return cache;
}

export async function ensureStoreConfig(): Promise<StoreConfig> {
  if (cache) return cache;
  return loadStoreConfig();
}

export async function saveStoreConfig(partial: Partial<StoreConfig>): Promise<StoreConfig> {
  const current = await ensureStoreConfig();
  const next: StoreConfig = {
    shipping: { ...current.shipping, ...partial.shipping },
    momo: { ...current.momo, ...partial.momo },
    bank: { ...current.bank, ...partial.bank },
    pickup: { ...current.pickup, ...partial.pickup },
    store: { ...current.store, ...partial.store },
    lowStockThreshold:
      partial.lowStockThreshold != null ? partial.lowStockThreshold : current.lowStockThreshold,
  };

  const map = configToMap(next);
  for (const key of KEYS) {
    const existing = await db.query.storeSettings.findFirst({
      where: eq(storeSettings.key, key),
    });
    if (existing) {
      await db
        .update(storeSettings)
        .set({ value: map[key], updatedAt: new Date() })
        .where(eq(storeSettings.key, key));
    } else {
      await db.insert(storeSettings).values({ key, value: map[key] });
    }
  }

  cache = next;
  return next;
}
