import streamlit as st
from datetime import datetime

from utils.database import (
    init_db, get_evaluations_for_user, update_evaluation, delete_evaluation,
    get_projects_for_user, get_roles_for_user,
)
from utils.auth import require_auth, get_current_user, logout_user
from utils.pdf_utils import generate_evaluation_pdf
from utils.ui import inject_common_css, render_authenticated_sidebar, render_page_logo

st.set_page_config(
    page_title="Archives – Let's Evaluate",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded",
)
init_db()
require_auth()

user = get_current_user()
uid = user["id"]

# ── Sidebar ────────────────────────────────────────────────────────────────
render_authenticated_sidebar()

# ── CSS ────────────────────────────────────────────────────────────────────
inject_common_css()
st.markdown("""
<style>
.status-badge {
  display: inline-block;
  border-radius: 20px;
  padding: 3px 12px;
  font-size: 0.78rem;
  font-weight: 700;
}
.s-pending  { background: #F1F5F9; color: #475569; }
.s-selected { background: #DCFCE7; color: #16A34A; }
.s-rejected { background: #FEE2E2; color: #DC2626; }
.s-hold     { background: #FEF9C3; color: #CA8A04; }
.stButton > button { border-radius: 8px !important; font-weight: 500 !important; }
</style>
""", unsafe_allow_html=True)

render_page_logo()
STATUS_OPTIONS = ["Pending", "Selected", "Rejected", "Hold"]
STATUS_CLS = {"Pending": "s-pending", "Selected": "s-selected", "Rejected": "s-rejected", "Hold": "s-hold"}
STATUS_ICON = {"Pending": "⚪", "Selected": "🟢", "Rejected": "🔴", "Hold": "🟡"}

st.markdown("## 📂 Evaluation Archives")

evaluations = get_evaluations_for_user(uid)
projects = get_projects_for_user(uid)
roles = get_roles_for_user(uid)

# ── FILTERS ─────────────────────────────────────────────────────────────────
st.markdown("### 🔍 Filter")
f1, f2, f3, f4, f5, f6 = st.columns([2, 2, 2, 2, 2, 2])
with f1:
    search_name = st.text_input("Candidate Name", placeholder="Search…", key="f_name")
with f2:
    proj_names = ["All"] + list({e["project_name"] for e in evaluations if e.get("project_name")})
    filter_proj = st.selectbox("Project", proj_names, key="f_proj")
with f3:
    role_names = ["All"] + list({e["role_name"] for e in evaluations if e.get("role_name")})
    filter_role = st.selectbox("Role", role_names, key="f_role")
with f4:
    filter_status = st.selectbox("Status", ["All"] + STATUS_OPTIONS, key="f_status")
with f5:
    date_from = st.date_input("From", value=None, key="f_from")
with f6:
    date_to = st.date_input("To", value=None, key="f_to")

# Apply filters
filtered = evaluations
if search_name:
    filtered = [e for e in filtered if search_name.lower() in e["candidate_name"].lower()]
if filter_proj != "All":
    filtered = [e for e in filtered if e.get("project_name") == filter_proj]
if filter_role != "All":
    filtered = [e for e in filtered if e.get("role_name") == filter_role]
if filter_status != "All":
    filtered = [e for e in filtered if e.get("status") == filter_status]
if date_from:
    filtered = [
        e for e in filtered
        if e.get("created_at") and e["created_at"].date() >= date_from
    ]
if date_to:
    filtered = [
        e for e in filtered
        if e.get("created_at") and e["created_at"].date() <= date_to
    ]

st.markdown(f"**{len(filtered)} evaluation(s) found**")
st.divider()

if not filtered:
    st.info("No evaluations match your filters.")
else:
    # ── TABLE HEADER ────────────────────────────────────────────────────────
    hc = st.columns([3, 2, 2, 2, 2, 1, 1, 1])
    for col, hdr in zip(hc, ["Candidate", "Project", "Role", "Date", "Status", "PDF", "Status↑", "Delete"]):
        col.markdown(f"**{hdr}**")

    for ev in filtered:
        c1, c2, c3, c4, c5, c6, c7, c8 = st.columns([3, 2, 2, 2, 2, 1, 1, 1])

        with c1:
            st.write(ev["candidate_name"])
            if ev.get("candidate_email"):
                st.caption(ev["candidate_email"])
        with c2:
            st.write(ev.get("project_name") or "—")
        with c3:
            st.write(ev.get("role_name") or "—")
        with c4:
            created = ev.get("created_at")
            st.write(created.strftime("%d %b %Y") if created else "—")
        with c5:
            cls = STATUS_CLS.get(ev["status"], "s-pending")
            icon = STATUS_ICON.get(ev["status"], "⚪")
            st.markdown(
                f'<span class="status-badge {cls}">{icon} {ev["status"]}</span>',
                unsafe_allow_html=True,
            )
        with c6:
            if st.button("📥", key=f"pdf_{ev['id']}", help="Download PDF"):
                with st.spinner("Generating PDF…"):
                    pdf_bytes = generate_evaluation_pdf(ev)
                safe_name = "".join(
                    c if c.isalnum() or c in ("-", "_") else "_"
                    for c in ev["candidate_name"].replace(" ", "_")
                )
                filename = f"eval_{safe_name}_{ev['id'][:8]}.pdf"
                st.download_button(
                    label="⬇ Download",
                    data=pdf_bytes,
                    file_name=filename,
                    mime="application/pdf",
                    key=f"dl_{ev['id']}",
                )
        with c7:
            new_status = st.selectbox(
                "Status",
                STATUS_OPTIONS,
                index=STATUS_OPTIONS.index(ev["status"]) if ev["status"] in STATUS_OPTIONS else 0,
                key=f"status_{ev['id']}",
                label_visibility="collapsed",
            )
            if new_status != ev["status"]:
                update_evaluation(ev["id"], status=new_status)
                st.toast(f"Status updated to {new_status}", icon="✅")
                st.rerun()
        with c8:
            if st.button("🗑️", key=f"del_{ev['id']}", help="Delete evaluation"):
                st.session_state[f"confirm_del_ev_{ev['id']}"] = True
                st.rerun()

        # Inline delete confirmation
        if st.session_state.get(f"confirm_del_ev_{ev['id']}", False):
            st.warning(f"Delete evaluation for **{ev['candidate_name']}**?")
            dc1, dc2, _ = st.columns([1, 1, 6])
            with dc1:
                if st.button("✅ Yes, Delete", key=f"do_del_ev_{ev['id']}"):
                    delete_evaluation(ev["id"])
                    st.session_state.pop(f"confirm_del_ev_{ev['id']}", None)
                    st.toast("Evaluation deleted.", icon="🗑️")
                    st.rerun()
            with dc2:
                if st.button("✖️ Cancel", key=f"cancel_del_ev_{ev['id']}"):
                    st.session_state.pop(f"confirm_del_ev_{ev['id']}", None)
                    st.rerun()

        st.divider()
