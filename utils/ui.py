"""Shared UI helpers for every page in Let's Evaluate."""

import html
import streamlit as st

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

# Larger logo variant for prominent page headers (e.g. auth page)
_SCALES_SVG_28 = (
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white"'
    ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<line x1="12" y1="3" x2="12" y2="21"/>'
    '<path d="M3 6l9-3 9 3"/>'
    '<path d="M6 10l-3 6h6z"/>'
    '<path d="M18 10l-3 6h6z"/>'
    '<line x1="9" y1="21" x2="15" y2="21"/>'
    '</svg>'
)


_ALLOWED_LOGO_HREFS = {"/", "/Dashboard"}


def _make_logo_html(href: str = "/") -> str:
    """Generate logo HTML that navigates to *href* on click.

    Only hrefs from the known-safe allowlist are accepted; any other value
    falls back to the landing page ("/") to prevent open-redirect / XSS.
    """
    safe_href = html.escape(href if href in _ALLOWED_LOGO_HREFS else "/")
    return (
        f'<a href="{safe_href}" target="_self" style="cursor:pointer;display:inline-flex;align-items:center;'
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


# Reusable logo HTML – navigates to home page on click (for unauthenticated pages)
LOGO_HTML = _make_logo_html("/")

LOGO_HTML_LARGE = (
    '<a href="/" target="_self" style="cursor:pointer;display:inline-flex;align-items:center;'
    'gap:14px;text-decoration:none;">'
    '<span style="width:52px;height:52px;'
    'background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:13px;'
    'display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;'
    'box-shadow:0 4px 14px rgba(79,70,229,.35);">'
    + _SCALES_SVG_28
    + '</span>'
    '<span style="font-size:2rem;font-weight:800;color:#1E293B;'
    "letter-spacing:-.03em;line-height:1;\">Let's Evaluate</span>"
    '</a>'
)

# ── CSS injected on every page ─────────────────────────────────────────────
COMMON_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

/* Page background gradient */
[data-testid="stAppViewContainer"] {
  background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 55%, #EDE9FE 100%) !important;
}
[data-testid="stMain"] {
  background: transparent !important;
}

/* Remove Streamlit chrome — header, menu, footer, toolbar */
header[data-testid="stHeader"]            { display: none !important; }
#MainMenu                                  { display: none !important; }
footer                                     { display: none !important; }
[data-testid="stToolbar"]                 { display: none !important; }
[data-testid="stToolbarActions"]          { display: none !important; }
[data-testid="stStatusWidget"]            { display: none !important; }
.block-container { padding-top: 0.6rem !important; padding-bottom: 0 !important; }

/* Hide auto sidebar nav, anchor buttons, top decoration */
[data-testid="stSidebarNav"]              { display: none !important; }
[data-testid="StyledLinkIconContainer"]   { display: none !important; }
[data-testid="stDecoration"]              { display: none !important; }
[data-testid="stHeadingWithActionElements"] button { display: none !important; }
.stHeadingActionButton                    { display: none !important; }

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

/* Icon-only action buttons (edit / delete) in table rows.
   These sit inside [data-testid="stHorizontalBlock"] columns and should
   look like flat icon buttons, NOT gradient pill buttons. */
[data-testid="stHorizontalBlock"] [data-testid="column"] .stButton > button {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  color: #64748B !important;
  padding: 4px 8px !important;
  font-size: 1.15rem !important;
  min-height: unset !important;
  transform: none !important;
  border-radius: 6px !important;
  transition: background .15s, color .15s !important;
  line-height: 1.4 !important;
}
[data-testid="stHorizontalBlock"] [data-testid="column"] .stButton > button:hover {
  background: #EEF2FF !important;
  color: #4F46E5 !important;
  transform: none !important;
  box-shadow: none !important;
}
[data-testid="stHorizontalBlock"] [data-testid="column"] .stButton > button:active,
[data-testid="stHorizontalBlock"] [data-testid="column"] .stButton > button:focus {
  background: #E0E7FF !important;
  color: #4F46E5 !important;
  outline: none !important;
  box-shadow: none !important;
  transform: none !important;
}
/* Delete icon specifically — red hover */
[data-testid="stHorizontalBlock"] [data-testid="column"]:last-child .stButton > button:hover {
  background: #FEE2E2 !important;
  color: #DC2626 !important;
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
            '<a href="/Dashboard" target="_self" style="display:flex;align-items:center;'
            'gap:8px;padding:2px 0 10px;text-decoration:none;">'
            '<span style="width:28px;height:28px;'
            'background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:7px;'
            'display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">'
            + _SCALES_SVG_14
            + '</span>'
            '<span style="font-weight:800;font-size:0.95rem;color:#1E293B;">'
            "Let's Evaluate</span></a>",
            unsafe_allow_html=True,
        )
        st.page_link("pages/2_Dashboard.py", label="📊 Dashboard")
        st.page_link("pages/3_Projects.py", label="📁 Projects")
        st.page_link("pages/4_Roles.py", label="👥 Roles")
        st.page_link("pages/5_Questions.py", label="❓ Questions")
        st.page_link("pages/6_Evaluate_Candidate.py", label="🤖 Evaluate Candidate")
        st.page_link("pages/7_Archives.py", label="📂 Archives")
        st.page_link("pages/10_Bulk_Actions.py", label="📤 Bulk Actions")
        st.divider()
        user_name = st.session_state.get("user_name", "")
        user_email = st.session_state.get("user_email", "")
        if user_name or user_email:
            safe_name = html.escape(user_name)
            safe_email = html.escape(user_email)
            st.markdown(
                f'<div style="font-size:0.8rem;color:#64748B;padding:0 0 8px;'
                f'word-break:break-all;">'
                f'<span style="font-weight:600;color:#1E293B;">{safe_name}</span><br>'
                f'{safe_email}</div>',
                unsafe_allow_html=True,
            )
        if st.button("🚪 Sign Out", width='stretch'):
            from utils.auth import logout_user
            logout_user()
            st.switch_page("app.py")


def render_page_logo() -> None:
    """Render the brand logo link at the top of a page's main content area.

    When the user is authenticated the logo links to the Dashboard and a
    Sign Out button is shown on the right; otherwise only the logo is shown.
    The Sign Out button is rendered as a plain HTML link (not a Streamlit
    button) so it is never affected by page-specific button CSS overrides.
    Clicking it appends ``?action=signout`` to the URL, which is detected on
    the next render and triggers ``logout_user()`` + redirect to the landing
    page.
    """
    is_auth = st.session_state.get("authenticated", False)

    # Handle sign-out triggered by the header link
    if is_auth and st.query_params.get("action") == "signout":
        from utils.auth import logout_user
        logout_user()
        st.query_params.clear()
        st.switch_page("app.py")

    href = "/Dashboard" if is_auth else "/"

    if is_auth:
        col_logo, col_signout = st.columns([9, 2])
        with col_logo:
            st.markdown(_make_logo_html(href), unsafe_allow_html=True)
        with col_signout:
            st.markdown(
                """
                <style>
                .signout-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: white;
                    color: #64748B;
                    border: 1.5px solid #E2E8F0;
                    padding: 6px 14px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    border-radius: 8px;
                    text-decoration: none;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,.06);
                    white-space: nowrap;
                    transition: border-color .2s, color .2s, background .2s;
                }
                .signout-link:hover {
                    border-color: #4F46E5;
                    color: #4F46E5;
                    background: #EEF2FF;
                }
                </style>
                <div style="display:flex;justify-content:flex-end;
                            align-items:center;height:100%;padding-top:4px;">
                  <a class="signout-link" href="?action=signout" target="_self">
                    🚪 Sign Out
                  </a>
                </div>
                """,
                unsafe_allow_html=True,
            )
    else:
        st.markdown(_make_logo_html(href), unsafe_allow_html=True)


def render_policy_page_logo() -> None:
    """Render the brand logo centred at the top of a policy page."""
    st.markdown(
        f'<div style="display:flex;justify-content:center;padding:24px 0 16px;">'
        f'{LOGO_HTML}</div>',
        unsafe_allow_html=True,
    )


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
