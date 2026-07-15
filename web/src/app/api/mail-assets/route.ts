import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requireApiRole } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { mailTemplates, organizationMailAssets } from "@/lib/db/schema";
import { getBrand } from "@/lib/brand";
import { asc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { deleteMailAsset, listMailAssets, storeMailAsset } from "@/lib/storage/assets";

const scopeSchema = z.enum(["all", "specific"]);

const assetKeySchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => !value || value.startsWith("Assets/"), "Invalid key");

const updateSchema = z.object({
  logoAssetKey: assetKeySchema.optional(),
  headerImageAssetKey: assetKeySchema.optional(),
  footerImageAssetKey: assetKeySchema.optional(),
  applyScope: scopeSchema,
  templateSlugs: z.array(z.string().min(1)).default([]),
});

const deleteSchema = z.object({
  key: assetKeySchema,
});

function keyToUrl(key: string) {
  if (!key) return "";
  const path = key.split("/").map(encodeURIComponent).join("/");
  const appUrl = getBrand().appUrl?.trim().replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/public/assets/${path}`;
  return `/api/public/assets/${path}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const [row, templates, assets] = await Promise.all([
    db
      .select({
        logoAssetKey: organizationMailAssets.logoAssetKey,
        headerImageAssetKey: organizationMailAssets.headerImageAssetKey,
        footerImageAssetKey: organizationMailAssets.footerImageAssetKey,
        applyScope: organizationMailAssets.applyScope,
        templateSlugs: organizationMailAssets.templateSlugs,
      })
      .from(organizationMailAssets)
      .where(eq(organizationMailAssets.organizationId, session.user.organizationId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ slug: mailTemplates.slug, name: mailTemplates.name })
      .from(mailTemplates)
      .where(eq(mailTemplates.organizationId, session.user.organizationId))
      .orderBy(asc(mailTemplates.slug)),
    listMailAssets(),
  ]);

  const brand = getBrand();
  const fallbackLogoKey = brand.logoUrl?.trim().startsWith("Assets/")
    ? brand.logoUrl.trim()
    : "";
  const selectedLogoKey = row?.logoAssetKey || fallbackLogoKey;

  return NextResponse.json({
    config: {
      logoAssetKey: selectedLogoKey,
      headerImageAssetKey: row?.headerImageAssetKey || "",
      footerImageAssetKey: row?.footerImageAssetKey || "",
      applyScope: row?.applyScope === "specific" ? "specific" : "all",
      templateSlugs: Array.isArray(row?.templateSlugs) ? row?.templateSlugs : [],
    },
    assets: assets.map((asset) => ({
      ...asset,
      url: keyToUrl(asset.key),
    })),
    templates,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError("No file provided", 400);
  }

  const allowed = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ]);
  if (!allowed.has(file.type)) {
    return apiError("Only PNG, JPG, WEBP, GIF, and SVG are allowed", 400);
  }

  if (file.size > 6 * 1024 * 1024) {
    return apiError("File too large. Max size is 6 MB", 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const saved = await storeMailAsset(bytes, file.name || "asset");
  return NextResponse.json({
    ok: true,
    asset: {
      key: saved.key,
      name: saved.name,
      url: keyToUrl(saved.key),
    },
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = updateSchema.parse(await req.json());
  const now = new Date();
  const templateSlugs = body.applyScope === "specific" ? body.templateSlugs : [];

  await db
    .insert(organizationMailAssets)
    .values({
      id: uuid(),
      organizationId: session.user.organizationId,
      logoAssetKey: body.logoAssetKey ?? "",
      headerImageAssetKey: body.headerImageAssetKey ?? "",
      footerImageAssetKey: body.footerImageAssetKey ?? "",
      applyScope: body.applyScope,
      templateSlugs,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: organizationMailAssets.organizationId,
      set: {
        logoAssetKey: body.logoAssetKey ?? "",
        headerImageAssetKey: body.headerImageAssetKey ?? "",
        footerImageAssetKey: body.footerImageAssetKey ?? "",
        applyScope: body.applyScope,
        templateSlugs,
        updatedAt: now,
      },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin"]);
  if (forbidden) return forbidden;

  const body = deleteSchema.parse(await req.json());
  await deleteMailAsset(body.key);

  const [row] = await db
    .select({
      organizationId: organizationMailAssets.organizationId,
      logoAssetKey: organizationMailAssets.logoAssetKey,
      headerImageAssetKey: organizationMailAssets.headerImageAssetKey,
      footerImageAssetKey: organizationMailAssets.footerImageAssetKey,
      applyScope: organizationMailAssets.applyScope,
      templateSlugs: organizationMailAssets.templateSlugs,
    })
    .from(organizationMailAssets)
    .where(eq(organizationMailAssets.organizationId, session.user.organizationId))
    .limit(1);

  if (row) {
    const next = {
      logoAssetKey: row.logoAssetKey === body.key ? "" : row.logoAssetKey,
      headerImageAssetKey:
        row.headerImageAssetKey === body.key ? "" : row.headerImageAssetKey,
      footerImageAssetKey:
        row.footerImageAssetKey === body.key ? "" : row.footerImageAssetKey,
    };

    if (
      next.logoAssetKey !== row.logoAssetKey ||
      next.headerImageAssetKey !== row.headerImageAssetKey ||
      next.footerImageAssetKey !== row.footerImageAssetKey
    ) {
      await db
        .update(organizationMailAssets)
        .set({
          ...next,
          updatedAt: new Date(),
        })
        .where(eq(organizationMailAssets.organizationId, session.user.organizationId));
    }
  }

  return NextResponse.json({ ok: true });
}
