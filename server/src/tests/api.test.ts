import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatGhs, paymentInstructions, slugify } from "../lib/utils.js";
import { agentPhoneNumbers, normalizeWhatsAppPhone } from "../lib/whatsapp.js";

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
