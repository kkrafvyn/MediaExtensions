/** Build a manual wa.me link (fallback when API is not configured). */
export function whatsappLink(message: string, phone?: string): string {
  const digits = normalizeWhatsAppPhone(phone ?? process.env.STORE_WHATSAPP ?? "");
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

const GRAPH_API = "https://graph.facebook.com/v21.0";

/** Normalize Ghana/local numbers to WhatsApp digits (e.g. 23324…). */
export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `233${digits.slice(1)}`;
  return digits;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

export function shouldNotifyCustomers(): boolean {
  return process.env.WHATSAPP_NOTIFY_CUSTOMERS === "1";
}

/** Staff/agent numbers that receive new-customer alerts (comma-separated). */
export function agentPhoneNumbers(): string[] {
  const raw =
    process.env.WHATSAPP_AGENT_NUMBERS?.trim() ||
    process.env.STORE_WHATSAPP?.trim() ||
    "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const normalized = normalizeWhatsAppPhone(part);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

export type WhatsAppSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
  to: string;
};

export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<WhatsAppSendResult> {
  const toPhone = normalizeWhatsAppPhone(to);
  if (!toPhone) {
    return { ok: false, to: to, error: "invalid_phone" };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return { ok: false, to: toPhone, error: "not_configured" };
  }

  try {
    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: { preview_url: false, body },
      }),
    });

    const json = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        ok: false,
        to: toPhone,
        error: json.error?.message ?? res.statusText,
      };
    }

    return { ok: true, to: toPhone, messageId: json.messages?.[0]?.id };
  } catch (err) {
    return {
      ok: false,
      to: toPhone,
      error: err instanceof Error ? err.message : "send_failed",
    };
  }
}

/** Push the same alert to every configured staff agent. */
export async function notifyStaffAgents(
  message: string,
): Promise<WhatsAppSendResult[]> {
  const agents = agentPhoneNumbers();
  if (!agents.length) {
    return [];
  }
  return Promise.all(agents.map((agent) => sendWhatsAppText(agent, message)));
}
