"use client";

import { useState } from "react";
import { CabinetPage, CaseCard } from "@/components/CabinetPage";
import { FaceAvatar } from "@/components/FaceAvatar";
import { FieldInput, FieldLabel } from "@/components/FormField";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { PasswordStrengthMeter } from "@/components/PasswordStrength";
import type { MemberRole } from "@/lib/auth/config";
import { getRoleDisplayName, validatePassword } from "@/lib/auth/validation";
import { isPanelRole } from "@/lib/auth/capabilities";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export function ProfileClient({
  name,
  email,
  role,
  hasPassword,
}: {
  name: string;
  email: string;
  role: MemberRole;
  hasPassword: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function clearFieldError(key: keyof FieldErrors) {
    setFieldErrors((err) =>
      err[key] ? { ...err, [key]: undefined } : err,
    );
    if (success) setSuccess(false);
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!currentPassword) errors.currentPassword = "Current password is required";

    const passwordError = validatePassword(newPassword);
    if (passwordError) errors.newPassword = passwordError;
    else if (newPassword === currentPassword)
      errors.newPassword =
        "New password must be different from the current password";

    if (!confirmPassword) errors.confirmPassword = "Please confirm your new password";
    else if (newPassword !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!validate()) return;

    setLoading(true);
    const res = await fetch("/api/profile/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not update password. Please try again.");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <CabinetPage
      title="Profile"
      subtitle="Manage your account and security settings"
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <CaseCard className="p-5">
          <div className="flex items-center gap-4">
            <FaceAvatar name={name} size="lg" />
            <div className="min-w-0">
              <h2 className="font-serif text-xl font-bold">{name}</h2>
              <p className="truncate text-[13px] text-[var(--ink-faint)]">{email}</p>
              <Pill variant="cyan" className="mt-1.5">
                {getRoleDisplayName(role)}
              </Pill>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
              <FieldInput id="profile-name" value={name} disabled readOnly />
            </div>
            <div>
              <FieldLabel htmlFor="profile-email">Email</FieldLabel>
              <FieldInput id="profile-email" value={email} disabled readOnly />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[var(--ink-faint)]">
            Your name and email are managed by your organization and can&apos;t be
            edited here.
          </p>
        </CaseCard>

        <CaseCard className="p-5">
          <h2 className="font-serif text-lg font-bold">Change password</h2>
          <p className="mt-0.5 text-[13px] text-[var(--ink-faint)]">
            Update the password you use to sign in.
          </p>

          {hasPassword ? (
            <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
              <div>
                <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                <FieldInput
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    clearFieldError("currentPassword");
                  }}
                  aria-invalid={!!fieldErrors.currentPassword}
                  className={fieldErrors.currentPassword ? "border-red-400" : undefined}
                />
                {fieldErrors.currentPassword && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {fieldErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <FieldInput
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearFieldError("newPassword");
                  }}
                  aria-invalid={!!fieldErrors.newPassword}
                  className={fieldErrors.newPassword ? "border-red-400" : undefined}
                />
                <PasswordStrengthMeter password={newPassword} />
                {fieldErrors.newPassword && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {fieldErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                <FieldInput
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  className={fieldErrors.confirmPassword ? "border-red-400" : undefined}
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
                {confirmPassword &&
                  newPassword === confirmPassword &&
                  !fieldErrors.confirmPassword && (
                    <p className="mt-1.5 text-sm text-[var(--green)]">
                      Passwords match
                    </p>
                  )}
              </div>

              {error && (
                <p
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-lg bg-[var(--green-soft)] px-3 py-2 text-sm text-[var(--green)]">
                  Password updated successfully.
                </p>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          ) : (
            <p className="mt-4 rounded-lg bg-[var(--cream)] px-4 py-3 text-sm text-[var(--ink-soft)]">
              You sign in through your organization&apos;s single sign-on, so your
              password is managed there.
            </p>
          )}
        </CaseCard>

        <CaseCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold">
                  Two-factor authentication
                </h2>
                <Pill variant="neutral">Coming soon</Pill>
              </div>
              <p className="mt-0.5 text-[13px] text-[var(--ink-faint)]">
                Add an extra layer of security with an authenticator app. This
                option will be available soon.
              </p>
            </div>
            <Button variant="outline" disabled>
              Enable MFA
            </Button>
          </div>
        </CaseCard>

        {isPanelRole(role) && <AvailabilityEditor />}
      </div>
    </CabinetPage>
  );
}
