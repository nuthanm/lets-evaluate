import mammoth from "mammoth";
import { isAllowedResumeFilename } from "@/lib/resume/formats";

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
    } finally {
      await parser.destroy();
    }
  }
  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }
  throw new Error("Please upload a resume in PDF or DOCX format.");
}
