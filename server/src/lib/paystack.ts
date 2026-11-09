const PAYSTACK_BASE = "https://api.paystack.co";

export type PaystackChannel = "shop" | "repair";

function secretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return key || null;
}

export function publicKey(): string {
  return process.env.PAYSTACK_PUBLIC_KEY?.trim() ?? "";
}

export function isPaystackConfigured(): boolean {
  return Boolean(secretKey() && publicKey());
}

export function subaccountFor(channel: PaystackChannel): string | null {
  const key =
    channel === "shop"
      ? process.env.PAYSTACK_SHOP_SUBACCOUNT
      : process.env.PAYSTACK_REPAIR_SUBACCOUNT;
  const code = key?.trim();
  return code || null;
}

export function isSubaccountConfigured(channel: PaystackChannel): boolean {
  return Boolean(subaccountFor(channel));
}

function defaultCallback(channel: PaystackChannel): string {
  const client = (process.env.CLIENT_URL ?? "http://localhost:5173").replace(/\/$/, "");
  if (channel === "repair") {
    return (
      process.env.PAYSTACK_REPAIR_CALLBACK_URL?.trim() ||
      `${client}/repairs/paystack-return`
    );
  }
  return (
    process.env.PAYSTACK_CALLBACK_URL?.trim() || `${client}/checkout/paystack-return`
  );
}

function feeBearer(): "account" | "subaccount" {
  const raw = process.env.PAYSTACK_BEARER?.trim().toLowerCase();
  return raw === "subaccount" ? "subaccount" : "account";
}

export type PaystackInitResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializeTransaction(opts: {
  channel: PaystackChannel;
  email: string;
  amountPesewas: number;
  reference: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResult | null> {
  const key = secretKey();
  if (!key) {
    console.warn("[paystack] PAYSTACK_SECRET_KEY missing — skip initialize");
    return null;
  }

  const subaccount = subaccountFor(opts.channel);
  if (!subaccount) {
    console.warn(
      `[paystack] ${opts.channel} subaccount not set — settlement stays on main account`,
    );
  }

  const body: Record<string, unknown> = {
    email: opts.email,
    amount: opts.amountPesewas,
    currency: "GHS",
    reference: opts.reference,
    callback_url: opts.callback_url ?? defaultCallback(opts.channel),
    metadata: {
      ...opts.metadata,
      channel: opts.channel,
    },
  };

  if (subaccount) {
    body.subaccount = subaccount;
    body.bearer = feeBearer();
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data?: PaystackInitResult;
  };

  if (!res.ok || !json.status || !json.data) {
    throw new Error(json.message || "Paystack initialize failed");
  }

  return json.data;
}

export type PaystackVerifyResult = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  customer?: { email?: string };
  metadata?: Record<string, unknown>;
};

export async function verifyTransaction(
  reference: string,
): Promise<PaystackVerifyResult | null> {
  const key = secretKey();
  if (!key) {
    console.warn("[paystack] PAYSTACK_SECRET_KEY missing — skip verify");
    return null;
  }

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );

  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data?: PaystackVerifyResult;
  };

  if (!res.ok || !json.status || !json.data) {
    throw new Error(json.message || "Paystack verify failed");
  }

  return json.data;
}

export type PaystackRefundResult = {
  id?: number;
  status?: string;
  refund_reference?: string | null;
  transaction_reference?: string;
};

export async function initiateRefund(opts: {
  transactionReference: string;
  amountPesewas: number;
  customerNote: string;
  merchantNote: string;
}): Promise<PaystackRefundResult> {
  const key = secretKey();
  if (!key) throw new Error("Paystack is not configured");

  const res = await fetch(`${PAYSTACK_BASE}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: opts.transactionReference,
      amount: opts.amountPesewas,
      currency: "GHS",
      customer_note: opts.customerNote,
      merchant_note: opts.merchantNote,
    }),
  });

  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data?: PaystackRefundResult;
  };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(json.message || "Paystack refund could not be queued");
  }
  return json.data;
}
