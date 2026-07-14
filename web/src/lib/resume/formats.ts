const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".docx"] as const;

export const RESUME_UPLOAD_ACCEPT = ALLOWED_RESUME_EXTENSIONS.join(",");

export const RESUME_UPLOAD_FRIENDLY_ERROR =
  "Please upload a resume in PDF or DOCX format.";

export function isAllowedResumeFilename(filename: string): boolean {
  const lower = filename.trim().toLowerCase();
  return ALLOWED_RESUME_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
