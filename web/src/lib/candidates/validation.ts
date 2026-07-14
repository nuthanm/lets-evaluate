export const MAX_CANDIDATE_NAME_LENGTH = 120;
export const MAX_CANDIDATE_EMAIL_LENGTH = 254;
export const MAX_RESUME_TEXT_LENGTH = 20000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCandidateName(name: string): string | null {
  const value = name.trim();
  if (!value) return "Candidate name is required.";
  if (value.length > MAX_CANDIDATE_NAME_LENGTH) {
    return `Candidate name must be ${MAX_CANDIDATE_NAME_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validateCandidateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Email is required.";
  if (value.length > MAX_CANDIDATE_EMAIL_LENGTH) {
    return `Email must be ${MAX_CANDIDATE_EMAIL_LENGTH} characters or fewer.`;
  }
  if (!EMAIL_RE.test(value)) return "Enter a valid email address.";
  return null;
}

export function validateResumeTextLength(text: string): string | null {
  if (text.length > MAX_RESUME_TEXT_LENGTH) {
    return `Resume content is too long. Keep it under ${MAX_RESUME_TEXT_LENGTH.toLocaleString()} characters.`;
  }
  return null;
}
