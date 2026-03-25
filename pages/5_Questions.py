import streamlit as st
from utils.database import (
    init_db, get_questions_for_user, create_question, update_question, delete_question,
    get_roles_for_user,
)
from utils.auth import require_auth, get_current_user, logout_user

st.set_page_config(page_title="Questions – Let's Evaluate", page_icon="❓", layout="wide")
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
.q-card {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 10px;
  transition: all .25s;
}
.q-card:hover { border-color: #4F46E5; }
.q-text { font-size: 0.95rem; color: #1E293B; font-weight: 500; margin-bottom: 8px; }
.badge {
  display: inline-block;
  border-radius: 20px;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 4px;
}
.badge-cat  { background: #EEF2FF; color: #4F46E5; }
.badge-easy { background: #DCFCE7; color: #16A34A; }
.badge-med  { background: #FEF9C3; color: #CA8A04; }
.badge-hard { background: #FEE2E2; color: #DC2626; }
.badge-role { background: #F1F5F9; color: #475569; }
.stButton > button { border-radius: 8px !important; font-weight: 500 !important; }
</style>
""", unsafe_allow_html=True)

CATEGORIES = ["Technical", "Behavioral", "Situational", "Process"]
DIFFICULTIES = ["Easy", "Medium", "Hard"]
DIFF_BADGE = {"Easy": "badge-easy", "Medium": "badge-med", "Hard": "badge-hard"}

if "edit_question_id" not in st.session_state:
    st.session_state["edit_question_id"] = None

roles = get_roles_for_user(uid)
role_options = {"(None)": None, **{r["name"]: r["id"] for r in roles}}
role_id_to_name = {r["id"]: r["name"] for r in roles}

st.markdown("## ❓ Questions")

# ── ADD QUESTION ────────────────────────────────────────────────────────────
with st.expander("➕ Add New Question", expanded=False):
    with st.form("form_add_question", clear_on_submit=True):
        q_text = st.text_area("Question Text *", height=90)
        c1, c2, c3 = st.columns(3)
        with c1:
            q_cat = st.selectbox("Category", CATEGORIES)
        with c2:
            q_diff = st.selectbox("Difficulty", DIFFICULTIES)
        with c3:
            q_role = st.selectbox("Link to Role (optional)", list(role_options.keys()))
        submitted = st.form_submit_button("✅ Add Question", type="primary")
        if submitted:
            if not q_text.strip():
                st.error("Question text is required.")
            else:
                rid = role_options.get(q_role)
                create_question(uid, q_text.strip(), q_cat, q_diff, rid)
                st.success("Question added!")
                st.rerun()

st.divider()

# ── FILTERS ─────────────────────────────────────────────────────────────────
questions = get_questions_for_user(uid)

st.markdown("### 🔍 Filter Questions")
fc1, fc2, fc3 = st.columns(3)
with fc1:
    filter_role = st.selectbox("By Role", ["All"] + [r["name"] for r in roles], key="filter_role")
with fc2:
    filter_cat = st.selectbox("By Category", ["All"] + CATEGORIES, key="filter_cat")
with fc3:
    filter_diff = st.selectbox("By Difficulty", ["All"] + DIFFICULTIES, key="filter_diff")

filtered = questions
if filter_role != "All":
    target_rid = role_id_to_name and next((r["id"] for r in roles if r["name"] == filter_role), None)
    filtered = [q for q in filtered if q.get("role_id") == target_rid]
if filter_cat != "All":
    filtered = [q for q in filtered if q.get("category") == filter_cat]
if filter_diff != "All":
    filtered = [q for q in filtered if q.get("difficulty") == filter_diff]

st.markdown(f"**{len(filtered)} question(s) found**")

# ── QUESTION LIST ────────────────────────────────────────────────────────────
for q in filtered:
    diff_cls = DIFF_BADGE.get(q.get("difficulty", "Medium"), "badge-med")
    role_badge = (
        f'<span class="badge badge-role">👥 {q["role_name"]}</span>'
        if q.get("role_name") else ""
    )
    st.markdown(
        f'<div class="q-card">'
        f'<div class="q-text">{q["question_text"]}</div>'
        f'<span class="badge badge-cat">{q["category"]}</span>'
        f'<span class="badge {diff_cls}">{q["difficulty"]}</span>'
        f'{role_badge}'
        f'</div>',
        unsafe_allow_html=True,
    )

    btn1, btn2, _ = st.columns([1, 1, 6])
    with btn1:
        if st.button("✏️ Edit", key=f"edit_q_{q['id']}"):
            st.session_state["edit_question_id"] = q["id"]
            st.rerun()
    with btn2:
        if st.button("🗑️ Delete", key=f"del_q_{q['id']}"):
            st.session_state[f"confirm_del_q_{q['id']}"] = True
            st.rerun()

    if st.session_state.get(f"confirm_del_q_{q['id']}", False):
        dc1, dc2, _ = st.columns([1, 1, 6])
        with dc1:
            if st.button("✅ Confirm", key=f"do_del_q_{q['id']}"):
                delete_question(q["id"])
                st.session_state.pop(f"confirm_del_q_{q['id']}", None)
                st.toast("Question deleted.", icon="🗑️")
                st.rerun()
        with dc2:
            if st.button("✖️ Cancel", key=f"cancel_del_q_{q['id']}"):
                st.session_state.pop(f"confirm_del_q_{q['id']}", None)
                st.rerun()

# ── EDIT FORM ────────────────────────────────────────────────────────────────
edit_id = st.session_state.get("edit_question_id")
if edit_id:
    q_map = {q["id"]: q for q in questions}
    eq = q_map.get(edit_id)
    if eq:
        st.divider()
        st.markdown("### ✏️ Edit Question")
        with st.form("form_edit_question"):
            eq_text = st.text_area("Question Text *", value=eq["question_text"], height=90)
            ec1, ec2, ec3 = st.columns(3)
            with ec1:
                eq_cat = st.selectbox("Category", CATEGORIES,
                                       index=CATEGORIES.index(eq.get("category", "Technical")))
            with ec2:
                eq_diff = st.selectbox("Difficulty", DIFFICULTIES,
                                        index=DIFFICULTIES.index(eq.get("difficulty", "Medium")))
            with ec3:
                role_names = list(role_options.keys())
                cur_role_name = role_id_to_name.get(eq.get("role_id"), "(None)")
                eq_role = st.selectbox("Link to Role", role_names,
                                        index=role_names.index(cur_role_name) if cur_role_name in role_names else 0)

            s1, s2 = st.columns(2)
            with s1:
                save = st.form_submit_button("💾 Save", type="primary")
            with s2:
                cancel = st.form_submit_button("✖️ Cancel")

            if save:
                if not eq_text.strip():
                    st.error("Question text is required.")
                else:
                    rid = role_options.get(eq_role)
                    update_question(edit_id, eq_text.strip(), eq_cat, eq_diff, rid)
                    st.session_state["edit_question_id"] = None
                    st.toast("Question updated!", icon="✅")
                    st.rerun()
            if cancel:
                st.session_state["edit_question_id"] = None
                st.rerun()
