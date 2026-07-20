const MAIL_SLUG_LABELS: Record<string, string> = {
  candidate_proceed: "Proceeding to next stage",
  candidate_hold: "Candidate on hold",
  candidate_reject: "Candidate rejection",
  candidate_clarification: "Clarification request",
  candidate_job_description_deleted: "Job description removed",
  candidate_scheduled: "Interview scheduled",
  candidate_technical_round: "Technical round invite",
  candidate_manager_round: "Manager round invite",
  candidate_hr_round: "HR round invite",
  candidate_selected: "Final selection",
  candidate_final_reject: "Final rejection",
  candidate_deleted_pre_analysis: "Candidate removed (pre-analysis)",
  candidate_deleted_post_analysis: "Candidate removed (post-analysis)",
  candidate_deleted_post_interview: "Candidate removed (post-interview)",
  interviewer_assigned: "Interviewer assigned",
  interviewer_technical_assigned: "Technical interviewer assigned",
  interviewer_manager_assigned: "Manager interviewer assigned",
  interviewer_hr_assigned: "HR interviewer assigned",
  interviewer_sla_reminder: "Interviewer SLA reminder",
};

const DECISION_LABELS: Record<string, string> = {
  proceed: "Proceed",
  hold: "On hold",
  reject: "Rejected",
};

/** Human-readable label for an audit / activity event action key. */
export function formatAuditAction(
  action: string,
  payload: Record<string, unknown> = {},
): string {
  switch (action) {
    case "mail.prepared": {
      const slug = payload.slug as string | undefined;
      const section = slug
        ? (MAIL_SLUG_LABELS[slug] ?? slug.replace(/_/g, " "))
        : null;
      return section ? `Mail prepared — ${section}` : "Mail prepared";
    }
    case "screening.decided": {
      const d = payload.decision as string | undefined;
      return d
        ? `Screening decided — ${DECISION_LABELS[d] ?? d}`
        : "Screening decision";
    }
    case "screening.analyzed":
      return "Resume analysis completed";
    case "screening.reanalyzed":
      return "Resume re-analysed";
    case "screening.reused_analysis":
      return "Screening analysis reused (cached)";
    case "screening.disqualified":
      return "Candidate disqualified";
    case "screening.outcome_recorded":
      return "Screening outcome recorded";
    case "screening.retry_granted":
      return "Screening retry granted";
    case "ai_screening.completed": {
      const verdict = payload.verdict as string | undefined;
      const score = payload.score as number | undefined;
      const parts = ["AI screening completed"];
      if (verdict) parts.push(verdict);
      if (score !== undefined) parts.push(`score ${score}`);
      return parts.join(" — ");
    }
    case "interview.assigned": {
      const stage = payload.stage as string | undefined;
      return stage ? `Interviewer assigned — ${stage}` : "Interviewer assigned";
    }
    case "stage.decided": {
      const stage = payload.stage as string | undefined;
      const decision = payload.decision as string | undefined;
      const STAGE_DECISION: Record<string, string> = {
        yes: "Proceeded",
        no: "Not proceeded",
        selected: "Selected",
        rejected: "Rejected",
        hold: "On hold",
      };
      const parts = ["Stage decided"];
      if (stage) parts.push(stage);
      if (decision) parts.push(STAGE_DECISION[decision] ?? decision);
      return parts.join(" — ");
    }
    case "candidate.finalized":
      return "Candidate finalised";
    case "candidate.reassigned":
      return "Candidate reassigned";
    case "candidate.deleted":
      return "Candidate deleted";
    case "candidates.imported": {
      const count = payload.count as number | undefined;
      return count !== undefined
        ? `${count} candidate(s) imported`
        : "Candidates imported";
    }
    case "bulk_job.started": {
      const count = payload.count as number | undefined;
      return count !== undefined
        ? `Bulk import started — ${count} candidate(s)`
        : "Bulk import started";
    }
    case "pipeline.updated":
      return "Interview pipeline updated";
    case "opening.closed":
      return "Opening closed";
    case "opening.reopened":
      return "Opening reopened";
    case "user.password_changed":
      return "Password changed";
    case "user.reactivated":
      return "User reactivated";
    default:
      return action
        .replace(/\./g, " — ")
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase());
  }
}
