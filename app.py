import streamlit as st
from utils.database import init_db

st.set_page_config(
    page_title="Let's Evaluate",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Initialise database on every cold start
init_db()

# ── Sidebar nav (authenticated users only) ─────────────────────────────────
if st.session_state.get("authenticated", False):
    with st.sidebar:
        st.markdown("### ⚖️ Let's Evaluate")
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

/* Hide Streamlit chrome that wastes vertical space */
header[data-testid="stHeader"]   { display: none !important; }
#MainMenu                         { display: none !important; }
footer                            { display: none !important; }
.block-container                  { padding-top: 0.6rem !important; padding-bottom: 0 !important; }

/* Hide default streamlit nav, heading anchor buttons, top decoration and sidebar toggle */
[data-testid="stSidebarNav"]          { display: none !important; }
[data-testid="StyledLinkIconContainer"]{ display: none !important; }
[data-testid="stDecoration"]           { display: none !important; }
.stHeadingActionButton                 { display: none !important; }
[data-testid="stSidebarCollapsedControl"],
[data-testid="collapsedControl"],
section[data-testid="stSidebar"] > div:first-child button,
button[kind="header"]                  { display: none !important; }

/* Style page_link nav items in header columns */
[data-testid="stPageLink-NavLink"] {
  color: #64748B !important;
  font-size: 0.9rem !important;
  font-weight: 500 !important;
  background: none !important;
  border: none !important;
  padding: 0 !important;
  text-decoration: none !important;
  transition: color .2s !important;
}
[data-testid="stPageLink-NavLink"]:hover { color: #4F46E5 !important; }

/* Make the brand/logo page_link stand out */
div[data-testid="column"]:first-child [data-testid="stPageLink-NavLink"] {
  font-size: 1.6rem !important;
  font-weight: 800 !important;
  color: #4F46E5 !important;
  line-height: 2 !important;
}

/* ── Architecture diagram ── */
@keyframes archNodeIn {
  0%   { opacity: 0; transform: translateY(18px) scale(0.92); }
  100% { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes archGlow {
  0%, 100% { box-shadow: 0 4px 20px rgba(79,70,229,0.2); }
  50%       { box-shadow: 0 4px 30px rgba(79,70,229,0.5); }
}
@keyframes fadeBarIn {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}

.arch-diagram { max-width: 900px; margin: 12px auto 24px; padding: 0 8px; }

.arch-row-center { display:flex; justify-content:center; margin:6px 0; }

.arch-node {
  background: white;
  border: 2px solid #4F46E5;
  border-radius: 14px;
  padding: 14px 22px;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  animation: archNodeIn 0.5s ease forwards; opacity: 0;
  box-shadow: 0 4px 14px rgba(0,0,0,0.07);
  transition: transform .2s, box-shadow .2s;
}
.arch-node:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(79,70,229,0.18); }
.arch-hero {
  background: linear-gradient(135deg,#EEF2FF,#F5F3FF);
  animation-delay:.05s;
  animation: archNodeIn .5s ease .05s forwards, archGlow 3s ease .6s infinite;
  max-width: 340px;
}
.arch-ico   { font-size:2rem; line-height:1; }
.arch-lbl   { font-size:1rem; font-weight:700; color:#1E293B; }
.arch-sub   { font-size:0.74rem; color:#64748B; }
.arch-ico-sm{ font-size:1.4rem; }
.arch-lbl-sm{ font-size:0.82rem; font-weight:600; color:#1E293B; margin-top:3px; }

.arch-arrow-v {
  text-align:center; font-size:1.4rem; color:#4F46E5; margin:2px 0; line-height:1;
  animation: archNodeIn .4s ease forwards; opacity:0;
}

.arch-fork-bar, .arch-merge-bar {
  height:2px;
  background: linear-gradient(90deg, transparent 15%, #CBD5E1 15%, #CBD5E1 85%, transparent 85%);
  margin:10px 0;
  animation: fadeBarIn .4s ease forwards; opacity:0;
}

.arch-tracks {
  display: flex; gap:14px; align-items:flex-start; justify-content:center;
}
.arch-track {
  flex:1; display:flex; flex-direction:column; align-items:center; gap:0;
}
.arch-track-title {
  font-size:0.78rem; font-weight:700; padding:5px 14px;
  border-radius:20px; margin-bottom:8px; letter-spacing:.03em;
  animation: archNodeIn .4s ease forwards; opacity:0;
}
.arch-track-node {
  background:white; border:1.5px solid #CBD5E1; border-radius:12px;
  padding:9px 12px; display:flex; flex-direction:column; align-items:center; gap:2px;
  width:100%;
  animation: archNodeIn .5s ease forwards; opacity:0;
  box-shadow:0 2px 8px rgba(0,0,0,0.05);
  transition:transform .2s, border-color .2s;
}
.arch-track-node:hover { transform:translateY(-2px); border-color:#4F46E5; }
.arch-track-arrow {
  font-size:1.1rem; color:#CBD5E1; text-align:center; padding:1px 0;
  animation: archNodeIn .3s ease forwards; opacity:0;
}

/* ── Footer ── */
.page-footer {
  border-top: 1px solid #E2E8F0;
  margin-top: 48px;
  padding-top: 20px;
  text-align: center;
  color: #94A3B8;
  font-size: 0.82rem;
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
hcol1, hcol2, hcol3 = st.columns([4, 1, 1])
with hcol1:
    st.page_link("app.py", label="⚖️ Let's Evaluate")
with hcol2:
    st.page_link("pages/8_Privacy_Policy.py", label="Privacy Policy")
with hcol3:
    st.page_link("pages/9_Terms_Conditions.py", label="Terms & Conditions")

# ── Animated App Architecture Flow ─────────────────────────────────────────
st.markdown("""
<div class="arch-diagram">

  <!-- Tier 1: Platform -->
  <div class="arch-row-center">
    <div class="arch-node arch-hero">
      <span class="arch-ico">⚖️</span>
      <span class="arch-lbl">Let's Evaluate</span>
      <span class="arch-sub">AI-Assisted Hiring Platform</span>
    </div>
  </div>

  <div class="arch-row-center">
    <div class="arch-arrow-v" style="animation-delay:.2s">↓</div>
  </div>

  <!-- Tier 2: Authentication -->
  <div class="arch-row-center">
    <div class="arch-node" style="border-color:#7C3AED;max-width:300px;animation-delay:.3s">
      <span class="arch-ico">🔐</span>
      <span class="arch-lbl">Authentication</span>
      <span class="arch-sub">Login · Register · Password Reset</span>
    </div>
  </div>

  <div class="arch-row-center">
    <div class="arch-arrow-v" style="animation-delay:.5s">↓</div>
  </div>

  <!-- Tier 3: Dashboard -->
  <div class="arch-row-center">
    <div class="arch-node" style="border-color:#2563EB;max-width:300px;animation-delay:.6s">
      <span class="arch-ico">📊</span>
      <span class="arch-lbl">Dashboard</span>
      <span class="arch-sub">Central hub · Metrics · Quick access</span>
    </div>
  </div>

  <!-- Fork bar -->
  <div class="arch-fork-bar" style="animation-delay:.85s"></div>

  <!-- Tier 4: Three parallel tracks -->
  <div class="arch-tracks">

    <!-- Track A: Setup -->
    <div class="arch-track">
      <div class="arch-track-title" style="background:#EFF6FF;color:#2563EB;animation-delay:.9s">
        📋 Setup
      </div>
      <div class="arch-track-node" style="border-color:#0891B2;animation-delay:.95s">
        <span class="arch-ico-sm">📁</span><span class="arch-lbl-sm">Projects</span>
      </div>
      <div class="arch-track-arrow" style="animation-delay:1.05s">↓</div>
      <div class="arch-track-node" style="border-color:#059669;animation-delay:1.1s">
        <span class="arch-ico-sm">👥</span><span class="arch-lbl-sm">Roles</span>
      </div>
      <div class="arch-track-arrow" style="animation-delay:1.2s">↓</div>
      <div class="arch-track-node" style="border-color:#D97706;animation-delay:1.25s">
        <span class="arch-ico-sm">❓</span><span class="arch-lbl-sm">Questions</span>
      </div>
    </div>

    <!-- Track B: Evaluation flow -->
    <div class="arch-track">
      <div class="arch-track-title" style="background:#F5F3FF;color:#7C3AED;animation-delay:.9s">
        🤖 Evaluate
      </div>
      <div class="arch-track-node" style="border-color:#DC2626;animation-delay:1.0s">
        <span class="arch-ico-sm">📄</span><span class="arch-lbl-sm">Resume Upload</span>
      </div>
      <div class="arch-track-arrow" style="animation-delay:1.1s">↓</div>
      <div class="arch-track-node" style="border-color:#7C3AED;animation-delay:1.15s">
        <span class="arch-ico-sm">🤖</span><span class="arch-lbl-sm">AI Analysis</span>
      </div>
      <div class="arch-track-arrow" style="animation-delay:1.25s">↓</div>
      <div class="arch-track-node" style="border-color:#4F46E5;animation-delay:1.3s">
        <span class="arch-ico-sm">🧑‍💼</span><span class="arch-lbl-sm">Evaluation</span>
      </div>
    </div>

    <!-- Track C: Output -->
    <div class="arch-track">
      <div class="arch-track-title" style="background:#F0FDF4;color:#059669;animation-delay:.9s">
        📤 Output
      </div>
      <div class="arch-track-node" style="border-color:#059669;animation-delay:1.05s">
        <span class="arch-ico-sm">📋</span><span class="arch-lbl-sm">PDF Reports</span>
      </div>
      <div class="arch-track-arrow" style="animation-delay:1.15s">↓</div>
      <div class="arch-track-node" style="border-color:#64748B;animation-delay:1.2s">
        <span class="arch-ico-sm">📂</span><span class="arch-lbl-sm">Archives</span>
      </div>
    </div>

  </div>

  <!-- Merge bar -->
  <div class="arch-merge-bar" style="animation-delay:1.5s"></div>

  <!-- Tier 5: Principle footer -->
  <div class="arch-row-center">
    <div class="arch-node" style="border-color:#4F46E5;max-width:420px;
         background:linear-gradient(135deg,#EEF2FF,#F5F3FF);animation-delay:1.6s">
      <span class="arch-ico">🧠</span>
      <span class="arch-lbl">AI Assists · Humans Decide</span>
      <span class="arch-sub">OpenAI GPT-4o-mini · Privacy-first · Transparent · Accountable</span>
    </div>
  </div>

</div>
""", unsafe_allow_html=True)

# ── CTA ─────────────────────────────────────────────────────────────────────
st.markdown("<br>", unsafe_allow_html=True)
_, cta_col, _ = st.columns([2, 1, 2])
with cta_col:
    if st.session_state.get("authenticated", False):
        if st.button("Go to Dashboard", use_container_width=True):
            st.switch_page("pages/2_Dashboard.py")
    else:
        if st.button("Start Evaluate", use_container_width=True):
            st.switch_page("pages/1_Auth.py")

# ── Footer ───────────────────────────────────────────────────────────────────
st.markdown("<br><br>", unsafe_allow_html=True)
st.markdown(
    '<p style="text-align:center;color:#94A3B8;font-size:0.8rem;border-top:1px solid #E2E8F0;padding-top:20px;margin-top:48px;">'
    '© 2025 Let\'s Evaluate · AI assists; humans decide.</p>',
    unsafe_allow_html=True,
)
