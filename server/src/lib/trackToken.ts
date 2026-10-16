import { createHmac, timingSafeEqual } from "node:crypto";

export type TrackKind = "order" | "repair";

type Payload = { k: TrackKind; id: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET ?? process.env.TRACK_TOKEN_SECRET;
  if (!s) throw new Error("SESSION_SECRET required for track tokens");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createTrackToken(kind: TrackKind, id: string, ttlDays = 30): string {
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ k: kind, id, exp } satisfies Payload)).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyTrackToken(token: string): Payload | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  try {
    if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Payload;
    if (!parsed?.id || (parsed.k !== "order" && parsed.k !== "repair")) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
