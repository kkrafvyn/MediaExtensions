export type Role = "admin" | "manager" | "consumer";

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricePesewas: number;
  images: string[];
  fulfillment: "digital" | "physical" | "both";
  stock: number;
  digitalAssetPath?: string | null;
  featured: boolean;
  active?: boolean;
  category?: Category | null;
};

export type CartLine = {
  id: string;
  quantity: number;
  lineTotalPesewas: number;
  product: {
    id: string;
    name: string;
    slug: string;
    pricePesewas: number;
    images: string[];
    fulfillment: Product["fulfillment"];
    stock: number;
  };
};

export type Cart = {
  cartId: string;
  items: CartLine[];
  subtotalPesewas: number;
  needsShipping: boolean;
  itemCount: number;
};

export type RepairService = {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricePesewas: number | null;
};

export type PaymentInfo = {
  momo: { network: string; number: string; name: string };
  bank: { bankName: string; accountNumber: string; accountName: string };
};

export type SiteMeta = {
  brand: string;
  currency: string;
  regions?: string[];
  shipping: { accraPesewas: number; otherPesewas: number };
  pickup?: {
    address?: string;
    landmark?: string;
    hours?: string;
    city?: string;
  };
  storePhone?: string;
  storeWhatsApp?: string;
  storeEmail?: string;
  store?: { phone?: string; whatsapp?: string; email?: string };
  paystackPublicKey?: string | null;
  paystackEnabled?: boolean;
  lowStockThreshold?: number;
};

export type StaffAnalytics = {
  revenuePesewas?: number;
  paidRevenuePesewas?: number;
  orderStatusCounts?: Record<string, number>;
  repairStatusCounts?: Record<string, number>;
  lowStock?: Array<{
    id: string;
    name: string;
    slug: string;
    stock: number;
  }>;
  stats?: {
    orders: number;
    repairs: number;
    products: number;
  };
};

export type OrderSummary = {
  id: string;
  status: string;
  paymentMethod: string;
  totalPesewas: number;
  email: string;
  name: string;
  phone?: string | null;
  createdAt?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPricePesewas: number;
  }>;
  shipping?: {
    fullName?: string;
    street?: string;
    city?: string;
    region?: string;
    phone?: string;
  } | null;
};
