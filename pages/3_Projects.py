import streamlit as st
from utils.database import (
    init_db, get_projects_for_user, create_project, update_project, delete_project,
    get_roles_for_user, get_questions_for_user,
)
from utils.auth import require_auth, get_current_user, logout_user

st.set_page_config(page_title="Projects – Let's Evaluate", page_icon="📁", layout="wide")
init_db()
require_auth()

user = get_current_user()
uid = user["id"]

# ── Sidebar ────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 🎯 Let's Evaluate")
    st.page_link("app.py", label="🏠 Home")
    st.page_link("pages/2_Dashboard.py", label="📊 Dashboard")
    st.page_link("pages/3_Projects.py", label="📁 Projects")
    st.page_link("pages/4_Roles.py", label="👥 Roles")
    st.page_link("pages/5_Questions.py", label="❓ Questions")
    st.page_link("pages/6_Evaluate_Candidate.py", label="🤖 Evaluate Candidate")
    st.page_link("pages/7_Archives.py", label="📂 Archives")
    st.divider()
    if st.button("🚪 Logout", use_container_width=True):
        logout_user()
        st.switch_page("app.py")

# ── CSS ────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
[data-testid="stSidebarNav"] { display: none; }
.proj-card {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 12px;
  transition: all .25s;
}
.proj-card:hover { border-color: #4F46E5; box-shadow: 0 4px 14px rgba(79,70,229,0.1); }
.proj-name { font-size: 1.05rem; font-weight: 700; color: #1E293B; }
.proj-desc { font-size: 0.88rem; color: #64748B; margin: 6px 0 10px; }
.tech-chip {
  display: inline-block;
  background: #EEF2FF;
  color: #4F46E5;
  border-radius: 20px;
  padding: 2px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  margin: 2px 3px 2px 0;
}
.stButton > button {
  border-radius: 8px !important;
  font-weight: 500 !important;
}
</style>
""", unsafe_allow_html=True)

COMMON_TECHS = [
    "Python", "JavaScript", "TypeScript", "React", "Vue.js", "Angular",
    "Node.js", "FastAPI", "Django", "Flask", "Spring Boot", "Go", "Rust",
    "Java", "Kotlin", "Swift", "C#", "C++", "Ruby on Rails",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform",
    "Git", "GraphQL", "REST API", "gRPC", "Kafka", "RabbitMQ",
    "Machine Learning", "TensorFlow", "PyTorch", "LangChain",
]

st.markdown("## 📁 Projects")

# ── Add / Edit forms ────────────────────────────────────────────────────────
# Session state keys
if "edit_project_id" not in st.session_state:
    st.session_state["edit_project_id"] = None

# ── ADD NEW PROJECT ─────────────────────────────────────────────────────────
with st.expander("➕ Add New Project", expanded=False):
    with st.form("form_add_project", clear_on_submit=True):
        p_name = st.text_input("Project Name *", key="add_pname")
        p_desc = st.text_area("Description", key="add_pdesc", height=80)
        p_tech = st.multiselect(
            "Tech Stack",
            options=COMMON_TECHS,
            key="add_ptech",
        )
        custom_tech = st.text_input(
            "Add custom technologies (comma-separated)",
            key="add_custom_tech",
            placeholder="e.g. FastAPI, Redis, Kafka",
        )
        submitted = st.form_submit_button("✅ Create Project", type="primary")
        if submitted:
            if not p_name.strip():
                st.error("Project name is required.")
            else:
                extra = [t.strip() for t in custom_tech.split(",") if t.strip()]
                final_tech = list(dict.fromkeys(p_tech + extra))  # dedup, preserve order
                create_project(uid, p_name.strip(), p_desc.strip(), final_tech)
                st.success(f"Project **{p_name}** created!")
                st.rerun()

st.divider()

# ── PROJECT LIST ────────────────────────────────────────────────────────────
projects = get_projects_for_user(uid)

if not projects:
    st.info("No projects yet. Create your first project above.")
else:
    st.markdown(f"**{len(projects)} project(s)**")
    for i in range(0, len(projects), 2):
        cols = st.columns(2, gap="medium")
        for j, col in enumerate(cols):
            idx = i + j
            if idx >= len(projects):
                break
            p = projects[idx]

            with col:
                st.markdown(f'<div class="proj-card">', unsafe_allow_html=True)
                chips = "".join(f'<span class="tech-chip">{t}</span>' for t in (p["tech_stack"] or []))
                st.markdown(
                    f'<div class="proj-name">{p["name"]}</div>'
                    f'<div class="proj-desc">{p["description"] or "No description"}</div>'
                    f'<div>{chips}</div>',
                    unsafe_allow_html=True,
                )
                st.markdown("</div>", unsafe_allow_html=True)

                btn_col1, btn_col2 = st.columns(2)
                with btn_col1:
                    if st.button("✏️ Edit", key=f"edit_proj_{p['id']}", use_container_width=True):
                        st.session_state["edit_project_id"] = p["id"]
                        st.rerun()
                with btn_col2:
                    if st.button("🗑️ Delete", key=f"del_proj_{p['id']}", use_container_width=True):
                        st.session_state[f"confirm_delete_proj_{p['id']}"] = True
                        st.rerun()

                # ── Delete confirmation ─────────────────────────────────
                if st.session_state.get(f"confirm_delete_proj_{p['id']}", False):
                    all_roles = get_roles_for_user(uid)
                    linked_roles = [r for r in all_roles if r["project_id"] == p["id"]]
                    all_qs = get_questions_for_user(uid)
                    linked_qs = [q for q in all_qs if any(
                        r["id"] == q["role_id"] for r in linked_roles
                    )]

                    if linked_roles or linked_qs:
                        st.warning(
                            f"⚠️ This project has **{len(linked_roles)} linked role(s)** "
                            f"and **{len(linked_qs)} linked question(s)**. "
                            "Deleting it will remove all associations."
                        )
                    confirm_text = st.text_input(
                        'Type **Delete** to confirm',
                        key=f"del_confirm_text_{p['id']}",
                    )
                    cc1, cc2 = st.columns(2)
                    with cc1:
                        if st.button("⚠️ Confirm Delete", key=f"do_del_{p['id']}", use_container_width=True):
                            if confirm_text == "Delete":
                                delete_project(p["id"])
                                st.session_state.pop(f"confirm_delete_proj_{p['id']}", None)
                                st.toast(f"Project '{p['name']}' deleted.", icon="🗑️")
                                st.rerun()
                            else:
                                st.error("Type 'Delete' to confirm.")
                    with cc2:
                        if st.button("✖️ Cancel", key=f"cancel_del_{p['id']}", use_container_width=True):
                            st.session_state.pop(f"confirm_delete_proj_{p['id']}", None)
                            st.rerun()

# ── EDIT FORM (modal-style below the list) ──────────────────────────────────
edit_id = st.session_state.get("edit_project_id")
if edit_id:
    project_map = {p["id"]: p for p in projects}
    ep = project_map.get(edit_id)
    if ep:
        st.divider()
        st.markdown(f"### ✏️ Edit Project: *{ep['name']}*")
        with st.form("form_edit_project"):
            ep_name = st.text_input("Project Name *", value=ep["name"])
            ep_desc = st.text_area("Description", value=ep["description"], height=80)
            current_tech = ep.get("tech_stack") or []
            extra_known = [t for t in current_tech if t not in COMMON_TECHS]
            ep_tech = st.multiselect("Tech Stack", options=COMMON_TECHS, default=[t for t in current_tech if t in COMMON_TECHS])
            ep_custom = st.text_input(
                "Custom technologies (comma-separated)",
                value=", ".join(extra_known),
            )
            c_save, c_cancel = st.columns(2)
            with c_save:
                save = st.form_submit_button("💾 Save Changes", type="primary")
            with c_cancel:
                cancel = st.form_submit_button("✖️ Cancel")

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
