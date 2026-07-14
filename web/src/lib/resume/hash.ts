import crypto from "crypto";

/**
 * Generate a deterministic SHA-256 hash of resume text.
 * Used to detect duplicate resumes and enable caching.
 */
export function hashResumeText(text: string): string {
  const normalized = text.trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Validate that two resume texts are identical.
 */
export function sameResume(text1: string, text2: string): boolean {
  return hashResumeText(text1) === hashResumeText(text2);
}
