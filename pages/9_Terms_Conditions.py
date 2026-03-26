import streamlit as st
from utils.database import init_db
from utils.auth import logout_user
from utils.ui import inject_common_css, render_authenticated_sidebar, render_page_logo

_is_auth = st.session_state.get("authenticated", False)
st.set_page_config(
    page_title="Terms & Conditions – Let's Evaluate",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded" if _is_auth else "collapsed",
)
init_db()

# ── Sidebar ────────────────────────────────────────────────────────────────
if _is_auth:
    render_authenticated_sidebar()

# ── CSS ────────────────────────────────────────────────────────────────────
inject_common_css()
st.markdown("""
<style>
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
render_page_logo()

# ── Header ─────────────────────────────────────────────────────────────────
st.markdown("# 📜 Terms & Conditions")
st.markdown('<p class="policy-meta">Last updated: March 2025 &nbsp;·&nbsp; Let\'s Evaluate Platform</p>',
            unsafe_allow_html=True)

st.markdown("""
<div class="policy-section">
  <h3>1. Acceptance of Terms</h3>
  <p>
    By accessing or using <strong>Let's Evaluate</strong> ("the Platform"), you agree to be
    bound by these Terms &amp; Conditions. If you do not agree with any part of these terms,
    you may not use the Platform.
  </p>
</div>

<div class="policy-section">
  <h3>2. Description of Service</h3>
  <p>
    Let's Evaluate is an AI-assisted interview evaluation platform designed to help hiring
    teams structure their interview process. The Platform provides tools for managing
    projects, roles, question banks, résumé analysis, and evaluation records.
  </p>
</div>

<div class="policy-section">
  <h3>3. Human Responsibility in Hiring Decisions</h3>
  <p>
    <strong>All hiring decisions are the sole responsibility of the human evaluator.</strong>
    AI-generated content within the Platform (including résumé analysis, skill match scores,
    recommendations, and interview questions) is provided as a <em>decision-support tool only</em>.
    It does not replace human judgment, and no hiring or rejection decision should be made
    based solely on AI output. You agree to review, verify, and take accountability for all
    decisions made using information from this Platform.
  </p>
</div>

<div class="policy-section">
  <h3>4. User Accounts &amp; Responsibilities</h3>
  <ul>
    <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
    <li>You agree to provide accurate and complete information when creating an account.</li>
    <li>You are responsible for all activity that occurs under your account.</li>
    <li>You must notify your administrator immediately of any unauthorised use of your account.</li>
    <li>You must not share your account credentials with any other person.</li>
  </ul>
</div>

<div class="policy-section">
  <h3>5. Acceptable Use</h3>
  <p>You agree not to use the Platform to:</p>
  <ul>
    <li>Violate any applicable law or regulation, including data-protection and employment laws.</li>
    <li>Discriminate against candidates on the basis of race, gender, age, religion, disability,
        or any other protected characteristic.</li>
    <li>Upload malicious files, viruses, or any software designed to disrupt or damage the Platform.</li>
    <li>Attempt to gain unauthorised access to other accounts or the underlying system.</li>
    <li>Use the Platform in any way that could bring it into disrepute.</li>
  </ul>
</div>

<div class="policy-section">
  <h3>6. Candidate Data &amp; Privacy Compliance</h3>
  <p>
    If you collect and process candidate personal data (names, email addresses, résumés) through
    the Platform, you must ensure that:
  </p>
  <ul>
    <li>You have a lawful basis for processing the candidate's personal data.</li>
    <li>Candidates have been informed that their data will be used for evaluation purposes.</li>
    <li>You comply with applicable data-protection regulations (GDPR, PDPA, CCPA, or equivalent).</li>
  </ul>
</div>

<div class="policy-section">
  <h3>7. Intellectual Property</h3>
  <p>
    The Platform, including its design, code, and branding, is the property of Let's Evaluate.
    You retain ownership of the content you create (questions, evaluation notes, project data).
    You grant the Platform a limited licence to store and process your content solely for the
    purpose of providing the service.
  </p>
</div>

<div class="policy-section">
  <h3>8. AI Content Disclaimer</h3>
  <p>
    AI-generated content (résumé analysis, match scores, interview questions) is produced by
    third-party language model services (OpenAI). The Platform makes no warranty as to the
    accuracy, completeness, or fitness for purpose of AI-generated content.
    <strong>Always verify AI output before acting on it.</strong>
  </p>
</div>

<div class="policy-section">
  <h3>9. Limitation of Liability</h3>
  <p>
    To the fullest extent permitted by law, Let's Evaluate and its operators shall not be liable
    for any indirect, incidental, special, or consequential damages arising out of or in connection
    with your use of the Platform, including but not limited to hiring decisions made using
    Platform data or AI-generated content.
  </p>
</div>

<div class="policy-section">
  <h3>10. Service Availability</h3>
  <p>
    The Platform is provided "as is" and "as available". We do not guarantee uninterrupted or
    error-free access. We reserve the right to modify, suspend, or discontinue any aspect of
    the Platform at any time.
  </p>
</div>

<div class="policy-section">
  <h3>11. Changes to These Terms</h3>
  <p>
    We reserve the right to update these Terms &amp; Conditions at any time. The "Last updated"
    date at the top of this page will reflect any changes. Continued use of the Platform after
    changes are posted constitutes your acceptance of the updated terms.
  </p>
</div>

<div class="policy-section">
  <h3>12. Contact</h3>
  <p>
    If you have any questions about these Terms &amp; Conditions, please contact your system
    administrator or the organisation that deployed this instance of Let's Evaluate.
  </p>
</div>
""", unsafe_allow_html=True)

st.divider()
st.page_link("app.py", label="← Back to Home")
st.page_link("pages/8_Privacy_Policy.py", label="🔒 View Privacy Policy")
