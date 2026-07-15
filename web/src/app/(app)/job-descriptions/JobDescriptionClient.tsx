"use client";

import { useEffect, useMemo, useState } from "react";
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

type PromptPreset = {
  id: string;
  title: string;
  hint: string;
  template: string;
  source?: "builtin" | "saved";
  savedId?: string;
};

type SavedPrompt = {
  id: string;
  name: string;
  template: string;
  updatedAt: string;
};

type RoleOption = {
  id: string;
  name: string;
  projectId: string | null;
  projectIds: string[];
};

const PREVIEW_LOGO_URL =
  process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() || "/assets/mail/logo-sample.svg";

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "kanini-official-format",
    title: "KANINI Official Format",
    hint: "Standard recruiter prompt used by the team.",
    template: [
      "Generate a recruiter-grade Job Description in KANINI's official format.",
      "Role Title: [Insert Role]",
      "Location: [Insert Location]",
      "Experience: [Insert Years]",
      "Structure must follow:",
      "Header (Role, Location, Experience)",
      "About the Role (KANINI branding + role impact)",
      "What You'll Do (6-8 action-oriented bullets)",
      "What You Bring (skills, experience, domain)",
      "Why Join KANINI (culture, Great Place to Work, tech exposure)",
      "Ready to Make an Impact (call-to-action)",
      "Tone: Crisp, professional, candidate-friendly.",
      "Always highlight Great Place to Work recognition.",
    ].join("\n"),
  },
  {
    id: "kanini-bsa",
    title: "BSA Prompt",
    hint: "Business analysis and stakeholder alignment.",
    template: [
      "Generate a recruiter-grade Job Description in KANINI's official format.",
      "Role Title: [Insert Role]",
      "Location: [Insert Location]",
      "Experience: [Insert Years]",
      "Focus on requirement discovery, process modeling, stakeholder communication, and business impact.",
      "Use the exact KANINI JD section structure.",
    ].join("\n"),
  },
  {
    id: "kanini-manager",
    title: "Manager Prompt",
    hint: "People and delivery leadership outcomes.",
    template: [
      "Generate a recruiter-grade Job Description in KANINI's official format.",
      "Role Title: [Insert Role]",
      "Location: [Insert Location]",
      "Experience: [Insert Years]",
      "Focus on leadership, cross-functional execution, governance, and team mentoring.",
      "Use the exact KANINI JD section structure.",
    ].join("\n"),
  },
  {
    id: "kanini-technical",
    title: "Technical Prompt",
    hint: "Hands-on engineering and architecture depth.",
    template: [
      "Generate a recruiter-grade Job Description in KANINI's official format.",
      "Role Title: [Insert Role]",
      "Location: [Insert Location]",
      "Experience: [Insert Years]",
      "Focus on coding, system design, reliability, performance, and engineering ownership.",
      "Use the exact KANINI JD section structure.",
    ].join("\n"),
  },
  {
    id: "kanini-management",
    title: "Management Prompt",
    hint: "Strategic and portfolio-level ownership.",
    template: [
      "Generate a recruiter-grade Job Description in KANINI's official format.",
      "Role Title: [Insert Role]",
      "Location: [Insert Location]",
      "Experience: [Insert Years]",
      "Focus on strategic planning, governance, metrics ownership, and business outcomes.",
      "Use the exact KANINI JD section structure.",
    ].join("\n"),
  },
  {
    id: "kanini-marketing",
    title: "Marketing Prompt",
    hint: "Campaign impact, growth, and brand execution.",
    template: [
      "Generate a recruiter-grade Job Description in KANINI's official format.",
      "Role Title: [Insert Role]",
      "Location: [Insert Location]",
      "Experience: [Insert Years]",
      "Focus on campaign execution, brand storytelling, demand generation, and analytics.",
      "Use the exact KANINI JD section structure.",
    ].join("\n"),
  },
];

export function JobDescriptionClient({
  roleOptions,
  locationOptions,
}: {
  roleOptions: RoleOption[];
  locationOptions: string[];
}) {
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [domain, setDomain] = useState("");
  const [mustHaveSkills, setMustHaveSkills] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState<"docx" | "pdf" | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [promptName, setPromptName] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptName, setEditingPromptName] = useState("");
  const [editingPromptTemplate, setEditingPromptTemplate] = useState("");
  const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);
  const [promptBusy, setPromptBusy] = useState(false);
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

  const selectedRoleOption = roleOptions.find((role) => role.id === selectedRoleId) ?? null;
  const resolvedRoleTitle =
    selectedRoleId === "__custom__"
      ? roleTitle.trim()
      : selectedRoleOption?.name.trim() ?? "";
  const resolvedLocation = selectedLocation === "__custom__" ? location.trim() : selectedLocation.trim();

  const promptOptions = useMemo(
    () => [
      ...PROMPT_PRESETS.map((item) => ({
        ...item,
        source: "builtin" as const,
      })),
      ...savedPrompts.map((item) => ({
        id: `saved-${item.id}`,
        title: item.name,
        hint: "Saved by your team",
        template: item.template,
        source: "saved" as const,
        savedId: item.id,
      })),
    ],
    [savedPrompts],
  );

  async function reloadSavedPrompts() {
    const refreshed = await fetch("/api/job-descriptions/prompts");
    const rows = (await refreshed.json().catch(() => [])) as SavedPrompt[];
    setSavedPrompts(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    reloadSavedPrompts()
      .catch(() => setSavedPrompts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyPromptPreset(preset: PromptPreset) {
    try {
      await navigator.clipboard.writeText(preset.template);
      setCopiedPresetId(preset.id);
      setTimeout(() => setCopiedPresetId((current) => (current === preset.id ? null : current)), 1800);
    } catch {
      setError("Could not copy prompt. Please copy manually from the text box.");
    }
  }

  async function savePromptTemplate() {
    const name = promptName.trim();
    const template = promptTemplate.trim();
    if (!name) {
      setError("Prompt name is required to save a custom prompt.");
      return;
    }
    if (template.length < 20) {
      setError("Prompt text is too short. Add more context before saving.");
      return;
    }

    setPromptBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/job-descriptions/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, template }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Could not save this prompt.");
        return;
      }

      await reloadSavedPrompts();
      setPromptName("");
      setPromptTemplate("");
      setSaveMessage("Prompt saved and added to the Prompts section.");
    } finally {
      setPromptBusy(false);
    }
  }

  function startEditPrompt(preset: PromptPreset) {
    if (preset.source !== "saved" || !preset.savedId) return;
    setEditingPromptId(preset.savedId);
    setEditingPromptName(preset.title);
    setEditingPromptTemplate(preset.template);
  }

  function cancelEditPrompt() {
    setEditingPromptId(null);
    setEditingPromptName("");
    setEditingPromptTemplate("");
  }

  async function saveEditedPrompt() {
    if (!editingPromptId) return;
    const name = editingPromptName.trim();
    const template = editingPromptTemplate.trim();
    if (!name) {
      setError("Prompt name is required.");
      return;
    }
    if (template.length < 20) {
      setError("Prompt text is too short.");
      return;
    }

    setPromptBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/job-descriptions/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPromptId,
          name,
          template,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not update prompt.");
        return;
      }

      await reloadSavedPrompts();
      cancelEditPrompt();
      setSaveMessage("Prompt updated.");
    } finally {
      setPromptBusy(false);
    }
  }

  async function deletePrompt(savedId: string) {
    setDeletingPromptId(savedId);
    setPromptBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/job-descriptions/prompts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedId }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not delete prompt.");
        return;
      }
      await reloadSavedPrompts();
      if (editingPromptId === savedId) cancelEditPrompt();
      setSaveMessage("Prompt deleted.");
    } finally {
      setPromptBusy(false);
      setDeletingPromptId(null);
    }
  }

  async function saveJobDescription() {
    if (!generated) return;

    setSaveBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const projectId = selectedRoleOption?.projectId ?? selectedRoleOption?.projectIds?.[0] ?? undefined;
      const res = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: generated,
          roleId: selectedRoleOption?.id,
          projectId,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not save job description.");
        return;
      }
      setSaveMessage("Job description saved. It is now available as a Job ID in candidate creation.");
    } finally {
      setSaveBusy(false);
    }
  }

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
    <div className="space-y-5">
      <div className="grid items-stretch gap-5 xl:grid-cols-2">
        <CaseCard className="h-full min-h-[900px] p-5">
        <h2 className="font-serif text-xl font-bold">Generate with AI</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
          Recruiter-grade KANINI JD generation with consistent structure and downloadable DOCX/PDF.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <FieldLabel htmlFor="roleTitle">Role Title</FieldLabel>
            <FieldSelect
              id="roleTitle"
              value={selectedRoleId}
              onChange={(e) => {
                setSelectedRoleId(e.target.value);
                if (e.target.value !== "__custom__") setRoleTitle("");
              }}
            >
              <option value="">Select role</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
              <option value="__custom__">Other (type manually)</option>
            </FieldSelect>
            {selectedRoleId === "__custom__" && (
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
              placeholder="Paste copied prompt here (optional), plus any client context or constraints..."
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
        {saveMessage && <p className="mt-3 text-[13px] font-semibold text-[var(--green)]">{saveMessage}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={generate} disabled={busy} className="px-5 py-2.5 text-[13px]">
            {busy ? "Generating..." : "Generate job description"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => void saveJobDescription()}
            disabled={!generated || saveBusy}
            className="px-5 py-2.5 text-[13px]"
          >
            {saveBusy ? "Saving JD..." : "Save job description"}
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

      <CaseCard className="h-full min-h-[900px] p-5">
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
          <div className="mt-4 flex h-[calc(100%-48px)] flex-col overflow-auto rounded-xl border border-[var(--cream-2)] bg-white">
            <header className="border-b border-[var(--cream-2)] px-5 py-4">
              <img src={PREVIEW_LOGO_URL} alt="KANINI logo" className="h-8 w-auto object-contain" />
            </header>

            <div className="flex-1 space-y-4 px-5 py-4">
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

            <footer className="border-t border-[var(--cream-2)] px-5 py-3 text-center text-[12px] text-[var(--ink-soft)]">
              Great Place to Work Certified | Intellect · Energy · Integrity
            </footer>
          </div>
        )}
      </CaseCard>
    </div>

      <CaseCard className="p-5">
        <h2 className="font-serif text-xl font-bold">Prompts</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
          Prompts are separate from Job Description form fields. Copy a prompt and paste it into Additional context when needed.
        </p>

        <div className="mt-4 rounded-xl border border-[var(--cream-2)] bg-white p-3">
          <p className="text-[13px] font-semibold text-[var(--ink)]">Create a new prompt</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <FieldInput
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder="Prompt name (e.g., Technical Architect Standard)"
            />
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-[12px]"
              disabled={promptBusy}
              onClick={() => void savePromptTemplate()}
            >
              {promptBusy ? "Saving..." : "Save prompt"}
            </Button>
          </div>
          <FieldTextarea
            className="mt-2"
            rows={7}
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            placeholder="Paste or type a reusable prompt template here..."
          />
        </div>

        <div className="mt-4 space-y-3">
          {promptOptions.map((preset) => (
            <div key={preset.id} className="rounded-lg border border-[var(--cream-2)] bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--ink)]">{preset.title}</p>
                  <p className="text-[12px] text-[var(--ink-soft)]">{preset.hint}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1.5 text-[12px]"
                    onClick={() => void copyPromptPreset(preset)}
                  >
                    {copiedPresetId === preset.id ? "Copied" : "Copy prompt"}
                  </Button>
                  {preset.source === "saved" && preset.savedId && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1.5 text-[12px]"
                        onClick={() => startEditPrompt(preset)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1.5 text-[12px] text-[#c0392b] hover:text-[#c0392b]"
                        disabled={promptBusy}
                        onClick={() => void deletePrompt(preset.savedId!)}
                      >
                        {deletingPromptId === preset.savedId ? "Deleting..." : "Delete"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editingPromptId === preset.savedId ? (
                <div className="mt-2 space-y-2">
                  <FieldInput
                    value={editingPromptName}
                    onChange={(e) => setEditingPromptName(e.target.value)}
                    placeholder="Prompt name"
                  />
                  <FieldTextarea
                    value={editingPromptTemplate}
                    onChange={(e) => setEditingPromptTemplate(e.target.value)}
                    rows={8}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-3 py-1.5 text-[12px]"
                      disabled={promptBusy}
                      onClick={() => void saveEditedPrompt()}
                    >
                      {promptBusy ? "Saving..." : "Save changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-3 py-1.5 text-[12px]"
                      disabled={promptBusy}
                      onClick={cancelEditPrompt}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <FieldTextarea value={preset.template} rows={8} readOnly className="mt-2" />
              )}
            </div>
          ))}
        </div>
      </CaseCard>
    </div>
  );
}
