import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/api/helpers";
import { readResume } from "@/lib/storage/resumes";

type Params = { params: Promise<{ id: string }> };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text → basic HTML paragraphs used when mammoth is unavailable. */
function textToHtml(text: string): string {
  const parts: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { parts.push("<br />"); continue; }
    if (line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
      parts.push(`<h2>${escapeHtml(line)}</h2>`);
    } else if (/^[\u2022\-*]\s/.test(line)) {
      parts.push(`<li>${escapeHtml(line.replace(/^[\u2022\-*]\s*/, ""))}</li>`);
    } else {
      parts.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  return parts.join("\n");
}

const PAGE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #1a1a2e;
    font-family: "Segoe UI", Calibri, Arial, sans-serif; font-size: 13px; line-height: 1.75; }
  body { padding: 36px 40px 48px; max-width: 900px; }
  h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
  h2 { font-size: 13px; font-weight: 700; color: #1e40af; margin: 20px 0 6px;
       border-bottom: 1.5px solid #bfdbfe; padding-bottom: 3px;
       text-transform: uppercase; letter-spacing: 0.5px; }
  h3 { font-size: 13px; font-weight: 600; color: #1e293b; margin: 12px 0 3px; }
  p  { margin: 0 0 7px; }
  ul, ol { margin: 4px 0 10px 22px; padding: 0; }
  li { margin-bottom: 3px; }
  strong, b { font-weight: 600; color: #0f172a; }
  em, i     { color: #475569; }
  a         { color: #2563eb; text-decoration: none; }
  a:hover   { text-decoration: underline; }
  table     { width: 100%; border-collapse: collapse; margin: 10px 0; }
  td, th    { padding: 5px 9px; border: 1px solid #e2e8f0; font-size: 12px; vertical-align: top; }
  th        { background: #f8fafc; font-weight: 600; }
  hr        { border: none; border-top: 1px solid #e2e8f0; margin: 14px 0; }
`;

function htmlResponse(filename: string, body: string): Response {
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(filename)}</title>
  <style>${PAGE_CSS}</style>
</head>
<body>${body}</body>
</html>`;
  return new Response(page, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

/** Serve the resume as a styled HTML page for inline iframe preview.
 *  Path 1: stored DOCX → mammoth rich HTML.
 *  Path 2 (fallback): extracted text already in DB → plain formatted HTML. */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { id } = await params;

  try {
    // Get the candidate
    const candidateResult = await db
      .select({
        resumeStorageKey: candidates.resumeStorageKey,
        resumeFilename: candidates.resumeFilename,
        resumeText: candidates.resumeText,
        organizationId: candidates.organizationId,
      })
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1);

    if (!candidateResult || candidateResult.length === 0) {
      return apiError("Not found", 404);
    }

    const candidate = candidateResult[0];

    // Check if candidate belongs to user's organization
    // Admins can access candidates from any organization
    if (session.user.role !== "admin" && candidate.organizationId !== session.user.organizationId) {
      return apiError("Not found", 404);
    }

    // Serve the resume as HTML
    const filename = candidate.resumeFilename ?? "resume.docx";

    // Path 1: stored file → mammoth rich HTML
    if (candidate.resumeStorageKey) {
      try {
        const buf = await readResume(candidate.resumeStorageKey);
        const mammoth = (await import("mammoth")).default;
        const { value: bodyHtml } = await mammoth.convertToHtml({ buffer: buf });
        return htmlResponse(filename, bodyHtml);
      } catch (err) {
        console.error("[resume/html] mammoth failed, using text fallback:", err);
      }
    }

    // Path 2: plain-text fallback (always present after analysis)
    if (candidate.resumeText?.trim()) {
      return htmlResponse(filename, textToHtml(candidate.resumeText));
    }

    return apiError("Resume preview unavailable", 404);
  } catch {
    return apiError("Resume preview unavailable", 404);
  }
}
