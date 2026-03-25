import streamlit as st
from utils.database import init_db
from utils.auth import logout_user

st.set_page_config(page_title="Privacy Policy – Let's Evaluate", page_icon="🔒", layout="wide")
init_db()

# ── Sidebar ────────────────────────────────────────────────────────────────
if st.session_state.get("authenticated", False):
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
else:
    with st.sidebar:
        st.page_link("app.py", label="🏠 Home")

# ── CSS ────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
[data-testid="stSidebarNav"] { display: none !important; }
[data-testid="StyledLinkIconContainer"] { display: none !important; }
[data-testid="stDecoration"] { display: none !important; }
.stHeadingActionButton { display: none !important; }
[data-testid="stSidebarCollapsedControl"] { display: none !important; }
header[data-testid="stHeader"] { display: none !important; }
#MainMenu { display: none !important; }
footer { display: none !important; }
.block-container { padding-top: 0.6rem !important; }

.policy-section {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 24px 28px;
  margin-bottom: 20px;
}
.policy-section h3 {
  color: #4F46E5;
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 10px;
}
.policy-section p, .policy-section ul {
  color: #334155;
  font-size: 0.92rem;
  line-height: 1.7;
  margin: 0;
}
.policy-section ul { padding-left: 20px; }
.policy-section li { margin-bottom: 4px; }
.policy-meta {
  color: #94A3B8;
  font-size: 0.82rem;
  margin-bottom: 28px;
}
</style>
""", unsafe_allow_html=True)

# ── Logo header ─────────────────────────────────────────────────────────────
st.page_link("app.py", label="⚖️ Let's Evaluate")

# ── Header ─────────────────────────────────────────────────────────────────
st.markdown("# 🔒 Privacy Policy")
st.markdown('<p class="policy-meta">Last updated: March 2025 &nbsp;·&nbsp; Let\'s Evaluate Platform</p>',
            unsafe_allow_html=True)

st.markdown("""
<div class="policy-section">
  <h3>1. Introduction</h3>
  <p>
    Welcome to <strong>Let's Evaluate</strong>. We are committed to protecting your personal
    information and your right to privacy. This Privacy Policy explains what information we
    collect, how we use it, and what rights you have in relation to it.
  </p>
</div>

<div class="policy-section">
  <h3>2. Information We Collect</h3>
  <ul>
    <li><strong>Account data:</strong> Your name and email address when you register.</li>
    <li><strong>Authentication data:</strong> A securely hashed version of your password.
        We never store your password in plain text.</li>
    <li><strong>Evaluation data:</strong> Candidate names, email addresses, uploaded résumé
        text (extracted for AI analysis), evaluation notes, scores, and statuses that you
        create within the platform.</li>
    <li><strong>Usage data:</strong> Session-level activity within the application (projects,
        roles, questions, and evaluations you manage).</li>
  </ul>
</div>

<div class="policy-section">
  <h3>3. How We Use Your Information</h3>
  <ul>
    <li>To provide, maintain, and improve the Let's Evaluate platform.</li>
    <li>To authenticate your account and keep your data secure.</li>
    <li>To perform AI-assisted résumé analysis using the data you provide (résumé text and
        role requirements).</li>
    <li>To generate evaluation reports (PDF) on your request.</li>
    <li>To send password-reset emails when you request them.</li>
  </ul>
</div>

<div class="policy-section">
  <h3>4. Data Storage &amp; Security</h3>
  <p>
    All data is stored in a local SQLite database on the server where the application is
    deployed. Passwords are hashed using bcrypt before storage. We implement
    industry-standard security practices; however, no method of electronic storage is 100%
    secure, and we cannot guarantee absolute security.
  </p>
</div>

<div class="policy-section">
  <h3>5. AI &amp; Third-Party Services</h3>
  <p>
    Résumé analysis and question generation are powered by an AI language model
    (OpenAI GPT-4o-mini). When you trigger an AI analysis, the relevant résumé text
    and role information are sent to OpenAI's API. Please review
    <a href="https://openai.com/policies/privacy-policy" target="_blank">OpenAI's Privacy Policy</a>
    for details on how they handle data.
  </p>
  <p style="margin-top:8px;">
    <strong>Important:</strong> AI-generated content is a decision-support tool.
    All hiring decisions must be reviewed and made by a human evaluator.
  </p>
</div>

<div class="policy-section">
  <h3>6. Candidate Data</h3>
  <p>
    If you upload a candidate's résumé and personal information (name, email) through this
    platform, you are responsible for ensuring you have obtained the candidate's consent to
    process their data in this manner, in compliance with applicable data-protection laws
    (e.g., GDPR, PDPA, or other local regulations).
  </p>
</div>

<div class="policy-section">
  <h3>7. Data Retention</h3>
  <p>
    Your data is retained as long as your account is active. You may delete individual
    evaluations, projects, roles, or questions at any time from within the platform.
    To request deletion of your account and all associated data, contact your system
    administrator.
  </p>
</div>

<div class="policy-section">
  <h3>8. Your Rights</h3>
  <ul>
    <li><strong>Access:</strong> You may view all data you have entered into the platform.</li>
    <li><strong>Correction:</strong> You may edit your data at any time.</li>
    <li><strong>Deletion:</strong> You may delete evaluations, projects, roles, and questions
        from within the platform.</li>
    <li><strong>Portability:</strong> Evaluation reports can be exported as PDFs.</li>
  </ul>
</div>

<div class="policy-section">
  <h3>9. Changes to This Policy</h3>
  <p>
    We may update this Privacy Policy from time to time. The "Last updated" date at the top
    of this page will reflect any changes. Continued use of the platform after changes
    constitutes acceptance of the updated policy.
  </p>
</div>
""", unsafe_allow_html=True)

st.divider()
st.page_link("app.py", label="← Back to Home")
st.page_link("pages/9_Terms_Conditions.py", label="📜 View Terms & Conditions")
