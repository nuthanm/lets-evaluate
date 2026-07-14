import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_ANALYSIS_MODEL: z.string().default("gpt-4o"),
  RESUME_STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  S2_BUCKET: z.string().optional(),
  S2_REGION: z.string().optional(),
  S2_ENDPOINT: z.string().optional(),
  S2_ACCESS_KEY_ID: z.string().optional(),
  S2_SECRET_ACCESS_KEY: z.string().optional(),
  AZURE_AD_CLIENT_ID: z.string().optional(),
  AZURE_AD_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_TENANT_ID: z.string().optional(),
  ALLOWED_EMAIL_DOMAIN: z.string().optional(),
  ORG_SLUG: z.string().default("kanini"),
  ORG_NAME: z.string().default("KANINI"),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    OPENAI_ANALYSIS_MODEL: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4o",
    RESUME_STORAGE_PROVIDER: process.env.RESUME_STORAGE_PROVIDER ?? "local",
    S2_BUCKET: process.env.S2_BUCKET,
    S2_REGION: process.env.S2_REGION,
    S2_ENDPOINT: process.env.S2_ENDPOINT,
    S2_ACCESS_KEY_ID: process.env.S2_ACCESS_KEY_ID,
    S2_SECRET_ACCESS_KEY: process.env.S2_SECRET_ACCESS_KEY,
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
    ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN,
    ORG_SLUG: process.env.ORG_SLUG ?? "kanini",
    ORG_NAME: process.env.ORG_NAME ?? "KANINI",
  });
}
