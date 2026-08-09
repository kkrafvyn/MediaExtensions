import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Integration-style checks against a running API.
 * Skips automatically when SKIP_INTEGRATION=1 or the health endpoint is unreachable.
 */
const BASE = process.env.API_URL ?? "http://localhost:4000";
const skip = process.env.SKIP_INTEGRATION === "1";

async function healthOk(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    return Boolean(json.ok);
  } catch {
    return false;
  }
}

describe("API health (integration)", () => {
  it("GET /api/health returns ok when server is up", async (t) => {
    if (skip) {
      t.skip("SKIP_INTEGRATION=1");
      return;
    }
    const up = await healthOk();
    if (!up) {
      t.skip(`API not reachable at ${BASE}`);
      return;
    }
    const res = await fetch(`${BASE}/api/health`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { ok: boolean; brand: string };
    assert.equal(json.ok, true);
    assert.equal(json.brand, "Media Extensions");
  });
});
