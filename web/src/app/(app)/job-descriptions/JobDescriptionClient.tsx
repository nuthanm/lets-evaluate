"use client";

import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldSelect, FieldTextarea } from "@/components/FormField";

type GeneratedJd = {
  roleTitle: string;
  location: string;
  experience: string;
  aboutRole: string;
  whatYoullDo: string[];
  whatYouBring: {
    summary: string;
    skills: string[];
    domain: string;
  };
  whyJoinKanini: string[];
  readyToMakeImpact: string;
  generatedAt?: string;
};

type Usage = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export function JobDescriptionClient({
  roleOptions,
  locationOptions,
}: {
  roleOptions: string[];
  locationOptions: string[];
}) {
  const [selectedRole, setSelectedRole] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [domain, setDomain] = useState("");
  const [mustHaveSkills, setMustHaveSkills] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState<"docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedJd | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  const parsedSkills = useMemo(
    () =>
      mustHaveSkills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12),
    [mustHaveSkills],
  );

  const resolvedRoleTitle = selectedRole === "__custom__" ? roleTitle.trim() : selectedRole.trim();
  const resolvedLocation = selectedLocation === "__custom__" ? location.trim() : selectedLocation.trim();

  async function generate() {
    if (!resolvedRoleTitle || !resolvedLocation || !experience.trim()) {
      setError("Role title, location, and experience are required.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/job-descriptions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle: resolvedRoleTitle,
          location: resolvedLocation,
          experience,
          domain: domain.trim() || undefined,
          mustHaveSkills: parsedSkills.length ? parsedSkills : undefined,
          additionalContext: additionalContext.trim() || undefined,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        jobDescription?: GeneratedJd;
        usage?: Usage;
      };

      if (!res.ok || !payload.jobDescription) {
        setError(payload.error ?? "Could not generate the job description.");
        return;
      }

      setGenerated(payload.jobDescription);
      setUsage(payload.usage ?? null);
    } finally {
      setBusy(false);
    }
  }

  async function download(format: "docx" | "pdf") {
    if (!generated) return;

    setExportBusy(format);
    setError(null);

    try {
      const endpoint =
        format === "docx"
          ? "/api/job-descriptions/export/docx"
          : "/api/job-descriptions/export/pdf";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: generated }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Failed to export ${format.toUpperCase()}`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^\";]+)"?/i);
      const filename = filenameMatch?.[1] ?? `job-description-kanini.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setExportBusy(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
      <CaseCard className="p-5">
        <h2 className="font-serif text-xl font-bold">Generate with AI</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
          Structured for recruiter workflows with consistent formatting and token-efficient prompts.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <FieldLabel htmlFor="roleTitle">Role Title</FieldLabel>
            <FieldSelect
              id="roleTitle"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                if (e.target.value !== "__custom__") setRoleTitle("");
              }}
            >
              <option value="">Select role</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
              <option value="__custom__">Other (type manually)</option>
            </FieldSelect>
            {selectedRole === "__custom__" && (
              <FieldInput
                className="mt-2"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Senior Java Developer"
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <FieldSelect
                id="location"
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  if (e.target.value !== "__custom__") setLocation("");
                }}
              >
                <option value="">Select location</option>
                {locationOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="__custom__">Other (type manually)</option>
              </FieldSelect>
              {selectedLocation === "__custom__" && (
                <FieldInput
                  className="mt-2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Chennai / Hybrid"
                />
              )}
            </div>
            <div>
              <FieldLabel htmlFor="experience">Experience</FieldLabel>
              <FieldInput
                id="experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="5-8 years"
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="domain">Domain (optional)</FieldLabel>
            <FieldInput
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="BFSI, Healthcare, Retail..."
            />
          </div>

          <div>
            <FieldLabel htmlFor="skills">Must-have skills (optional)</FieldLabel>
            <FieldInput
              id="skills"
              value={mustHaveSkills}
              onChange={(e) => setMustHaveSkills(e.target.value)}
              placeholder="Java, Spring Boot, Microservices, Azure"
            />
            <p className="mt-1 text-[11px] text-[var(--ink-faint)]">
              Comma-separated. Up to 12 skills are used.
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="context">Additional context (optional)</FieldLabel>
            <FieldTextarea
              id="context"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={5}
              placeholder="Client context, project goals, team constraints, notice-period preference..."
            />
            <div className="mt-2 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-[12px] text-[var(--ink-soft)]">
              <p className="font-semibold text-[var(--ink)]">Reference for additional context</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>Project objective: migration, greenfield, support, optimization.</li>
                <li>Team setup: squad size, cross-functional partners, stakeholder exposure.</li>
                <li>Work model: onsite, hybrid days, travel expectations, shift details.</li>
                <li>Delivery expectations: ownership scope, sprint rhythm, quality targets.</li>
                <li>Candidate constraints: notice period, domain preference, communication needs.</li>
              </ul>
            </div>
          </div>
        </div>

        {usage && (
          <div className="mt-4 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-[12px] text-[var(--ink-soft)]">
            Model: <strong>{usage.model}</strong> · Prompt: <strong>{usage.promptTokens}</strong> · Output: <strong>{usage.completionTokens}</strong> · Total: <strong>{usage.totalTokens}</strong>
          </div>
        )}

        {error && <p className="mt-3 text-[13px] font-semibold text-[var(--orange)]">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={generate} disabled={busy} className="px-5 py-2.5 text-[13px]">
            {busy ? "Generating..." : "Generate job description"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => download("docx")}
            disabled={!generated || exportBusy !== null}
            className="px-5 py-2.5 text-[13px]"
          >
            {exportBusy === "docx" ? "Preparing DOCX..." : "Download DOCX"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => download("pdf")}
            disabled={!generated || exportBusy !== null}
            className="px-5 py-2.5 text-[13px]"
          >
            {exportBusy === "pdf" ? "Preparing PDF..." : "Download PDF"}
          </Button>
          {generated && (
            <ButtonLink href="/candidates?quick=unmapped&source=jd" variant="ghost" className="px-5 py-2.5 text-[13px]">
              Map candidate and project
            </ButtonLink>
          )}
          {generated && (
            <ButtonLink href="/evaluate/new" variant="ghost" className="px-5 py-2.5 text-[13px]">
              Add candidate
            </ButtonLink>
          )}
        </div>
      </CaseCard>

      <CaseCard className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-bold">Preview</h2>
          {generated?.generatedAt && (
            <span className="text-[11px] text-[var(--ink-faint)]">
              Generated {new Date(generated.generatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {!generated ? (
          <p className="mt-4 rounded-xl bg-[var(--cream)] p-4 text-[13px] text-[var(--ink-soft)]">
            Generate a job description to review structured sections before mapping candidates and projects.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <section className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-4">
              <h3 className="font-serif text-lg font-bold">Header</h3>
              <p className="mt-2 text-[14px]"><strong>Role:</strong> {generated.roleTitle}</p>
              <p className="text-[14px]"><strong>Location:</strong> {generated.location}</p>
              <p className="text-[14px]"><strong>Experience:</strong> {generated.experience}</p>
            </section>

            <section>
              <h3 className="font-serif text-lg font-bold">About the Role</h3>
              <p className="mt-2 text-[14px] leading-7 text-[var(--ink-soft)]">{generated.aboutRole}</p>
            </section>

            <section>
              <h3 className="font-serif text-lg font-bold">What You'll Do</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-7 text-[var(--ink-soft)]">
                {generated.whatYoullDo.map((line, idx) => (
                  <li key={`${line}-${idx}`}>{line}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-serif text-lg font-bold">What You Bring</h3>
              <p className="mt-2 text-[14px] leading-7 text-[var(--ink-soft)]">{generated.whatYouBring.summary}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-7 text-[var(--ink-soft)]">
                {generated.whatYouBring.skills.map((line, idx) => (
                  <li key={`${line}-${idx}`}>{line}</li>
                ))}
              </ul>
              <p className="mt-2 text-[14px] leading-7 text-[var(--ink-soft)]">
                <strong>Domain:</strong> {generated.whatYouBring.domain}
              </p>
            </section>

            <section>
              <h3 className="font-serif text-lg font-bold">Why Join KANINI</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-7 text-[var(--ink-soft)]">
                {generated.whyJoinKanini.map((line, idx) => (
                  <li key={`${line}-${idx}`}>{line}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-serif text-lg font-bold">Ready to Make an Impact</h3>
              <p className="mt-2 text-[14px] leading-7 text-[var(--ink-soft)]">{generated.readyToMakeImpact}</p>
            </section>
          </div>
        )}
      </CaseCard>
    </div>
  );
}
