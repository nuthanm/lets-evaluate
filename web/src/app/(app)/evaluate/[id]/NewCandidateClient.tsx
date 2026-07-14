"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CaseCard } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldSelect } from "@/components/FormField";

type Project = { id: string; name: string };
type Role = { id: string; name: string; projectId: string | null };

export function NewCandidateClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const url = projectId
      ? `/api/roles?projectId=${projectId}`
      : "/api/roles";
    fetch(url)
      .then((r) => r.json())
      .then(setRoles)
      .catch(() => {});
  }, [projectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    if (phone) fd.set("phone", phone);
    if (source) fd.set("source", source);
    if (consent) fd.set("consent", "true");
    if (projectId) fd.set("projectId", projectId);
    if (roleId) fd.set("roleId", roleId);
    if (file) fd.set("resume", file);
    const res = await fetch("/api/candidates", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (data.id) router.push(`/evaluate/${data.id}`);
  }

  return (
    <form onSubmit={submit}>
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
              required
              placeholder="e.g. Jordan Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="candidate-email">Email</FieldLabel>
            <FieldInput
              id="candidate-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            <FieldLabel htmlFor="candidate-project">Project</FieldLabel>
            <FieldSelect
              id="candidate-project"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setRoleId("");
              }}
            >
              <option value="">Select project (optional)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FieldSelect>
          </div>
          <div>
            <FieldLabel htmlFor="candidate-role">Role</FieldLabel>
            <FieldSelect
              id="candidate-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Select role (optional)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </FieldSelect>
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
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Opening…" : "Open case file →"}
          </Button>
        </div>
      </CaseCard>
    </form>
  );
}
