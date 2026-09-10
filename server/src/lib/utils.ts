import { getStoreConfigSync } from "./storeConfig.js";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatGhs(pesewas: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(pesewas / 100);
}

export function shippingPesewasForRegion(region: string): number {
  const { shipping } = getStoreConfigSync();
  const normalized = region.toLowerCase();
  if (normalized.includes("accra") || normalized.includes("greater accra")) {
    return shipping.accraPesewas;
  }
  return shipping.otherPesewas;
}

export function paymentInstructions() {
  const config = getStoreConfigSync();
  return {
    momo: config.momo,
    bank: config.bank,
    pickup: config.pickup,
    store: config.store,
    paystackEnabled: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
  };
}

export const GH_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Eastern",
  "Central",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Western North",
  "Oti",
  "Savannah",
  "North East",
] as const;
