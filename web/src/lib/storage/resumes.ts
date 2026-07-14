import { mkdir, writeFile, readFile } from "fs/promises";
import os from "os";
import path from "path";
import { v4 as uuid } from "uuid";

// Serverless platforms (Vercel/Lambda) mount the app directory read-only; only
// the OS temp dir is writable. Fall back to it so local file writes don't 500.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_DIR = isServerless
  ? path.join(os.tmpdir(), "resumes")
  : path.join(process.cwd(), "storage", "resumes");

export async function storeResume(
  file: Buffer,
  filename: string,
): Promise<string> {
  const provider = process.env.RESUME_STORAGE_PROVIDER ?? "local";
  const key = `${uuid()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

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
        ContentType: guessMime(filename),
      }),
    );
    return key;
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, key), file);
  return key;
}

export async function readResume(key: string): Promise<Buffer> {
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
      new GetObjectCommand({ Bucket: process.env.S2_BUCKET!, Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty resume object");
    return Buffer.from(bytes);
  }
  return readFile(path.join(LOCAL_DIR, key));
}

function guessMime(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}
