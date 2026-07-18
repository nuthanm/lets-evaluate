import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PDFDocument,
  type PDFFont,
  StandardFonts,
  degrees,
  rgb,
  type PDFPage,
} from "pdf-lib";
import { getBrand } from "@/lib/brand";
import { db } from "@/lib/db";
import { organizationMailAssets } from "@/lib/db/schema";
import { readMailAsset } from "@/lib/storage/assets";
import { eq } from "drizzle-orm";
import type { JobDescription } from "./types";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 50;
const MARGIN_TOP = 68;
const MARGIN_BOTTOM = 58;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type ImageAsset = {
  data: Uint8Array;
  ext: "png" | "jpg";
};

type JobDescriptionAssets = {
  logo: ImageAsset | null;
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function toImageAsset(
  bytes: Uint8Array,
  contentType: string,
  pathHint = "",
): ImageAsset | null {
  const lowerType = (contentType || "").toLowerCase();
  const lowerPath = pathHint.toLowerCase();
  if (lowerType.includes("png") || lowerPath.endsWith(".png")) {
    return { data: bytes, ext: "png" };
  }
  if (
    lowerType.includes("jpeg") ||
    lowerType.includes("jpg") ||
    /\.(jpe?g)$/i.test(lowerPath)
  ) {
    return { data: bytes, ext: "jpg" };
  }
  return null;
}

async function fetchImageByKey(key: string | undefined): Promise<ImageAsset | null> {
  if (!key?.trim()) return null;
  try {
    const file = await readMailAsset(key.trim());
    return toImageAsset(file.body, file.contentType, key);
  } catch {
    return null;
  }
}

async function fetchImageByUrl(logoUrl: string | undefined): Promise<ImageAsset | null> {
  if (!logoUrl) return null;

  const brand = getBrand();
  const base = brand.appUrl || undefined;
  let url: URL;
  try {
    url = base ? new URL(logoUrl, base) : new URL(logoUrl);
  } catch {
    return null;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!bytes.length) return null;
    return toImageAsset(bytes, contentType, url.pathname);
  } catch {
    return null;
  }
}

async function fetchLogoFallback(): Promise<ImageAsset | null> {
  try {
    const bytes = new Uint8Array(
      await readFile(join(process.cwd(), "public", "assets", "mail", "Kanini-logo.png")),
    );
    return bytes.length ? { data: bytes, ext: "png" } : null;
  } catch {
    return null;
  }
}

async function getJobDescriptionAssets(
  organizationId?: string,
): Promise<JobDescriptionAssets> {
  const brand = getBrand();
  let logo: ImageAsset | null = null;

  if (organizationId) {
    const [row] = await db
      .select({
        logoAssetKey: organizationMailAssets.logoAssetKey,
      })
      .from(organizationMailAssets)
      .where(eq(organizationMailAssets.organizationId, organizationId))
      .limit(1);

    if (row) {
      logo = await fetchImageByKey(row.logoAssetKey);
    }
  }

  if (!logo) {
    logo = (await fetchImageByUrl(brand.logoUrl)) ?? (await fetchLogoFallback());
  }

  return { logo };
}

function jdFilenameBase(jd: JobDescription) {
  return `${jd.roleTitle}-${jd.location}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

export function getJobDescriptionFilename(jd: JobDescription, ext: "docx" | "pdf") {
  const base = jdFilenameBase(jd) || "job-description";
  return `${base}-${getBrand().orgSlug}.${ext}`;
}

export async function buildJobDescriptionDocx(
  jd: JobDescription,
  organizationId?: string,
): Promise<Uint8Array> {
  const brand = getBrand();
  const assets = await getJobDescriptionAssets(organizationId);
  const navyHex = brand.colors.navy.replace("#", "");
  const headingHex = navyHex.length === 6 ? navyHex : "1A2B3C";

  const sectionTitle = (value: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 180 },
      children: [new TextRun({ text: value, bold: true, color: headingHex })],
    });

  const bullet = (value: string) =>
    new Paragraph({
      text: value,
      bullet: { level: 0 },
      spacing: { after: 100 },
    });

  const headerChildren: Paragraph[] = [];
  if (assets.logo) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new ImageRun({
            data: assets.logo.data,
            type: assets.logo.ext,
            transformation: { width: 122, height: 34 },
          }),
        ],
      }),
    );
  } else {
    headerChildren.push(
      new Paragraph({
        children: [new TextRun({ text: brand.orgName, bold: true, size: 24 })],
      }),
    );
  }

  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40 },
      children: [
        new TextRun({ text: "CONFIDENTIAL", bold: true, italics: true, size: 18, color: "B8B8B8" }),
      ],
    }),
  );

  const footerChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${brand.tagline} | Great Place to Work`, size: 18 }),
      ],
    }),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22,
            color: "292929",
          },
          paragraph: {
            spacing: { line: 300, after: 120 },
          },
        },
      },
    },
    sections: [
      {
        // A light visual confidentiality marker for the DOCX output.
        watermark: {
          text: "CONFIDENTIAL",
          color: "D6D6D6",
          opacity: 0.12,
          font: "Calibri",
          size: 48,
          bold: true,
        },
        properties: {
          page: {
            margin: { top: 900, right: 900, bottom: 900, left: 900 },
          },
        },
        headers: {
          default: new Header({ children: headerChildren }),
        },
        footers: {
          default: new Footer({ children: footerChildren }),
        },
        children: [
          // ── Header block ──────────────────────────────────────────────
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: `Role: ${jd.roleTitle}`, bold: true, size: 28, color: headingHex }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: `Location: ${jd.location}`, size: 22, color: "5C5C5C" })],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: `Experience: ${jd.experience}`, size: 22, color: "5C5C5C" })],
          }),
          // ── About the Role ────────────────────────────────────────────
          sectionTitle("About the Role"),
          new Paragraph({ text: jd.aboutRole, spacing: { after: 200 } }),
          // ── What You'll Do ────────────────────────────────────────────
          sectionTitle("What You'll Do"),
          ...jd.whatYoullDo.map((line) => bullet(line)),
          new Paragraph({ text: "", spacing: { after: 120 } }),
          // ── What You Bring ────────────────────────────────────────────
          sectionTitle("What You Bring"),
          new Paragraph({ text: jd.whatYouBring.summary, spacing: { after: 160 } }),
          ...jd.whatYouBring.skills.map((line) => bullet(line)),
          new Paragraph({
            spacing: { before: 120, after: 160 },
            children: [
              new TextRun({ text: "Domain: ", bold: true, color: headingHex }),
              new TextRun({ text: jd.whatYouBring.domain }),
            ],
          }),
          // ── Why Join <org> ────────────────────────────────────────────
          sectionTitle(`Why Join ${brand.orgName}`),
          ...jd.whyJoinKanini.map((line) => bullet(line)),
          new Paragraph({ text: "", spacing: { after: 120 } }),
          // ── Ready to Make an Impact ───────────────────────────────────
          sectionTitle("Ready to Make an Impact"),
          new Paragraph({ text: jd.readyToMakeImpact, spacing: { after: 200 } }),
        ],
      },
    ],
  });

  const file = await Packer.toBuffer(doc);
  return new Uint8Array(toArrayBuffer(file));
}

function wrap(text: string, maxChars = 92) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line) {
      line = w;
      continue;
    }
    if (`${line} ${w}`.length > maxChars) {
      lines.push(line);
      line = w;
    } else {
      line = `${line} ${w}`;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTextBlock(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  color = rgb(0.16, 0.16, 0.16),
  maxChars = 92,
  lineGap = 4,
) {
  const lines = wrap(text, maxChars);
  let cursor = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursor, size, color });
    cursor -= size + lineGap;
  }
  return cursor;
}

function drawFooter(
  page: PDFPage,
  text: string,
  footerImage?: { image: Awaited<ReturnType<PDFDocument["embedPng"]>>; width: number; height: number },
) {
  let lineY = MARGIN_BOTTOM - 6;
  if (footerImage) {
    const imageHeight = 60;
    const imageWidth = Math.min(CONTENT_WIDTH, (footerImage.width / footerImage.height) * imageHeight);
    const imageX = MARGIN_X + (CONTENT_WIDTH - imageWidth) / 2;
    page.drawImage(footerImage.image, {
      x: imageX,
      y: MARGIN_BOTTOM + 22,
      width: imageWidth,
      height: imageHeight,
    });
    lineY = MARGIN_BOTTOM + 14;
  }

  page.drawLine({
    start: { x: MARGIN_X, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN_X, y: lineY },
    thickness: 0.6,
    color: rgb(0.85, 0.85, 0.85),
  });
  page.drawText(text, {
    x: MARGIN_X,
    y: lineY - 18,
    size: 9,
    color: rgb(0.35, 0.35, 0.35),
  });
}

function drawConfidentialWatermark(page: PDFPage, font: PDFFont) {
  page.drawText("CONFIDENTIAL", {
    x: PAGE_WIDTH / 2 - 150,
    y: PAGE_HEIGHT / 2 + 15,
    size: 42,
    font,
    color: rgb(0.76, 0.76, 0.76),
    opacity: 0.12,
    rotate: degrees(32),
  });
}

function hexToRgbNorm(hex: string): [number, number, number] {
  const h = hex.replace("#", "").slice(0, 6);
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export async function buildJobDescriptionPdf(
  jd: JobDescription,
  organizationId?: string,
): Promise<Uint8Array> {
  const brand = getBrand();
  const assets = await getJobDescriptionAssets(organizationId);

  const [hR, hG, hB] = hexToRgbNorm(brand.colors.primary);
  const [nR, nG, nB] = hexToRgbNorm(brand.colors.navy);
  const brandColor = rgb(hR, hG, hB);
  const navyColor = rgb(nR, nG, nB);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const logoImage = assets.logo
    ? assets.logo.ext === "png"
      ? await doc.embedPng(assets.logo.data)
      : await doc.embedJpg(assets.logo.data)
    : null;

  const footerTopBoundary = MARGIN_BOTTOM + 18;

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const ensure = (need = 20) => {
    if (y - need > footerTopBoundary) return;
    drawFooter(page, `${brand.tagline} | Great Place to Work`);
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;
    drawHeader();
    drawConfidentialWatermark(page, bold);
  };

  const drawHeader = () => {
    if (logoImage) {
      const h = 24;
      const w = (logoImage.width / logoImage.height) * h;
      page.drawImage(logoImage, {
        x: MARGIN_X,
        y: PAGE_HEIGHT - 52,
        width: Math.min(w, 115),
        height: h,
      });
    } else {
      page.drawText(brand.orgName, {
        x: MARGIN_X,
        y: PAGE_HEIGHT - 44,
        size: 13,
        font: bold,
        color: rgb(0.1, 0.17, 0.24),
      });
    }

    page.drawText("Job Description", {
      x: PAGE_WIDTH - MARGIN_X - 102,
      y: PAGE_HEIGHT - 44,
      size: 11,
      font: bold,
      color: rgb(0.1, 0.17, 0.24),
    });

    page.drawLine({
      start: { x: MARGIN_X, y: PAGE_HEIGHT - 60 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 60 },
      thickness: 1,
      color: rgb(0.88, 0.9, 0.92),
    });
    y = PAGE_HEIGHT - 84;
  };

  drawConfidentialWatermark(page, bold);

  const sectionGap = 10;

  const title = (value: string) => {
    y -= sectionGap;
    ensure(44);
    page.drawText(value, {
      x: MARGIN_X,
      y,
      size: 13,
      font: bold,
      color: navyColor,
    });
    y -= 20;
  };

  const body = (value: string) => {
    ensure(42);
    y = drawTextBlock(page, value, MARGIN_X, y, 11, rgb(0.17, 0.17, 0.17), 92, 4);
    y -= 12;
  };

  const bullet = (value: string) => {
    ensure(34);
    page.drawText("•", { x: MARGIN_X + 2, y, size: 10, font: bold, color: navyColor });
    y = drawTextBlock(page, value, MARGIN_X + 14, y, 11, rgb(0.17, 0.17, 0.17), 88, 4);
    y -= 6;
  };

  const labeledLine = (label: string, value: string) => {
    ensure(28);
    const labelW = label.length * 6.2 + 4;
    page.drawText(label, { x: MARGIN_X, y, size: 11, font: bold, color: navyColor });
    page.drawText(value, { x: MARGIN_X + labelW, y, size: 11, font, color: rgb(0.17, 0.17, 0.17) });
    y -= 18;
  };

  drawHeader();

  // ── Role header block ──────────────────────────────────────────────
  page.drawText(jd.roleTitle, {
    x: MARGIN_X,
    y,
    size: 16,
    font: bold,
    color: navyColor,
  });
  y -= 22;
  page.drawText(`Location: ${jd.location}`, {
    x: MARGIN_X,
    y,
    size: 11,
    font,
    color: rgb(0.36, 0.36, 0.36),
  });
  y -= 16;
  page.drawText(`Experience: ${jd.experience}`, {
    x: MARGIN_X,
    y,
    size: 11,
    font,
    color: rgb(0.36, 0.36, 0.36),
  });
  y -= 10;

  // ── Sections ───────────────────────────────────────────────────────
  title("About the Role");
  body(jd.aboutRole);

  title("What You'll Do");
  for (const line of jd.whatYoullDo) bullet(line);

  title("What You Bring");
  body(jd.whatYouBring.summary);
  for (const line of jd.whatYouBring.skills) bullet(line);
  y -= 4;
  labeledLine("Domain:", jd.whatYouBring.domain);

  title(`Why Join ${brand.orgName}`);
  for (const line of jd.whyJoinKanini) bullet(line);

  title("Ready to Make an Impact");
  body(jd.readyToMakeImpact);

  drawFooter(
    page,
    `${brand.tagline} | Great Place to Work`,
  );

  return await doc.save();
}
