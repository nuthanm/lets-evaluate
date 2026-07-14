import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  candidates,
  projects,
  roles,
  candidateStages,
  screenings,
  evaluationEvents,
} from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import {
  storeResume,
  readResume,
  deleteResume,
  putResumeAtKey,
} from "@/lib/storage/resumes";
import { extractResumeText } from "@/lib/resume/parse";
import {
  isAllowedResumeFilename,
  RESUME_UPLOAD_FRIENDLY_ERROR,
} from "@/lib/resume/formats";
import {
  validateCandidateEmail,
  validateCandidateName,
  validateResumeTextLength,
} from "@/lib/candidates/validation";
import {
  ANALYSIS_MODEL,
  analyzeResume,
  generateResumeQuestions,
  generateStandardQuestions,
} from "@/lib/ai";
import { logEvent } from "@/lib/events";
import { apiError, rateLimit, requireApiRole } from "@/lib/api/helpers";
import {
  ensureCandidateStages,
  getCandidateDetail,
  getCandidateStages,
} from "@/lib/db/queries";
import { assertRoleOpen } from "@/lib/db/opening-guard";
import { MAIL_SLUG_FOR_DECISION, prepareMail, prepareMails } from "@/lib/email";
import { buildMailVars } from "@/lib/email/vars";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const { id } = await params;
  const detail = await getCandidateDetail(session.user.organizationId, id);
  if (!detail) return apiError("Not found", 404);
  return NextResponse.json(detail);
}

const screenSchema = z.object({
  action: z.enum([
    "analyze",
    "questions",
    "decide",
    "finalize",
    "reassign",
    "handoff",
  ]),
  comments: z.string().optional(),
  decision: z.enum(["proceed", "hold", "reject"]).optional(),
  finalDecision: z.enum(["selected", "rejected", "hold"]).optional(),
  resumeText: z.string().optional(),
  ratings: z.record(z.string(), z.unknown()).optional(),
  projectId: z.string().optional(),
  roleId: z.string().optional(),
  createdById: z.string().optional(),
});

/**
 * Resolve the resume text to analyze. Prefers text posted by the client but
 * falls back to re-extracting it from the stored resume file so the TA never
 * has to copy/paste the resume manually.
 */
async function resolveResumeText(
  candidate: {
    resumeStorageKey: string | null;
    resumeFilename: string | null;
    resumeText?: string | null;
  },
  bodyText?: string,
): Promise<string> {
  if (bodyText && bodyText.trim()) return bodyText;
  // Persisted text is the source of truth: it survives ephemeral file storage
  // and works across environments that share the same database.
  if (candidate.resumeText && candidate.resumeText.trim()) {
    return candidate.resumeText;
  }
  if (candidate.resumeStorageKey && candidate.resumeFilename) {
    try {
      const buf = await readResume(candidate.resumeStorageKey);
      return await extractResumeText(buf, candidate.resumeFilename);
    } catch (err) {
      console.error("Resume re-extraction failed", err);
    }
  }
  return "";
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  if (!rateLimit(`ai:${session.user.id}`, 30)) {
    return apiError("Rate limit exceeded", 429);
  }

  const { id } = await params;
  const body = screenSchema.parse(await req.json());

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(
      and(
        eq(candidates.id, id),
        eq(candidates.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);
  if (!candidate) return apiError("Not found", 404);

  const [project] = candidate.projectId
    ? await db
        .select()
        .from(projects)
        .where(eq(projects.id, candidate.projectId))
        .limit(1)
    : [null];
  const [role] = candidate.roleId
    ? await db
        .select()
        .from(roles)
        .where(eq(roles.id, candidate.roleId))
        .limit(1)
    : [null];

  const techStack = (project?.techStack as string[]) ?? [];
  const requirements = role?.requirements ?? "";

  if (body.action === "analyze") {
    const resumeText = await resolveResumeText(candidate, body.resumeText);
    if (!resumeText) {
      return apiError(
        "No resume found. Re-upload the resume for this candidate.",
        400,
      );
    }
    const resumeLengthError = validateResumeTextLength(resumeText);
    if (resumeLengthError) return apiError(resumeLengthError, 400);

    // Backfill persisted text for legacy candidates so future analyses no
    // longer depend on the (possibly ephemeral) stored file.
    if (!candidate.resumeText?.trim()) {
      await db
        .update(candidates)
        .set({ resumeText })
        .where(eq(candidates.id, id));
    }

    const otherProjects = await db
      .select({ name: projects.name, techStack: projects.techStack })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, session.user.organizationId),
          candidate.projectId
            ? ne(projects.id, candidate.projectId)
            : undefined,
        ),
      );

    const metrics = await analyzeResume(resumeText, techStack, requirements, {
      roleName: role?.name,
      projectName: project?.name,
      otherProjects: otherProjects.map((p) => ({
        name: p.name,
        techStack: (p.techStack as string[]) ?? [],
      })),
    });

    const [existing] = await db
      .select()
      .from(screenings)
      .where(eq(screenings.candidateId, id))
      .limit(1);

    if (existing) {
      await db
        .update(screenings)
        .set({ metrics, screenedById: session.user.id })
        .where(eq(screenings.id, existing.id));
    } else {
      await db.insert(screenings).values({
        id: uuid(),
        candidateId: id,
        organizationId: session.user.organizationId,
        metrics,
        screenedById: session.user.id,
      });
    }

    await db
      .update(candidates)
      .set({ status: "screening", updatedAt: new Date() })
      .where(eq(candidates.id, id));

    await logEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      entityType: "candidate",
      entityId: id,
      action: "screening.analyzed",
      payload: { score: metrics.tech_match_score },
    });

    return NextResponse.json({ metrics, model: ANALYSIS_MODEL });
  }

  if (body.action === "questions") {
    const [screening] = await db
      .select()
      .from(screenings)
      .where(eq(screenings.candidateId, id))
      .limit(1);
    const resumeText = await resolveResumeText(candidate, body.resumeText);
    if (resumeText) {
      const resumeLengthError = validateResumeTextLength(resumeText);
      if (resumeLengthError) return apiError(resumeLengthError, 400);
    }
    const std = await generateStandardQuestions(
      role?.name ?? "Engineer",
      techStack,
      5,
    );
    const resumeQ = resumeText
      ? await generateResumeQuestions(resumeText, requirements, 5)
      : [];

    await db
      .update(screenings)
      .set({
        standardQuestions: std,
        resumeQuestions: resumeQ,
      })
      .where(eq(screenings.candidateId, id));

    return NextResponse.json({ standardQuestions: std, resumeQuestions: resumeQ });
  }

  if (body.action === "decide") {
    if (!body.decision) return apiError("Decision required", 400);
    const openingErr = await assertRoleOpen(candidate.roleId);
    if (openingErr) return apiError(openingErr, 400);

    const statusMap = {
      proceed: "ready_for_interview" as const,
      hold: "screened_hold" as const,
      reject: "screened_rejected" as const,
    };

    await db
      .update(screenings)
      .set({
        decision: body.decision,
        comments: body.comments ?? "",
        qSatisfaction: body.ratings ?? {},
        screenedAt: new Date(),
        screenedById: session.user.id,
      })
      .where(eq(screenings.candidateId, id));

    await db
      .update(candidates)
      .set({
        status: statusMap[body.decision],
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, id));

    // Advance the configurable interview flow off the screening stage.
    await ensureCandidateStages(
      session.user.organizationId,
      id,
      candidate.projectId,
    );
    const stages = await getCandidateStages(id, session.user.organizationId);
    const screeningStage =
      stages.find((s) => s.stage.kind === "screening") ?? stages[0];

    if (screeningStage) {
      if (body.decision === "proceed") {
        await db
          .update(candidateStages)
          .set({
            status: "passed",
            decision: "yes",
            comments: body.comments ?? "",
            decidedById: session.user.id,
            decidedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(candidateStages.id, screeningStage.stage.id));

        const next = stages.find(
          (s) =>
            s.stage.position > screeningStage.stage.position &&
            s.stage.status === "pending",
        );
        if (next) {
          await db
            .update(candidateStages)
            .set({ status: "active", updatedAt: new Date() })
            .where(eq(candidateStages.id, next.stage.id));
        }
      } else if (body.decision === "reject") {
        await db
          .update(candidateStages)
          .set({
            status: "failed",
            decision: "no",
            comments: body.comments ?? "",
            decidedById: session.user.id,
            decidedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(candidateStages.id, screeningStage.stage.id));

        // A screening rejection ends the journey — every later round is
        // skipped so the pipeline reflects that they never take place.
        for (const s of stages) {
          if (
            s.stage.position > screeningStage.stage.position &&
            (s.stage.status === "pending" || s.stage.status === "active")
          ) {
            await db
              .update(candidateStages)
              .set({ status: "skipped", updatedAt: new Date() })
              .where(eq(candidateStages.id, s.stage.id));
          }
        }
      } else if (body.decision === "hold") {
        await db
          .update(candidateStages)
          .set({
            comments: body.comments ?? "",
            updatedAt: new Date(),
          })
          .where(eq(candidateStages.id, screeningStage.stage.id));
      }
    }

    const [screening] = await db
      .select()
      .from(screenings)
      .where(eq(screenings.candidateId, id))
      .limit(1);
    const metrics = screening?.metrics as Record<string, unknown> | undefined;
    const mail = await prepareMail(
      session.user.organizationId,
      MAIL_SLUG_FOR_DECISION[body.decision],
      buildMailVars({
        candidate,
        roleName: role?.name ?? "Role",
        projectName: project?.name ?? "Project",
        taName: session.user.name ?? undefined,
        screeningComments: body.comments,
        techMatchScore: metrics?.tech_match_score as number | undefined,
      }),
    );

    await logEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      entityType: "candidate",
      entityId: id,
      action: "screening.decided",
      payload: { decision: body.decision },
    });

    await logEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      entityType: "candidate",
      entityId: id,
      action: "mail.prepared",
      payload: { slug: MAIL_SLUG_FOR_DECISION[body.decision] },
    });

    return NextResponse.json({ ok: true, mail });
  }

  if (body.action === "reassign") {
    const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
    if (forbidden) return forbidden;
    if (!body.projectId && !body.roleId) {
      return apiError("projectId or roleId required", 400);
    }
    const openingErr = await assertRoleOpen(body.roleId ?? candidate.roleId);
    if (openingErr) return apiError(openingErr, 400);

    await db
      .update(candidates)
      .set({
        projectId: body.projectId ?? candidate.projectId,
        roleId: body.roleId ?? candidate.roleId,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, id));

    await logEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      entityType: "candidate",
      entityId: id,
      action: "candidate.reassigned",
      payload: { projectId: body.projectId, roleId: body.roleId },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "handoff") {
    const forbidden = requireApiRole(session.user.role, ["admin"]);
    if (forbidden) return forbidden;
    if (!body.createdById) return apiError("createdById required", 400);

    await db
      .update(candidates)
      .set({ createdById: body.createdById, updatedAt: new Date() })
      .where(eq(candidates.id, id));

    return NextResponse.json({ ok: true });
  }

  if (body.action === "finalize") {
    const fd = body.finalDecision;
    if (!fd) return apiError("Final decision required", 400);

    await ensureCandidateStages(
      session.user.organizationId,
      id,
      candidate.projectId,
    );
    const stages = await getCandidateStages(id, session.user.organizationId);
    const finalStage =
      stages.find((s) => s.stage.kind === "final") ?? stages[stages.length - 1];

    if (finalStage) {
      await db
        .update(candidateStages)
        .set({
          status:
            fd === "selected" ? "passed" : fd === "rejected" ? "failed" : "active",
          decision: fd === "hold" ? null : fd === "selected" ? "yes" : "no",
          comments: body.comments ?? finalStage.stage.comments ?? "",
          decidedById: session.user.id,
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(candidateStages.id, finalStage.stage.id));
    }

    await db
      .update(candidates)
      .set({ status: fd, updatedAt: new Date() })
      .where(eq(candidates.id, id));

    const slug =
      fd === "selected" ? "candidate_selected" : "candidate_final_reject";
    const mail = await prepareMail(
      session.user.organizationId,
      slug,
      buildMailVars({
        candidate,
        roleName: role?.name ?? "Role",
        projectName: project?.name ?? "Project",
        taName: session.user.name ?? undefined,
        screeningComments: body.comments,
      }),
    );

    await logEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      entityType: "candidate",
      entityId: id,
      action: "candidate.finalized",
      payload: { decision: fd },
    });

    return NextResponse.json({ ok: true, mail });
  }

  return apiError("Invalid action");
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const projectId = String(form.get("projectId") ?? "") || null;
  const roleId = String(form.get("roleId") ?? "") || null;
  const phone = String(form.get("phone") ?? "").trim();
  const source = String(form.get("source") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const consent = form.get("consent") === "true" || form.get("consent") === "on";
  const file = form.get("resume") as File | null;

  let resumeStorageKey: string | undefined;
  let resumeFilename: string | undefined;
  let resumeText: string | undefined;

  if (file && file.size > 0) {
    if (!isAllowedResumeFilename(file.name)) {
      return apiError(RESUME_UPLOAD_FRIENDLY_ERROR, 400);
    }
    if (file.size > 10 * 1024 * 1024) {
      return apiError("Resume must be under 10MB", 400);
    }
    const buf = Buffer.from(await file.arrayBuffer());
    resumeFilename = file.name;
    try {
      resumeStorageKey = await storeResume(buf, file.name);
    } catch (err) {
      console.error("Resume storage failed", err);
      return apiError("Resume upload failed. Check the storage connection and try again.", 502);
    }
    resumeText = await extractResumeText(buf, file.name);
    if (resumeText) {
      const resumeLengthError = validateResumeTextLength(resumeText);
      if (resumeLengthError) return apiError(resumeLengthError, 400);
    }
  }

  const [existing] = await db
    .select()
    .from(candidates)
    .where(
      and(
        eq(candidates.id, id),
        eq(candidates.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (existing) {
    const nextName = name || existing.name || "";
    const nextEmail = email || existing.email || "";
    const nameError = validateCandidateName(nextName);
    if (nameError) return apiError(nameError, 400);
    const emailError = validateCandidateEmail(nextEmail);
    if (emailError) return apiError(emailError, 400);

    await db
      .update(candidates)
      .set({
        name: nextName,
        email: nextEmail,
        phone: phone || existing.phone,
        source: source || existing.source,
        notes: notes || existing.notes,
        consentAt: consent ? new Date() : existing.consentAt,
        projectId: projectId ?? existing.projectId,
        roleId: roleId ?? existing.roleId,
        resumeStorageKey: resumeStorageKey ?? existing.resumeStorageKey,
        resumeFilename: resumeFilename ?? existing.resumeFilename,
        resumeText: resumeText ?? existing.resumeText,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, id));
    return NextResponse.json({ id, resumeText });
  }

  const nameError = validateCandidateName(name);
  if (nameError) return apiError(nameError, 400);
  const emailError = validateCandidateEmail(email);
  if (emailError) return apiError(emailError, 400);

  const newId = id === "new" ? uuid() : id;
  await db.insert(candidates).values({
    id: newId,
    organizationId: session.user.organizationId,
    name,
    email,
    projectId,
    roleId,
    resumeStorageKey,
    resumeFilename: resumeFilename ?? "",
    resumeText: resumeText ?? null,
    status: "draft",
    createdById: session.user.id,
  });

  return NextResponse.json({ id: newId, resumeText }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);
  const forbidden = requireApiRole(session.user.role, ["admin", "ta"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await _req.json().catch(() => ({}));
  if (body?.confirmText !== "DELETE") {
    return apiError("Type DELETE to confirm candidate removal.", 400);
  }

  const [existing] = await db
    .select()
    .from(candidates)
    .where(
      and(
        eq(candidates.id, id),
        eq(candidates.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!existing) return apiError("Not found", 404);

  const [screening] = await db
    .select({
      decision: screenings.decision,
      comments: screenings.comments,
      metrics: screenings.metrics,
    })
    .from(screenings)
    .where(eq(screenings.candidateId, id))
    .limit(1);

  const [project] = existing.projectId
    ? await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, existing.projectId))
        .limit(1)
    : [null];
  const [role] = existing.roleId
    ? await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, existing.roleId))
        .limit(1)
    : [null];

  const hadAnalysis = Boolean(screening?.decision) || existing.status !== "draft";
  const hadInterviewRounds = [
    "ready_for_interview",
    "assigned",
    "interview_in_progress",
    "interview_complete",
    "selected",
    "rejected",
    "hold",
  ].includes(existing.status);
  const noticeSlug = hadInterviewRounds
    ? "candidate_deleted_post_interview"
    : hadAnalysis
      ? "candidate_deleted_post_analysis"
      : "candidate_deleted_pre_analysis";

  const mail = await prepareMail(
    session.user.organizationId,
    noticeSlug,
    buildMailVars({
      candidate: {
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        source: existing.source,
        id: existing.id,
      },
      roleName: role?.name ?? undefined,
      projectName: project?.name ?? undefined,
      taName: session.user.name ?? undefined,
      screeningComments: screening?.comments ?? undefined,
      techMatchScore: (screening?.metrics as Record<string, unknown> | undefined)?.tech_match_score as number | undefined,
    }),
  );

  let resumeBackup: Buffer | null = null;
  if (existing.resumeStorageKey) {
    try {
      resumeBackup = await readResume(existing.resumeStorageKey);
    } catch (err) {
      const error = err as NodeJS.ErrnoException & { name?: string };
      const msg = error.message ?? "";
      const isMissingObject =
        error.code === "ENOENT" ||
        error.name === "NoSuchKey" ||
        error.name === "NotFound" ||
        /NoSuchKey|not found|does not exist/i.test(msg);
      if (!isMissingObject) {
        console.error("Resume backup read failed", {
          candidateId: id,
          key: existing.resumeStorageKey,
          err,
        });
        return apiError("Failed to prepare resume deletion rollback", 500);
      }
    }

    try {
      await deleteResume(existing.resumeStorageKey);
    } catch (err) {
      console.error("Resume storage delete failed", {
        candidateId: id,
        key: existing.resumeStorageKey,
        err,
      });
      return apiError("Failed to delete resume from storage", 500);
    }
  }

  try {
    await db.transaction(async (tx) => {
      // Related screenings, assignments, reviews and drafts cascade on delete.
      await tx
        .delete(candidates)
        .where(
          and(
            eq(candidates.id, id),
            eq(candidates.organizationId, session.user.organizationId),
          ),
        );

      await tx.insert(evaluationEvents).values({
        id: uuid(),
        organizationId: session.user.organizationId,
        actorId: session.user.id,
        entityType: "candidate",
        entityId: id,
        action: "candidate.deleted",
        payload: { name: existing.name, noticeSlug, hadAnalysis, hadInterviewRounds },
      });
    });
  } catch (err) {
    if (existing.resumeStorageKey && resumeBackup) {
      try {
        await putResumeAtKey(
          existing.resumeStorageKey,
          resumeBackup,
          existing.resumeFilename || "resume.bin",
        );
      } catch (restoreErr) {
        console.error("Resume rollback restore failed", {
          candidateId: id,
          key: existing.resumeStorageKey,
          restoreErr,
        });
      }
    }

    console.error("Candidate delete transaction failed", {
      candidateId: id,
      err,
    });
    return apiError("Candidate delete failed. Changes were rolled back.", 500);
  }

  return NextResponse.json({ ok: true, mail });
}
