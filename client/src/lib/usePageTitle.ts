import { useEffect } from "react";

const BASE = "Media Extensions";

const ROUTE_TITLES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/$/, title: "Creator Tools, Gear & GSM Repairs" },
  { match: /^\/shop/, title: "Shop" },
  { match: /^\/product\//, title: "Product" },
  { match: /^\/cart/, title: "Shopping Bag" },
  { match: /^\/checkout\/paystack-return/, title: "Payment Confirmation" },
  { match: /^\/checkout/, title: "Checkout" },
  { match: /^\/order\/[^/]+\/receipt/, title: "Order Receipt" },
  { match: /^\/order\//, title: "Order Details" },
  { match: /^\/track/, title: "Track Order or Repair" },
  { match: /^\/account\/repairs/, title: "Repair Tickets" },
  { match: /^\/account/, title: "My Account" },
  { match: /^\/repairs\/book/, title: "Book a Repair" },
  { match: /^\/repairs\/status\/[^/]+\/receipt/, title: "Repair Receipt" },
  { match: /^\/repairs\/status\//, title: "Repair Status" },
  { match: /^\/repairs/, title: "GSM Repairs" },
  { match: /^\/imei-check/, title: "IMEI Checker" },
  { match: /^\/about/, title: "About" },
  { match: /^\/contact/, title: "Contact" },
  { match: /^\/shipping/, title: "Shipping" },
  { match: /^\/returns/, title: "Returns & Warranty" },
  { match: /^\/privacy/, title: "Privacy Policy" },
  { match: /^\/terms/, title: "Terms of Service" },
  { match: /^\/faq/, title: "FAQ" },
  { match: /^\/pickup/, title: "Accra Pickup" },
  { match: /^\/login/, title: "Sign In" },
  { match: /^\/register/, title: "Create Account" },
  { match: /^\/forgot-password/, title: "Forgot Password" },
  { match: /^\/reset-password/, title: "Reset Password" },
  { match: /^\/staff/, title: "Staff Console" },
];

export function usePageTitle(pathname: string) {
  useEffect(() => {
    const entry = ROUTE_TITLES.find((r) => r.match.test(pathname));
    const page = entry?.title ?? "Page Not Found";
    document.title = `${page} · ${BASE}`;
  }, [pathname]);
}
