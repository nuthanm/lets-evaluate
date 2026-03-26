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
/* Icon-only action buttons (edit/delete) */
button[data-testid^="baseButton-"][title="Edit question"],
button[data-testid^="baseButton-"][title="Delete question"],
div[data-testid="column"] button[kind="secondary"][data-icon-only="true"] {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 2px 6px !important;
  font-size: 1.05rem !important;
  min-height: unset !important;
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
.badge {
  display: inline-block;
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  margin-right: 2px;
}
.badge-cat  { background: #EEF2FF; color: #4F46E5; }
.badge-easy { background: #DCFCE7; color: #16A34A; }
.badge-med  { background: #FEF9C3; color: #CA8A04; }
.badge-hard { background: #FEE2E2; color: #DC2626; }
.badge-role { background: #F1F5F9; color: #475569; }
.form-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1E293B;
  padding-bottom: 10px;
  margin-bottom: 4px;
  border-bottom: 2px solid #EEF2FF;
}
/* Remove box from icon-only buttons in question rows */
[data-testid="stHorizontalBlock"] .stButton > button {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #64748B !important;
  padding: 4px 6px !important;
  font-size: 1.1rem !important;
  min-height: unset !important;
  transition: color .15s !important;
}
[data-testid="stHorizontalBlock"] .stButton > button:hover {
  color: #4F46E5 !important;
  background: #EEF2FF !important;
  border-radius: 6px !important;
}
</style>
""", unsafe_allow_html=True)

MAX_QUESTION_PREVIEW_LENGTH = 80
MAX_QUESTION_DIALOG_PREVIEW_LENGTH = 120

CATEGORIES = ["Technical", "Behavioral", "Situational", "Process", "Other"]
DIFFICULTIES = ["Easy", "Medium", "Hard"]
DIFF_BADGE = {"Easy": "badge-easy", "Medium": "badge-med", "Hard": "badge-hard"}

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
if "edit_question_id" not in st.session_state:
    st.session_state["edit_question_id"] = None

# ── Delete confirmation dialog ───────────────────────────────────────────────
@st.dialog("🗑️ Confirm Delete")
def _delete_question_dialog():
    q = st.session_state["_pending_delete_question"]
    st.markdown(f"Are you sure you want to delete this question?")
    st.markdown(
        f'<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;'
        f'padding:10px 12px;font-size:0.88rem;color:#475569;margin:8px 0;">'
        f'{q["question_text"][:MAX_QUESTION_DIALOG_PREVIEW_LENGTH]}{"…" if len(q["question_text"]) > MAX_QUESTION_DIALOG_PREVIEW_LENGTH else ""}'
        f'</div>',
        unsafe_allow_html=True,
    )
    c1, c2 = st.columns(2)
    with c1:
        if st.button("🗑️ Delete", type="primary", use_container_width=True):
            delete_question(q["id"])
            del st.session_state["_pending_delete_question"]
            st.toast("Question deleted.", icon="🗑️")
            st.rerun()
    with c2:
        if st.button("✖️ Cancel", use_container_width=True):
            del st.session_state["_pending_delete_question"]
            st.rerun()

# ── Load data ────────────────────────────────────────────────────────────────
roles = get_roles_for_user(uid)
role_options = {"(None)": None, **{r["name"]: r["id"] for r in roles}}
role_id_to_name = {r["id"]: r["name"] for r in roles}
questions = get_questions_for_user(uid)
question_map = {q["id"]: q for q in questions}

# ── Open delete dialog if one is pending ────────────────────────────────────
if "_pending_delete_question" in st.session_state:
    _delete_question_dialog()

# ── Page header ──────────────────────────────────────────────────────────────
render_page_logo()
st.markdown("## ❓ Questions")

# ── Two-column layout: table (left) + form (right) ──────────────────────────
left_col, right_col = st.columns([6, 4], gap="large")

# ════════════════════════════════════════════════════════
#  RIGHT COLUMN – Add / Edit form (always open)
# ════════════════════════════════════════════════════════
with right_col:
    edit_id = st.session_state.get("edit_question_id")
    eq = question_map.get(edit_id) if edit_id else None
    role_names = list(role_options.keys())

    with st.container(border=True):
        if eq:
            # ── EDIT MODE ───────────────────────────────────────────────
            st.markdown(
                '<div class="form-section-title">✏️ Edit Question</div>',
                unsafe_allow_html=True,
            )
            with st.form("form_question_edit", clear_on_submit=False):
                eq_text = st.text_area("Question Text *", value=eq["question_text"], height=90)
                ec1, ec2 = st.columns(2)
                with ec1:
                    existing_cat = eq.get("category", "Technical")
                    cat_in_list = existing_cat in CATEGORIES
                    default_cat = existing_cat if cat_in_list else "Other"
                    eq_cat = st.selectbox("Category", CATEGORIES,
                                          index=CATEGORIES.index(default_cat))
                with ec2:
                    eq_diff = st.selectbox("Difficulty", DIFFICULTIES,
                                            index=DIFFICULTIES.index(eq.get("difficulty", "Medium")))
                cur_role_name = role_id_to_name.get(eq.get("role_id"), "(None)")
                eq_role = st.selectbox(
                    "Link to Role",
                    role_names,
                    index=role_names.index(cur_role_name) if cur_role_name in role_names else 0,
                )
                eq_cat_other = st.text_input(
                    "Custom category (when 'Other' selected)",
                    value="" if cat_in_list else existing_cat,
                    placeholder="e.g. Leadership, Domain Knowledge…",
                )
                s1, s2 = st.columns(2)
                with s1:
                    save = st.form_submit_button("💾 Save", type="primary", use_container_width=True)
                with s2:
                    cancel = st.form_submit_button("✖️ Cancel", use_container_width=True)

                if save:
                    if not eq_text.strip():
                        st.error("Question text is required.")
                    elif eq_cat == "Other" and not eq_cat_other.strip():
                        st.error("Please enter a custom category name.")
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
        else:
            # ── ADD MODE ────────────────────────────────────────────────
            st.markdown(
                '<div class="form-section-title">➕ Add New Question</div>',
                unsafe_allow_html=True,
            )
            with st.form("form_add_question", clear_on_submit=True):
                q_text = st.text_area("Question Text *", height=90)
                c1, c2 = st.columns(2)
                with c1:
                    q_cat = st.selectbox("Category", CATEGORIES)
                with c2:
                    q_diff = st.selectbox("Difficulty", DIFFICULTIES)
                q_role = st.selectbox("Link to Role (optional)", list(role_options.keys()))
                q_cat_other = st.text_input(
                    "Custom category (when 'Other' selected)",
                    placeholder="e.g. Leadership, Domain Knowledge…",
                )
                submitted = st.form_submit_button(
                    "✅ Add Question", type="primary", use_container_width=True
                )
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

# ════════════════════════════════════════════════════════
#  LEFT COLUMN – Filters + Modern Table Layout
# ════════════════════════════════════════════════════════
with left_col:
    # ── Filters ─────────────────────────────────────────────────────────────
    st.markdown("### 🔍 Filter")
    fc1, fc2, fc3 = st.columns(3)
    with fc1:
        filter_role = st.selectbox("By Role", ["All"] + [r["name"] for r in roles], key="filter_role")
    with fc2:
        filter_cat = st.selectbox("By Category", ["All"] + CATEGORIES, key="filter_cat")
    with fc3:
        filter_diff = st.selectbox("By Difficulty", ["All"] + DIFFICULTIES, key="filter_diff")

    # Apply filters
    filtered = questions
    if filter_role != "All":
        target_rid = next((r["id"] for r in roles if r["name"] == filter_role), None)
        filtered = [q for q in filtered if q.get("role_id") == target_rid]
    if filter_cat != "All":
        _preset_cats = {"Technical", "Behavioral", "Situational", "Process"}
        if filter_cat == "Other":
            filtered = [q for q in filtered if q.get("category") not in _preset_cats]
        else:
            filtered = [q for q in filtered if q.get("category") == filter_cat]
    if filter_diff != "All":
        filtered = [q for q in filtered if q.get("difficulty") == filter_diff]

    if not filtered:
        st.info("No questions match the current filters. Add your first question using the form →")
    else:
        st.markdown(f"**{len(filtered)} question(s) found**")

        # Table header row
        h1, h2, h3, h4, h_act = st.columns([4, 1.8, 1.8, 1.8, 1.5])
        with h1:
            st.markdown('<div class="tbl-col-hdr">Question</div>', unsafe_allow_html=True)
        with h2:
            st.markdown('<div class="tbl-col-hdr">Category</div>', unsafe_allow_html=True)
        with h3:
            st.markdown('<div class="tbl-col-hdr">Difficulty</div>', unsafe_allow_html=True)
        with h4:
            st.markdown('<div class="tbl-col-hdr">Role</div>', unsafe_allow_html=True)
        with h_act:
            st.markdown('<div class="tbl-col-hdr">Actions</div>', unsafe_allow_html=True)

        # Table data rows
        for idx, q in enumerate(filtered):
            gradient = ROW_GRADIENTS[idx % len(ROW_GRADIENTS)]
            diff_cls = DIFF_BADGE.get(q.get("difficulty", "Medium"), "badge-med")

            c1, c2, c3, c4, c_edit, c_del = st.columns([4, 1.8, 1.8, 1.8, 0.75, 0.75])

            with c1:
                q_preview = q["question_text"]
                if len(q_preview) > MAX_QUESTION_PREVIEW_LENGTH:
                    q_preview = q_preview[:MAX_QUESTION_PREVIEW_LENGTH] + "…"
                st.markdown(
                    f'<div style="background:{gradient};color:white;padding:8px 10px;'
                    f'border-radius:8px;font-weight:600;font-size:0.84rem;line-height:1.3;'
                    f'margin:4px 0 2px;">{q_preview}</div>',
                    unsafe_allow_html=True,
                )
            with c2:
                st.markdown(
                    f'<div style="padding:8px 4px 2px;">'
                    f'<span class="badge badge-cat">{q["category"]}</span></div>',
                    unsafe_allow_html=True,
                )
            with c3:
                st.markdown(
                    f'<div style="padding:8px 4px 2px;">'
                    f'<span class="badge {diff_cls}">{q["difficulty"]}</span></div>',
                    unsafe_allow_html=True,
                )
            with c4:
                role_html = (
                    f'<span class="badge badge-role">{q["role_name"]}</span>'
                    if q.get("role_name") else
                    '<span style="color:#94A3B8;font-size:0.82rem;">—</span>'
                )
                st.markdown(
                    f'<div style="padding:8px 4px 2px;">{role_html}</div>',
                    unsafe_allow_html=True,
                )
            with c_edit:
                if st.button("✏️", key=f"edit_q_{q['id']}", help="Edit question",
                             use_container_width=True):
                    st.session_state["edit_question_id"] = q["id"]
                    st.rerun()
            with c_del:
                if st.button("🗑️", key=f"del_q_{q['id']}", help="Delete question",
                             use_container_width=True):
                    st.session_state["_pending_delete_question"] = q
                    st.rerun()

            st.markdown(
                '<hr style="margin:4px 0 0;border:none;border-top:1px solid #F1F5F9;">',
                unsafe_allow_html=True,
            )
