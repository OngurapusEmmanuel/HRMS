import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Storage abstraction with two backends, selected by STORAGE_PROVIDER:
//   - "local" (default): writes to public/uploads. Fine for a single
//     persistent server, NOT for stateless serverless deploys (Vercel) —
//     the filesystem doesn't survive between invocations there.
//   - "s3": any S3-compatible object store — AWS S3, Cloudflare R2, or GCS
//     via its S3 interoperability API (https://cloud.google.com/storage/docs/interoperability).
//     Configure via S3_BUCKET / S3_REGION / S3_ACCESS_KEY_ID /
//     S3_SECRET_ACCESS_KEY / S3_ENDPOINT (S3_ENDPOINT only needed for R2/GCS,
//     omit it for real AWS S3) and optionally S3_PUBLIC_URL_BASE if the
//     bucket is served through a CDN/custom domain rather than the raw
//     endpoint.
//
// Every call site only depends on saveFile()/deleteFile()'s signatures, so
// switching providers is a config change, not a code change.

export type SavedFile = { url: string; sizeBytes: number; mimeType: string };

const PROVIDER = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();

function uniqueFilename(originalName: string): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "";
  return `${randomUUID()}${ext ? `.${ext}` : ""}`;
}

// ---------- Local disk backend ----------

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function saveFileLocal(file: File): Promise<SavedFile> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = uniqueFilename(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return {
    url: `/uploads/${filename}`,
    sizeBytes: buffer.byteLength,
    mimeType: file.type || "application/octet-stream",
  };
}

async function deleteFileLocal(url: string): Promise<void> {
  // url looks like "/uploads/<filename>" — only ever delete inside the
  // upload directory, never resolve an arbitrary caller-supplied path.
  const filename = path.basename(url);
  await unlink(path.join(UPLOAD_DIR, filename));
}

// ---------- S3-compatible backend ----------
// Dynamically imported so the AWS SDK is never bundled/loaded when running
// with the local provider (keeps the default dev setup dependency-free).

async function getS3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT, // unset = real AWS S3
    forcePathStyle: Boolean(process.env.S3_ENDPOINT), // required by R2/most non-AWS endpoints
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function publicUrlFor(key: string): string {
  if (process.env.S3_PUBLIC_URL_BASE) {
    return `${process.env.S3_PUBLIC_URL_BASE.replace(/\/$/, "")}/${key}`;
  }
  // Fall back to constructing a standard virtual-hosted-style URL. This
  // matches AWS S3 and most compatible providers; if yours differs, set
  // S3_PUBLIC_URL_BASE explicitly rather than relying on this guess.
  const endpoint = process.env.S3_ENDPOINT?.replace(/^https?:\/\//, "");
  const bucket = process.env.S3_BUCKET;
  if (endpoint) return `https://${bucket}.${endpoint}/${key}`;
  return `https://${bucket}.s3.${process.env.S3_REGION ?? "us-east-1"}.amazonaws.com/${key}`;
}

async function saveFileS3(file: File): Promise<SavedFile> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  const key = `uploads/${uniqueFilename(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return { url: publicUrlFor(key), sizeBytes: buffer.byteLength, mimeType };
}

async function deleteFileS3(url: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  // Recover the object key from whatever URL shape we stored — works for
  // both the S3_PUBLIC_URL_BASE and the guessed-endpoint forms above.
  const key = url.includes("/uploads/") ? `uploads/${url.split("/uploads/")[1]}` : url;

  await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}

// ---------- Public API ----------

export async function saveFile(file: File): Promise<SavedFile> {
  return PROVIDER === "s3" ? saveFileS3(file) : saveFileLocal(file);
}

// Best-effort by design — callers should never fail a request just because
// the underlying blob cleanup didn't succeed (already-deleted, permissions
// drift, etc).
export async function deleteFile(url: string): Promise<void> {
  try {
    if (PROVIDER === "s3") {
      await deleteFileS3(url);
    } else {
      await deleteFileLocal(url);
    }
  } catch (err) {
    console.error("Failed to delete stored file:", err);
  }
}

export function storageStatus(): { provider: "local" | "s3"; configured: boolean } {
  if (PROVIDER === "s3") {
    const configured = Boolean(
      process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    );
    return { provider: "s3", configured };
  }
  return { provider: "local", configured: true };
}
