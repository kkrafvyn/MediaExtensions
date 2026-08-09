import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatGhs, paymentInstructions, slugify } from "../lib/utils.js";

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
