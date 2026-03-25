import streamlit as st
from utils.database import (
    init_db, get_projects_for_user, get_roles_for_user,
    get_questions_for_user, get_evaluations_for_user,
)
from utils.auth import require_auth, get_current_user, logout_user

st.set_page_config(page_title="Dashboard – Let's Evaluate", page_icon="🎯", layout="wide")
init_db()
require_auth()

user = get_current_user()

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
.metric-card {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 22px 20px;
  text-align: center;
  transition: all .25s ease;
}
.metric-card:hover {
  border-color: #4F46E5;
  box-shadow: 0 6px 18px rgba(79,70,229,0.12);
  transform: translateY(-3px);
}
.metric-icon { font-size: 2rem; margin-bottom: 8px; }
.metric-value {
  font-size: 2.4rem;
  font-weight: 800;
  color: #4F46E5;
  line-height: 1;
}
.metric-label {
  font-size: 0.85rem;
  color: #64748B;
  margin-top: 4px;
  font-weight: 500;
}
.nav-card {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  border-radius: 16px;
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: all .3s ease;
  color: white;
  height: 100%;
}
.nav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(79,70,229,0.35);
}
.nav-card-icon { font-size: 2.4rem; margin-bottom: 10px; }
.nav-card-title { font-size: 1rem; font-weight: 700; }
.nav-card-desc { font-size: 0.82rem; opacity: 0.85; margin-top: 4px; }
.stButton > button {
  background: linear-gradient(135deg, #4F46E5, #7C3AED) !important;
  color: white !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
}
</style>
""", unsafe_allow_html=True)

# ── Welcome ────────────────────────────────────────────────────────────────
st.markdown(f"## 👋 Welcome back, **{user['name']}**!")
st.caption(f"Signed in as {user['email']}")
st.divider()

# ── Stats ──────────────────────────────────────────────────────────────────
uid = user["id"]
projects = get_projects_for_user(uid)
roles = get_roles_for_user(uid)
questions = get_questions_for_user(uid)
evaluations = get_evaluations_for_user(uid)

c1, c2, c3, c4 = st.columns(4)
stats = [
    (c1, "📁", len(projects), "Projects"),
    (c2, "👥", len(roles), "Roles"),
    (c3, "❓", len(questions), "Questions"),
    (c4, "📊", len(evaluations), "Evaluations"),
]
for col, icon, val, label in stats:
    with col:
        st.markdown(f"""
        <div class="metric-card">
          <div class="metric-icon">{icon}</div>
          <div class="metric-value">{val}</div>
          <div class="metric-label">{label}</div>
        </div>""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ── Quick navigation cards ──────────────────────────────────────────────────
st.markdown("### Quick Access")
nav_cols = st.columns(5)
nav_items = [
    ("📁", "Projects", "Manage your projects", "pages/3_Projects.py"),
    ("👥", "Roles", "Define hiring roles", "pages/4_Roles.py"),
    ("❓", "Questions", "Build question bank", "pages/5_Questions.py"),
    ("🤖", "Evaluate", "AI-powered evaluation", "pages/6_Evaluate_Candidate.py"),
    ("📂", "Archives", "Past evaluations", "pages/7_Archives.py"),
]
for col, (icon, title, desc, page) in zip(nav_cols, nav_items):
    with col:
        if st.button(f"{icon} {title}", use_container_width=True, key=f"nav_{title}"):
            st.switch_page(page)
        st.caption(desc)

# ── Recent evaluations ─────────────────────────────────────────────────────
if evaluations:
    st.divider()
    st.markdown("### 🕐 Recent Evaluations")
    recent = evaluations[:5]
    cols_h = st.columns([3, 2, 2, 2, 1])
    headers = ["Candidate", "Project", "Role", "Date", "Status"]
    for col, h in zip(cols_h, headers):
        col.markdown(f"**{h}**")
    for ev in recent:
        c1, c2, c3, c4, c5 = st.columns([3, 2, 2, 2, 1])
        c1.write(ev["candidate_name"])
        c2.write(ev.get("project_name") or "—")
        c3.write(ev.get("role_name") or "—")
        c4.write(ev["created_at"].strftime("%d %b %Y") if ev.get("created_at") else "—")
        status_colors = {"Selected": "🟢", "Rejected": "🔴", "Hold": "🟡", "Pending": "⚪"}
        c5.write(f"{status_colors.get(ev['status'], '⚪')} {ev['status']}")
