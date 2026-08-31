import mammoth from "mammoth";
import { isAllowedResumeFilename } from "@/lib/resume/formats";

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
      const result = await parser.getText();
      return (result.text || "").trim();
    } catch (error) {
      try {
        return await extractPdfTextWithPdfJs(buffer);
      } catch (fallbackError) {
        throw new Error("PDF text extraction failed", {
          cause: fallbackError ?? error,
        });
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
