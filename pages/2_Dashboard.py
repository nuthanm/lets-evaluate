import streamlit as st
import pandas as pd
from utils.database import (
    init_db, get_projects_for_user, get_roles_for_user,
    get_questions_for_user, get_evaluations_for_user,
    get_drafts_for_user, delete_draft, create_evaluation,
)
from utils.auth import require_auth, get_current_user, logout_user
from utils.ui import inject_common_css, render_authenticated_sidebar, render_page_logo, create_logo_favicon

st.set_page_config(
    page_title="Dashboard – Let's Evaluate",
    page_icon=create_logo_favicon(),
    layout="wide",
    initial_sidebar_state="expanded",
)
init_db()

# ── CSS injected early so chrome is hidden even on auth redirect ───────────
inject_common_css()
require_auth()

user = get_current_user()

# ── Sidebar ────────────────────────────────────────────────────────────────
render_authenticated_sidebar()
st.markdown("""
<style>
.dash-welcome {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  border-radius: 18px;
  padding: 28px 32px;
  color: white;
  margin-bottom: 20px;
}
.dash-welcome h2 { margin: 0 0 4px; font-size: 1.6rem; font-weight: 800; }
.dash-welcome p  { margin: 0; opacity: .85; font-size: 0.9rem; }
.metric-card {
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 16px;
  padding: 24px 20px;
  text-align: center;
  transition: all .25s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.metric-card:hover {
  border-color: #4F46E5;
  box-shadow: 0 8px 24px rgba(79,70,229,0.14);
  transform: translateY(-3px);
}
.metric-icon { font-size: 2.2rem; margin-bottom: 8px; }
.metric-value {
  font-size: 2.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}
.metric-label {
  font-size: 0.85rem;
  color: #64748B;
  margin-top: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stButton > button {
  background: linear-gradient(135deg, #4F46E5, #7C3AED) !important;
  color: white !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
}
.recent-table th {
  background: #F1F5F9;
  padding: 10px 14px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.recent-table td {
  padding: 10px 14px;
  font-size: 0.88rem;
  color: #1E293B;
  border-bottom: 1px solid #F1F5F9;
}
.recent-table tr:last-child td { border-bottom: none; }
.recent-table { width: 100%; border-collapse: collapse; }
</style>
""", unsafe_allow_html=True)

# ── Page logo + Welcome banner ─────────────────────────────────────────────
render_page_logo()
st.markdown(
    f'<div class="dash-welcome">'
    f'<h2>👋 Welcome back, {user["name"]}!</h2>'
    f'<p>Signed in as {user["email"]}</p>'
    f'</div>',
    unsafe_allow_html=True,
)

# ── Stats ──────────────────────────────────────────────────────────────────
uid = user["id"]
projects = get_projects_for_user(uid)
roles = get_roles_for_user(uid)
questions = get_questions_for_user(uid)
evaluations = get_evaluations_for_user(uid)
drafts = get_drafts_for_user(uid)

c1, c2, c3, c4 = st.columns(4)
stats = [
    (c1, "📁", len(projects), "Projects"),
    (c2, "👥", len(roles), "Roles"),
    (c3, "❓", len(questions), "Questions"),
    (c4, "📊", len(evaluations), "Evaluations"),
]
for col, icon, val, label in stats:
    with col:
        st.markdown(f"""
        <div class="metric-card">
          <div class="metric-icon">{icon}</div>
          <div class="metric-value">{val}</div>
          <div class="metric-label">{label}</div>
        </div>""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)
st.info("📂 **All your completed interview evaluations can be found in the Archives section.** Use the Archives page to review past evaluations, download reports, and track candidate decisions.")

# ── Quick navigation cards ──────────────────────────────────────────────────
st.markdown("### 🚀 Quick Access")
nav_cols = st.columns(5)
nav_items = [
    ("📁", "Projects", "Manage your projects", "pages/3_Projects.py"),
    ("👥", "Roles", "Define hiring roles", "pages/4_Roles.py"),
    ("❓", "Questions", "Build question bank", "pages/5_Questions.py"),
    ("🤖", "Evaluate", "AI-powered evaluation", "pages/6_Evaluate_Candidate.py"),
    ("📂", "Archives", "Past evaluations", "pages/7_Archives.py"),
]
for col, (icon, title, desc, page) in zip(nav_cols, nav_items):
    with col:
        if st.button(f"{icon} {title}", width='stretch', key=f"nav_{title}"):
            st.switch_page(page)
        st.caption(desc)

# ── Resume The Process ─────────────────────────────────────────────────────
if drafts:
    st.divider()
    st.markdown("### ▶️ Resume The Process")
    st.caption("Saved evaluation drafts — pick up where you left off.")

    STEP_LABELS = {"1": "Setup", "2": "AI Analysis", "3": "Questions", "4": "Submit"}

    for draft in drafts:
        with st.container():
            dc1, dc2, dc3, dc4, dc5 = st.columns([2.5, 1.5, 1.5, 1.5, 1])
            with dc1:
                st.markdown(f"**{draft['candidate_name'] or 'Unnamed'}**")
                updated = draft.get("updated_at")
                if updated:
                    st.caption(f"Last saved: {updated.strftime('%d %b %Y, %H:%M')}")
            with dc2:
                st.write(draft.get("project_name") or "—")
            with dc3:
                st.write(draft.get("role_name") or "—")
            with dc4:
                step_label = STEP_LABELS.get(str(draft["step"]), draft["step"])
                st.markdown(
                    f'<span style="background:#EEF2FF;color:#4F46E5;border-radius:20px;padding:3px 10px;font-size:0.8rem;font-weight:700;">Step {draft["step"]}: {step_label}</span>',
                    unsafe_allow_html=True,
                )
            with dc5:
                rb1, rb2 = st.columns(2)
                with rb1:
                    if st.button("▶", key=f"resume_{draft['id']}", help="Resume from left over", width='stretch'):
                        st.query_params["draft_id"] = draft["id"]
                        st.switch_page("pages/6_Evaluate_Candidate.py")
                with rb2:
                    if st.button("🗑", key=f"del_draft_{draft['id']}", help="Delete this draft", width='stretch'):
                        st.session_state[f"del_draft_confirm_{draft['id']}"] = True
                        st.rerun()

        # Delete confirmation with mandatory comment
        if st.session_state.get(f"del_draft_confirm_{draft['id']}", False):
            with st.form(key=f"del_draft_form_{draft['id']}"):
                st.warning(f"⚠️ Delete draft for **{draft['candidate_name'] or 'Unnamed'}**?")
                del_comment = st.text_area(
                    "Reason for deletion (required) *",
                    placeholder="Enter a reason for deleting this draft…",
                    key=f"del_draft_comment_{draft['id']}",
                )
                cf1, cf2 = st.columns(2)
                with cf1:
                    submitted = st.form_submit_button("✅ Confirm Delete", type="primary", width='stretch')
                with cf2:
                    cancelled = st.form_submit_button("✖️ Cancel", width='stretch')

                if submitted:
                    if not del_comment.strip():
                        st.error("A deletion reason is required.")
                    else:
                        # Archive the draft as a cancelled evaluation
                        eval_data = draft.get("eval_data", {})
                        create_evaluation(
                            user_id=uid,
                            candidate_name=draft["candidate_name"] or "Unnamed",
                            candidate_email=eval_data.get("eval_candidate_email", ""),
                            resume_filename=eval_data.get("eval_resume_filename", ""),
                            project_id=draft.get("project_id"),
                            role_id=draft.get("role_id"),
                            initial_metrics=eval_data.get("eval_metrics", {}),
                            standard_questions=eval_data.get("eval_std_questions", []),
                            resume_questions=eval_data.get("eval_resume_questions", []),
                            role_questions=eval_data.get("eval_role_questions", []),
                            q_satisfaction=eval_data.get("eval_q_satisfaction", {}),
                            comments=f"[Draft Deleted] {del_comment}",
                            status="Cancelled",
                            interviewer_name=eval_data.get("eval_interviewer_name", ""),
                        )
                        delete_draft(draft["id"])
                        st.session_state.pop(f"del_draft_confirm_{draft['id']}", None)
                        st.toast("Draft deleted and archived.", icon="🗑️")
                        st.rerun()
                if cancelled:
                    st.session_state.pop(f"del_draft_confirm_{draft['id']}", None)
                    st.rerun()

        st.divider()

# ── Recent evaluations ─────────────────────────────────────────────────────
if evaluations:
    st.divider()
    st.markdown("### 🕐 Recent Evaluations")
    recent = evaluations[:5]
    status_icons = {"Selected": "🟢", "Rejected": "🔴", "Hold": "🟡", "Pending": "⚪", "Shortlisted": "🔵", "Cancelled": "⛔"}
    rows = [
        {
            "Candidate": ev["candidate_name"],
            "Project": ev.get("project_name") or "—",
            "Role": ev.get("role_name") or "—",
            "Date": ev["created_at"].strftime("%d %b %Y") if ev.get("created_at") else "—",
            "Status": f"{status_icons.get(ev['status'], '⚪')} {ev['status']}",
        }
        for ev in recent
    ]
    df_recent = pd.DataFrame(rows)
    st.dataframe(df_recent, width='stretch', hide_index=True)
