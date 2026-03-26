import io
import streamlit as st
import pandas as pd
import pdfplumber

from utils.database import (
    init_db, get_projects_for_user, get_roles_for_project, get_questions_for_role,
    create_evaluation,
)
from utils.auth import require_auth, get_current_user, logout_user
from utils.ai_utils import analyze_resume, generate_standard_questions, generate_resume_based_questions
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
}
for k, v in defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v


def _reset_eval():
    for k, v in defaults.items():
        st.session_state[k] = v


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
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


render_page_logo()
st.markdown("## 🤖 Evaluate Candidate")

projects = get_projects_for_user(uid)

# ── STEP INDICATOR ──────────────────────────────────────────────────────────
step_labels = ["1 Setup", "2 AI Analysis", "3 Questions", "4 Submit"]
step_cols = st.columns(4)
for i, (col, label) in enumerate(zip(step_cols, step_labels), 1):
    with col:
        active = st.session_state["eval_step"] == i
        bg = "#4F46E5" if active else "#E2E8F0"
        fg = "white" if active else "#64748B"
        st.markdown(
            f'<div style="background:{bg};color:{fg};border-radius:8px;padding:8px;text-align:center;font-weight:700;">{label}</div>',
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
    selected_proj_name = st.selectbox("Select Project", list(proj_options.keys()))
    selected_proj_id = proj_options[selected_proj_name]

    roles = get_roles_for_project(selected_proj_id)
    if not roles:
        st.warning("No roles linked to this project. Add a role first.")
        if st.button("Go to Roles"):
            st.switch_page("pages/4_Roles.py")
        st.stop()

    role_options = {r["name"]: r["id"] for r in roles}
    selected_role_name = st.selectbox("Select Role", list(role_options.keys()))
    selected_role_id = role_options[selected_role_name]

    # Pre-populate role-linked questions
    role_qs = get_questions_for_role(selected_role_id)

    c1, c2 = st.columns(2)
    with c1:
        cand_name = st.text_input("Candidate Name *", value=st.session_state["eval_candidate_name"])
    with c2:
        cand_email = st.text_input("Candidate Email", value=st.session_state["eval_candidate_email"])

    uploaded = st.file_uploader("Upload Resume (PDF or DOCX) *", type=["pdf", "docx"])

    if st.button("▶ Next: Analyse Resume", type="primary"):
        if not cand_name.strip():
            st.error("Candidate name is required.")
        elif uploaded is None:
            st.error("Please upload a resume.")
        else:
            file_bytes = uploaded.read()
            if uploaded.name.lower().endswith(".pdf"):
                resume_text = _extract_text_from_pdf(file_bytes)
            else:
                resume_text = _extract_text_from_docx(file_bytes)

            if not resume_text.strip():
                st.error("Could not extract text from the uploaded file. Please try a different file.")
            else:
                st.session_state["eval_project_id"] = selected_proj_id
                st.session_state["eval_role_id"] = selected_role_id
                st.session_state["eval_candidate_name"] = cand_name.strip()
                st.session_state["eval_candidate_email"] = cand_email.strip()
                st.session_state["eval_resume_text"] = resume_text
                st.session_state["eval_resume_filename"] = uploaded.name
                st.session_state["eval_role_questions"] = role_qs
                st.session_state["eval_step"] = 2
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
    score = metrics.get("tech_match_score", 0)
    exp = metrics.get("experience_level", "—")
    rec = metrics.get("recommendation", "—")
    rec_cls = {"Proceed": "rec-proceed", "Hold": "rec-hold", "Reject": "rec-reject"}.get(rec, "")
    matched_count = len(metrics.get("matched_technologies", []))
    missing_count = len(metrics.get("missing_technologies", []))
    emp_status = "✅ Currently Employed" if metrics.get("is_currently_employed") else "🔴 Not Currently Employed"
    current_employer = metrics.get("current_employer", "")

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Tech Match</div><div class="metric-value">{score}/100</div></div>', unsafe_allow_html=True)
        st.progress(score / 100)
    with c2:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Experience Level</div><div class="metric-value">{exp}</div></div>', unsafe_allow_html=True)
    with c3:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Recommendation</div><div class="metric-value {rec_cls}">{rec}</div></div>', unsafe_allow_html=True)
    with c4:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Tech Coverage</div><div class="metric-value">✅ {matched_count} / ❌ {missing_count}</div></div>', unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── 1. Tech Stack Comparison Table ─────────────────────────────────────
    st.markdown("### 🔬 Tech Stack Comparison")
    tech_comparison = metrics.get("tech_comparison", [])
    if tech_comparison:
        tc_rows = []
        for item in tech_comparison:
            tech = item.get("technology", "")
            status = item.get("status", "Unknown")
            status_display = "✅ Matched" if status == "Matched" else "❌ Unmatched"
            tc_rows.append({"Technology": tech, "Required": "✅", "Status": status_display})
        df_tc = pd.DataFrame(tc_rows)
        st.dataframe(
            df_tc,
            use_container_width=True,
            hide_index=True,
            column_config={
                "Technology": st.column_config.TextColumn("Technology", width="medium"),
                "Required": st.column_config.TextColumn("Required", width="small"),
                "Status": st.column_config.TextColumn("Status", width="medium"),
            },
        )
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
    exp_col1, exp_col2, exp_col3 = st.columns(3)
    with exp_col1:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Experience Mentioned</div><div class="metric-value" style="font-size:1rem;">{metrics.get("total_experience_mentioned", "Unknown")}</div></div>', unsafe_allow_html=True)
    with exp_col2:
        st.markdown(f'<div class="metric-card"><div class="metric-label">Calculated Experience</div><div class="metric-value" style="font-size:1rem;">{metrics.get("total_experience_calculated", "Unknown")}</div></div>', unsafe_allow_html=True)
    with exp_col3:
        emp_color = "#16A34A" if metrics.get("is_currently_employed") else "#DC2626"
        emp_label = f'<span style="color:{emp_color};font-size:0.95rem;font-weight:700;">{emp_status}</span>'
        employer_line = f'<div style="font-size:0.82rem;color:#64748B;margin-top:4px;">{current_employer}</div>' if current_employer else ""
        st.markdown(f'<div class="metric-card"><div class="metric-label">Employment Status</div>{emp_label}{employer_line}</div>', unsafe_allow_html=True)

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
        # Display from newest (top) to oldest (bottom)
        for i, role_item in enumerate(reversed(career_history)):
            title = role_item.get("title", "Unknown Role")
            company = role_item.get("company", "")
            start = role_item.get("start", "")
            end = role_item.get("end", "")
            duration = role_item.get("duration", "")
            is_current = role_item.get("is_current", False)

            dot_color = "#4F46E5" if is_current else "#94A3B8"
            badge = '<span style="background:#DCFCE7;color:#16A34A;border-radius:20px;padding:2px 8px;font-size:0.72rem;font-weight:700;margin-left:8px;">Current</span>' if is_current else ""
            period = f"{start} – {end}" if start else end
            dur_text = f" · {duration}" if duration else ""
            connector = "" if i == len(career_history) - 1 else (
                '<div style="width:2px;height:24px;background:#E2E8F0;margin-left:9px;"></div>'
            )
            st.markdown(
                f'<div style="display:flex;align-items:flex-start;gap:12px;">'
                f'<div style="width:20px;height:20px;border-radius:50%;background:{dot_color};'
                f'flex-shrink:0;margin-top:3px;box-shadow:0 0 0 3px rgba(79,70,229,0.15);"></div>'
                f'<div style="padding-bottom:4px;">'
                f'<div style="font-weight:700;color:#1E293B;font-size:0.95rem;">{title}{badge}</div>'
                f'<div style="color:#64748B;font-size:0.85rem;">{company}</div>'
                f'<div style="color:#94A3B8;font-size:0.8rem;">{period}{dur_text}</div>'
                f'</div></div>{connector}',
                unsafe_allow_html=True,
            )
        st.markdown("<br>", unsafe_allow_html=True)

    # ── Summary ─────────────────────────────────────────────────────────────
    st.info(f"📝 **Summary:** {metrics.get('summary', '')}")

    st.markdown("<br>", unsafe_allow_html=True)
    b1, b2 = st.columns(2)
    with b1:
        if st.button("← Back", use_container_width=True):
            st.session_state["eval_step"] = 1
            st.session_state["eval_metrics"] = {}
            st.rerun()
    with b2:
        if st.button("▶ Generate Questions", type="primary", use_container_width=True):
            st.session_state["eval_step"] = 3
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

    # Role-linked questions
    role_qs = st.session_state.get("eval_role_questions", [])
    if role_qs:
        st.markdown(f"**📌 Pre-linked Questions ({len(role_qs)})**")
        for i, q in enumerate(role_qs, 1):
            with st.expander(f"Q{i}: {_truncate(q['question_text'])}"):
                st.write(q["question_text"])
                st.caption(f"Category: {q['category']} | Difficulty: {q['difficulty']}")

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
            with st.expander(f"Q{i}: {_truncate(q.get('question', ''))}"):
                st.write(q.get("question", ""))
                st.caption(f"Category: {q.get('category', '')} | Hints: {q.get('expected_answer_hints', '')}")

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
            with st.expander(f"Q{i}: {_truncate(q.get('question', ''))}"):
                st.write(q.get("question", ""))
                st.caption(f"Category: {q.get('category', '')} | Hints: {q.get('expected_answer_hints', '')}")

    st.markdown("<br>", unsafe_allow_html=True)
    b1, b2 = st.columns(2)
    with b1:
        if st.button("← Back", use_container_width=True):
            st.session_state["eval_step"] = 2
            st.rerun()
    with b2:
        if st.button("▶ Continue to Submit", type="primary", use_container_width=True):
            st.session_state["eval_step"] = 4
            st.rerun()

# ===========================================================================
# STEP 4 – COMMENTS & SUBMIT
# ===========================================================================
elif st.session_state["eval_step"] == 4:
    st.markdown('<div class="step-header">📝 Step 4: Comments & Submit</div>', unsafe_allow_html=True)

    st.markdown(f"**Candidate:** {st.session_state['eval_candidate_name']}")
    st.markdown(f"**Email:** {st.session_state['eval_candidate_email'] or '—'}")
    st.markdown(f"**Resume:** {st.session_state['eval_resume_filename']}")
    st.divider()

    comments = st.text_area(
        "Add your evaluation notes…",
        height=150,
        placeholder="Overall impression, cultural fit, red flags, recommendations…",
        key="eval_comments",
    )

    status = st.selectbox("Initial Status", ["Pending", "Selected", "Rejected", "Hold"], key="eval_status")

    b1, b2 = st.columns(2)
    with b1:
        if st.button("← Back", use_container_width=True):
            st.session_state["eval_step"] = 3
            st.rerun()
    with b2:
        if st.button("✅ Submit Evaluation", type="primary", use_container_width=True):
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
                comments=comments,
                status=status,
            )
            st.success(f"✅ Evaluation saved! ID: {result['id']}")
            st.balloons()
            _reset_eval()
            if st.button("View in Archives"):
                st.switch_page("pages/7_Archives.py")
