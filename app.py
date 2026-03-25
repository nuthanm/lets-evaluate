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

/* ── Architecture diagram (horizontal flow) ── */
@keyframes archNodeIn {
  0%   { opacity: 0; transform: translateX(-14px) scale(0.94); }
  100% { opacity: 1; transform: translateX(0)     scale(1);    }
}
@keyframes archGlow {
  0%, 100% { box-shadow: 0 4px 20px rgba(79,70,229,0.2); }
  50%       { box-shadow: 0 4px 32px rgba(79,70,229,0.5); }
}

/* Full-width wrapper */
.arch-wrap {
  width: 100%; padding: 18px 4px 8px; box-sizing: border-box;
}

/* Horizontal pipeline row */
.arch-flow {
  display: flex; flex-direction: row;
  align-items: center; justify-content: center;
  gap: 2px; flex-wrap: nowrap; overflow-x: auto; padding: 4px 0 12px;
}

/* Each step card */
.arch-card {
  background: white; border: 2px solid #4F46E5; border-radius: 14px;
  padding: 12px 14px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  animation: archNodeIn 0.5s ease forwards; opacity: 0;
  box-shadow: 0 4px 14px rgba(0,0,0,0.07);
  transition: transform .2s, box-shadow .2s;
  min-width: 108px; flex-shrink: 0; text-align: center;
}
.arch-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(79,70,229,0.2); }

/* Hero card (platform) */
.arch-hero-card {
  background: linear-gradient(135deg,#EEF2FF,#F5F3FF);
  animation: archNodeIn .5s ease .05s forwards, archGlow 3s ease .6s infinite;
  min-width: 130px;
}

.arch-card-icon  { font-size: 1.6rem; line-height: 1; }
.arch-card-title { font-size: 0.88rem; font-weight: 700; color: #1E293B; }
.arch-card-sub   { font-size: 0.68rem; color: #64748B; text-align: center; }

/* Badge label (for group cards) */
.arch-card-badge {
  font-size: 0.72rem; font-weight: 700; padding: 3px 10px;
  border-radius: 20px; margin-bottom: 2px; letter-spacing: .03em;
}

/* Item list inside a card */
.arch-card-items { display: flex; flex-direction: column; align-items: stretch; gap: 3px; width: 100%; }
.arch-card-items span {
  font-size: 0.7rem; color: #475569;
  background: #F8FAFC; border-radius: 6px;
  padding: 2px 8px; text-align: center;
}

/* Horizontal connector arrow */
.arch-h-arrow {
  font-size: 1.4rem; color: #4F46E5; flex-shrink: 0;
  animation: archNodeIn 0.4s ease forwards; opacity: 0;
  padding: 0 2px; line-height: 1;
}

/* Footer principle row */
.arch-footer-row { display: flex; justify-content: center; margin-top: 18px; }

/* Colour variant classes for individual pipeline steps */
.arch-card-auth    { border-color: #7C3AED; }
.arch-card-dash    { border-color: #2563EB; }
.arch-card-setup   { border-color: #0891B2; }
.arch-card-eval    { border-color: #7C3AED; }
.arch-card-output  { border-color: #059669; }
.arch-card-principle {
  border-color: #4F46E5;
  background: linear-gradient(135deg,#EEF2FF,#F5F3FF);
  min-width: 360px;
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

# ── Animated App Architecture Flow (horizontal) ────────────────────────────
st.markdown("""
<div class="arch-wrap">

  <div class="arch-flow">

    <!-- 1: Platform -->
    <div class="arch-card arch-hero-card" style="animation-delay:.05s">
      <div class="arch-card-icon">⚖️</div>
      <div class="arch-card-title">Let's Evaluate</div>
      <div class="arch-card-sub">AI Hiring Platform</div>
    </div>

    <div class="arch-h-arrow" style="animation-delay:.2s">→</div>

    <!-- 2: Auth -->
    <div class="arch-card arch-card-auth" style="animation-delay:.25s">
      <div class="arch-card-icon">🔐</div>
      <div class="arch-card-title">Authentication</div>
      <div class="arch-card-items">
        <span>Login</span>
        <span>Register</span>
        <span>Password Reset</span>
      </div>
    </div>

    <div class="arch-h-arrow" style="animation-delay:.4s">→</div>

    <!-- 3: Dashboard -->
    <div class="arch-card arch-card-dash" style="animation-delay:.45s">
      <div class="arch-card-icon">📊</div>
      <div class="arch-card-title">Dashboard</div>
      <div class="arch-card-items">
        <span>Metrics</span>
        <span>Quick Access</span>
      </div>
    </div>

    <div class="arch-h-arrow" style="animation-delay:.6s">→</div>

    <!-- 4: Setup -->
    <div class="arch-card arch-card-setup" style="animation-delay:.65s">
      <div class="arch-card-badge" style="background:#EFF6FF;color:#0891B2">📋 Setup</div>
      <div class="arch-card-items">
        <span>📁 Projects</span>
        <span>👥 Roles</span>
        <span>❓ Questions</span>
      </div>
    </div>

    <div class="arch-h-arrow" style="animation-delay:.8s">→</div>

    <!-- 5: Evaluate -->
    <div class="arch-card arch-card-eval" style="animation-delay:.85s">
      <div class="arch-card-badge" style="background:#F5F3FF;color:#7C3AED">🤖 Evaluate</div>
      <div class="arch-card-items">
        <span>📄 Resume Upload</span>
        <span>🤖 AI Analysis</span>
        <span>🧑‍💼 Evaluation</span>
      </div>
    </div>

    <div class="arch-h-arrow" style="animation-delay:1.0s">→</div>

    <!-- 6: Output -->
    <div class="arch-card arch-card-output" style="animation-delay:1.05s">
      <div class="arch-card-badge" style="background:#F0FDF4;color:#059669">📤 Output</div>
      <div class="arch-card-items">
        <span>📋 PDF Reports</span>
        <span>📂 Archives</span>
      </div>
    </div>

  </div>

  <!-- AI principle footer -->
  <div class="arch-footer-row">
    <div class="arch-card arch-card-principle" style="animation-delay:1.2s">
      <div class="arch-card-icon">🧠</div>
      <div class="arch-card-title">AI Assists · Humans Decide</div>
      <div class="arch-card-sub">OpenAI GPT-4o-mini · Privacy-first · Transparent · Accountable</div>
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
