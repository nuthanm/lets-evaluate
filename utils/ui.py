"""Shared UI helpers for every page in Let's Evaluate."""

import streamlit as st
from utils.auth import logout_user as _logout

BRAND = "⚖️ Let's Evaluate"

# ── CSS injected on every page ─────────────────────────────────────────────
COMMON_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

/* Remove Streamlit chrome */
header[data-testid="stHeader"]            { display: none !important; }
#MainMenu                                  { display: none !important; }
footer                                     { display: none !important; }
.block-container { padding-top: 0.6rem !important; padding-bottom: 0 !important; }

/* Hide auto sidebar nav, anchor buttons, top decoration */
[data-testid="stSidebarNav"]              { display: none !important; }
[data-testid="StyledLinkIconContainer"]   { display: none !important; }
[data-testid="stDecoration"]              { display: none !important; }
.stHeadingActionButton                    { display: none !important; }

/* Always hide the sidebar collapse/expand toggle (stops the > blinking) */
[data-testid="stSidebarCollapsedControl"],
[data-testid="collapsedControl"],
section[data-testid="stSidebar"] > div:first-child button,
button[kind="header"]                     { display: none !important; }

/* Brand logo page-link style */
.brand-logo-wrap [data-testid="stPageLink-NavLink"] {
  font-size: 1.4rem !important;
  font-weight: 800 !important;
  color: #4F46E5 !important;
  text-decoration: none !important;
  line-height: 1.8 !important;
  background: none !important;
  border: none !important;
  padding: 0 !important;
}

/* Primary action buttons */
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
"""


def inject_common_css() -> None:
    """Inject shared CSS into the current page."""
    st.markdown(COMMON_CSS, unsafe_allow_html=True)


def render_authenticated_sidebar() -> None:
    """Render the standard authenticated navigation sidebar."""
    with st.sidebar:
        st.markdown(f"### {BRAND}")
        st.page_link("app.py", label="🏠 Home")
        st.page_link("pages/2_Dashboard.py", label="📊 Dashboard")
        st.page_link("pages/3_Projects.py", label="📁 Projects")
        st.page_link("pages/4_Roles.py", label="👥 Roles")
        st.page_link("pages/5_Questions.py", label="❓ Questions")
        st.page_link("pages/6_Evaluate_Candidate.py", label="🤖 Evaluate Candidate")
        st.page_link("pages/7_Archives.py", label="📂 Archives")
        st.divider()
        if st.button("🚪 Logout", use_container_width=True):
            _logout()
            st.switch_page("app.py")


def render_page_logo() -> None:
    """Render the brand logo link at the top of a page's main content area."""
    st.markdown('<div class="brand-logo-wrap">', unsafe_allow_html=True)
    st.page_link("app.py", label=BRAND)
    st.markdown('</div>', unsafe_allow_html=True)
