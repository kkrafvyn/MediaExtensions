export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatGhs(pesewas: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(pesewas / 100);
}

export function shippingPesewasForRegion(region: string): number {
  const accra = Number(process.env.SHIPPING_ACCRA_PESEWAS ?? 2500);
  const other = Number(process.env.SHIPPING_OTHER_PESEWAS ?? 4500);
  const normalized = region.toLowerCase();
  if (normalized.includes("accra") || normalized.includes("greater accra")) {
    return accra;
  }
  return other;
}

export function paymentInstructions() {
  return {
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
