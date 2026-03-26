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
[data-testid="stHeadingWithActionElements"] button { display: none !important; }
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


def render_policy_page_logo() -> None:
    """Render the brand logo for policy pages using st.page_link for reliable navigation.

    Splits the logo into two side-by-side columns: the gradient icon (HTML visual)
    and the brand name rendered as a ``st.page_link`` so Streamlit's native router
    handles the navigation to the home page instantly.
    """
    # Style the main-content page_link to look like the brand logo text
    st.markdown("""
<style>
.block-container [data-testid="stPageLink-NavLink"] {
  color: #1E293B !important;
  font-size: 1.15rem !important;
  font-weight: 800 !important;
  letter-spacing: -0.02em !important;
  line-height: 1 !important;
  background-image: none !important;
  background-size: 0 !important;
  border: none !important;
  padding: 0 !important;
  transition: color .2s !important;
}
.block-container [data-testid="stPageLink-NavLink"]:hover {
  color: #4F46E5 !important;
  background-image: none !important;
}
</style>
""", unsafe_allow_html=True)
    _icon_col, _text_col, _ = st.columns([1, 3, 12])
    with _icon_col:
        st.markdown(
            '<div style="padding-top:6px;">'
            '<span style="width:34px;height:34px;'
            'background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:9px;'
            'display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;'
            'box-shadow:0 2px 8px rgba(79,70,229,.30);">'
            + _SCALES_SVG_18
            + '</span></div>',
            unsafe_allow_html=True,
        )
    with _text_col:
        st.page_link("app.py", label=BRAND)


@st.cache_resource
def create_logo_favicon():
    """Return a PIL Image of the brand logo for use as a browser favicon.

    Produces a 64×64 RGBA image: purple gradient rounded square (#4F46E5 →
    #7C3AED at 135°) with the white scales icon centred inside — matching the
    logo shown on every page.  Falls back to the '⚖️' emoji string if Pillow
    is not installed.
    """
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return "⚖️"

    size = 64

    # Build 135° diagonal gradient: top-left = #4F46E5, bottom-right = #7C3AED
    r1, g1, b1 = 79, 70, 229    # #4F46E5
    r2, g2, b2 = 124, 58, 237   # #7C3AED
    data = []
    denom = 2 * (size - 1)
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            data.append((
                int(r1 + (r2 - r1) * t),
                int(g1 + (g2 - g1) * t),
                int(b1 + (b2 - b1) * t),
                255,
            ))
    img = Image.new("RGBA", (size, size))
    img.putdata(data)

    # Rounded corners — radius proportional to the logo's 9 px on 34 px ≈ 27 %
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=17, fill=255
    )
    img.putalpha(mask)

    # Draw white scales icon — SVG viewBox 24×24, scaled ×2, offset +8 px
    draw = ImageDraw.Draw(img)

    def pt(x, y):
        return (8 + x * 2, 8 + y * 2)

    w, lw = (255, 255, 255, 255), 2
    draw.line([pt(12, 3), pt(12, 21)], fill=w, width=lw)          # centre pole
    draw.line([pt(3, 6), pt(12, 3)], fill=w, width=lw)            # top bar left
    draw.line([pt(12, 3), pt(21, 6)], fill=w, width=lw)           # top bar right
    draw.polygon([pt(6, 10), pt(3, 16), pt(9, 16)], fill=w)       # left bowl
    draw.polygon([pt(18, 10), pt(15, 16), pt(21, 16)], fill=w)    # right bowl
    draw.line([pt(9, 21), pt(15, 21)], fill=w, width=lw)          # base line

    return img
