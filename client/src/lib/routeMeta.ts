const DEFAULT =
  "Digital tools, camera gear, and GSM repairs in Koforidua, Ghana. Shop in GHS with MoMo, bank, or Paystack.";

type RouteMeta = { title: string; description: string };

const ROUTES: Array<{ match: RegExp; meta: RouteMeta }> = [
  { match: /^\/shop/, meta: { title: "Shop", description: "Browse digital downloads, camera gear, and audio tools. Prices in Ghana cedis." } },
  { match: /^\/cart/, meta: { title: "Shopping bag", description: "Review items before checkout at Media Extensions." } },
  { match: /^\/checkout/, meta: { title: "Checkout", description: "Pay with MoMo, bank transfer, pay on pickup, or Paystack. Digital downloads unlock after payment is confirmed." } },
  { match: /^\/repairs\/book/, meta: { title: "Book a repair", description: "GSM repair intake in Koforidua — screens, batteries, diagnostics, and board work." } },
  { match: /^\/repairs/, meta: { title: "GSM repairs", description: "Phone and device repairs in Koforidua with clear quotes before billable work." } },
  { match: /^\/track/, meta: { title: "Track order or repair", description: "Self-service tracking for store orders and repair tickets." } },
  { match: /^\/imei-check/, meta: { title: "IMEI format check", description: "Validate a 15-digit IMEI checksum before booking a repair." } },
  { match: /^\/wholesale/, meta: { title: "Wholesale", description: "Bulk pricing for studios, schools, and resellers in Ghana." } },
];

export function getRouteMeta(pathname: string): RouteMeta | null {
  if (/^\/product\//.test(pathname) || /^\/staff/.test(pathname)) return null;
  const entry = ROUTES.find((r) => r.match.test(pathname));
  if (entry) return entry.meta;
  if (pathname === "/") return { title: "Shop & repairs", description: DEFAULT };
  return null;
}
