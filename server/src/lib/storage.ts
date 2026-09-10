import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type StorageKind = "uploads" | "downloads";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRoot = path.resolve(__dirname, "../../storage");

function driver(): "local" | "s3" {
  const value = (process.env.STORAGE_DRIVER ?? "local").trim().toLowerCase();
  return value === "s3" ? "s3" : "local";
}

function localDir(kind: StorageKind): string {
  return path.join(localRoot, kind);
}

function s3Bucket(): string {
  const bucket = process.env.S3_BUCKET?.trim() || process.env.R2_BUCKET?.trim();
  if (!bucket) throw new Error("S3_BUCKET (or R2_BUCKET) is required when STORAGE_DRIVER=s3");
  return bucket;
}

function s3Key(kind: StorageKind, filename: string): string {
  const prefix = (process.env.S3_PREFIX ?? "media").replace(/\/+$/, "");
  return `${prefix}/${kind}/${filename}`;
}

let s3Client: S3Client | null = null;

function getS3(): S3Client {
  if (s3Client) return s3Client;

  const endpoint = process.env.S3_ENDPOINT?.trim() || process.env.R2_ENDPOINT?.trim();
  const region = process.env.S3_REGION?.trim() || process.env.R2_REGION?.trim() || "auto";
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID?.trim() || process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY?.trim() || process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 access credentials are required when STORAGE_DRIVER=s3");
  }

  s3Client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });
  return s3Client;
}

export function isLocalStorage(): boolean {
  return driver() === "local";
}

export function getLocalUploadsDir(): string {
  return localDir("uploads");
}

export function getLocalDownloadsDir(): string {
  return localDir("downloads");
}

/** Ensure local directories exist when using the local driver. */
export function ensureLocalStorageDirs(): void {
  if (!isLocalStorage()) return;
  fs.mkdirSync(localDir("uploads"), { recursive: true });
  fs.mkdirSync(localDir("downloads"), { recursive: true });
}

export function safeStorageFilename(originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${safe}`;
}

/** Public URL stored on product.images for storefront display. */
export function publicUploadUrl(filename: string): string {
  const key = path.basename(filename);
  if (driver() === "s3") {
    const base =
      process.env.S3_PUBLIC_BASE_URL?.trim() ||
      process.env.R2_PUBLIC_BASE_URL?.trim();
    if (base) {
      return `${base.replace(/\/+$/, "")}/${s3Key("uploads", key)}`;
    }
  }
  return `/uploads/${key}`;
}

export async function putObject(
  kind: StorageKind,
  filename: string,
  body: Buffer,
  contentType?: string,
): Promise<{ key: string; publicUrl?: string }> {
  const key = path.basename(filename);

  if (driver() === "local") {
    const dir = localDir(kind);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, key), body);
    return {
      key,
      publicUrl: kind === "uploads" ? publicUploadUrl(key) : undefined,
    };
  }

  await getS3().send(
    new PutObjectCommand({
      Bucket: s3Bucket(),
      Key: s3Key(kind, key),
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );

  return {
    key,
    publicUrl: kind === "uploads" ? publicUploadUrl(key) : undefined,
  };
}

export async function objectExists(kind: StorageKind, filename: string): Promise<boolean> {
  const key = path.basename(filename);

  if (driver() === "local") {
    try {
      await fsp.access(path.join(localDir(kind), key));
      return true;
    } catch {
      return false;
    }
  }

  try {
    await getS3().send(
      new HeadObjectCommand({
        Bucket: s3Bucket(),
        Key: s3Key(kind, key),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export type StoredObject = {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
  filename: string;
};

export async function getObject(kind: StorageKind, filename: string): Promise<StoredObject | null> {
  const key = path.basename(filename);

  if (driver() === "local") {
    const filePath = path.join(localDir(kind), key);
    try {
      await fsp.access(filePath);
    } catch {
      return null;
    }
    const stat = await fsp.stat(filePath);
    return {
      stream: fs.createReadStream(filePath),
      contentLength: stat.size,
      filename: key,
    };
  }

  try {
    const result = await getS3().send(
      new GetObjectCommand({
        Bucket: s3Bucket(),
        Key: s3Key(kind, key),
      }),
    );
    if (!result.Body) return null;

    const body = result.Body as { transformToWebStream?: () => ReadableStream } & NodeJS.ReadableStream;
    const stream =
      typeof body.transformToWebStream === "function"
        ? Readable.fromWeb(body.transformToWebStream() as import("node:stream/web").ReadableStream)
        : (body as Readable);

    return {
      stream,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      filename: key,
    };
  } catch {
    return null;
  }
}
