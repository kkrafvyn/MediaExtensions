const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return key || null;
}

export function isPaystackConfigured(): boolean {
  return Boolean(secretKey());
}

export type PaystackInitResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializeTransaction(opts: {
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

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountPesewas,
      currency: "GHS",
      reference: opts.reference,
      callback_url:
        opts.callback_url ??
        process.env.PAYSTACK_CALLBACK_URL ??
        `${process.env.CLIENT_URL ?? "http://localhost:5173"}/checkout/paystack-return`,
      metadata: opts.metadata,
    }),
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
