"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldSelect } from "@/components/FormField";
import {
  isAllowedResumeFilename,
  RESUME_UPLOAD_ACCEPT,
  RESUME_UPLOAD_FRIENDLY_ERROR,
} from "@/lib/resume/formats";
import {
  validateCandidateEmail,
  validateCandidateName,
} from "@/lib/candidates/validation";

type JobDescriptionOption = {
  id: string;
  label: string;
  roleId: string;
  projectId: string | null;
};

export function NewCandidateClient() {
  const MAX_RESUME_FILE_BYTES = 10 * 1024 * 1024;
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [jobDescriptionId, setJobDescriptionId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [jobDescriptions, setJobDescriptions] = useState<JobDescriptionOption[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    resume?: string;
    jobDescription?: string;
  }>({});
  const [touched, setTouched] = useState<{ name: boolean; email: boolean }>({
    name: false,
    email: false,
  });

  useEffect(() => {
    fetch("/api/job-descriptions?view=options")
      .then((r) => r.json())
      .then((rows: JobDescriptionOption[]) =>
        setJobDescriptions(Array.isArray(rows) ? rows : []),
      )
      .catch(() => {});
  }, []);

  function validateField(field: "name" | "email", value: string) {
    if (field === "name") return validateCandidateName(value);
    return validateCandidateEmail(value);
  }

  function validateForm() {
    const nextErrors: typeof fieldErrors = {
      name: validateCandidateName(name) ?? undefined,
      email: validateCandidateEmail(email) ?? undefined,
    };

    if (file && !isAllowedResumeFilename(file.name)) {
      nextErrors.resume = RESUME_UPLOAD_FRIENDLY_ERROR;
    } else if (file && file.size > MAX_RESUME_FILE_BYTES) {
      nextErrors.resume = "Resume must be under 10MB.";
    }

    if (!jobDescriptionId) {
      nextErrors.jobDescription = "Job ID is required.";
    }

    setFieldErrors(nextErrors);
    return (
      !nextErrors.name &&
      !nextErrors.email &&
      !nextErrors.resume &&
      !nextErrors.jobDescription
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("email", email.trim());
    if (phone) fd.set("phone", phone);
    if (source) fd.set("source", source);
    if (consent) fd.set("consent", "true");
    fd.set("jobDescriptionId", jobDescriptionId);
    if (file) fd.set("resume", file);
    const res = await fetch("/api/candidates", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && data.id) {
      router.push(`/evaluate/${data.id}`);
      return;
    }
    setError(data?.error ?? "Could not create the candidate. Please try again.");
  }

  return (
    <form onSubmit={submit} noValidate>
      <CaseCard className="max-w-lg p-6">
        <h2 className="font-serif text-lg font-bold">Open a new case file</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
          Candidate details and resume evidence
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <FieldLabel htmlFor="candidate-name">Candidate name</FieldLabel>
            <FieldInput
              id="candidate-name"
              placeholder="e.g. Jordan Rivera"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (touched.name) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    name: validateCandidateName(e.target.value) ?? undefined,
                  }));
                }
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, name: true }));
                setFieldErrors((prev) => ({
                  ...prev,
                  name: validateField("name", name) ?? undefined,
                }));
              }}
              aria-invalid={!!fieldErrors.name && touched.name}
              className={fieldErrors.name && touched.name ? "border-red-400" : undefined}
            />
            {fieldErrors.name && touched.name ? (
              <p className="mt-1.5 text-sm text-red-600" role="alert">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="candidate-email">Email</FieldLabel>
            <FieldInput
              id="candidate-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (touched.email) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    email: validateCandidateEmail(e.target.value) ?? undefined,
                  }));
                }
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, email: true }));
                setFieldErrors((prev) => ({
                  ...prev,
                  email: validateField("email", email) ?? undefined,
                }));
              }}
              aria-invalid={!!fieldErrors.email && touched.email}
              className={fieldErrors.email && touched.email ? "border-red-400" : undefined}
            />
            {fieldErrors.email && touched.email ? (
              <p className="mt-1.5 text-sm text-red-600" role="alert">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="candidate-phone">Phone</FieldLabel>
            <FieldInput
              id="candidate-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <FieldLabel htmlFor="candidate-source">Source</FieldLabel>
            <FieldInput
              id="candidate-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. LinkedIn, referral, agency"
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[var(--ink-soft)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Candidate has consented to data processing
          </label>
          <div>
            <FieldLabel htmlFor="candidate-job-id">Job ID</FieldLabel>
            <FieldSelect
              id="candidate-job-id"
              value={jobDescriptionId}
              onChange={(e) => {
                const nextJobId = e.target.value;
                setJobDescriptionId(nextJobId);
                const selected = jobDescriptions.find((job) => job.id === nextJobId);
                setProjectId(selected?.projectId ?? "");
                setRoleId(selected?.roleId ?? "");
                setFieldErrors((prev) => ({ ...prev, jobDescription: undefined }));
              }}
            >
              <option value="">Select Job ID (required)</option>
              {jobDescriptions.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.label}
                </option>
              ))}
            </FieldSelect>
            {fieldErrors.jobDescription ? (
              <p className="mt-1.5 text-sm text-red-600" role="alert">
                {fieldErrors.jobDescription}
              </p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="candidate-role">Role mapping</FieldLabel>
            <FieldInput
              id="candidate-role"
              value={roleId ? "Mapped from selected Job ID" : "Select a Job ID to auto-map role"}
              readOnly
            />
          </div>
          <div>
            <FieldLabel htmlFor="candidate-project">Project mapping</FieldLabel>
            <FieldInput
              id="candidate-project"
              value={projectId ? "Mapped from selected Job ID" : "No project mapped"}
              readOnly
            />
          </div>
          <div>
            <FieldLabel>Resume</FieldLabel>
            <label
              htmlFor="candidate-resume"
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--cream-2)] bg-[var(--cream)] px-4 py-3 text-sm transition-colors hover:border-[var(--cyan)]"
            >
              <span className="min-w-0 truncate text-[var(--ink-soft)]">
                {file ? file.name : "Upload a PDF or DOCX resume"}
              </span>
              <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[var(--cyan-d)] shadow-sm">
                {file ? "Change" : "Browse"}
              </span>
            </label>
            <input
              id="candidate-resume"
              type="file"
              accept={RESUME_UPLOAD_ACCEPT}
              onChange={(e) => {
                const nextFile = e.target.files?.[0] ?? null;
                if (nextFile && !isAllowedResumeFilename(nextFile.name)) {
                  setFile(null);
                  setFieldErrors((prev) => ({
                    ...prev,
                    resume: RESUME_UPLOAD_FRIENDLY_ERROR,
                  }));
                  e.target.value = "";
                  return;
                }
                if (nextFile && nextFile.size > MAX_RESUME_FILE_BYTES) {
                  setFile(null);
                  setFieldErrors((prev) => ({
                    ...prev,
                    resume: "Resume must be under 10MB.",
                  }));
                  e.target.value = "";
                  return;
                }
                setFile(nextFile);
                setFieldErrors((prev) => ({ ...prev, resume: undefined }));
                setError(null);
              }}
              className="sr-only"
            />
            {fieldErrors.resume ? (
              <p className="mt-1.5 text-sm text-red-600" role="alert">
                {fieldErrors.resume}
              </p>
            ) : null}
          </div>
          {error ? <p className="text-sm font-semibold text-[#c0392b]">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Opening…" : "Open case file →"}
          </Button>
        </div>
      </CaseCard>
    </form>
  );
}
