import { MockAppChrome, MockPill, MockStat } from "./MockAppChrome";

export function MockDashboardPage() {
  return (
    <MockAppChrome
      activeId="dashboard"
      pageTitle="Dashboard"
      pageSubtitle="Pipeline health · Monday, 20 July 2026"
    >
      <div className="pres-mock-grid-4">
        <MockStat label="Screening" value="12" tone="orange" />
        <MockStat label="Ready to schedule" value="5" tone="cyan" />
        <MockStat label="In interview" value="8" tone="cyan" />
        <MockStat label="Est. AI cost" value="$4.20" tone="green" />
      </div>
      <div className="pres-mock-grid-2 pres-mock-mt">
        <div className="pres-mock-panel">
          <div className="pres-mock-panel-head">Pipeline funnel</div>
          <div className="pres-mock-funnel">
            {[
              ["Screening", 12, "var(--orange)"],
              ["Ready", 5, "var(--cyan)"],
              ["Interview", 8, "var(--cyan-d)"],
              ["Selected", 3, "var(--green)"],
            ].map(([label, n, color]) => (
              <div key={String(label)} className="pres-mock-funnel-row">
                <span>{label}</span>
                <div className="pres-mock-bar-track">
                  <div
                    className="pres-mock-bar-fill"
                    style={{
                      width: `${(Number(n) / 12) * 100}%`,
                      background: String(color),
                    }}
                  />
                </div>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="pres-mock-panel">
          <div className="pres-mock-panel-head">Open roles</div>
          <ul className="pres-mock-list">
            {[
              ["Senior React Developer", "Cloud Platform", "4 active"],
              ["DevOps Engineer", "Infrastructure", "2 active"],
              ["Technical Lead", "Product Suite", "1 active"],
            ].map(([role, project, count]) => (
              <li key={String(role)} className="pres-mock-list-row">
                <div>
                  <strong>{role}</strong>
                  <span>{project}</span>
                </div>
                <MockPill tone="cyan">{count}</MockPill>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MockAppChrome>
  );
}

export function MockEvaluatePage() {
  return (
    <MockAppChrome
      activeId="evaluate"
      pageTitle="Candidate case file"
      pageSubtitle="Priya Sharma · Senior React Developer"
    >
      <div className="pres-mock-split">
        <div className="pres-mock-resume">
          <div className="pres-mock-resume-line pres-mock-shimmer" />
          <div className="pres-mock-resume-line w-3/4 pres-mock-shimmer" />
          <div className="pres-mock-resume-line w-full pres-mock-shimmer" />
          <div className="pres-mock-resume-line w-5/6 pres-mock-shimmer" />
          <p className="pres-mock-resume-label">Resume preview</p>
        </div>
        <div className="pres-mock-ai">
          <div className="pres-mock-ai-head">
            <span>🤖 AI Analysis</span>
            <MockPill tone="green">Proceed</MockPill>
          </div>
          <div className="pres-mock-grid-3 pres-mock-mt-sm">
            <MockStat label="Match" value="87%" tone="cyan" />
            <MockStat label="Experience" value="6.2 yrs" />
            <MockStat label="Gaps" value="1" tone="orange" />
          </div>
          <div className="pres-mock-tags pres-mock-mt-sm">
            {["React", "TypeScript", "Node.js", "AWS"].map((t) => (
              <MockPill key={t} tone="green">
                ✓ {t}
              </MockPill>
            ))}
            <MockPill tone="orange">? GraphQL</MockPill>
          </div>
          <div className="pres-mock-callout pres-mock-mt-sm">
            AI assists · recruiter decides in Verdict step
          </div>
        </div>
      </div>
    </MockAppChrome>
  );
}

export function MockPipelinePage() {
  const cols = [
    {
      label: "Screening",
      color: "var(--orange)",
      cards: [["Arjun K.", "Draft"], ["Meera S.", "AI run"]],
    },
    {
      label: "Ready",
      color: "var(--cyan)",
      cards: [["Priya S.", "87% match"]],
    },
    {
      label: "Interview",
      color: "var(--cyan-d)",
      cards: [["Rahul V.", "Round 2"], ["Anita P.", "Round 1"]],
    },
    {
      label: "Selected",
      color: "var(--green)",
      cards: [["Kiran M.", "Offer prep"]],
    },
  ];

  return (
    <MockAppChrome
      activeId="pipeline"
      pageTitle="Pipeline"
      pageSubtitle="Track candidates from screening to decision"
    >
      <div className="pres-mock-kanban">
        {cols.map((col) => (
          <div key={col.label} className="pres-mock-col">
            <div
              className="pres-mock-col-head"
              style={{ borderTopColor: col.color }}
            >
              {col.label}
              <span>{col.cards.length}</span>
            </div>
            {col.cards.map(([name, meta]) => (
              <div key={name} className="pres-mock-kanban-card">
                <strong>{name}</strong>
                <span>{meta}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </MockAppChrome>
  );
}

export function MockBookingPage() {
  return (
    <MockAppChrome
      activeId="booking"
      pageTitle="Schedule"
      pageSubtitle="Assign screened candidates to interviewers"
    >
      <div className="pres-mock-panel">
        <div className="pres-mock-list">
          {[
            ["Priya Sharma", "Senior React · Ready", "Assign →"],
            ["Rahul Verma", "DevOps · Round 2", "Scheduled"],
            ["Anita Patel", "Tech Lead · Round 1", "Assign →"],
          ].map(([name, role, action]) => (
            <div key={String(name)} className="pres-mock-booking-row">
              <div className="pres-mock-avatar">{String(name)[0]}</div>
              <div className="flex-1">
                <strong>{name}</strong>
                <span>{role}</span>
              </div>
              <span
                className={
                  action === "Scheduled"
                    ? "pres-mock-action-done"
                    : "pres-mock-action"
                }
              >
                {action}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="pres-mock-schedule pres-mock-mt">
        <div className="pres-mock-panel-head">Schedule slot</div>
        <div className="pres-mock-schedule-grid">
          <div>
            <label>Interviewer</label>
            <div className="pres-mock-field">Rajesh Kumar</div>
          </div>
          <div>
            <label>Date & time</label>
            <div className="pres-mock-field">22 Jul · 10:30 AM</div>
          </div>
        </div>
        <span className="pres-mock-ics">↓ Download calendar invite (.ics)</span>
      </div>
    </MockAppChrome>
  );
}

export function MockAssignmentsPage() {
  return (
    <MockAppChrome
      activeId="assignments"
      pageTitle="My assignments"
      pageSubtitle="Panel view · Rajesh Kumar"
    >
      <div className="pres-mock-assignment">
        <div className="pres-mock-handoff">
          <strong>Handoff from TA:</strong> Focus on React architecture & system
          design. Strong backend — probe depth on GraphQL gap.
        </div>
        <div className="pres-mock-panel pres-mock-mt-sm">
          <div className="pres-mock-panel-head">Priya Sharma · Technical round</div>
          <div className="pres-mock-questions">
            {[
              ["Explain your React state strategy", "Rated 4/5"],
              ["Design a real-time dashboard", "In progress"],
              ["API integration experience", "Pending"],
            ].map(([q, status]) => (
              <div key={q} className="pres-mock-q-row">
                <span>{q}</span>
                <MockPill tone={status.includes("4") ? "green" : "neutral"}>
                  {status}
                </MockPill>
              </div>
            ))}
          </div>
          <div className="pres-mock-actions">
            <span className="pres-mock-action">Submit decision</span>
            <span className="pres-mock-action-done">PDF Report</span>
          </div>
        </div>
      </div>
    </MockAppChrome>
  );
}

export function MockCodingPage() {
  return (
    <MockAppChrome
      activeId="assignments"
      pageTitle="Coding exercise"
      pageSubtitle="Live panel round · no candidate login"
    >
      <div className="pres-mock-assignment">
        <div className="pres-mock-handoff">
          <strong>Token link shared:</strong> evaluate.app/coding/ex_8f3a2c · tagged to
          Priya Sharma + Rajesh Kumar · First technical
        </div>
        <div className="pres-mock-panel pres-mock-mt-sm">
          <div className="pres-mock-panel-head">
            Live editor mirror · TypeScript · Fix the race condition
            <MockPill tone="green">Live</MockPill>
          </div>
          <div className="pres-mock-questions">
            <div className="pres-mock-q-row">
              <span className="font-mono text-[11px]">
                class Cache {"{"} … get/set with lock …
              </span>
              <MockPill tone="cyan">sync 2s ago</MockPill>
            </div>
            <div className="pres-mock-q-row">
              <span>Activity: opened → typing → paste detected</span>
              <MockPill tone="orange">paste ×1</MockPill>
            </div>
            <div className="pres-mock-q-row">
              <span>AI library · saved scenarios · regenerate anytime</span>
              <MockPill tone="green">New</MockPill>
            </div>
          </div>
          <div className="pres-mock-actions">
            <span className="pres-mock-action">Copy token link</span>
            <span className="pres-mock-action-done">Include in PDF</span>
          </div>
        </div>
      </div>
    </MockAppChrome>
  );
}

export function MockAuditPage() {
  return (
    <MockAppChrome
      activeId="audit"
      pageTitle="Audit log"
      pageSubtitle="Organization-wide activity history"
    >
      <div className="pres-mock-panel">
        <ul className="pres-mock-audit">
          {[
            ["Nuthan M.", "Screening decision: Proceed", "Priya Sharma", "2m ago"],
            ["Nuthan M.", "Assigned interviewer", "Priya Sharma", "15m ago"],
            ["Rajesh K.", "Submitted interview report", "Priya Sharma", "1h ago"],
            ["System", "AI analysis completed", "Priya Sharma", "1h ago"],
            ["Nuthan M.", "Candidate created", "Priya Sharma", "1h ago"],
          ].map(([who, action, entity, time]) => (
            <li key={`${action}-${time}`} className="pres-mock-audit-row">
              <div className="pres-mock-audit-dot" />
              <div className="flex-1">
                <strong>{who}</strong>
                <span>{action}</span>
                <em>{entity}</em>
              </div>
              <time>{time}</time>
            </li>
          ))}
        </ul>
      </div>
    </MockAppChrome>
  );
}

const MOCK_PAGES: Record<string, () => React.JSX.Element> = {
  dashboard: MockDashboardPage,
  evaluate: MockEvaluatePage,
  pipeline: MockPipelinePage,
  booking: MockBookingPage,
  assignments: MockAssignmentsPage,
  coding: MockCodingPage,
  audit: MockAuditPage,
};

export function MockPageById({ id }: { id: string }) {
  const Page = MOCK_PAGES[id] ?? MockDashboardPage;
  return <Page />;
}
