import streamlit as st
from utils.database import (
    init_db, get_projects_for_user, create_project, update_project, delete_project,
    get_roles_for_user, get_questions_for_user,
)
from utils.auth import require_auth, get_current_user, logout_user
from utils.ui import inject_common_css, render_authenticated_sidebar, render_page_logo, create_logo_favicon

st.set_page_config(
    page_title="Projects – Let's Evaluate",
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
/* Secondary (action) buttons – compact, outlined style */
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
.tech-chip {
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
MAX_VISIBLE_TECH_STACK_ITEMS = 4

COMMON_TECHS = [
    "Python", "JavaScript", "TypeScript", "React", "Vue.js", "Angular",
    "Node.js", "FastAPI", "Django", "Flask", "Spring Boot", "Go", "Rust",
    "Java", "Kotlin", "Swift", "C#", "C++", "Ruby on Rails",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform",
    "Git", "GraphQL", "REST API", "gRPC", "Kafka", "RabbitMQ",
    "Machine Learning", "TensorFlow", "PyTorch", "LangChain",
]

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
if "edit_project_id" not in st.session_state:
    st.session_state["edit_project_id"] = None

# ── Delete confirmation dialog ───────────────────────────────────────────────
@st.dialog("🗑️ Confirm Delete")
def _delete_project_dialog():
    p = st.session_state["_pending_delete_proj"]
    all_roles = get_roles_for_user(uid)
    linked_roles = [r for r in all_roles if r["project_id"] == p["id"]]
    all_qs = get_questions_for_user(uid)
    linked_qs = [q for q in all_qs if any(r["id"] == q["role_id"] for r in linked_roles)]

    st.markdown(f"Are you sure you want to delete project **{p['name']}**?")
    if linked_roles or linked_qs:
        st.warning(
            f"This project has **{len(linked_roles)} linked role(s)** and "
            f"**{len(linked_qs)} linked question(s)**. "
            f"Roles will be **unlinked** from this project (not deleted). "
            f"Questions will remain associated with their roles."
        )
    c1, c2 = st.columns(2)
    with c1:
        if st.button("🗑️ Delete", type="primary", use_container_width=True):
            delete_project(p["id"])
            del st.session_state["_pending_delete_proj"]
            st.toast(f"Project '{p['name']}' deleted.", icon="🗑️")
            st.rerun()
    with c2:
        if st.button("✖️ Cancel", use_container_width=True):
            del st.session_state["_pending_delete_proj"]
            st.rerun()

# ── Load data ────────────────────────────────────────────────────────────────
projects = get_projects_for_user(uid)
project_map = {p["id"]: p for p in projects}

# ── Open delete dialog if one is pending ────────────────────────────────────
if "_pending_delete_proj" in st.session_state:
    _delete_project_dialog()

# ── Page header ──────────────────────────────────────────────────────────────
render_page_logo()
hdr_col, btn_col = st.columns([8, 2])
with hdr_col:
    st.markdown("## 📁 Projects")
with btn_col:
    if st.button("🏠 Dashboard", use_container_width=True, help="Go to Dashboard"):
        st.switch_page("pages/2_Dashboard.py")

# ── Two-column layout: table (left) + form (right) ──────────────────────────
left_col, right_col = st.columns([6, 4], gap="large")

# ════════════════════════════════════════════════════════
#  RIGHT COLUMN – Add / Edit form (always open)
# ════════════════════════════════════════════════════════
with right_col:
    edit_id = st.session_state.get("edit_project_id")
    ep = project_map.get(edit_id) if edit_id else None

    with st.container(border=True):
        if ep:
            # ── EDIT MODE ───────────────────────────────────────────────
            st.markdown(
                f'<div class="form-section-title">✏️ Edit: {ep["name"]}</div>',
                unsafe_allow_html=True,
            )
            with st.form("form_project_edit", clear_on_submit=False):
                ep_name = st.text_input("Project Name *", value=ep["name"])
                ep_desc = st.text_area("Description", value=ep["description"] or "", height=80)
                current_tech = ep.get("tech_stack") or []
                extra_known = [t for t in current_tech if t not in COMMON_TECHS]
                ep_tech = st.multiselect(
                    "Tech Stack",
                    options=COMMON_TECHS,
                    default=[t for t in current_tech if t in COMMON_TECHS],
                )
                ep_custom = st.text_input(
                    "Custom technologies (comma-separated)",
                    value=", ".join(extra_known),
                )
                c_save, c_cancel = st.columns(2)
                with c_save:
                    save = st.form_submit_button("💾 Save Changes", type="primary", use_container_width=True)
                with c_cancel:
                    cancel = st.form_submit_button("✖️ Cancel", use_container_width=True)

                if save:
                    if not ep_name.strip():
                        st.error("Project name is required.")
                    else:
                        extras = [t.strip() for t in ep_custom.split(",") if t.strip()]
                        final = list(dict.fromkeys(ep_tech + extras))
                        update_project(edit_id, ep_name.strip(), ep_desc.strip(), final)
                        st.session_state["edit_project_id"] = None
                        st.toast("Project updated!", icon="✅")
                        st.rerun()
                if cancel:
                    st.session_state["edit_project_id"] = None
                    st.rerun()
        else:
            # ── ADD MODE ────────────────────────────────────────────────
            st.markdown(
                '<div class="form-section-title">➕ Add New Project</div>',
                unsafe_allow_html=True,
            )
            with st.form("form_add_project", clear_on_submit=True):
                p_name = st.text_input("Project Name *")
                p_desc = st.text_area("Description", height=80)
                p_tech = st.multiselect("Tech Stack", options=COMMON_TECHS)
                custom_tech = st.text_input(
                    "Custom technologies (comma-separated)",
                    placeholder="e.g. FastAPI, Redis, Kafka",
                )
                submitted = st.form_submit_button(
                    "✅ Create Project", type="primary", use_container_width=True
                )
                if submitted:
                    if not p_name.strip():
                        st.error("Project name is required.")
                    else:
                        extra = [t.strip() for t in custom_tech.split(",") if t.strip()]
                        final_tech = list(dict.fromkeys(p_tech + extra))
                        create_project(uid, p_name.strip(), p_desc.strip(), final_tech)
                        st.success(f"Project **{p_name}** created!")
                        st.rerun()

# ════════════════════════════════════════════════════════
#  LEFT COLUMN – Modern Table Layout
# ════════════════════════════════════════════════════════
with left_col:
    if not projects:
        st.info("No projects yet. Add your first project using the form →")
    else:
        st.markdown(f"**{len(projects)} project(s)**")

        # Table header row
        h1, h2, h3, h_act = st.columns([2.5, 3, 3, 1.5])
        with h1:
            st.markdown('<div class="tbl-col-hdr">Project</div>', unsafe_allow_html=True)
        with h2:
            st.markdown('<div class="tbl-col-hdr">Description</div>', unsafe_allow_html=True)
        with h3:
            st.markdown('<div class="tbl-col-hdr">Tech Stack</div>', unsafe_allow_html=True)
        with h_act:
            st.markdown('<div class="tbl-col-hdr">Actions</div>', unsafe_allow_html=True)

        # Table data rows
        for idx, p in enumerate(projects):
            gradient = ROW_GRADIENTS[idx % len(ROW_GRADIENTS)]
            c1, c2, c3, c_edit, c_del = st.columns([2.5, 3, 3, 0.75, 0.75])

            with c1:
                st.markdown(
                    f'<div style="background:{gradient};color:white;padding:8px 10px;'
                    f'border-radius:8px;font-weight:600;font-size:0.88rem;line-height:1.3;'
                    f'margin:4px 0 2px;">{p["name"]}</div>',
                    unsafe_allow_html=True,
                )
            with c2:
                desc = (p["description"] or "—")
                if len(desc) > MAX_DESCRIPTION_PREVIEW_LENGTH:
                    desc = desc[:MAX_DESCRIPTION_PREVIEW_LENGTH] + "…"
                st.markdown(
                    f'<div style="font-size:0.84rem;color:#475569;padding:8px 4px 2px;">{desc}</div>',
                    unsafe_allow_html=True,
                )
            with c3:
                tech_list = p["tech_stack"] or []
                chips = "".join(
                    f'<span class="tech-chip">{t}</span>' for t in tech_list[:MAX_VISIBLE_TECH_STACK_ITEMS]
                )
                if len(tech_list) > MAX_VISIBLE_TECH_STACK_ITEMS:
                    chips += f'<span class="tech-chip">+{len(tech_list) - MAX_VISIBLE_TECH_STACK_ITEMS}</span>'
                st.markdown(
                    f'<div style="padding:6px 0 2px;">{chips or "—"}</div>',
                    unsafe_allow_html=True,
                )
            with c_edit:
                if st.button("✏️", key=f"edit_proj_{p['id']}", help="Edit project",
                             use_container_width=True):
                    st.session_state["edit_project_id"] = p["id"]
                    st.rerun()
            with c_del:
                if st.button("🗑️", key=f"del_proj_{p['id']}", help="Delete project",
                             use_container_width=True):
                    st.session_state["_pending_delete_proj"] = p
                    st.rerun()

            st.markdown(
                '<hr style="margin:4px 0 0;border:none;border-top:1px solid #F1F5F9;">',
                unsafe_allow_html=True,
            )
