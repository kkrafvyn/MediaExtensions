import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatGhs, paymentInstructions, slugify } from "../lib/utils.js";
import { agentPhoneNumbers, normalizeWhatsAppPhone } from "../lib/whatsapp.js";
import {
  canTransitionFulfillmentStatus,
  canTransitionOrderStatus,
  canTransitionRepairStatus,
  canTransitionReturnStatus,
  isOrderAlreadyPaid,
  isPhysicalReturnEligible,
  paystackRefundStatusForEvent,
  shouldFinalizeStockOnPaid,
} from "../lib/orderTransitions.js";
import { signSessionPayload, vercelSession, verifySessionPayload } from "../middleware/vercelSession.js";
import type { Request, Response } from "express";
import { hashEmailVerificationToken, hashPasswordResetToken, isAllowedOrigin, newPasswordSchema } from "../lib/security.js";
import { initiateRefund } from "../lib/paystack.js";
import { decryptTotpSecret, encryptTotpSecret, generateRecoveryCodes, generateTotpCode, generateTotpSecret, hashRecoveryCode, totpSetupUri, verifyTotp } from "../lib/totp.js";

describe("slugify", () => {
  it("normalizes names to url slugs", () => {
    assert.equal(slugify("Cinematic LUT Pack"), "cinematic-lut-pack");
    assert.equal(slugify("  Hello!!! World  "), "hello-world");
  });
});

describe("formatGhs", () => {
  it("formats pesewas as Ghana cedis", () => {
    const formatted = formatGhs(12550);
    assert.ok(formatted.includes("125.50") || formatted.includes("125.5"));
    assert.ok(/GHS|GH₵|₵/.test(formatted));
  });
});

describe("paymentInstructions", () => {
  it("returns momo, bank, and pickup blocks", () => {
    const info = paymentInstructions();
    assert.ok(info.momo);
    assert.ok(info.bank);
    assert.ok(info.pickup);
    assert.equal(typeof info.paystackEnabled, "boolean");
  });
});

describe("normalizeWhatsAppPhone", () => {
  it("converts Ghana local numbers to 233 format", () => {
    assert.equal(normalizeWhatsAppPhone("0240000000"), "233240000000");
    assert.equal(normalizeWhatsAppPhone("233240000000"), "233240000000");
    assert.equal(normalizeWhatsAppPhone("+233 24 000 0000"), "233240000000");
  });
});

describe("agentPhoneNumbers", () => {
  it("parses comma-separated agent list from env", () => {
    const prev = process.env.WHATSAPP_AGENT_NUMBERS;
    process.env.WHATSAPP_AGENT_NUMBERS = "0240000000, 233501234567";
    assert.deepEqual(agentPhoneNumbers(), ["233240000000", "233501234567"]);
    if (prev === undefined) delete process.env.WHATSAPP_AGENT_NUMBERS;
    else process.env.WHATSAPP_AGENT_NUMBERS = prev;
  });
});

describe("order status transitions", () => {
  it("requires payment before fulfillment and prevents cancelling paid orders", () => {
    assert.equal(canTransitionOrderStatus("pending_payment", "fulfilled"), false);
    assert.equal(canTransitionOrderStatus("awaiting_pickup", "fulfilled"), false);
    assert.equal(canTransitionOrderStatus("paid", "fulfilled"), true);
    assert.equal(canTransitionOrderStatus("paid", "cancelled"), false);
    assert.equal(canTransitionOrderStatus("fulfilled", "cancelled"), false);
  });

  it("allows cancellation of unpaid orders but uses fulfillment state for pickup readiness", () => {
    assert.equal(canTransitionOrderStatus("pending_payment", "awaiting_pickup"), false);
    assert.equal(canTransitionOrderStatus("pending_payment", "cancelled"), true);
    assert.equal(canTransitionOrderStatus("awaiting_pickup", "cancelled"), true);
  });

  it("keeps delivery and pickup fulfillment on their own paths", () => {
    assert.equal(canTransitionFulfillmentStatus("delivery", "unfulfilled", "preparing"), true);
    assert.equal(canTransitionFulfillmentStatus("delivery", "ready_to_ship", "shipped"), true);
    assert.equal(canTransitionFulfillmentStatus("delivery", "shipped", "collected"), false);
    assert.equal(canTransitionFulfillmentStatus("pickup", "preparing", "ready_for_pickup"), true);
    assert.equal(canTransitionFulfillmentStatus("pickup", "ready_for_pickup", "collected"), true);
    assert.equal(canTransitionFulfillmentStatus("pickup", "preparing", "shipped"), false);
    assert.equal(canTransitionFulfillmentStatus("digital", "not_required", "preparing"), false);
  });

  it("requires staff approval before a return can be marked refunded", () => {
    assert.equal(canTransitionReturnStatus("requested", "approved"), true);
    assert.equal(canTransitionReturnStatus("requested", "rejected"), true);
    assert.equal(canTransitionReturnStatus("requested", "refunded"), false);
    assert.equal(canTransitionReturnStatus("approved", "refunded"), true);
    assert.equal(canTransitionReturnStatus("rejected", "approved"), false);
    assert.equal(canTransitionReturnStatus("refunded", "approved"), false);
    assert.equal(canTransitionReturnStatus("refund_failed", "refund_pending"), true);
  });

  it("maps only known Paystack refund events to refund states", () => {
    assert.equal(paystackRefundStatusForEvent("refund.pending"), "refund_pending");
    assert.equal(paystackRefundStatusForEvent("refund.processing"), "refund_processing");
    assert.equal(paystackRefundStatusForEvent("refund.needs-attention"), "refund_needs_attention");
    assert.equal(paystackRefundStatusForEvent("refund.failed"), "refund_failed");
    assert.equal(paystackRefundStatusForEvent("refund.processed"), "refunded");
    assert.equal(paystackRefundStatusForEvent("charge.success"), null);
  });

  it("limits return requests to the seven days after physical delivery or pickup", () => {
    const now = new Date("2026-10-03T12:00:00.000Z");
    const base = { status: "fulfilled", fulfillmentMethod: "delivery", fulfillmentStatus: "delivered", fulfilledAt: new Date("2026-10-01T12:00:00.000Z"), updatedAt: new Date("2026-10-01T12:00:00.000Z") };
    assert.equal(isPhysicalReturnEligible(base, now), true);
    assert.equal(isPhysicalReturnEligible({ ...base, fulfillmentMethod: "digital" }, now), false);
    assert.equal(isPhysicalReturnEligible({ ...base, fulfillmentStatus: "shipped" }, now), false);
    assert.equal(isPhysicalReturnEligible({ ...base, fulfilledAt: new Date("2026-09-25T11:59:59.000Z") }, now), false);
    assert.equal(isPhysicalReturnEligible({ ...base, fulfilledAt: new Date("2026-10-04T12:00:00.000Z") }, now), false);
    assert.equal(isPhysicalReturnEligible({ ...base, fulfilledAt: null, updatedAt: new Date("2026-10-01T12:00:00.000Z") }, now), true);
  });
});

describe("Vercel session cookie signatures", () => {
  it("round-trips cart and user identity only while the signature is valid and unexpired", () => {
    const now = 1_800_000_000_000;
    const token = signSessionPayload({ userId: "user-1", cartSessionId: "cart-1", nonce: "nonce-1" }, "test-secret", now);
    assert.deepEqual(verifySessionPayload(token, "test-secret", now + 1), {
      userId: "user-1",
      cartSessionId: "cart-1",
      nonce: "nonce-1",
      expiresAt: now + 14 * 24 * 60 * 60 * 1000,
    });
    assert.equal(verifySessionPayload(token, "wrong-secret", now + 1), null);
    assert.equal(verifySessionPayload(`${token.slice(0, -1)}x`, "test-secret", now + 1), null);
    assert.equal(verifySessionPayload(token, "test-secret", now + 15 * 24 * 60 * 60 * 1000), null);
  });

  it("persists user and guest-cart identity across requests", () => {
    const middleware = vercelSession("test-secret", true);
    const makeResponse = () => {
      const headers = new Map<string, string>();
      const response = {
        headersSent: false as boolean,
        setHeader(name: string, value: string) { headers.set(name, value); return this; },
        getHeader(name: string) { return headers.get(name); },
        end(this: { headersSent: boolean }) { this.headersSent = true; return this; },
      } as unknown as Response & { headers: Map<string, string> };
      response.headers = headers;
      return response;
    };

    const firstRequest = {} as Request;
    const firstResponse = makeResponse();
    middleware(firstRequest, firstResponse, () => undefined);
    firstRequest.session.userId = "user-1";
    firstRequest.session.cartSessionId = "cart-1";
    firstResponse.end();
    const cookie = firstResponse.headers.get("Set-Cookie");
    assert.ok(cookie);
    const token = cookie!.split(";", 1)[0].slice("connect.sid=".length);

    const nextRequest = { cookies: { "connect.sid": token } } as unknown as Request;
    const nextResponse = makeResponse();
    middleware(nextRequest, nextResponse, () => undefined);
    assert.equal(nextRequest.session.userId, "user-1");
    assert.equal(nextRequest.session.cartSessionId, "cart-1");
  });
});

describe("account security policies", () => {
  it("requires strong new passwords without constraining existing login passwords", () => {
    assert.equal(newPasswordSchema.safeParse("correct-horse-battery").success, true);
    assert.equal(newPasswordSchema.safeParse("shortpass").success, false);
    assert.equal(newPasswordSchema.safeParse("x".repeat(129)).success, false);
  });

  it("allows only configured origins for credentialed browser requests", () => {
    const allowed = new Set(["https://store.example.com", "https://preview-project.vercel.app"]);
    assert.equal(isAllowedOrigin(undefined, allowed), true);
    assert.equal(isAllowedOrigin("https://store.example.com", allowed), true);
    assert.equal(isAllowedOrigin("https://attacker.vercel.app", allowed), false);
  });

  it("stores only a one-way hash of an email-verification token", () => {
    const token = "unpredictable-email-verification-token";
    const hash = hashEmailVerificationToken(token);
    assert.notEqual(hash, token);
    assert.equal(hashEmailVerificationToken(token), hash);
  });
});

describe("Paystack refunds", () => {
  it("queues a GHS refund against the verified transaction reference", async () => {
    const oldKey = process.env.PAYSTACK_SECRET_KEY;
    const oldFetch = globalThis.fetch;
    process.env.PAYSTACK_SECRET_KEY = "test-secret";
    globalThis.fetch = (async (input, init) => {
      assert.equal(String(input), "https://api.paystack.co/refund");
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-secret");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        transaction: "order-reference",
        amount: 2500,
        currency: "GHS",
        customer_note: "Return request ret-123",
        merchant_note: "Damaged item",
      });
      return new Response(JSON.stringify({ status: true, message: "queued", data: { id: 42, status: "pending" } }), { status: 200 });
    }) as typeof fetch;

    try {
      const result = await initiateRefund({
        transactionReference: "order-reference",
        amountPesewas: 2500,
        customerNote: "Return request ret-123",
        merchantNote: "Damaged item",
      });
      assert.equal(result.id, 42);
      assert.equal(result.status, "pending");
    } finally {
      globalThis.fetch = oldFetch;
      if (oldKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
      else process.env.PAYSTACK_SECRET_KEY = oldKey;
    }
  });
});

describe("admin TOTP MFA", () => {
  it("verifies time-based codes and encrypts provisioning secrets at rest", () => {
    const secret = generateTotpSecret();
    const now = 1_800_000_000_000;
    const code = generateTotpCode(secret, now);
    assert.equal(verifyTotp(secret, code, now), true);
    assert.equal(verifyTotp(secret, code, now + 30_000), true);
    assert.equal(verifyTotp(secret, "000000", now), false);
    const encrypted = encryptTotpSecret(secret, "test-master-key");
    assert.equal(encrypted.includes(secret), false);
    assert.equal(decryptTotpSecret(encrypted, "test-master-key"), secret);
    assert.match(totpSetupUri(secret, "admin@example.com"), /^otpauth:\/\/totp\//);
    assert.throws(() => decryptTotpSecret(encrypted, "wrong-master-key"));
    const recoveryCodes = generateRecoveryCodes();
    assert.equal(recoveryCodes.length, 10);
    assert.equal(new Set(recoveryCodes).size, 10);
    assert.equal(hashRecoveryCode(recoveryCodes[0]), hashRecoveryCode(`${recoveryCodes[0].slice(0, 8)}-${recoveryCodes[0].slice(8)}`));
    assert.notEqual(hashRecoveryCode(recoveryCodes[0]), recoveryCodes[0]);
  });
});

describe("repair status transitions", () => {
  it("follows the repair bench workflow", () => {
    assert.equal(canTransitionRepairStatus("submitted", "diagnosing"), true);
    assert.equal(canTransitionRepairStatus("submitted", "ready"), false);
    assert.equal(canTransitionRepairStatus("ready", "completed"), true);
    assert.equal(canTransitionRepairStatus("completed", "cancelled"), false);
  });
});

describe("hashPasswordResetToken", () => {
  it("hashes reset tokens consistently", () => {
    assert.equal(hashPasswordResetToken("abc"), hashPasswordResetToken("abc"));
    assert.notEqual(hashPasswordResetToken("abc"), "abc");
  });
});

describe("markOrderPaid idempotency helpers", () => {
  it("treats paid and fulfilled as terminal", () => {
    assert.equal(isOrderAlreadyPaid("paid"), true);
    assert.equal(isOrderAlreadyPaid("fulfilled"), true);
    assert.equal(isOrderAlreadyPaid("pending_payment"), false);
    assert.equal(isOrderAlreadyPaid("awaiting_pickup"), false);
  });

  it("finalizes reserved stock only from holding statuses", () => {
    assert.equal(shouldFinalizeStockOnPaid("pending_payment"), true);
    assert.equal(shouldFinalizeStockOnPaid("awaiting_pickup"), true);
    assert.equal(shouldFinalizeStockOnPaid("paid"), false);
  });
});
