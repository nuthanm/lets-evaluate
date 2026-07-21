"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { BulkUploadCard, SetupCreateRow } from "@/components/BulkUploadCard";
import { CabinetPage } from "@/components/CabinetPage";
import { FieldInput, FieldLabel, FieldSelect, FieldTextarea } from "@/components/FormField";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  techStack: string[] | null;
};

type Role = {
  id: string;
  name: string;
  level: string | null;
  requirements: string | null;
  projectId: string | null;
  projectIds: string[] | null;
};

export function ProjectsClient({ projects: initialProjects }: { projects: Project[] }) {
  const router = useRouter();
  const { tasks } = useNotifications();
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    const done = tasks.some(
      (t) => t.entity === "projects" && t.status === "completed" && !t.read,
    );
    if (done) refreshProjects();
  }, [tasks]);

  async function refreshProjects() {
    const r = await fetch("/api/projects");
    if (r.ok) setProjects(await r.json());
    router.refresh();
  }

  return (
    <CabinetPage
      title="Projects"
      subtitle="Configure hiring context once — reuse everywhere"
      bodyClassName="p-5 md:p-6"
    >
      <div className="space-y-5">
        <SetupCreateRow
          manual={<ProjectCreateForm onChanged={refreshProjects} />}
          upload={
            <BulkUploadCard
              entity="projects"
              title="Upload projects"
              description="Import many projects from a spreadsheet."
              icon={<UploadGlyph className="size-4" />}
              onComplete={refreshProjects}
            />
          }
        />
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </h3>
          {projects.length === 0 ? (
            <EmptyState label="No projects yet — create one manually or upload a file above." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white shadow-sm">
              {projects.map((p, i) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  last={i === projects.length - 1}
                  onChanged={refreshProjects}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </CabinetPage>
  );
}

export function RolesClient({ projects }: { projects: Project[] }) {
  const { tasks } = useNotifications();
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    fetch("/api/roles")
      .then((r) => r.json())
      .then(setRoles)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const done = tasks.some((t) => t.entity === "roles" && t.status === "completed" && !t.read);
    if (done) refreshRoles();
  }, [tasks]);

  async function refreshRoles() {
    const r = await fetch("/api/roles");
    if (r.ok) setRoles(await r.json());
  }

  const projectNames = (role: Role) => {
    const ids = role.projectIds?.length ? role.projectIds : role.projectId ? [role.projectId] : [];
    return ids
      .map((id) => projects.find((p) => p.id === id)?.name)
      .filter(Boolean) as string[];
  };

  return (
    <CabinetPage
      title="Roles"
      subtitle="Define positions and requirements for your hiring pipeline"
      bodyClassName="p-5 md:p-6"
    >
      <div className="space-y-5">
        <SetupCreateRow
          manual={<RoleCreateForm projects={projects} onChanged={refreshRoles} />}
          upload={
            <BulkUploadCard
              entity="roles"
              title="Upload roles"
              description="Import roles with or without project links. Multiple projects per row are supported."
              icon={<UploadGlyph className="size-4" />}
              onComplete={refreshRoles}
            />
          }
        />
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            {roles.length} {roles.length === 1 ? "role" : "roles"}
          </h3>
          {roles.length === 0 ? (
            <EmptyState label="No roles yet — create one manually or upload a file above." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--cream-2)] bg-white shadow-sm">
              {roles.map((r, i) => (
                <RoleRow
                  key={r.id}
                  role={r}
                  projects={projects}
                  projectNames={projectNames(r)}
                  last={i === roles.length - 1}
                  onChanged={refreshRoles}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </CabinetPage>
  );
}

/* ----------------------------------- Roles ----------------------------------- */

function ProjectCreateForm({ onChanged }: { onChanged: () => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [stack, setStack] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        techStack: stack.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    setLoading(false);
    setName("");
    setStack("");
    await onChanged();
  }

  return (
    <FormShell
      icon={<ProjectsGlyph className="size-4" />}
      title="New project"
      description="Name the context and list the technologies you evaluate against."
    >
      <div className="space-y-3">
        <div>
          <FieldLabel>Project name</FieldLabel>
          <FieldInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Payments Platform"
          />
        </div>
        <div>
          <FieldLabel>Tech stack</FieldLabel>
          <FieldInput
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="Comma-separated, e.g. React, Node, Postgres"
          />
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={save} disabled={loading || !name} className="w-full">
          {loading ? "Saving…" : "Create project"}
        </Button>
      </div>
    </FormShell>
  );
}

function ProjectRow({
  project,
  last,
  onChanged,
}: {
  project: Project;
  last: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const tags = project.techStack ?? [];

  if (editing) {
    return (
      <div className={cn("p-4", !last && "border-b border-[var(--cream-2)]")}>
        <ProjectEditForm
          project={project}
          onClose={() => setEditing(false)}
          onChanged={onChanged}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--cream)]/60",
        !last && "border-b border-[var(--cream-2)]",
      )}
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--cyan-soft)] text-[var(--cyan-d)]">
        <ProjectsGlyph className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[var(--ink)]">{project.name}</div>
        <div className="mt-0.5 truncate text-xs text-[var(--ink-faint)]">
          {tags.join(" · ") || "No tech stack configured"}
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold text-[var(--cyan-d)] opacity-0 transition-opacity group-hover:opacity-100">
        Edit
      </span>
    </button>
  );
}

function ProjectEditForm({
  project,
  onClose,
  onChanged,
}: {
  project: Project;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [stack, setStack] = useState((project.techStack ?? []).join(", "));
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        techStack: stack.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    setLoading(false);
    onClose();
    await onChanged();
  }

  async function remove() {
    if (!confirm(`Delete project "${project.name}"?`)) return;
    setLoading(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setLoading(false);
    onClose();
    await onChanged();
  }

  return (
    <div>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cyan-d)]">
        Editing project
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Project name</FieldLabel>
          <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Tech stack</FieldLabel>
          <FieldInput
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="Comma-separated"
          />
        </div>
      </div>
      <EditActions loading={loading} disabled={!name} onSave={save} onCancel={onClose} onDelete={remove} />
    </div>
  );
}

/* ----------------------------------- Roles ----------------------------------- */

function RoleCreateForm({
  projects,
  onChanged,
}: {
  projects: Project[];
  onChanged: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        level: level || undefined,
        projectIds,
        requirements,
      }),
    });
    setLoading(false);
    setName("");
    setLevel("");
    setProjectIds([]);
    setRequirements("");
    await onChanged();
  }

  return (
    <FormShell
      icon={<RolesGlyph className="size-4" />}
      title="New role"
      description="Capture the position, seniority, and skills you screen for."
    >
      <div className="space-y-3">
        <div>
          <FieldLabel>Role name</FieldLabel>
          <FieldInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Backend Engineer"
          />
        </div>
        <div>
          <FieldLabel>Level</FieldLabel>
          <FieldSelect value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FieldSelect>
        </div>
        <ProjectPicker projects={projects} selected={projectIds} onChange={setProjectIds} />
        <div>
          <FieldLabel>Requirements</FieldLabel>
          <FieldTextarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Key skills and expectations for this role"
          />
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={save} disabled={loading || !name} className="w-full">
          {loading ? "Saving…" : "Create role"}
        </Button>
      </div>
    </FormShell>
  );
}

function RoleRow({
  role,
  projects,
  projectNames,
  last,
  onChanged,
}: {
  role: Role;
  projects: Project[];
  projectNames: string[];
  last: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className={cn("p-4", !last && "border-b border-[var(--cream-2)]")}>
        <RoleEditForm
          role={role}
          projects={projects}
          onClose={() => setEditing(false)}
          onChanged={onChanged}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--cream)]/60",
        !last && "border-b border-[var(--cream-2)]",
      )}
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--green)]/15 text-[var(--green)]">
        <RolesGlyph className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--ink)]">{role.name}</span>
          {role.level && (
            <span className="rounded-md bg-[var(--cream)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink-soft)]">
              {role.level}
            </span>
          )}
          {projectNames.map((n) => (
            <span
              key={n}
              className="rounded-md bg-[var(--cyan-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--cyan-d)]"
            >
              {n}
            </span>
          ))}
        </div>
        <div className="mt-0.5 truncate text-xs text-[var(--ink-faint)]">
          {role.requirements || "No requirements"}
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold text-[var(--cyan-d)] opacity-0 transition-opacity group-hover:opacity-100">
        Edit
      </span>
    </button>
  );
}

function RoleEditForm({
  role,
  projects,
  onClose,
  onChanged,
}: {
  role: Role;
  projects: Project[];
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [name, setName] = useState(role.name);
  const [level, setLevel] = useState(role.level ?? "");
  const [projectIds, setProjectIds] = useState<string[]>(
    role.projectIds?.length ? role.projectIds : role.projectId ? [role.projectId] : [],
  );
  const [requirements, setRequirements] = useState(role.requirements ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await fetch(`/api/roles/${role.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        level: level || undefined,
        projectIds,
        requirements,
      }),
    });
    setLoading(false);
    onClose();
    await onChanged();
  }

  async function remove() {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    setLoading(true);
    await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    setLoading(false);
    onClose();
    await onChanged();
  }

  return (
    <div>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--cyan-d)]">
        Editing role
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Role name</FieldLabel>
          <FieldInput value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Level</FieldLabel>
          <FieldSelect value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FieldSelect>
        </div>
      </div>
      <div className="mt-3">
        <ProjectPicker projects={projects} selected={projectIds} onChange={setProjectIds} />
      </div>
      <div className="mt-3">
        <FieldLabel>Requirements</FieldLabel>
        <FieldTextarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
      </div>
      <EditActions loading={loading} disabled={!name} onSave={save} onCancel={onClose} onDelete={remove} />
    </div>
  );
}

/* --------------------------------- Shared UI --------------------------------- */

const LEVEL_OPTIONS = [
  { value: "", label: "Any level (optional)" },
  { value: "Intern", label: "Intern" },
  { value: "Junior", label: "Junior" },
  { value: "Mid", label: "Mid" },
  { value: "Senior", label: "Senior" },
  { value: "Lead", label: "Lead" },
  { value: "Principal", label: "Principal" },
  { value: "Manager", label: "Manager" },
];

function FormShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--cream-2)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--cyan-soft)] text-[var(--cyan-d)]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-faint)]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ProjectPicker({
  projects,
  selected,
  onChange,
}: {
  projects: Project[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div>
      <FieldLabel>Projects</FieldLabel>
      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--cream-2)] px-3 py-2.5 text-xs text-[var(--ink-faint)]">
          No projects yet — create one first to link roles.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {projects.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  on
                    ? "border-[var(--cyan)] bg-[var(--cyan-soft)] text-[var(--cyan-d)]"
                    : "border-[var(--cream-2)] bg-white text-[var(--ink-soft)] hover:border-[var(--cyan)]",
                )}
              >
                {on ? "✓ " : ""}
                {p.name}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">
        Select one or more projects this role applies to.
      </p>
    </div>
  );
}

function EditActions({
  loading,
  disabled,
  onSave,
  onCancel,
  onDelete,
}: {
  loading: boolean;
  disabled: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={loading || disabled}>
          {loading ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="rounded-lg px-3 py-2 text-xs font-bold text-[var(--red,#c0392b)] transition-colors hover:bg-[var(--cream)] disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--cream-2)] bg-white/50 px-6 py-12 text-center text-sm text-[var(--ink-faint)]">
      {label}
    </div>
  );
}

function ProjectsGlyph({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-5"} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="12" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="12" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RolesGlyph({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-5"} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2 17c0-2.8 2.2-5 5-5s5 2.2 5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 17c.3-2 1.8-3.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-5"} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3v10M6 7l4-4 4 4M4 14h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
