import { DOMMatrix } from "@napi-rs/canvas";
import mammoth from "mammoth";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { isAllowedResumeFilename } from "@/lib/resume/formats";

if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = DOMMatrix as typeof globalThis.DOMMatrix;
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) };

  const cause = error.cause;
  return {
    name: error.name,
    message: error.message,
    cause:
      cause instanceof Error
        ? { name: cause.name, message: cause.message }
        : cause === undefined
          ? undefined
          : String(cause),
  };
}

async function extractPdfTextWithPdfJs(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  try {
    const pages = await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const content = await page.getTextContent();
        return content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
      }),
    );
    return pages.join("\n").trim();
  } finally {
    await document.destroy();
  }
}

export async function extractResumeText(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase();
  if (!isAllowedResumeFilename(filename)) {
    throw new Error("Please upload a resume in PDF or DOCX format.");
  }
  if (lower.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      let pdfParseError: unknown;
      try {
        const result = await parser.getText();
        const text = (result.text || "").trim();
        if (text) return text;
      } catch (error) {
        pdfParseError = error;
      }

      try {
        return await extractPdfTextWithPdfJs(buffer);
      } catch (pdfJsError) {
        console.error("[resume] PDF text extraction failed", {
          pdfParse: pdfParseError
            ? errorDetails(pdfParseError)
            : { message: "No text returned" },
          pdfJs: errorDetails(pdfJsError),
        });
        throw new Error("PDF text extraction failed", { cause: pdfJsError });
      }
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }
  throw new Error("Please upload a resume in PDF or DOCX format.");
}
