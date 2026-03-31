import streamlit as st
from utils.database import (
    init_db, get_roles_for_user, create_role, update_role, delete_role,
    get_projects_for_user, get_questions_for_user,
)
from utils.auth import require_auth, get_current_user, logout_user
from utils.ui import inject_common_css, render_authenticated_sidebar, render_page_logo, create_logo_favicon

st.set_page_config(
    page_title="Roles – Let's Evaluate",
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
.stButton > button[kind="secondary"] {
  background: white !important;
  color: #4F46E5 !important;
  border: 1.5px solid #E2E8F0 !important;
  padding: 4px 10px !important;
  font-size: 0.9rem !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  transform: none !important;
  transition: all .2s !important;
}
.stButton > button[kind="secondary"]:hover {
  border-color: #4F46E5 !important;
  box-shadow: 0 2px 8px rgba(79,70,229,0.18) !important;
  transform: none !important;
}
.tbl-col-hdr {
  font-size: 0.72rem;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  padding: 0 0 8px 0;
  border-bottom: 1.5px solid #E2E8F0;
}
.role-proj-badge {
  display: inline-block;
  background: #EEF2FF;
  color: #4F46E5;
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  margin: 1px 2px 1px 0;
}
.form-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1E293B;
  padding-bottom: 10px;
  margin-bottom: 4px;
  border-bottom: 2px solid #EEF2FF;
}
</style>
""", unsafe_allow_html=True)

MAX_DESCRIPTION_PREVIEW_LENGTH = 70

# Cycling gradient palette matching the app's indigo/violet brand
ROW_GRADIENTS = [
    "linear-gradient(135deg,#4F46E5,#6D28D9)",
    "linear-gradient(135deg,#5B21B6,#7C3AED)",
    "linear-gradient(135deg,#4338CA,#5B21B6)",
    "linear-gradient(135deg,#2563EB,#4F46E5)",
    "linear-gradient(135deg,#6D28D9,#9333EA)",
    "linear-gradient(135deg,#3730A3,#4F46E5)",
    "linear-gradient(135deg,#1D4ED8,#4338CA)",
]

# ── Session state ────────────────────────────────────────────────────────────
if "edit_role_id" not in st.session_state:
    st.session_state["edit_role_id"] = None

# ── Delete confirmation dialog ───────────────────────────────────────────────
@st.dialog("🗑️ Confirm Delete")
def _delete_role_dialog():
    r = st.session_state["_pending_delete_role"]
    questions = st.session_state.get("_all_questions_for_delete", [])
    linked_qs = [q for q in questions if q["role_id"] == r["id"] or r["id"] in q.get("role_ids", [])]

    st.markdown(f"Are you sure you want to delete role **{r['name']}**?")
    if linked_qs:
        st.warning(
            f"This role has **{len(linked_qs)} linked question(s)**. "
            f"Questions will be **unlinked** from this role (not deleted). "
            f"They will appear as 'No Role Associated' in the Questions page."
        )
    c1, c2 = st.columns(2)
    with c1:
        if st.button("🗑️ Delete", type="primary", width='stretch'):
            delete_role(r["id"])
            del st.session_state["_pending_delete_role"]
            st.session_state.pop("_all_questions_for_delete", None)
            st.toast(f"Role '{r['name']}' deleted.", icon="🗑️")
            st.rerun()
    with c2:
        if st.button("✖️ Cancel", width='stretch'):
            del st.session_state["_pending_delete_role"]
            st.session_state.pop("_all_questions_for_delete", None)
            st.rerun()

# ── Load data ────────────────────────────────────────────────────────────────
projects = get_projects_for_user(uid)
project_options = {p["name"]: p["id"] for p in projects}
project_id_to_name = {p["id"]: p["name"] for p in projects}

roles = get_roles_for_user(uid)
role_map = {r["id"]: r for r in roles}

# ── Open delete dialog if one is pending ────────────────────────────────────
if "_pending_delete_role" in st.session_state:
    _delete_role_dialog()

# ── Page header ──────────────────────────────────────────────────────────────
render_page_logo()
hdr_col, btn_col = st.columns([8, 2])
with hdr_col:
    st.markdown("## 👥 Roles")
with btn_col:
    if st.button("🏠 Dashboard", width='stretch', help="Go to Dashboard"):
        st.switch_page("pages/2_Dashboard.py")

# ── Two-column layout: table (left) + form (right) ──────────────────────────
left_col, right_col = st.columns([6, 4], gap="large")

# ════════════════════════════════════════════════════════
#  RIGHT COLUMN – Add / Edit form (always open)
# ════════════════════════════════════════════════════════
with right_col:
    edit_id = st.session_state.get("edit_role_id")
    er = role_map.get(edit_id) if edit_id else None

    with st.container(border=True):
        if er:
            # ── EDIT MODE ───────────────────────────────────────────────
            st.markdown(
                f'<div class="form-section-title">✏️ Edit: {er["name"]}</div>',
                unsafe_allow_html=True,
            )
            with st.form("form_role_edit", clear_on_submit=False):
                er_name = st.text_input("Role Name *", value=er["name"])
                er_desc = st.text_area("Description", value=er["description"] or "", height=70)
                er_req = st.text_area("Requirements", value=er["requirements"] or "", height=100)
                # Multi-project selection – pre-check existing linked projects
                existing_pids = er.get("project_ids") or (
                    [er["project_id"]] if er.get("project_id") else []
                )
                existing_proj_names = [
                    project_id_to_name[pid]
                    for pid in existing_pids
                    if pid in project_id_to_name
                ]
                er_projs = st.multiselect(
                    "Link to Project(s)",
                    options=list(project_options.keys()),
                    default=existing_proj_names,
                    help="A role can be linked to multiple projects.",
                )

                c_save, c_cancel = st.columns(2)
                with c_save:
                    save = st.form_submit_button("💾 Save Changes", type="primary", width='stretch')
                with c_cancel:
                    cancel = st.form_submit_button("✖️ Cancel", width='stretch')

                if save:
                    if not er_name.strip():
                        st.error("Role name is required.")
                    else:
                        pids = [project_options[n] for n in er_projs if n in project_options]
                        update_role(
                            edit_id, er_name.strip(), er_desc.strip(), er_req.strip(),
                            project_ids=pids,
                        )
                        st.session_state["edit_role_id"] = None
                        st.toast("Role updated!", icon="✅")
                        st.rerun()
                if cancel:
                    st.session_state["edit_role_id"] = None
                    st.rerun()
        else:
            # ── ADD MODE ────────────────────────────────────────────────
            st.markdown(
                '<div class="form-section-title">➕ Add New Role</div>',
                unsafe_allow_html=True,
            )
            with st.form("form_add_role", clear_on_submit=True):
                r_name = st.text_input("Role Name *")
                r_desc = st.text_area("Description", height=70)
                r_req = st.text_area(
                    "Requirements", height=100,
                    placeholder="List key skills, years of experience, etc.",
                )
                r_projs = st.multiselect(
                    "Link to Project(s) (optional)",
                    options=list(project_options.keys()),
                    help="Select one or more projects this role belongs to.",
                )
                submitted = st.form_submit_button(
                    "✅ Create Role", type="primary", width='stretch'
                )
                if submitted:
                    if not r_name.strip():
                        st.error("Role name is required.")
                    else:
                        pids = [project_options[n] for n in r_projs if n in project_options]
                        create_role(uid, r_name.strip(), r_desc.strip(), r_req.strip(), project_ids=pids)
                        st.success(f"Role **{r_name}** created!")
                        st.rerun()

# ════════════════════════════════════════════════════════
#  LEFT COLUMN – Modern Table Layout
# ════════════════════════════════════════════════════════
with left_col:
    if not roles:
        st.info("No roles yet. Add your first role using the form →")
    else:
        st.markdown(f"**{len(roles)} role(s)**")

        # Table header row
        h1, h2, h3, h_act = st.columns([2.5, 2, 3.5, 1.5])
        with h1:
            st.markdown('<div class="tbl-col-hdr">Role</div>', unsafe_allow_html=True)
        with h2:
            st.markdown('<div class="tbl-col-hdr">Project</div>', unsafe_allow_html=True)
        with h3:
            st.markdown('<div class="tbl-col-hdr">Description</div>', unsafe_allow_html=True)
        with h_act:
            st.markdown('<div class="tbl-col-hdr">Actions</div>', unsafe_allow_html=True)

        # Table data rows
        for idx, r in enumerate(roles):
            gradient = ROW_GRADIENTS[idx % len(ROW_GRADIENTS)]
            c1, c2, c3, c_edit, c_del = st.columns([2.5, 2, 3.5, 0.75, 0.75])

            with c1:
                st.markdown(
                    f'<div style="background:{gradient};color:white;padding:8px 10px;'
                    f'border-radius:8px;font-weight:600;font-size:0.88rem;line-height:1.3;'
                    f'margin:4px 0 2px;">{r["name"]}</div>',
                    unsafe_allow_html=True,
                )
            with c2:
                # Show all linked project badges
                pids = r.get("project_ids") or (
                    [r["project_id"]] if r.get("project_id") else []
                )
                if pids:
                    badges = "".join(
                        f'<span class="role-proj-badge">📁 {project_id_to_name.get(pid, (pid or "?")[:8])}</span> '
                        for pid in pids
                        if pid and pid in project_id_to_name
                    )
                    proj_html = badges if badges.strip() else '<span style="color:#94A3B8;font-size:0.82rem;">—</span>'
                else:
                    proj_html = '<span style="color:#94A3B8;font-size:0.82rem;">—</span>'
                st.markdown(
                    f'<div style="padding:8px 4px 2px;">{proj_html}</div>',
                    unsafe_allow_html=True,
                )
            with c3:
                desc = (r["description"] or "—")
                if len(desc) > MAX_DESCRIPTION_PREVIEW_LENGTH:
                    desc = desc[:MAX_DESCRIPTION_PREVIEW_LENGTH] + "…"
                st.markdown(
                    f'<div style="font-size:0.84rem;color:#475569;padding:8px 4px 2px;">{desc}</div>',
                    unsafe_allow_html=True,
                )
            with c_edit:
                if st.button("✏️", key=f"edit_role_{r['id']}", help="Edit role",
                             width='stretch'):
                    st.session_state["edit_role_id"] = r["id"]
                    st.rerun()
            with c_del:
                if st.button("🗑️", key=f"del_role_{r['id']}", help="Delete role",
                             width='stretch'):
                    all_qs = get_questions_for_user(uid)
                    st.session_state["_pending_delete_role"] = r
                    st.session_state["_all_questions_for_delete"] = all_qs
                    st.rerun()

            st.markdown(
                '<hr style="margin:4px 0 0;border:none;border-top:1px solid #F1F5F9;">',
                unsafe_allow_html=True,
            )
