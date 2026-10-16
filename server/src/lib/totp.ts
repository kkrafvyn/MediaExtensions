import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(bytes: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(text: string) {
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of text.toUpperCase().replace(/=+$/g, "")) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("Invalid MFA secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function encryptionKey(masterKey = process.env.MFA_ENCRYPTION_KEY ?? process.env.SESSION_SECRET) {
  if (!masterKey?.trim()) throw new Error("MFA_ENCRYPTION_KEY or SESSION_SECRET is required to encrypt MFA secrets");
  return createHash("sha256").update(masterKey).digest();
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => randomBytes(8).toString("hex").toUpperCase());
}

export function hashRecoveryCode(code: string) {
  return createHash("sha256").update(code.replace(/[-\s]/g, "").toUpperCase()).digest("hex");
}

export function generateTotpCode(secret: string, timeMs = Date.now()) {
  const counter = BigInt(Math.floor(timeMs / 30_000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, timeMs = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  const candidate = Buffer.from(code);
  for (const offset of [-1, 0, 1]) {
    const expected = Buffer.from(generateTotpCode(secret, timeMs + offset * 30_000));
    if (timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}

export function encryptTotpSecret(secret: string, masterKey?: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(masterKey), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptTotpSecret(value: string, masterKey?: string) {
  const [version, ivValue, tagValue, cipherValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !cipherValue) throw new Error("Invalid encrypted MFA secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(masterKey), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function totpSetupUri(secret: string, email: string, issuer = "Media Extensions") {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const query = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${query.toString()}`;
}
