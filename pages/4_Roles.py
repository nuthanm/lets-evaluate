import streamlit as st
from utils.database import (
    init_db, get_roles_for_user, create_role, update_role, delete_role,
    get_projects_for_user, get_questions_for_user,
)
from utils.auth import require_auth, get_current_user, logout_user

st.set_page_config(page_title="Roles – Let's Evaluate", page_icon="👥", layout="wide")
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
[data-testid="stSidebarNav"] { display: none !important; }
[data-testid="StyledLinkIconContainer"] { display: none !important; }
[data-testid="stDecoration"] { display: none !important; }
.stHeadingActionButton { display: none !important; }
.role-card {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 12px;
  transition: all .25s;
}
.role-card:hover { border-color: #4F46E5; box-shadow: 0 4px 14px rgba(79,70,229,0.1); }
.role-name { font-size: 1.05rem; font-weight: 700; color: #1E293B; }
.role-project {
  display: inline-block;
  background: #EEF2FF;
  color: #4F46E5;
  border-radius: 20px;
  padding: 2px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  margin: 4px 0;
}
.role-desc { font-size: 0.88rem; color: #64748B; margin: 6px 0; }
.stButton > button { border-radius: 8px !important; font-weight: 500 !important; }
</style>
""", unsafe_allow_html=True)

if "edit_role_id" not in st.session_state:
    st.session_state["edit_role_id"] = None

projects = get_projects_for_user(uid)
project_options = {p["name"]: p["id"] for p in projects}
project_id_to_name = {p["id"]: p["name"] for p in projects}

st.markdown("## 👥 Roles")

# ── ADD NEW ROLE ────────────────────────────────────────────────────────────
with st.expander("➕ Add New Role", expanded=False):
    with st.form("form_add_role", clear_on_submit=True):
        r_name = st.text_input("Role Name *", key="add_rname")
        r_desc = st.text_area("Description", key="add_rdesc", height=70)
        r_req = st.text_area("Requirements", key="add_rreq", height=100,
                              placeholder="List key skills, years of experience, etc.")
        proj_names = ["(None)"] + list(project_options.keys())
        r_proj = st.selectbox("Link to Project (optional)", options=proj_names, key="add_rproj")
        submitted = st.form_submit_button("✅ Create Role", type="primary")
        if submitted:
            if not r_name.strip():
                st.error("Role name is required.")
            else:
                pid = project_options.get(r_proj) if r_proj != "(None)" else None
                create_role(uid, r_name.strip(), r_desc.strip(), r_req.strip(), pid)
                st.success(f"Role **{r_name}** created!")
                st.rerun()

st.divider()

# ── ROLE LIST ───────────────────────────────────────────────────────────────
roles = get_roles_for_user(uid)
questions = get_questions_for_user(uid)

if not roles:
    st.info("No roles yet. Create your first role above.")
else:
    st.markdown(f"**{len(roles)} role(s)**")
    for i in range(0, len(roles), 2):
        cols = st.columns(2, gap="medium")
        for j, col in enumerate(cols):
            idx = i + j
            if idx >= len(roles):
                break
            r = roles[idx]

            with col:
                proj_badge = (
                    f'<span class="role-project">📁 {r["project_name"]}</span>'
                    if r.get("project_name") else ""
                )
                st.markdown(
                    f'<div class="role-card">'
                    f'<div class="role-name">{r["name"]}</div>'
                    f'{proj_badge}'
                    f'<div class="role-desc">{r["description"] or "No description"}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

                b1, b2 = st.columns(2)
                with b1:
                    if st.button("✏️ Edit", key=f"edit_role_{r['id']}", use_container_width=True):
                        st.session_state["edit_role_id"] = r["id"]
                        st.rerun()
                with b2:
                    if st.button("🗑️ Delete", key=f"del_role_{r['id']}", use_container_width=True):
                        st.session_state[f"confirm_del_role_{r['id']}"] = True
                        st.rerun()

                # ── Delete confirmation ─────────────────────────────────
                if st.session_state.get(f"confirm_del_role_{r['id']}", False):
                    linked_qs = [q for q in questions if q["role_id"] == r["id"]]
                    if linked_qs:
                        st.warning(f"⚠️ This role has **{len(linked_qs)} linked question(s)**.")
                    confirm_text = st.text_input(
                        "Type **Delete** to confirm",
                        key=f"del_confirm_role_{r['id']}",
                    )
                    dc1, dc2 = st.columns(2)
                    with dc1:
                        if st.button("⚠️ Confirm Delete", key=f"do_del_role_{r['id']}", use_container_width=True):
                            if confirm_text == "Delete":
                                delete_role(r["id"])
                                st.session_state.pop(f"confirm_del_role_{r['id']}", None)
                                st.toast(f"Role '{r['name']}' deleted.", icon="🗑️")
                                st.rerun()
                            else:
                                st.error("Type 'Delete' to confirm.")
                    with dc2:
                        if st.button("✖️ Cancel", key=f"cancel_del_role_{r['id']}", use_container_width=True):
                            st.session_state.pop(f"confirm_del_role_{r['id']}", None)
                            st.rerun()

# ── EDIT FORM ───────────────────────────────────────────────────────────────
edit_id = st.session_state.get("edit_role_id")
if edit_id:
    role_map = {r["id"]: r for r in roles}
    er = role_map.get(edit_id)
    if er:
        st.divider()
        st.markdown(f"### ✏️ Edit Role: *{er['name']}*")
        with st.form("form_edit_role"):
            er_name = st.text_input("Role Name *", value=er["name"])
            er_desc = st.text_area("Description", value=er["description"], height=70)
            er_req = st.text_area("Requirements", value=er["requirements"], height=100)
            proj_names = ["(None)"] + list(project_options.keys())
            current_proj = project_id_to_name.get(er.get("project_id"), "(None)")
            default_idx = proj_names.index(current_proj) if current_proj in proj_names else 0
            er_proj = st.selectbox("Link to Project", options=proj_names, index=default_idx)

            c_save, c_cancel = st.columns(2)
            with c_save:
                save = st.form_submit_button("💾 Save Changes", type="primary")
            with c_cancel:
                cancel = st.form_submit_button("✖️ Cancel")

            if save:
                if not er_name.strip():
                    st.error("Role name is required.")
                else:
                    pid = project_options.get(er_proj) if er_proj != "(None)" else None
                    update_role(edit_id, er_name.strip(), er_desc.strip(), er_req.strip(), pid)
                    st.session_state["edit_role_id"] = None
                    st.toast("Role updated!", icon="✅")
                    st.rerun()
            if cancel:
                st.session_state["edit_role_id"] = None
                st.rerun()
