import streamlit as st
from utils.database import init_db

st.set_page_config(
    page_title="Let's Evaluate",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Initialise database on every cold start
init_db()

# ── Sidebar nav (authenticated users only) ─────────────────────────────────
if st.session_state.get("authenticated", False):
    with st.sidebar:
        st.markdown("### 🎯 Let's Evaluate")
        st.page_link("pages/2_Dashboard.py", label="🏠 Dashboard")
        st.page_link("pages/3_Projects.py", label="📁 Projects")
        st.page_link("pages/4_Roles.py", label="👥 Roles")
        st.page_link("pages/5_Questions.py", label="❓ Questions")
        st.page_link("pages/6_Evaluate_Candidate.py", label="📊 Evaluate Candidate")
        st.page_link("pages/7_Archives.py", label="📂 Archives")
        st.divider()
        if st.button("🚪 Logout", use_container_width=True):
            from utils.auth import logout_user
            logout_user()
            st.rerun()

# ── Global CSS ─────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

/* Hide default streamlit nav */
[data-testid="stSidebarNav"] { display: none; }

/* ── Animated gradient hero ── */
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.hero-bg {
  background: linear-gradient(135deg, #4F46E5, #7C3AED, #2563EB, #4F46E5);
  background-size: 300% 300%;
  animation: gradientShift 8s ease infinite;
  border-radius: 20px;
  padding: 60px 40px;
  text-align: center;
  margin-bottom: 32px;
}

.hero-title {
  font-size: 3.2rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  margin-bottom: 16px;
  text-shadow: 0 2px 20px rgba(0,0,0,0.25);
}

.hero-sub {
  font-size: 1.2rem;
  color: rgba(255,255,255,0.88);
  max-width: 620px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ── Header ── */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 24px 0;
}
.brand {
  font-size: 1.6rem;
  font-weight: 800;
  color: #4F46E5;
}
.header-links a {
  color: #64748B;
  text-decoration: none;
  margin-left: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color .2s;
}
.header-links a:hover { color: #4F46E5; }

/* ── Workflow animation ── */
@keyframes fadeSlideIn {
  0%   { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79,70,229,0.4); }
  50%       { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(79,70,229,0); }
}
@keyframes arrowSlide {
  0%   { opacity: 0.3; transform: translateX(-6px); }
  100% { opacity: 1; transform: translateX(6px); }
}

.workflow-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 32px 0;
  flex-wrap: wrap;
}

.workflow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeSlideIn 0.6s ease forwards;
  opacity: 0;
}
.workflow-step:nth-child(1)  { animation-delay: 0.1s; }
.workflow-step:nth-child(3)  { animation-delay: 0.25s; }
.workflow-step:nth-child(5)  { animation-delay: 0.4s; }
.workflow-step:nth-child(7)  { animation-delay: 0.55s; }
.workflow-step:nth-child(9)  { animation-delay: 0.7s; }

.step-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  animation: pulse 2.5s infinite;
  box-shadow: 0 8px 24px rgba(79,70,229,0.3);
  color: white;
}
.step-label {
  margin-top: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #1E293B;
  text-align: center;
  max-width: 90px;
}

.workflow-arrow {
  font-size: 1.8rem;
  color: #4F46E5;
  padding: 0 8px;
  animation: arrowSlide 1.2s ease-in-out infinite alternate;
  margin-bottom: 30px;
}

/* ── Feature cards ── */
.feature-card {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 16px;
  padding: 28px 24px;
  text-align: center;
  transition: all .3s ease;
  height: 100%;
}
.feature-card:hover {
  border-color: #4F46E5;
  box-shadow: 0 8px 24px rgba(79,70,229,0.12);
  transform: translateY(-4px);
}
.feature-icon { font-size: 2.4rem; margin-bottom: 14px; }
.feature-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 8px;
}
.feature-desc { font-size: 0.9rem; color: #64748B; line-height: 1.5; }

/* ── Section heading ── */
.section-heading {
  text-align: center;
  font-size: 1.6rem;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 8px;
}
.section-sub {
  text-align: center;
  color: #64748B;
  font-size: 1rem;
  margin-bottom: 32px;
}

/* ── CTA button ── */
.stButton > button {
  background: linear-gradient(135deg, #4F46E5, #7C3AED) !important;
  color: white !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  font-size: 1rem !important;
  padding: 12px 32px !important;
  transition: all .3s ease !important;
}
.stButton > button:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 20px rgba(79,70,229,0.35) !important;
}
</style>
""", unsafe_allow_html=True)

# ── App Header ──────────────────────────────────────────────────────────────
st.markdown("""
<div class="app-header">
  <div class="brand">🎯 Let's Evaluate</div>
  <div class="header-links">
    <a href="#privacy">Privacy Policy</a>
    <a href="#terms">Terms &amp; Conditions</a>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Hero section ────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero-bg">
  <div class="hero-title">Simplify Your Interview Process</div>
  <div class="hero-sub">
    Leverage AI-powered resume analysis, smart question generation, and
    structured evaluation workflows — all in one elegant platform.
  </div>
</div>
""", unsafe_allow_html=True)

# ── Animated Workflow ───────────────────────────────────────────────────────
st.markdown('<div class="section-heading">How It Works</div>', unsafe_allow_html=True)
st.markdown('<div class="section-sub">Five intelligent steps from resume to result</div>', unsafe_allow_html=True)

st.markdown("""
<div class="workflow-container">
  <div class="workflow-step">
    <div class="step-icon">📄</div>
    <div class="step-label">Profile Upload</div>
  </div>
  <div class="workflow-arrow">➜</div>
  <div class="workflow-step">
    <div class="step-icon">🤖</div>
    <div class="step-label">AI Analysis</div>
  </div>
  <div class="workflow-arrow">➜</div>
  <div class="workflow-step">
    <div class="step-icon">❓</div>
    <div class="step-label">Question Generation</div>
  </div>
  <div class="workflow-arrow">➜</div>
  <div class="workflow-step">
    <div class="step-icon">📋</div>
    <div class="step-label">Evaluation</div>
  </div>
  <div class="workflow-arrow">➜</div>
  <div class="workflow-step">
    <div class="step-icon">📊</div>
    <div class="step-label">Results</div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Features ────────────────────────────────────────────────────────────────
st.markdown('<div class="section-heading" style="margin-top:16px;">Why Let\'s Evaluate?</div>', unsafe_allow_html=True)
st.markdown('<div class="section-sub">Everything you need to run consistent, data-driven interviews</div>', unsafe_allow_html=True)

col1, col2, col3 = st.columns(3)
with col1:
    st.markdown("""
    <div class="feature-card">
      <div class="feature-icon">🧠</div>
      <div class="feature-title">AI-Powered Insights</div>
      <div class="feature-desc">GPT-4o-mini analyses resumes in seconds, highlighting tech matches,
      experience gaps, and tailored interview questions.</div>
    </div>""", unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="feature-card">
      <div class="feature-icon">🗂️</div>
      <div class="feature-title">Structured Workflows</div>
      <div class="feature-desc">Organise evaluations by projects and roles. Keep every question,
      score, and comment in one searchable archive.</div>
    </div>""", unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="feature-card">
      <div class="feature-icon">📑</div>
      <div class="feature-title">PDF Reports</div>
      <div class="feature-desc">Generate professional evaluation PDFs with one click — ready
      to share with your hiring team instantly.</div>
    </div>""", unsafe_allow_html=True)

# ── CTA ─────────────────────────────────────────────────────────────────────
st.markdown("<br>", unsafe_allow_html=True)
_, cta_col, _ = st.columns([2, 1, 2])
with cta_col:
    if st.session_state.get("authenticated", False):
        if st.button("🏠 Go to Dashboard", use_container_width=True):
            st.switch_page("pages/2_Dashboard.py")
    else:
        if st.button("🚀 Start Evaluate", use_container_width=True):
            st.switch_page("pages/1_Auth.py")
