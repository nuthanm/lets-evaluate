"""Shared UI helpers for every page in Let's Evaluate."""

import streamlit as st
from utils.auth import logout_user

BRAND = "Let's Evaluate"

# ── Brand logo components ──────────────────────────────────────────────────
_SCALES_SVG_18 = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white"'
    ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<line x1="12" y1="3" x2="12" y2="21"/>'
    '<path d="M3 6l9-3 9 3"/>'
    '<path d="M6 10l-3 6h6z"/>'
    '<path d="M18 10l-3 6h6z"/>'
    '<line x1="9" y1="21" x2="15" y2="21"/>'
    '</svg>'
)

_SCALES_SVG_14 = (
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white"'
    ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
    '<line x1="12" y1="3" x2="12" y2="21"/>'
    '<path d="M3 6l9-3 9 3"/>'
    '<path d="M6 10l-3 6h6z"/>'
    '<path d="M18 10l-3 6h6z"/>'
    '<line x1="9" y1="21" x2="15" y2="21"/>'
    '</svg>'
)

# Reusable logo HTML – navigates to home page on click
LOGO_HTML = (
    '<a href="/" target="_self" style="display:inline-flex;align-items:center;'
    'gap:10px;text-decoration:none;">'
    '<span style="width:34px;height:34px;'
    'background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:9px;'
    'display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;'
    'box-shadow:0 2px 8px rgba(79,70,229,.30);">'
    + _SCALES_SVG_18
    + '</span>'
    '<span style="font-size:1.2rem;font-weight:800;color:#1E293B;'
    "letter-spacing:-.02em;line-height:1;\">Let's Evaluate</span>"
    '</a>'
)

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
        st.markdown(
            '<div style="display:flex;align-items:center;gap:8px;padding:2px 0 10px;">'
            '<span style="width:28px;height:28px;'
            'background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:7px;'
            'display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">'
            + _SCALES_SVG_14
            + '</span>'
            '<span style="font-weight:800;font-size:0.95rem;color:#1E293B;">'
            "Let's Evaluate</span></div>",
            unsafe_allow_html=True,
        )
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


def render_page_logo() -> None:
    """Render the brand logo link at the top of a page's main content area."""
    st.markdown(LOGO_HTML, unsafe_allow_html=True)
