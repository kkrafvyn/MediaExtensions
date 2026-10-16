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

describe("Authentication and guest-cart persistence (integration)", () => {
  it("keeps a new account and its cart session across requests", async (t) => {
    if (process.env.RUN_AUTH_WORKFLOW !== "1") {
      t.skip("Set RUN_AUTH_WORKFLOW=1 against a disposable API/database to run the auth workflow");
      return;
    }
    if (!(await healthOk())) {
      t.skip(`API not reachable at ${BASE}`);
      return;
    }

    const email = `workflow-${crypto.randomUUID()}@example.test`;
    const register = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: "Workflow Test", password: "workflow-test-password-12" }),
    });
    assert.equal(register.status, 201);
    const setCookie = register.headers.get("set-cookie");
    assert.ok(setCookie, "registration should persist a session cookie");
    const cookie = setCookie!.split(";", 1)[0];

    const me = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal(me.status, 200);
    const meBody = (await me.json()) as { user: { email: string } | null };
    assert.equal(meBody.user?.email, email);

    const firstCart = await fetch(`${BASE}/api/cart`, { headers: { Cookie: cookie } });
    const secondCart = await fetch(`${BASE}/api/cart`, { headers: { Cookie: cookie } });
    assert.equal(firstCart.status, 200);
    assert.equal(secondCart.status, 200);
    const firstCartBody = (await firstCart.json()) as { cartId: string };
    const secondCartBody = (await secondCart.json()) as { cartId: string };
    assert.equal(firstCartBody.cartId, secondCartBody.cartId);

    const logout = await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { Cookie: cookie } });
    assert.equal(logout.status, 200);
    const afterLogout = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
    const logoutBody = (await afterLogout.json()) as { user: null };
    assert.equal(logoutBody.user, null);
  });
});
