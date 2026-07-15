import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";

const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
);
const LOCAL_DIR = isServerless
  ? path.join(os.tmpdir(), "assets")
  : path.join(process.cwd(), "storage", "assets");

export type MailAssetItem = {
  key: string;
  name: string;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function guessMime(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

export async function storeMailAsset(file: Buffer, filename: string) {
  const provider = process.env.RESUME_STORAGE_PROVIDER ?? "local";
  const safeName = sanitizeFilename(filename || "asset");
  const key = `Assets/${Date.now()}-${safeName}`;

  if (provider === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S2_REGION ?? "auto",
      endpoint: process.env.S2_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S2_BUCKET!,
        Key: key,
        Body: file,
        ContentType: guessMime(safeName),
      }),
    );
    return { key, name: safeName };
  }

  await mkdir(path.join(LOCAL_DIR, "Assets"), { recursive: true });
  await writeFile(path.join(LOCAL_DIR, key), file);
  return { key, name: safeName };
}

export async function listMailAssets(): Promise<MailAssetItem[]> {
  const provider = process.env.RESUME_STORAGE_PROVIDER ?? "local";

  if (provider === "s3") {
    const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S2_REGION ?? "auto",
      endpoint: process.env.S2_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S2_SECRET_ACCESS_KEY!,
      },
    });
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S2_BUCKET!,
        Prefix: "Assets/",
        MaxKeys: 500,
      }),
    );
    const rows = (res.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key) && key.startsWith("Assets/"))
      .map((key) => ({ key, name: key.split("/").at(-1) ?? key }));
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  await mkdir(path.join(LOCAL_DIR, "Assets"), { recursive: true });
  const names = await readdir(path.join(LOCAL_DIR, "Assets"), {
    withFileTypes: true,
  });
  return names
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      key: `Assets/${entry.name}`,
      name: entry.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function readMailAsset(key: string): Promise<{
  body: Buffer;
  contentType: string;
}> {
  if (!key.startsWith("Assets/")) {
    throw new Error("Invalid key");
  }

  const provider = process.env.RESUME_STORAGE_PROVIDER ?? "local";

  if (provider === "s3") {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S2_REGION ?? "auto",
      endpoint: process.env.S2_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S2_SECRET_ACCESS_KEY!,
      },
    });
    const res = await client.send(
      new GetObjectCommand({
        Bucket: process.env.S2_BUCKET!,
        Key: key,
      }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty asset object");
    return {
      body: Buffer.from(bytes),
      contentType: res.ContentType || guessMime(key),
    };
  }

  const filePath = path.join(LOCAL_DIR, key);
  const body = await readFile(filePath);
  return {
    body,
    contentType: guessMime(key),
  };
}

export async function deleteMailAsset(key: string): Promise<void> {
  if (!key.startsWith("Assets/")) {
    throw new Error("Invalid key");
  }

  const provider = process.env.RESUME_STORAGE_PROVIDER ?? "local";

  if (provider === "s3") {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S2_REGION ?? "auto",
      endpoint: process.env.S2_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S2_BUCKET!,
        Key: key,
      }),
    );
    return;
  }

  try {
    await unlink(path.join(LOCAL_DIR, key));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}
