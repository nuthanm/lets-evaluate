import io
import time
import base64 as _b64
import streamlit as st
import pandas as pd

from utils.database import (
    init_db, get_projects_for_user, get_roles_for_project, get_questions_for_role,
    create_evaluation, create_question, create_draft, update_draft, get_drafts_for_user,
    delete_draft,
)
from utils.auth import require_auth, get_current_user, logout_user
from utils.ai_utils import analyze_resume, generate_standard_questions, generate_resume_based_questions, refine_evaluation_notes
from utils.ui import inject_common_css, render_authenticated_sidebar, render_page_logo, create_logo_favicon


def _truncate(text: str, max_chars: int = 80) -> str:
    """Word-aware, multi-byte-safe truncation."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")
    return (truncated[:last_space] if last_space > 0 else truncated) + "…"

st.set_page_config(
    page_title="Evaluate Candidate – Let's Evaluate",
    page_icon=create_logo_favicon(),
    layout="wide",
    initial_sidebar_state="expanded",
)
init_db()

# ── CSS injected early so chrome is hidden even on auth redirect ───────────
inject_common_css()
require_auth()

user = get_current_user()
uid = user["id"]

# ── Sidebar ────────────────────────────────────────────────────────────────
render_authenticated_sidebar()

st.markdown("""
<style>
.step-header {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
  border-radius: 12px;
  padding: 16px 22px;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 20px;
}
.metric-card {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  padding: 18px 16px;
  text-align: center;
}
.metric-label { font-size: 0.8rem; color: #64748B; font-weight: 600; margin-bottom: 6px; }
.metric-value { font-size: 1.3rem; font-weight: 800; color: #1E293B; }
.rec-proceed { color: #16A34A; }
.rec-hold    { color: #D97706; }
.rec-reject  { color: #DC2626; }
.tech-chip {
  display: inline-block;
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  margin: 2px 3px 2px 0;
}
.chip-match   { background: #DCFCE7; color: #16A34A; }
.chip-missing { background: #FEE2E2; color: #DC2626; }
.stButton > button {
  background: linear-gradient(135deg, #4F46E5, #7C3AED) !important;
  color: white !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
}
</style>
""", unsafe_allow_html=True)

# ── Session State Keys ──────────────────────────────────────────────────────
defaults = {
    "eval_step": 1,
    "eval_project_id": None,
    "eval_role_id": None,
    "eval_candidate_name": "",
    "eval_candidate_email": "",
    "eval_resume_text": "",
    "eval_resume_filename": "",
    "eval_metrics": {},
    "eval_std_questions": [],
    "eval_resume_questions": [],
    "eval_role_questions": [],
    "eval_interviewer_name": "",
    "eval_q_satisfaction": {},   # {key: {"level": str, "comment": str}}
    "eval_refined_notes": "",
    "eval_draft_id": None,       # ID of the current in-progress draft
    "eval_max_step": 1,          # Highest step reached (enables back/forward navigation)
}
for k, v in defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v


def _reset_eval():
    for k, v in defaults.items():
        st.session_state[k] = v
    # Also clear widget-key session state entries that are not in defaults
    for k in ("eval_comments", "eval_comments_pending"):
        st.session_state.pop(k, None)


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        return ""


def _extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        import zipfile
        import xml.etree.ElementTree as ET
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            with z.open("word/document.xml") as f:
                tree = ET.parse(f)
        ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        return " ".join(
            node.text for node in tree.iter(f"{ns}t") if node.text
        )
    except Exception:
        return ""


def _save_progress():
    """Persist current evaluation session state as a draft."""
    eval_data = {k: st.session_state[k] for k in defaults if k != "eval_draft_id"}
    candidate_name = st.session_state.get("eval_candidate_name") or "Unnamed"
    project_id = st.session_state.get("eval_project_id")
    role_id = st.session_state.get("eval_role_id")
    step = str(st.session_state.get("eval_step", 1))
    draft_id = st.session_state.get("eval_draft_id")
    if draft_id:
        update_draft(draft_id, candidate_name, project_id, role_id, step, eval_data)
    else:
        result = create_draft(uid, candidate_name, project_id, role_id, step, eval_data)
        st.session_state["eval_draft_id"] = result["id"]
    st.toast("✅ Progress saved!", icon="💾")


# ── Load draft from query params ────────────────────────────────────────────
_qp = st.query_params
_draft_id_param = _qp.get("draft_id", None)
if _draft_id_param and st.session_state.get("eval_draft_id") != _draft_id_param:
    # Load the draft and restore session state
    drafts = get_drafts_for_user(uid)
    _draft = next((d for d in drafts if d["id"] == _draft_id_param), None)
    if _draft:
        _data = _draft["eval_data"]
        for k, v in defaults.items():
            if k in _data:
                st.session_state[k] = _data[k]
            else:
                st.session_state[k] = v
        st.session_state["eval_draft_id"] = _draft_id_param
        # Ensure the comments text area widget will reflect the restored notes
        # on the next render of Step 4 (must be set before the widget is created)
        _saved_notes = _data.get("eval_refined_notes", "")
        if _saved_notes:
            st.session_state["eval_comments_pending"] = _saved_notes
        else:
            # Clear any stale widget value so it starts fresh
            st.session_state.pop("eval_comments", None)
        st.query_params.clear()
        st.rerun()


render_page_logo()
st.markdown("## 🤖 Evaluate Candidate")

projects = get_projects_for_user(uid)

# ── STEP INDICATOR ──────────────────────────────────────────────────────────
step_labels = ["1 Setup", "2 AI Analysis", "3 Questions", "4 Submit"]
current_step = st.session_state["eval_step"]
max_step = st.session_state.get("eval_max_step", current_step)
step_cols = st.columns(4)
for i, (col, label) in enumerate(zip(step_cols, step_labels), 1):
    with col:
        if i == current_step:
            st.markdown(
                f'<div style="background:#4F46E5;color:white;border-radius:8px;padding:8px;text-align:center;font-weight:700;">{label}</div>',
                unsafe_allow_html=True,
            )
        elif i <= max_step:
            # Previously visited step — clickable (back or forward)
            if st.button(label, key=f"step_nav_{i}", use_container_width=True, help=f"Go to {label}"):
                st.session_state["eval_step"] = i
                st.rerun()
        else:
            st.markdown(
                f'<div style="background:#E2E8F0;color:#94A3B8;border-radius:8px;padding:8px;text-align:center;font-weight:700;">{label}</div>',
                unsafe_allow_html=True,
            )

st.markdown("<br>", unsafe_allow_html=True)

# ===========================================================================
# STEP 1 – SETUP
# ===========================================================================
if st.session_state["eval_step"] == 1:
    st.markdown('<div class="step-header">📋 Step 1: Setup Evaluation</div>', unsafe_allow_html=True)

    if not projects:
        st.warning("No projects found. Please create a project first.")
        if st.button("Go to Projects"):
            st.switch_page("pages/3_Projects.py")
        st.stop()

    proj_options = {p["name"]: p["id"] for p in projects}
    # If a project is pre-selected from a draft, keep it selected
    saved_proj_id = st.session_state.get("eval_project_id")
    saved_proj_name = next((n for n, pid in proj_options.items() if pid == saved_proj_id), None)
    default_proj_idx = list(proj_options.keys()).index(saved_proj_name) if saved_proj_name in proj_options else 0
    selected_proj_name = st.selectbox("Select Project", list(proj_options.keys()), index=default_proj_idx)
    selected_proj_id = proj_options[selected_proj_name]

    roles = get_roles_for_project(selected_proj_id)
    if not roles:
        st.warning("No roles linked to this project. Add a role first.")
        if st.button("Go to Roles"):
            st.switch_page("pages/4_Roles.py")
        st.stop()

    role_options = {r["name"]: r["id"] for r in roles}
    saved_role_id = st.session_state.get("eval_role_id")
    saved_role_name = next((n for n, rid in role_options.items() if rid == saved_role_id), None)
    default_role_idx = list(role_options.keys()).index(saved_role_name) if saved_role_name in role_options else 0
    selected_role_name = st.selectbox("Select Role", list(role_options.keys()), index=default_role_idx)
    selected_role_id = role_options[selected_role_name]

    # Pre-populate role-linked questions
    role_qs = get_questions_for_role(selected_role_id)

    c1, c2 = st.columns(2)
    with c1:
        cand_name = st.text_input("Candidate Name *", value=st.session_state["eval_candidate_name"])
    with c2:
        cand_email = st.text_input("Candidate Email", value=st.session_state["eval_candidate_email"])

    # Show info if resume was previously loaded from draft
    if st.session_state.get("eval_resume_filename"):
        st.info(f"📄 Previously uploaded: **{st.session_state['eval_resume_filename']}** — upload again below to refresh or proceed with Next.")

    uploaded = st.file_uploader("Upload Resume (PDF or DOCX) *", type=["pdf", "docx"])

    b_next, b_save = st.columns([3, 1])
    with b_save:
        if st.button("💾 Save Progress", use_container_width=True, help="Save your progress and resume later"):
            st.session_state["eval_project_id"] = selected_proj_id
            st.session_state["eval_role_id"] = selected_role_id
            st.session_state["eval_candidate_name"] = cand_name.strip()
            st.session_state["eval_candidate_email"] = cand_email.strip()
            # Process the uploaded file now (if any) so it's included in the save
            if uploaded is not None:
                _file_bytes = uploaded.read()
                if uploaded.name.lower().endswith(".pdf"):
                    _resume_text = _extract_text_from_pdf(_file_bytes)
                else:
                    _resume_text = _extract_text_from_docx(_file_bytes)
                if _resume_text.strip():
                    if uploaded.name != st.session_state.get("eval_resume_filename"):
                        st.session_state["eval_metrics"] = {}
                    st.session_state["eval_resume_text"] = _resume_text
                    st.session_state["eval_resume_filename"] = uploaded.name
            _save_progress()
            st.rerun()
    with b_next:
        if st.button("▶ Next: Analyse Resume", type="primary", use_container_width=True):
            if not cand_name.strip():
                st.error("Candidate name is required.")
            elif uploaded is None and not st.session_state.get("eval_resume_text"):
                st.error("Please upload a resume.")
            else:
                if uploaded is not None:
                    file_bytes = uploaded.read()
                    if uploaded.name.lower().endswith(".pdf"):
                        resume_text = _extract_text_from_pdf(file_bytes)
                    else:
                        resume_text = _extract_text_from_docx(file_bytes)

                    if not resume_text.strip():
                        st.error("Could not extract text from the uploaded file. Please try a different file.")
                        st.stop()
                    # New upload → clear stale metrics so step 2 re-analyses
                    if uploaded.name != st.session_state.get("eval_resume_filename"):
                        st.session_state["eval_metrics"] = {}
                    st.session_state["eval_resume_text"] = resume_text
                    st.session_state["eval_resume_filename"] = uploaded.name

                st.session_state["eval_project_id"] = selected_proj_id
                st.session_state["eval_role_id"] = selected_role_id
                st.session_state["eval_candidate_name"] = cand_name.strip()
                st.session_state["eval_candidate_email"] = cand_email.strip()
                st.session_state["eval_role_questions"] = role_qs
                st.session_state["eval_step"] = 2
                st.session_state["eval_max_step"] = max(st.session_state.get("eval_max_step", 1), 2)
                st.rerun()

# ===========================================================================
# STEP 2 – AI ANALYSIS
# ===========================================================================
elif st.session_state["eval_step"] == 2:
    st.markdown('<div class="step-header">🤖 Step 2: AI Resume Analysis</div>', unsafe_allow_html=True)

    if not st.session_state.get("eval_metrics"):
        # Find selected project tech stack
        proj_id = st.session_state["eval_project_id"]
        proj = next((p for p in projects if p["id"] == proj_id), None)
        tech_stack = proj["tech_stack"] if proj else []

        roles = get_roles_for_project(proj_id)
        role_id = st.session_state["eval_role_id"]
        role = next((r for r in roles if r["id"] == role_id), None)
        role_req = role["requirements"] if role else ""

        with st.spinner("🤖 Analysing resume with AI… This may take a few seconds."):
            metrics = analyze_resume(
                st.session_state["eval_resume_text"],
                tech_stack,
                role_req,
            )
        st.session_state["eval_metrics"] = metrics

    metrics = st.session_state["eval_metrics"]

    # ── Summary metric cards ────────────────────────────────────────────────
    exp = metrics.get("experience_level", "—")
    rec = metrics.get("recommendation", "—")
    rec_cls = {"Proceed": "rec-proceed", "Hold": "rec-hold", "Reject": "rec-reject"}.get(rec, "")
    # Derive matched/missing counts from tech_comparison (consistent with the table)
    tech_comparison_raw = metrics.get("tech_comparison", [])
    if tech_comparison_raw:
        matched_count = sum(1 for t in tech_comparison_raw if t.get("status") == "Matched")
        missing_count = len(tech_comparison_raw) - matched_count
        total_tc = len(tech_comparison_raw)
        score = round((matched_count / total_tc) * 100) if total_tc > 0 else metrics.get("tech_match_score", 0)
    else:
        matched_count = len(metrics.get("matched_technologies", []))
        missing_count = len(metrics.get("missing_technologies", []))
        total_tc = matched_count + missing_count
        score = metrics.get("tech_match_score", 0)
    coverage_pct = round((matched_count / total_tc) * 100) if total_tc > 0 else 0
    emp_status = "✅ Currently Employed" if metrics.get("is_currently_employed") else "🔴 Not Currently Employed"
    current_employer = metrics.get("current_employer", "") or ""
    # Don't display literal "Unknown" as the employer name
    if current_employer.strip().lower() in ("unknown", "n/a", "-"):
        current_employer = ""

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Tech Match</div><div class="metric-value">{score}/100</div></div>', unsafe_allow_html=True)
        st.progress(score / 100)
        st.caption(f"Formula: {matched_count} matched ÷ {total_tc} required × 100 = **{score}**")
    with c2:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Experience Level</div><div class="metric-value">{exp}</div></div>', unsafe_allow_html=True)
        st.caption("Determined by AI from years of experience and seniority indicators in the resume.")
    with c3:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Recommendation</div><div class="metric-value {rec_cls}">{rec}</div></div>', unsafe_allow_html=True)
        st.caption("Based on tech match score, experience level, and alignment with role requirements.")
    with c4:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Tech Coverage</div><div class="metric-value">✅ {matched_count} / {total_tc}</div><div style="font-size:0.85rem;color:#16A34A;font-weight:700;">{coverage_pct}% match rate</div></div>', unsafe_allow_html=True)
        st.caption(f"{matched_count} matched, {missing_count} missing out of {total_tc} required technologies.")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── 1. Tech Stack Comparison Table ─────────────────────────────────────
    st.markdown("### 🔬 Tech Stack Comparison")
    tech_comparison = metrics.get("tech_comparison", [])
    if tech_comparison:
        html_rows = ""
        for item in tech_comparison:
            tech = item.get("technology", "")
            status = item.get("status", "Unknown")
            is_matched = status == "Matched"
            bg_color = "#DCFCE7" if is_matched else "#FEE2E2"
            text_color = "#16A34A" if is_matched else "#DC2626"
            icon = "✅" if is_matched else "❌"
            resume_tech = tech if is_matched else "Not found in resume"
            status_label = "Matched" if is_matched else "Unmatched"
            html_rows += (
                f'<tr>'
                f'<td style="padding:8px 14px;border-bottom:1px solid #E2E8F0;">{tech}</td>'
                f'<td style="padding:8px 14px;border-bottom:1px solid #E2E8F0;">{resume_tech}</td>'
                f'<td style="padding:8px 14px;border-bottom:1px solid #E2E8F0;background:{bg_color};'
                f'color:{text_color};font-weight:700;">{icon} {status_label}</td>'
                f'</tr>'
            )
        table_html = (
            '<table style="width:100%;border-collapse:collapse;">'
            '<thead><tr style="background:#F1F5F9;">'
            '<th style="padding:10px 14px;text-align:left;font-size:0.8rem;color:#475569;'
            'text-transform:uppercase;letter-spacing:0.05em;">Project Tech Stack</th>'
            '<th style="padding:10px 14px;text-align:left;font-size:0.8rem;color:#475569;'
            'text-transform:uppercase;letter-spacing:0.05em;">Resume Tech Stack</th>'
            '<th style="padding:10px 14px;text-align:left;font-size:0.8rem;color:#475569;'
            'text-transform:uppercase;letter-spacing:0.05em;">Match Status</th>'
            f'</tr></thead><tbody>{html_rows}</tbody></table>'
        )
        st.markdown(table_html, unsafe_allow_html=True)
    else:
        col_l, col_r = st.columns(2)
        with col_l:
            st.markdown("**✅ Matched Technologies**")
            chips = " ".join(f'<span class="tech-chip chip-match">{t}</span>' for t in metrics.get("matched_technologies", []))
            st.markdown(chips or "_None_", unsafe_allow_html=True)
        with col_r:
            st.markdown("**❌ Missing Technologies**")
            chips = " ".join(f'<span class="tech-chip chip-missing">{t}</span>' for t in metrics.get("missing_technologies", []))
            st.markdown(chips or "_None_", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── 2. Experience Details ───────────────────────────────────────────────
    st.markdown("### 📅 Experience Details")
    exp_mentioned = metrics.get("total_experience_mentioned", "") or ""
    if exp_mentioned.strip().lower() in ("unknown", "n/a", "-", "none", ""):
        exp_mentioned = "—"
    exp_calculated = metrics.get("total_experience_calculated", "") or ""
    if exp_calculated.strip().lower() in ("unknown", "n/a", "-", "none", ""):
        exp_calculated = "—"
    exp_col1, exp_col2, exp_col3 = st.columns(3)
    with exp_col1:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Experience Mentioned</div><div class="metric-value" style="font-size:1rem;">{exp_mentioned}</div></div>', unsafe_allow_html=True)
    with exp_col2:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Calculated Experience</div><div class="metric-value" style="font-size:1rem;">{exp_calculated}</div></div>', unsafe_allow_html=True)
        st.caption("Sum of all roles in career history: each role's (end date − start date) is totalled.")
    with exp_col3:
        emp_color = "#16A34A" if metrics.get("is_currently_employed") else "#DC2626"
        emp_label = f'<span style="color:{emp_color};font-size:0.95rem;font-weight:700;">{emp_status}</span>'
        employer_line = f'<div style="font-size:0.82rem;color:#64748B;margin-top:4px;">{current_employer}</div>' if current_employer else ""
        st.markdown(f'<div class="metric-card"><div class="metric-label">Employment Status</div>{emp_label}{employer_line}</div>', unsafe_allow_html=True)
        st.caption('Detected from resume: any role with end date "Present" or marked as current is considered active employment.')

    st.markdown("<br>", unsafe_allow_html=True)

    # ── 3. Strengths & Concerns ─────────────────────────────────────────────
    col_l, col_r = st.columns(2)
    with col_l:
        st.markdown("**💪 Strengths**")
        for s in metrics.get("strengths", []):
            st.markdown(f"• {s}")
    with col_r:
        st.markdown("**⚠️ Concerns**")
        for c in metrics.get("concerns", []):
            st.markdown(f"• {c}")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── 4. Certifications ──────────────────────────────────────────────────
    certifications = metrics.get("certifications", [])
    if certifications:
        st.markdown("### 🏆 Certifications")
        cert_html = "".join(
            f'<div style="display:inline-flex;align-items:center;gap:6px;'
            f'background:#FEF9C3;border:1px solid #FDE68A;color:#92400E;'
            f'border-radius:8px;padding:6px 14px;margin:4px 6px 4px 0;'
            f'font-size:0.85rem;font-weight:600;">🏅 {cert}</div>'
            for cert in certifications
        )
        st.markdown(cert_html, unsafe_allow_html=True)
        st.markdown("<br>", unsafe_allow_html=True)

    # ── 5. Career Timeline (newest at top → oldest at bottom) ─────────────
    career_history = metrics.get("career_history", [])
    if career_history:
        st.markdown("### 🗓️ Career Timeline")
        _unknown_vals = {"unknown", "n/a", "-", "none"}
        # Display from newest (top) to oldest (bottom)
        for i, role_item in enumerate(reversed(career_history)):
            title = role_item.get("title", "") or "—"
            company_raw = (role_item.get("company", "") or "").strip()
            company = "" if company_raw.lower() in _unknown_vals else company_raw
            start_raw = (role_item.get("start", "") or "").strip()
            start = "" if start_raw.lower() in _unknown_vals else start_raw
            end_raw = (role_item.get("end", "") or "").strip()
            end = "" if end_raw.lower() in _unknown_vals else end_raw
            duration_raw = (role_item.get("duration", "") or "").strip()
            duration = "" if duration_raw.lower() in _unknown_vals else duration_raw
            is_current = role_item.get("is_current", False)

            dot_color = "#4F46E5" if is_current else "#94A3B8"
            badge = '<span style="background:#DCFCE7;color:#16A34A;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:700;margin-left:8px;">Current</span>' if is_current else ""
            if start and end:
                period = f"{start} – {end}"
            elif end:
                period = end
            elif start:
                period = f"{start} – Present" if is_current else start
            else:
                period = ""
            dur_text = f" · {duration}" if duration else ""
            company_line = f'<div style="color:#64748B;font-size:0.85rem;">{company}</div>' if company else ""
            period_line = f'<div style="color:#94A3B8;font-size:0.8rem;">{period}{dur_text}</div>' if (period or dur_text) else ""
            connector = "" if i == len(career_history) - 1 else (
                '<div style="width:2px;height:24px;background:#E2E8F0;margin-left:9px;"></div>'
            )
            st.markdown(
                f'<div style="display:flex;align-items:flex-start;gap:12px;">'
                f'<div style="width:20px;height:20px;border-radius:50%;background:{dot_color};'
                f'flex-shrink:0;margin-top:3px;box-shadow:0 0 0 3px rgba(79,70,229,0.15);"></div>'
                f'<div style="padding-bottom:4px;">'
                f'<div style="font-weight:700;color:#1E293B;font-size:0.95rem;">{title}{badge}</div>'
                f'{company_line}{period_line}'
                f'</div></div>{connector}',
                unsafe_allow_html=True,
            )
        st.markdown("<br>", unsafe_allow_html=True)

    # ── Summary ─────────────────────────────────────────────────────────────
    st.info(f"📝 **Summary (based on project tech stack vs resume comparison):** {metrics.get('summary', '')}")

    st.markdown("<br>", unsafe_allow_html=True)
    b1, b2, b3 = st.columns([1, 1, 1])
    with b1:
        if st.button("← Back", use_container_width=True):
            st.session_state["eval_step"] = 1
            st.rerun()
    with b2:
        if st.button("💾 Save Progress", use_container_width=True):
            _save_progress()
            st.rerun()
    with b3:
        if st.button("▶ Generate Questions", type="primary", use_container_width=True):
            st.session_state["eval_step"] = 3
            st.session_state["eval_max_step"] = max(st.session_state.get("eval_max_step", 1), 3)
            st.rerun()

# ===========================================================================
# STEP 3 – QUESTIONS
# ===========================================================================
elif st.session_state["eval_step"] == 3:
    st.markdown('<div class="step-header">❓ Step 3: Interview Questions</div>', unsafe_allow_html=True)

    proj_id = st.session_state["eval_project_id"]
    role_id = st.session_state["eval_role_id"]
    proj = next((p for p in projects if p["id"] == proj_id), None)
    tech_stack = proj["tech_stack"] if proj else []
    roles = get_roles_for_project(proj_id)
    role = next((r for r in roles if r["id"] == role_id), None)
    role_name = role["name"] if role else "Unknown Role"
    role_req = role["requirements"] if role else ""

    SATISFACTION_OPTIONS = ["—", "Satisfied", "Not Satisfied", "Other"]

    def _render_satisfaction(q_key: str):
        """Render satisfaction level dropdown and optional comment box for a question."""
        sat = st.session_state["eval_q_satisfaction"].get(q_key, {"level": "—", "comment": ""})
        level = st.selectbox(
            "Satisfaction Level",
            SATISFACTION_OPTIONS,
            index=SATISFACTION_OPTIONS.index(sat["level"]) if sat["level"] in SATISFACTION_OPTIONS else 0,
            key=f"sat_sel_{q_key}",
            label_visibility="visible",
        )
        comment = sat.get("comment", "")
        if level == "Other":
            comment = st.text_area(
                "Comment",
                value=comment,
                height=80,
                placeholder="Add your comments here…",
                key=f"sat_cmt_{q_key}",
            )
            if st.button("💾 Save Comment", key=f"sat_save_{q_key}"):
                st.session_state["eval_q_satisfaction"][q_key] = {"level": level, "comment": comment}
                st.toast("Comment saved!", icon="✅")
                st.rerun()
        else:
            if level != sat["level"]:
                st.session_state["eval_q_satisfaction"][q_key] = {"level": level, "comment": ""}
                st.rerun()

    # Role-linked questions
    role_qs = st.session_state.get("eval_role_questions", [])
    if role_qs:
        st.markdown(f"**📌 Pre-linked Questions ({len(role_qs)})**")
        for i, q in enumerate(role_qs, 1):
            with st.expander(f"Q{i}: {_truncate(q['question_text'])}"):
                st.write(q["question_text"])
                st.caption(f"Category: {q['category']} | Difficulty: {q['difficulty']}")
                _render_satisfaction(f"role_{q['id']}")

    # Standard AI questions
    if not st.session_state["eval_std_questions"]:
        if st.button("🤖 Generate Standard Questions (AI)", type="primary"):
            with st.spinner("Generating standard interview questions…"):
                qs = generate_standard_questions(role_name, tech_stack)
            st.session_state["eval_std_questions"] = qs
            st.rerun()
    else:
        std_qs = st.session_state["eval_std_questions"]
        st.markdown(f"**🎯 AI Standard Questions ({len(std_qs)})**")
        for i, q in enumerate(std_qs, 1):
            q_key = f"std_{i}"
            with st.expander(f"Q{i}: {_truncate(q.get('question', ''))}"):
                st.write(q.get("question", ""))
                st.caption(f"Category: {q.get('category', '')} | Hints: {q.get('expected_answer_hints', '')}")
                _render_satisfaction(q_key)
                if st.button("➕ Add to My Questions", key=f"add_std_{i}"):
                    create_question(
                        uid,
                        q.get("question", ""),
                        "AI Based Questions",
                        "Medium",
                        role_id,
                    )
                    st.toast("Added to My Questions!", icon="✅")

    # Resume-based questions
    if not st.session_state["eval_resume_questions"]:
        if st.button("📄 Generate Questions Based on Resume (AI)"):
            with st.spinner("Generating resume-based questions…"):
                rqs = generate_resume_based_questions(
                    st.session_state["eval_resume_text"], role_req
                )
            st.session_state["eval_resume_questions"] = rqs
            st.rerun()
    else:
        res_qs = st.session_state["eval_resume_questions"]
        st.markdown(f"**📄 Resume-Based Questions ({len(res_qs)})**")
        for i, q in enumerate(res_qs, 1):
            q_key = f"res_{i}"
            with st.expander(f"Q{i}: {_truncate(q.get('question', ''))}"):
                st.write(q.get("question", ""))
                st.caption(f"Category: {q.get('category', '')} | Hints: {q.get('expected_answer_hints', '')}")
                _render_satisfaction(q_key)
                if st.button("➕ Add to My Questions", key=f"add_res_{i}"):
                    create_question(
                        uid,
                        q.get("question", ""),
                        "AI Based Questions",
                        "Medium",
                        role_id,
                    )
                    st.toast("Added to My Questions!", icon="✅")

    st.markdown("<br>", unsafe_allow_html=True)
    b1, b2, b3 = st.columns([1, 1, 1])
    with b1:
        if st.button("← Back", use_container_width=True):
            st.session_state["eval_step"] = 2
            st.rerun()
    with b2:
        if st.button("💾 Save Progress", use_container_width=True):
            _save_progress()
            st.rerun()
    with b3:
        if st.button("▶ Continue to Submit", type="primary", use_container_width=True):
            st.session_state["eval_step"] = 4
            st.session_state["eval_max_step"] = max(st.session_state.get("eval_max_step", 1), 4)
            st.rerun()

# ===========================================================================
# STEP 4 – COMMENTS & SUBMIT
# ===========================================================================
elif st.session_state["eval_step"] == 4:
    st.markdown('<div class="step-header">📝 Step 4: Comments & Submit</div>', unsafe_allow_html=True)

    st.markdown(f"**Candidate:** {st.session_state['eval_candidate_name']}")
    st.markdown(f"**Email:** {st.session_state['eval_candidate_email'] or '—'}")
    st.divider()

    interviewer_name = st.text_input(
        "Interviewer Name *",
        value=st.session_state["eval_interviewer_name"],
        placeholder="e.g. John Smith",
        key="eval_interviewer_name_input",
    )
    st.session_state["eval_interviewer_name"] = interviewer_name

    # Evaluation notes with AI-refine and copy
    st.markdown("**Evaluator Comments * (required)**")

    # Apply any pending AI-refined content BEFORE creating the text_area widget
    # (setting a widget's session-state key must happen before the widget is rendered)
    if "eval_comments_pending" in st.session_state:
        st.session_state["eval_comments"] = st.session_state.pop("eval_comments_pending")
    elif "eval_comments" not in st.session_state:
        # Seed with refined notes if present (e.g. after loading a draft)
        st.session_state["eval_comments"] = st.session_state.get("eval_refined_notes") or ""

    comments = st.text_area(
        "Add your evaluation notes…",
        height=150,
        placeholder="Overall impression, cultural fit, red flags, recommendations…",
        key="eval_comments",
    )
    # Keep eval_refined_notes in sync so it's saved correctly
    st.session_state["eval_refined_notes"] = comments

    btn_ai, btn_copy = st.columns([2, 1])
    with btn_ai:
        if st.button("✨ Refine with AI", help="Use AI to professionally reformat your notes"):
            if not comments.strip():
                st.warning("Please add some evaluation notes first.")
            else:
                with st.spinner("Refining with AI…"):
                    refined = refine_evaluation_notes(comments)
                st.session_state["eval_refined_notes"] = refined
                # Store as pending so it's applied BEFORE the widget on the next run
                st.session_state["eval_comments_pending"] = refined
                st.rerun()
    with btn_copy:
        # Use base64 to safely transfer the text to JavaScript without injection risk
        encoded_text = _b64.b64encode(comments.encode("utf-8")).decode("ascii")
        st.components.v1.html(
            f"""<button onclick="
                var text=atob('{encoded_text}');
                navigator.clipboard.writeText(text).then(function(){{
                    this.innerText='✅ Copied!';
                    setTimeout(function(){{document.getElementById('cpbtn').innerText='📋 Copy';}},2000);
                }}.bind(this)).catch(function(){{this.innerText='❌ Failed';}}.bind(this));
            " id="cpbtn"
            style="background:#4F46E5;color:white;border:none;padding:6px 16px;
                   border-radius:8px;cursor:pointer;font-weight:600;font-size:0.88rem;
                   margin-top:4px;">📋 Copy</button>""",
            height=45,
        )

    EVAL_STATUS_OPTIONS = ["Pending", "Shortlisted", "Selected", "Rejected", "Hold"]
    status = st.selectbox(
        "Technical Evaluation Status",
        EVAL_STATUS_OPTIONS,
        index=0,
        key="eval_status",
    )

    b1, b2, b3 = st.columns([1, 1, 1])
    with b1:
        if st.button("← Back", use_container_width=True):
            st.session_state["eval_step"] = 3
            st.rerun()
    with b2:
        if st.button("💾 Save Progress", use_container_width=True):
            st.session_state["eval_refined_notes"] = comments
            st.session_state["eval_interviewer_name"] = interviewer_name
            _save_progress()
            st.rerun()
    with b3:
        if st.button("✅ Submit Evaluation", type="primary", use_container_width=True):
            if not interviewer_name.strip():
                st.error("Interviewer Name is required.")
            elif not comments.strip():
                st.error("Evaluator Comments are required.")
            else:
                result = create_evaluation(
                    user_id=uid,
                    candidate_name=st.session_state["eval_candidate_name"],
                    candidate_email=st.session_state["eval_candidate_email"],
                    resume_filename=st.session_state["eval_resume_filename"],
                    project_id=st.session_state["eval_project_id"],
                    role_id=st.session_state["eval_role_id"],
                    initial_metrics=st.session_state["eval_metrics"],
                    standard_questions=st.session_state["eval_std_questions"],
                    resume_questions=st.session_state["eval_resume_questions"],
                    role_questions=st.session_state.get("eval_role_questions", []),
                    q_satisfaction=st.session_state.get("eval_q_satisfaction", {}),
                    comments=comments,
                    status=status,
                    interviewer_name=interviewer_name,
                )
                # Delete the draft if one was in progress
                draft_id = st.session_state.get("eval_draft_id")
                if draft_id:
                    delete_draft(draft_id)
                st.success("✅ Evaluation submitted successfully! Redirecting to dashboard…")
                st.balloons()
                _reset_eval()
                time.sleep(3)
                st.switch_page("pages/2_Dashboard.py")
