"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, ButtonLink } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldSelect, FieldTextarea } from "@/components/FormField";
import { cn } from "@/lib/utils";
import {
  isAllowedResumeFilename,
  RESUME_UPLOAD_ACCEPT,
  RESUME_UPLOAD_FRIENDLY_ERROR,
} from "@/lib/resume/formats";

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

type SavedJobDescription = {
  id: string;
  title: string;
  location: string;
  experience: string;
  updatedAt: string;
  content: GeneratedJd;
};

type SavedJobDescriptionOption = {
  id: string;
  label: string;
  roleId: string | null;
  projectId: string | null;
  location: string;
  experience: string;
  updatedAt: string;
};

type RoleOption = {
  id: string;
  name: string;
  projectId: string | null;
  projectIds: string[];
};

type ProjectOption = {
  id: string;
  name: string;
};

type DeleteImpactCandidate = {
  id: string;
  name: string;
  email: string;
  status: string;
  projectName: string | null;
  roleName: string | null;
};

type DeleteImpactPreview = {
  candidateId: string;
  candidateName: string;
  to: string;
  subject: string;
  body: string;
};

type DeleteImpact = {
  jobDescription: {
    id: string;
    title: string;
    location: string;
    experience: string;
    roleName: string | null;
    projectName: string | null;
  };
  candidates: DeleteImpactCandidate[];
  notificationPreview: DeleteImpactPreview[];
  hasLinkedProject: boolean;
  impactedCount: number;
};

const PREVIEW_LOGO_URL =
  process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() || "/assets/mail/Kanini-logo.png";

const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME ?? process.env.NEXT_PUBLIC_BRAND_ORG_NAME ?? "";

const DEFAULT_PROMPT_ID = "org-official-format";

function normalizeJdKey(value: string) {
  return value.trim().toLowerCase();
}

function findMatchingSavedJobDescription(
  options: SavedJobDescriptionOption[],
  input: {
    roleId: string;
    projectId?: string | null;
    location: string;
    experience: string;
  },
) {
  const locationKey = normalizeJdKey(input.location);
  const experienceKey = normalizeJdKey(input.experience);
  const projectKey = input.projectId?.trim() || null;

  return (
    options.find(
      (item) =>
        item.roleId === input.roleId &&
        normalizeJdKey(item.location) === locationKey &&
        normalizeJdKey(item.experience) === experienceKey &&
        (item.projectId?.trim() || null) === projectKey,
    ) ?? null
  );
}

function buildPromptPresets(orgName: string): PromptPreset[] {
  const org = orgName || "our company";
  return [
    {
      id: "org-official-format",
      title: `${org} Official Format`,
      hint: "Standard recruiter prompt used by the team.",
      template: [
        `Generate a recruiter-grade Job Description in ${org}'s official format.`,
        "Role Title: [Insert Role]",
        "Location: [Insert Location]",
        "Experience: [Insert Years]",
        "Structure must follow:",
        "Header (Role, Location, Experience)",
        `About the Role (${org} branding + role impact)`,
        "What You'll Do (6-8 action-oriented bullets)",
        "What You Bring (skills, experience, domain)",
        `Why Join ${org} (culture, Great Place to Work, tech exposure)`,
        "Ready to Make an Impact (call-to-action)",
        "Tone: Crisp, professional, candidate-friendly.",
        "Always highlight Great Place to Work recognition.",
      ].join("\n"),
    },
    {
      id: "org-bsa",
      title: "BSA Prompt",
      hint: "Business analysis and stakeholder alignment.",
      template: [
        `Generate a recruiter-grade Job Description in ${org}'s official format.`,
        "Role Title: [Insert Role]",
        "Location: [Insert Location]",
        "Experience: [Insert Years]",
        "Focus on requirement discovery, process modeling, stakeholder communication, and business impact.",
        `Use the exact ${org} JD section structure.`,
      ].join("\n"),
    },
    {
      id: "org-manager",
      title: "Manager Prompt",
      hint: "People and delivery leadership outcomes.",
      template: [
        `Generate a recruiter-grade Job Description in ${org}'s official format.`,
        "Role Title: [Insert Role]",
        "Location: [Insert Location]",
        "Experience: [Insert Years]",
        "Focus on leadership, cross-functional execution, governance, and team mentoring.",
        `Use the exact ${org} JD section structure.`,
      ].join("\n"),
    },
    {
      id: "org-technical",
      title: "Technical Prompt",
      hint: "Hands-on engineering and architecture depth.",
      template: [
        `Generate a recruiter-grade Job Description in ${org}'s official format.`,
        "Role Title: [Insert Role]",
        "Location: [Insert Location]",
        "Experience: [Insert Years]",
        "Focus on coding, system design, reliability, performance, and engineering ownership.",
        `Use the exact ${org} JD section structure.`,
      ].join("\n"),
    },
    {
      id: "org-management",
      title: "Management Prompt",
      hint: "Strategic and portfolio-level ownership.",
      template: [
        `Generate a recruiter-grade Job Description in ${org}'s official format.`,
        "Role Title: [Insert Role]",
        "Location: [Insert Location]",
        "Experience: [Insert Years]",
        "Focus on strategic planning, governance, metrics ownership, and business outcomes.",
        `Use the exact ${org} JD section structure.`,
      ].join("\n"),
    },
    {
      id: "org-marketing",
      title: "Marketing Prompt",
      hint: "Campaign impact, growth, and brand execution.",
      template: [
        `Generate a recruiter-grade Job Description in ${org}'s official format.`,
        "Role Title: [Insert Role]",
        "Location: [Insert Location]",
        "Experience: [Insert Years]",
        "Focus on campaign execution, brand storytelling, demand generation, and analytics.",
        `Use the exact ${org} JD section structure.`,
      ].join("\n"),
    },
  ];
}

export function JobDescriptionClient({
  roleOptions,
  locationOptions,
  projectOptions,
}: {
  roleOptions: RoleOption[];
  locationOptions: string[];
  projectOptions: ProjectOption[];
}) {
  const orgName = ORG_NAME;
  const promptOptions_builtin = useMemo(() => buildPromptPresets(orgName), [orgName]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [domain, setDomain] = useState("");
  const [mustHaveSkills, setMustHaveSkills] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [jdMode, setJdMode] = useState<"upload" | "generate">("upload");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [exportBusy, setExportBusy] = useState<"docx" | "pdf" | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [savedJdOptions, setSavedJdOptions] = useState<SavedJobDescriptionOption[]>([]);
  const [selectedSavedJdId, setSelectedSavedJdId] = useState("");
  const [promptName, setPromptName] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptName, setEditingPromptName] = useState("");
  const [editingPromptTemplate, setEditingPromptTemplate] = useState("");
  const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);
  const [promptBusy, setPromptBusy] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [generated, setGenerated] = useState<GeneratedJd | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  const [jdMessage, setJdMessage] = useState<string | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (deleteDialogOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => { document.body.classList.remove("modal-open"); };
  }, [deleteDialogOpen]);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3500);
  }

  const parsedSkills = useMemo(
    () =>
      mustHaveSkills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12),
    [mustHaveSkills],
  );

  const skillsError = useMemo(() => {
    const long = parsedSkills.find((s) => s.length > 60);
    return long ? `"${long.slice(0, 30)}…" exceeds 60 characters. Please shorten it.` : null;
  }, [parsedSkills]);

  const selectedRoleOption = roleOptions.find((role) => role.id === selectedRoleId) ?? null;
  const resolvedRoleTitle =
    selectedRoleId === "__custom__"
      ? roleTitle.trim()
      : selectedRoleOption?.name.trim() ?? "";
  const resolvedLocation = selectedLocation === "__custom__" ? location.trim() : selectedLocation.trim();

  // All project ids this role belongs to
  const roleProjectIds: string[] = useMemo(() => {
    if (!selectedRoleOption) return [];
    const ids = new Set<string>();
    if (selectedRoleOption.projectId) ids.add(selectedRoleOption.projectId);
    for (const pid of selectedRoleOption.projectIds) ids.add(pid);
    return Array.from(ids);
  }, [selectedRoleOption]);

  // Projects available to pick for this role (shown for any role that has at least 1 project)
  const roleProjectOptions: ProjectOption[] = useMemo(
    () => projectOptions.filter((p) => roleProjectIds.includes(p.id)),
    [projectOptions, roleProjectIds],
  );

  // Reset project selection when role changes
  useEffect(() => {
    if (roleProjectIds.length === 1) {
      setSelectedProjectId(roleProjectIds[0]);
    } else {
      setSelectedProjectId("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId]);

  // Load the default standard prompt when a mapped role is selected
  useEffect(() => {
    if (!selectedRoleId || selectedRoleId === "__custom__") {
      setAdditionalContext("");
      setSelectedPromptId("");
      return;
    }

    const defaultPreset = promptOptions_builtin.find((item) => item.id === DEFAULT_PROMPT_ID);
    if (defaultPreset) {
      setAdditionalContext(defaultPreset.template);
      setSelectedPromptId(DEFAULT_PROMPT_ID);
    }
  }, [selectedRoleId, promptOptions_builtin]);

  const resolvedProjectId =
    selectedProjectId || selectedRoleOption?.projectId || selectedRoleOption?.projectIds?.[0] || null;

  const matchingSavedJobDescription = useMemo(() => {
    if (!selectedRoleId || selectedRoleId === "__custom__" || !resolvedLocation || !experience.trim()) {
      return null;
    }
    if (roleProjectOptions.length > 1 && !selectedProjectId) {
      return null;
    }

    return findMatchingSavedJobDescription(savedJdOptions, {
      roleId: selectedRoleId,
      projectId: resolvedProjectId,
      location: resolvedLocation,
      experience: experience.trim(),
    });
  }, [
    selectedRoleId,
    resolvedLocation,
    experience,
    savedJdOptions,
    roleProjectOptions.length,
    selectedProjectId,
    resolvedProjectId,
  ]);

  const promptOptions = useMemo(
    () => [
      ...promptOptions_builtin.map((item) => ({
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

  async function reloadSavedJobDescriptionOptions() {
    const refreshed = await fetch("/api/job-descriptions?view=options");
    const rows = (await refreshed.json().catch(() => [])) as SavedJobDescriptionOption[];
    setSavedJdOptions(Array.isArray(rows) ? rows : []);
  }

  async function loadFullJobDescription(id: string) {
    const res = await fetch(`/api/job-descriptions/${id}?view=content`);
    if (!res.ok) {
      throw new Error("Failed to load job description");
    }
    return (await res.json()) as SavedJobDescription;
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([reloadSavedPrompts(), reloadSavedJobDescriptionOptions()])
      .catch(() => {
        setSavedPrompts([]);
        setSavedJdOptions([]);
      });
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
    setPromptMessage(null);
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
      setPromptMessage("Prompt saved and added to the Prompts section.");
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
    setPromptMessage(null);
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
      setPromptMessage("Prompt updated.");
    } finally {
      setPromptBusy(false);
    }
  }

  async function deletePrompt(savedId: string) {
    setDeletingPromptId(savedId);
    setPromptBusy(true);
    setError(null);
    setPromptMessage(null);
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
      setPromptMessage("Prompt deleted.");
    } finally {
      setPromptBusy(false);
      setDeletingPromptId(null);
    }
  }

  async function saveJobDescription() {
    if (!generated) return;

    if (!selectedRoleId || selectedRoleId === "__custom__") {
      setError("Select a role from the list before saving — saved job descriptions need a mapped role to appear as Job ID during candidate creation.");
      return;
    }

    if (roleProjectOptions.length > 1 && !selectedProjectId) {
      setError("This role belongs to multiple projects. Please select a project before saving.");
      return;
    }

    const existing = findMatchingSavedJobDescription(savedJdOptions, {
      roleId: selectedRoleId,
      projectId: resolvedProjectId,
      location: resolvedLocation,
      experience: experience.trim(),
    });
    if (existing) {
      setError(
        `A job description already exists for this role, location, and experience (${existing.label}). Load it from Saved Job Descriptions instead of creating another one.`,
      );
      setSelectedSavedJdId(existing.id);
      return;
    }

    setSaveBusy(true);
    setError(null);
    setJdMessage(null);
    try {
      const projectId = resolvedProjectId || undefined;
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

      await reloadSavedJobDescriptionOptions();
      const savedId = (payload as { id?: string }).id;

      if (savedId) {
        setSelectedSavedJdId(savedId);
        setJdMessage("Job description saved. The current draft stays in preview and is now available as a Job ID in candidate creation.");
      } else {
        setJdMessage("Job description saved. It is now available as a Job ID in candidate creation.");
      }
    } finally {
      setSaveBusy(false);
    }
  }

  async function deleteSavedJobDescription() {
    if (!selectedSavedJdId) {
      setError("Select a saved job description to delete.");
      return;
    }

    setDeleteBusy(true);
    setError(null);
    setJdMessage(null);

    try {
      const res = await fetch(`/api/job-descriptions/${selectedSavedJdId}`);
      const payload = (await res.json().catch(() => ({}))) as DeleteImpact & { error?: string };
      if (!res.ok || !payload.jobDescription) {
        setError(payload.error ?? "Could not load delete impact.");
        return;
      }

      setDeleteImpact(payload as DeleteImpact);
      setDeleteDialogOpen(true);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function confirmDeleteJobDescription() {
    if (!selectedSavedJdId || !deleteImpact) return;

    const selectedOption = savedJdOptions.find((item) => item.id === selectedSavedJdId);
    if (!selectedOption) {
      setError("Selected job description could not be found.");
      return;
    }

    setDeleteBusy(true);
    setError(null);
    setJdMessage(null);

    try {
      const res = await fetch(`/api/job-descriptions/${selectedSavedJdId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE" }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not delete job description.");
        return;
      }

      await reloadSavedJobDescriptionOptions();
      setSelectedSavedJdId("");
      setGenerated(null);
      setUsage(null);
      setDeleteDialogOpen(false);
      setDeleteImpact(null);
      showToast(`Deleted job description: ${selectedOption.label}.`);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function loadSavedJobDescription() {
    if (!selectedSavedJdId) {
      setError("Select a saved job description to load.");
      return;
    }

    setError(null);
    setJdMessage(null);

    try {
      const selected = await loadFullJobDescription(selectedSavedJdId);
      if (!selected?.content) {
        setError("Selected job description could not be loaded.");
        return;
      }

      setGenerated(selected.content);
      setUsage(null);
      setJdMessage(`Loaded saved job description: ${selected.title}.`);
    } catch (err) {
      setError("Failed to load job description. Please try again.");
    }
  }

  async function uploadExternalJobDescription() {
    if (!resolvedRoleTitle || !resolvedLocation || !experience.trim()) {
      setError("Role title, location, and experience are required before uploading.");
      return;
    }

    if (!selectedRoleId || selectedRoleId === "__custom__") {
      setError("Select a role from the list before uploading — saved job descriptions need a mapped role to appear as Job ID during candidate creation.");
      return;
    }

    if (!uploadFile) {
      setError("Choose a PDF or DOCX job description file to upload.");
      return;
    }

    if (!isAllowedResumeFilename(uploadFile.name)) {
      setError(RESUME_UPLOAD_FRIENDLY_ERROR);
      return;
    }

    setUploadBusy(true);
    setError(null);
    setJdMessage(null);
    setSelectedSavedJdId("");

    try {
      const fd = new FormData();
      fd.set("file", uploadFile);
      fd.set("roleTitle", resolvedRoleTitle);
      fd.set("location", resolvedLocation);
      fd.set("experience", experience);
      if (domain.trim()) fd.set("domain", domain.trim());

      const res = await fetch("/api/job-descriptions/import", {
        method: "POST",
        body: fd,
      });

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        jobDescription?: GeneratedJd;
        usage?: Usage;
      };

      if (!res.ok || !payload.jobDescription) {
        setError(payload.error ?? "Could not import the uploaded job description.");
        return;
      }

      setGenerated(payload.jobDescription);
      setUsage(payload.usage ?? null);
      setJdMessage("External job description uploaded. Review the preview, then save it to make it available as a Job ID.");
    } finally {
      setUploadBusy(false);
    }
  }

  async function generate() {
    if (!resolvedRoleTitle || !resolvedLocation || !experience.trim()) {
      setError("Role title, location, and experience are required.");
      return;
    }

    if (skillsError) {
      setError("Please fix the skills field before generating.");
      return;
    }

    setBusy(true);
    setError(null);
    setJdMessage(null);
    setSelectedSavedJdId("");

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
      const filename = filenameMatch?.[1] ?? `job-description-${(orgName || "export").toLowerCase().replace(/\s+/g, "-")}.${format}`;
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
      <div className="grid items-start gap-5 md:grid-cols-2">
        <CaseCard className="min-w-0 p-5">
          <div className="flex gap-2 border-b border-[var(--cream-2)]">
            {(
              [
                ["upload", "Upload JD"],
                ["generate", "Generate JD"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setJdMode(mode);
                  setError(null);
                }}
                className={cn(
                  "-mb-px flex-1 border-b-[3px] pb-3 text-center text-[13px] font-bold transition-colors",
                  jdMode === mode
                    ? "border-[var(--cyan)] text-[var(--ink)]"
                    : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink-soft)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[13px] text-[var(--ink-faint)]">
            {jdMode === "upload"
              ? "Import an existing PDF or DOCX job description, then save it as a Job ID for candidate creation."
              : `Recruiter-grade ${orgName} JD generation with consistent structure and downloadable DOCX/PDF.`}
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

            {roleProjectOptions.length >= 1 && (
              <div>
                <FieldLabel htmlFor="jd-project">Project</FieldLabel>
                <FieldSelect
                  id="jd-project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {roleProjectOptions.length > 1 && (
                    <option value="">Select project (required)</option>
                  )}
                  {roleProjectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </FieldSelect>
                {roleProjectOptions.length > 1 && (
                  <p className="mt-1 text-[11px] text-[var(--ink-faint)]">
                    This role belongs to multiple projects. Select which project this JD is for — it will appear in the Job ID label during candidate creation.
                  </p>
                )}
              </div>
            )}

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

            {jdMode === "upload" ? (
              <div className="space-y-3 border-t border-[var(--cream-2)] pt-4">
                <div>
                  <FieldLabel htmlFor="jd-upload">Job description file</FieldLabel>
                  <FieldInput
                    id="jd-upload"
                    type="file"
                    accept={RESUME_UPLOAD_ACCEPT}
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-1 text-[11px] text-[var(--ink-faint)]">
                    {uploadFile ? `Selected: ${uploadFile.name}` : "PDF or DOCX up to 10MB"}
                  </p>
                </div>
              </div>
            ) : (
              <>
            <div>
              <FieldLabel htmlFor="skills">Must-have skills (optional)</FieldLabel>
              <FieldInput
                id="skills"
                value={mustHaveSkills}
                onChange={(e) => setMustHaveSkills(e.target.value)}
                placeholder="Java, Spring Boot, Microservices, Azure"
              />
              {skillsError ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--orange)]">{skillsError}</p>
              ) : (
                <p className="mt-1 text-[11px] text-[var(--ink-faint)]">
                  Comma-separated. Up to 12 skills, max 60 characters each.
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <label htmlFor="context" className="case-label shrink-0">Additional context (optional)</label>
                <FieldSelect
                  value=""
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;

                    if (value === "__clear__") {
                      setAdditionalContext("");
                      setSelectedPromptId("");
                      return;
                    }

                    if (additionalContext.trim()) {
                      setError("Clear the additional context first, then choose a prompt from the dropdown.");
                      return;
                    }

                    const chosen = promptOptions.find((p) => p.id === value);
                    if (chosen) {
                      setAdditionalContext(chosen.template);
                      setSelectedPromptId(chosen.id);
                      setError(null);
                    }
                  }}
                  className="ml-auto min-w-0 max-w-[220px] text-[12px]"
                >
                  <option value="">Load a prompt…</option>
                  <option value="__clear__">Clear context</option>
                  {promptOptions_builtin.length > 0 && (
                    <optgroup label="Built-in">
                      {promptOptions_builtin.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </optgroup>
                  )}
                  {savedPrompts.length > 0 && (
                    <optgroup label="Saved">
                      {savedPrompts.map((p) => (
                        <option key={`saved-${p.id}`} value={`saved-${p.id}`}>{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                </FieldSelect>
              </div>
              <FieldTextarea
                id="context"
                value={additionalContext}
                onChange={(e) => {
                  setAdditionalContext(e.target.value);
                  if (selectedPromptId) {
                    const activePreset = promptOptions.find((item) => item.id === selectedPromptId);
                    if (activePreset && e.target.value !== activePreset.template) {
                      setSelectedPromptId("");
                    }
                  }
                }}
                rows={5}
                placeholder="The standard prompt loads when you select a role. Clear it first to choose a different prompt from the dropdown."
              />
              {matchingSavedJobDescription && (
                <p className="mt-2 text-[12px] font-semibold text-[var(--orange)]">
                  A saved job description already matches this role, location, and experience ({matchingSavedJobDescription.label}). Load it from Saved Job Descriptions instead of creating a duplicate.
                </p>
              )}
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
              </>
            )}
          </div>

          {usage && jdMode === "generate" && (
            <div className="mt-4 rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-3 text-[12px] text-[var(--ink-soft)]">
              Model: <strong>{usage.model}</strong> · Prompt: <strong>{usage.promptTokens}</strong> · Output: <strong>{usage.completionTokens}</strong> · Total: <strong>{usage.totalTokens}</strong>
            </div>
          )}

          {error && <p className="mt-3 text-[13px] font-semibold text-[var(--orange)]">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {jdMode === "upload" ? (
              <Button
                type="button"
                onClick={() => void uploadExternalJobDescription()}
                disabled={uploadBusy || busy || !uploadFile}
                className="px-5 py-2.5 text-[13px]"
              >
                {uploadBusy ? "Uploading..." : "Upload and preview"}
              </Button>
            ) : (
              <Button onClick={generate} disabled={busy || uploadBusy} className="px-5 py-2.5 text-[13px]">
                {busy ? "Generating..." : "Generate job description"}
              </Button>
            )}
          </div>
        </CaseCard>

        <div className="flex min-w-0 flex-col gap-5">
          <CaseCard className="min-w-0 p-5">
            <p className="text-[13px] font-semibold text-[var(--ink)]">Saved Job Descriptions</p>
            {savedJdOptions.length === 0 ? (
              <p className="mt-1 text-[12px] text-[var(--ink-soft)]">
                No saved job descriptions yet. You can still generate, preview, and download directly on this page.
              </p>
            ) : (
              <>
                <div className="mt-2 grid gap-2">
                  <FieldSelect
                    value={selectedSavedJdId}
                    onChange={(e) => setSelectedSavedJdId(e.target.value)}
                  >
                    <option value="">Select saved job description</option>
                    {savedJdOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </FieldSelect>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-2 text-[12px]"
                    onClick={loadSavedJobDescription}
                    disabled={!selectedSavedJdId}
                  >
                    Load to preview
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-[var(--ink-faint)]">
                  Loading a saved JD updates the Preview pane on this page and enables DOCX/PDF download here.
                </p>
              </>
            )}

            {jdMessage && <p className="mt-3 text-[12px] font-semibold text-[var(--green)]">{jdMessage}</p>}

            {selectedSavedJdId ? (
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (!selectedSavedJdId) return;
                      setExportBusy("docx");
                      try {
                        const saved = await loadFullJobDescription(selectedSavedJdId);
                        const res = await fetch("/api/job-descriptions/export/docx", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ jobDescription: saved.content }),
                        });
                        if (!res.ok) throw new Error("Export failed");
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${saved.title}.docx`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (err) {
                        setError("Failed to download DOCX");
                      } finally {
                        setExportBusy(null);
                      }
                    }}
                    disabled={exportBusy !== null}
                    className="px-3 py-2 text-[12px]"
                  >
                    {exportBusy === "docx" ? "Preparing DOCX..." : "Download DOCX"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (!selectedSavedJdId) return;
                      setExportBusy("pdf");
                      try {
                        const saved = await loadFullJobDescription(selectedSavedJdId);
                        const res = await fetch("/api/job-descriptions/export/pdf", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ jobDescription: saved.content }),
                        });
                        if (!res.ok) throw new Error("Export failed");
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${saved.title}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (err) {
                        setError("Failed to download PDF");
                      } finally {
                        setExportBusy(null);
                      }
                    }}
                    disabled={exportBusy !== null}
                    className="px-3 py-2 text-[12px]"
                  >
                    {exportBusy === "pdf" ? "Preparing PDF..." : "Download PDF"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void deleteSavedJobDescription()}
                    disabled={deleteBusy}
                    className="px-3 py-2 text-[12px]"
                  >
                    {deleteBusy ? "Reviewing delete impact..." : "Delete Job Description"}
                  </Button>
                  <ButtonLink href="/evaluate/new" variant="ghost" className="px-3 py-2 text-[12px]">
                    Add candidate
                  </ButtonLink>
                </div>
                <p className="text-[11px] text-[var(--ink-faint)]">
                  Download or load to preview. If you generate again, the loaded preview is replaced with the latest job description.
                </p>
              </div>
            ) : generated ? (
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => void saveJobDescription()}
                    disabled={saveBusy || !!matchingSavedJobDescription}
                    className="px-3 py-2 text-[12px]"
                  >
                    {saveBusy ? "Saving JD..." : "Save job description"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => download("docx")}
                    disabled={exportBusy !== null}
                    className="px-3 py-2 text-[12px]"
                  >
                    {exportBusy === "docx" ? "Preparing DOCX..." : "Download DOCX"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => download("pdf")}
                    disabled={exportBusy !== null}
                    className="px-3 py-2 text-[12px]"
                  >
                    {exportBusy === "pdf" ? "Preparing PDF..." : "Download PDF"}
                  </Button>
                  <ButtonLink href="/evaluate/new" variant="ghost" className="px-3 py-2 text-[12px]">
                    Add candidate
                  </ButtonLink>
                </div>
                <p className="text-[11px] text-[var(--ink-faint)]">
                  Save this job description to make it available as a Job ID, then add candidates from Evaluate.
                </p>
                {matchingSavedJobDescription && (
                  <p className="text-[12px] font-semibold text-[var(--orange)]">
                    This job description already exists ({matchingSavedJobDescription.label}). Load it from the list above instead of saving a duplicate.
                  </p>
                )}
              </div>
            ) : null}
          </CaseCard>

          <CaseCard className="min-w-0 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl font-bold">Preview</h2>
              {generated?.generatedAt && (
                <span className="text-[11px] text-[var(--ink-faint)]">
                  Generated {new Date(generated.generatedAt).toLocaleString()}
                </span>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white">
              <header className="border-b border-[var(--cream-2)] px-5 py-4">
                <img src={PREVIEW_LOGO_URL} alt={`${orgName} logo`} className="h-8 w-auto object-contain" />
              </header>

              {!generated ? (
                <div className="space-y-4 px-5 py-4">
                  <section className="rounded-xl border border-dashed border-[var(--cream-2)] bg-[var(--cream)] p-4 text-[13px] text-[var(--ink-soft)]">
                    Upload or generate a job description to review the full structured preview here.
                  </section>
                  <section className="rounded-xl border border-[var(--cream-2)] bg-[var(--cream)] p-4">
                    <h3 className="font-serif text-lg font-bold">Header</h3>
                    <p className="mt-2 text-[14px] text-[var(--ink-faint)]">Role: —</p>
                    <p className="text-[14px] text-[var(--ink-faint)]">Location: —</p>
                    <p className="text-[14px] text-[var(--ink-faint)]">Experience: —</p>
                  </section>
                </div>
              ) : (
                <div className="space-y-4 px-5 py-4">
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
                    <h3 className="font-serif text-lg font-bold">What You&apos;ll Do</h3>
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
                    <h3 className="font-serif text-lg font-bold">Why Join {orgName}</h3>
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

              <footer className="border-t border-[var(--cream-2)] px-5 py-3 text-center text-[12px] text-[var(--ink-soft)]">
                Great Place to Work Certified | Intellect · Energy · Integrity
              </footer>
            </div>
          </CaseCard>
        </div>
      </div>

      {mounted && deleteDialogOpen && deleteImpact && createPortal(
        <div className="modal-portal-root">
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteImpact(null);
            }}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-[var(--cream-2)] bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="border-b border-[var(--cream-2)] px-6 py-4 bg-gradient-to-r from-[var(--cream)] to-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="font-serif text-2xl font-bold text-[var(--ink)]">Delete Job Description</h2>
                  <p className="mt-2 text-[13px] font-semibold text-[var(--ink)]">
                    {deleteImpact.jobDescription.title} · {deleteImpact.jobDescription.location} · {deleteImpact.jobDescription.experience}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-shrink-0 px-3 py-2 text-[12px]"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteImpact(null);
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
              {/* Impact Summary Section */}
              {deleteImpact.impactedCount === 0 && !deleteImpact.hasLinkedProject ? (
                // NO MAPPING - SAFE TO DELETE
                <section className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-lg">✓</div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-900">Safe to delete</p>
                      <p className="mt-1 text-[13px] text-green-800">This job description has no candidate mappings or project links. You can delete it without affecting any records.</p>
                    </div>
                  </div>
                </section>
              ) : deleteImpact.impactedCount === 0 && deleteImpact.hasLinkedProject ? (
                // PROJECT LINKED ONLY
                <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-lg">ℹ</div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900">Project link only</p>
                      <p className="mt-1 text-[13px] text-blue-800">This job description is linked to a project but has no candidate mappings. Deleting will unlink it from the project.</p>
                    </div>
                  </div>
                </section>
              ) : (
                // CANDIDATES MAPPED - WARNING
                <section className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-lg">⚠</div>
                    <div className="flex-1">
                      <p className="font-semibold text-orange-900">Candidates will be affected</p>
                      <p className="mt-1 text-[13px] text-orange-800">
                        {deleteImpact.impactedCount} candidate{deleteImpact.impactedCount === 1 ? "" : "s"} {deleteImpact.impactedCount === 1 ? "is" : "are"} mapped to this job description.
                        {deleteImpact.hasLinkedProject && " The project link will also be removed."}
                        Notifications will be sent to affected candidates.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Job Description Details */}
              <section className="rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] p-4">
                <p className="text-[11px] font-semibold text-[var(--ink-faint)] uppercase tracking-wide">Job Description Details</p>
                <div className="mt-3 space-y-2 text-[13px] text-[var(--ink-soft)]">
                  <p><strong className="text-[var(--ink)]">Role:</strong> {deleteImpact.jobDescription.roleName ?? "-"}</p>
                  <p><strong className="text-[var(--ink)]">Project:</strong> {deleteImpact.jobDescription.projectName ?? "-"}</p>
                </div>
              </section>

              {/* Mapped Candidates Section */}
              {deleteImpact.impactedCount > 0 && (
                <section>
                  <h3 className="font-semibold text-[var(--ink)] text-[13px] uppercase tracking-wide">Affected Candidates ({deleteImpact.impactedCount})</h3>
                  <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {deleteImpact.candidates.map((candidate) => (
                      <div key={candidate.id} className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[var(--ink)] text-[13px]">{candidate.name}</p>
                            <p className="text-[12px] text-[var(--ink-soft)] truncate">{candidate.email}</p>
                          </div>
                          <div className="text-right text-[12px] flex-shrink-0">
                            <p className="font-semibold text-[var(--ink)]">{candidate.status}</p>
                            <p className="text-[var(--ink-soft)]">{candidate.projectName ?? "No project"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Notification note */}
              {deleteImpact.impactedCount > 0 && (
                <section className="rounded-lg border border-[var(--cream-2)] bg-[var(--cream)] px-4 py-3">
                  <p className="text-[12px] text-[var(--ink-soft)]">
                    <span className="font-semibold text-[var(--ink)]">{deleteImpact.impactedCount} candidate notification email{deleteImpact.impactedCount !== 1 ? "s" : ""}</span> will be sent automatically on deletion.
                  </p>
                </section>
              )}
            </div>

            {/* Footer / Actions */}
            <div className="border-t border-[var(--cream-2)] bg-[var(--cream)] px-6 py-4 flex justify-end gap-2">
              <Button
                type="button"
                className={`px-5 py-2.5 text-[13px] font-semibold text-white rounded-lg transition-colors ${
                  deleteImpact.impactedCount > 0
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                disabled={deleteBusy}
                onClick={() => void confirmDeleteJobDescription()}
              >
                {deleteBusy ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Deleting...
                  </>
                ) : (
                  <>Delete {deleteImpact.impactedCount > 0 ? "and Notify" : "Job Description"}</>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-5 py-2.5 text-[13px] font-semibold"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteImpact(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
        </div>
      , document.body)}

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
          <div className="mt-2 rounded-lg bg-[var(--cream)] p-2 text-[12px] text-[var(--ink-soft)]">
            <p className="font-semibold text-[var(--ink)]">Available placeholders:</p>
            <ul className="mt-1 space-y-1">
              <li><code className="bg-white px-1 py-0.5">[Insert Role]</code> - Job title or role name</li>
              <li><code className="bg-white px-1 py-0.5">[Insert Location]</code> - Work location or city</li>
              <li><code className="bg-white px-1 py-0.5">[Insert Years]</code> - Experience level (e.g., &quot;5-8 years&quot;)</li>
              <li><code className="bg-white px-1 py-0.5">[Insert Skills]</code> - Technical skills or competencies</li>
              <li><code className="bg-white px-1 py-0.5">[Insert Domain]</code> - Industry or domain expertise</li>
            </ul>
            <p className="mt-1 text-[11px]">Placeholders are replaced with actual form values during generation.</p>
          </div>
          {promptMessage && <p className="mt-2 text-[12px] font-semibold text-[var(--green)]">{promptMessage}</p>}
        </div>

        <div className="mt-4 space-y-3">
          {promptOptions.map((preset) => (
            <div key={preset.id} className="rounded-lg border border-[var(--cream-2)] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[var(--ink)]">{preset.title}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">{preset.hint}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1.5 text-[12px]"
                    onClick={() => void copyPromptPreset(preset)}
                  >
                    {copiedPresetId === preset.id ? "✓ Copied" : "Copy"}
                  </Button>
                  {preset.source === "saved" && preset.savedId && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1.5 text-[12px] text-[#0066cc] hover:text-[#0066cc] hover:underline"
                        onClick={() => startEditPrompt(preset)}
                        title="Edit this saved prompt"
                      >
                        ✎ Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1.5 text-[12px] text-[#c0392b] hover:text-[#c0392b] hover:underline"
                        disabled={promptBusy}
                        onClick={() => void deletePrompt(preset.savedId!)}
                        title="Delete this saved prompt"
                      >
                        {deletingPromptId === preset.savedId ? "Deleting..." : "🗑 Delete"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editingPromptId === preset.savedId ? (
                <div className="mt-3 space-y-2 border-t border-[var(--cream-2)] pt-3">
                  <p className="text-[12px] font-semibold text-[var(--ink)]">Editing prompt</p>
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
                  <div className="rounded-lg bg-[var(--cream)] p-2 text-[12px] text-[var(--ink-soft)]">
                    <p className="font-semibold text-[var(--ink)]">Available placeholders:</p>
                    <ul className="mt-1 space-y-1">
                      <li><code className="bg-white px-1 py-0.5">[Insert Role]</code> - Job title or role name</li>
                      <li><code className="bg-white px-1 py-0.5">[Insert Location]</code> - Work location or city</li>
                      <li><code className="bg-white px-1 py-0.5">[Insert Years]</code> - Experience level</li>
                      <li><code className="bg-white px-1 py-0.5">[Insert Skills]</code> - Technical skills</li>
                      <li><code className="bg-white px-1 py-0.5">[Insert Domain]</code> - Industry expertise</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-3 py-1.5 text-[12px]"
                      disabled={promptBusy}
                      onClick={() => void saveEditedPrompt()}
                    >
                      {promptBusy ? "Saving..." : "✓ Save changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-3 py-1.5 text-[12px] text-[var(--ink-soft)] hover:text-[var(--ink)]"
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

      {/* Toast notification */}
      {toastMsg && (
        <div className="lib-toast fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-3 text-[13px] font-semibold text-white shadow-xl">
          <span className="text-green-400">✓</span>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
