import { z } from "zod";
import type { MemberRole } from "@/lib/auth/config";

/** Resolve the org email domain from server env. */
export function getEmailDomain(): string {
  return (
    process.env.ALLOWED_EMAIL_DOMAIN ??
    process.env.NEXT_PUBLIC_EMAIL_DOMAIN ??
    `${process.env.ORG_SLUG ?? "kanini"}.com`
  );
}

/** Build a full email from a username and domain. */
export function buildEmail(username: string, domain: string): string {
  return `${username.trim().toLowerCase()}@${domain.trim().toLowerCase()}`;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) return "Username is required";
  if (trimmed.includes("@"))
    return "Enter only your username — the @domain is added automatically";
  if (trimmed.length > 64) return "Username must be 64 characters or fewer";
  if (!USERNAME_PATTERN.test(trimmed))
    return "Use letters, numbers, dots, hyphens, or underscores (cannot start/end with . or -)";
  return null;
}

export type PasswordStrength = {
  score: number;
  label: "Weak" | "Fair" | "Good" | "Strong";
  checks: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
};

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const label =
    score <= 2 ? "Weak" : score === 3 ? "Fair" : score === 4 ? "Good" : "Strong";
  return { score, label, checks };
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  const { checks } = getPasswordStrength(password);
  if (!checks.minLength) return "Password must be at least 8 characters";
  if (!checks.uppercase)
    return "Password must include at least one uppercase letter";
  if (!checks.lowercase)
    return "Password must include at least one lowercase letter";
  if (!checks.number) return "Password must include at least one number";
  if (!checks.special)
    return "Password must include at least one special character (!@#$%…)";
  return null;
}

export const memberRoleSchema = z.enum([
  "admin",
  "ta",
  "ta_lead",
  "interviewer",
  "manager",
  "hr",
]);

export const registerBodySchema = z
  .object({
    name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name is too long"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: memberRoleSchema,
  })
  .superRefine((data, ctx) => {
    const usernameError = validateUsername(data.username);
    if (usernameError) {
      ctx.addIssue({ code: "custom", message: usernameError, path: ["username"] });
    }
    const passwordError = validatePassword(data.password);
    if (passwordError) {
      ctx.addIssue({ code: "custom", message: passwordError, path: ["password"] });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const loginBodySchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(1, "New password is required"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .superRefine((data, ctx) => {
    const passwordError = validatePassword(data.newPassword);
    if (passwordError) {
      ctx.addIssue({ code: "custom", message: passwordError, path: ["newPassword"] });
    }
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
    if (data.currentPassword && data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: "custom",
        message: "New password must be different from the current password",
        path: ["newPassword"],
      });
    }
  });

/** Turn Zod errors into a single user-friendly string for API responses. */
export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  return first?.message ?? "Invalid input";
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin — full workspace control",
  ta: "Talent Acquisition — screen & assign candidates",
  ta_lead:
    "TA Lead — view all recruiters’ pipelines & performance (edit own only)",
  interviewer: "Interviewer — conduct assigned technical interviews",
  manager: "Manager — conduct assigned manager rounds",
  hr: "HR — conduct assigned HR rounds",
};

/** Short role title for profile chrome (e.g. sidebar). */
export function getRoleDisplayName(role: MemberRole): string {
  return ROLE_LABELS[role].split(" — ")[0] ?? role;
}

/** Normalize login credentials (username or full email) for NextAuth authorize. */
export function normalizeLoginCredentials(input: {
  email?: string;
  password?: string;
}) {
  if (!input.email?.trim()) {
    return { ok: false as const, error: "Username is required" };
  }
  if (!input.password) {
    return { ok: false as const, error: "Password is required" };
  }

  const raw = input.email.trim().toLowerCase();
  const domain = getEmailDomain();
  const email = raw.includes("@") ? raw : buildEmail(raw, domain);

  const localPart = email.split("@")[0] ?? "";
  const usernameError = validateUsername(localPart);
  if (usernameError) return { ok: false as const, error: usernameError };

  const domainCheck = process.env.ALLOWED_EMAIL_DOMAIN;
  if (domainCheck && !email.endsWith(`@${domainCheck.toLowerCase()}`)) {
    return {
      ok: false as const,
      error: `Sign-in is restricted to @${domainCheck} accounts`,
    };
  }

  return { ok: true as const, email, password: input.password };
}
