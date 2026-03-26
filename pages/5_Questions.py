import streamlit as st
from utils.database import (
    init_db, get_questions_for_user, create_question, update_question, delete_question,
    get_roles_for_user,
)
from utils.auth import require_auth, get_current_user, logout_user
from utils.ui import inject_common_css, render_authenticated_sidebar, render_page_logo, create_logo_favicon

st.set_page_config(
    page_title="Questions – Let's Evaluate",
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

CATEGORIES = ["Technical", "Behavioral", "Situational", "Process", "Other"]
DIFFICULTIES = ["Easy", "Medium", "Hard"]
DIFF_BADGE = {"Easy": "badge-easy", "Medium": "badge-med", "Hard": "badge-hard"}

if "edit_question_id" not in st.session_state:
    st.session_state["edit_question_id"] = None

roles = get_roles_for_user(uid)
role_options = {"(None)": None, **{r["name"]: r["id"] for r in roles}}
role_id_to_name = {r["id"]: r["name"] for r in roles}

render_page_logo()
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
        q_cat_other = st.text_input(
            "Custom category name (required when 'Other' is selected above)",
            placeholder="e.g. Leadership, Domain Knowledge…",
        )
        submitted = st.form_submit_button("✅ Add Question", type="primary")
        if submitted:
            if not q_text.strip():
                st.error("Question text is required.")
            elif q_cat == "Other" and not q_cat_other.strip():
                st.error("Please enter a custom category name when 'Other' is selected.")
            else:
                final_cat = q_cat_other.strip() if q_cat == "Other" else q_cat
                rid = role_options.get(q_role)
                create_question(uid, q_text.strip(), final_cat, q_diff, rid)
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
    _preset_cats = {"Technical", "Behavioral", "Situational", "Process"}
    if filter_cat == "Other":
        # Show questions whose category is not one of the preset values
        filtered = [q for q in filtered if q.get("category") not in _preset_cats]
    else:
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
                # If the saved category is not in the preset list it was a custom "Other" entry
                existing_cat = eq.get("category", "Technical")
                cat_in_list = existing_cat in CATEGORIES
                default_cat = existing_cat if cat_in_list else "Other"
                eq_cat = st.selectbox("Category", CATEGORIES,
                                       index=CATEGORIES.index(default_cat))
            with ec2:
                eq_diff = st.selectbox("Difficulty", DIFFICULTIES,
                                        index=DIFFICULTIES.index(eq.get("difficulty", "Medium")))
            with ec3:
                role_names = list(role_options.keys())
                cur_role_name = role_id_to_name.get(eq.get("role_id"), "(None)")
                eq_role = st.selectbox("Link to Role", role_names,
                                        index=role_names.index(cur_role_name) if cur_role_name in role_names else 0)
            eq_cat_other = st.text_input(
                "Custom category name (required when 'Other' is selected above)",
                value="" if cat_in_list else existing_cat,
                placeholder="e.g. Leadership, Domain Knowledge…",
            )

            s1, s2 = st.columns(2)
            with s1:
                save = st.form_submit_button("💾 Save", type="primary")
            with s2:
                cancel = st.form_submit_button("✖️ Cancel")

            if save:
                if not eq_text.strip():
                    st.error("Question text is required.")
                elif eq_cat == "Other" and not eq_cat_other.strip():
                    st.error("Please enter a custom category name when 'Other' is selected.")
                else:
                    final_cat = eq_cat_other.strip() if eq_cat == "Other" else eq_cat
                    rid = role_options.get(eq_role)
                    update_question(edit_id, eq_text.strip(), final_cat, eq_diff, rid)
                    st.session_state["edit_question_id"] = None
                    st.toast("Question updated!", icon="✅")
                    st.rerun()
            if cancel:
                st.session_state["edit_question_id"] = None
                st.rerun()
