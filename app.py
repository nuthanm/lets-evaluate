import streamlit as st
import streamlit.components.v1 as components
from datetime import datetime
from utils.database import init_db
from utils.ui import inject_common_css, LOGO_HTML, create_logo_favicon

# ── Must be the very first Streamlit call ──────────────────────────────────
st.set_page_config(
    page_title="Let's Evaluate",
    page_icon=create_logo_favicon(),
    layout="wide",
    initial_sidebar_state="collapsed",
)

try:
    init_db()
except Exception as _db_exc:  # noqa: BLE001
    st.error(
        "⚠️ **Database error** — the app could not initialize the database.\n\n"
        f"```\n{_db_exc}\n```\n\n"
        "**How to fix this:**\n"
        "1. Set `DATABASE_URL` to a valid, reachable PostgreSQL connection string.\n"
        "2. If you are using a Docker Compose hostname (e.g. `postgres`), replace it with a publicly accessible host.\n"
        "3. Free cloud databases: [Supabase](https://supabase.com) · [Neon](https://neon.tech) · [Railway](https://railway.app)\n"
        "4. On Streamlit Community Cloud: add `DATABASE_URL` under **App settings → Secrets**."
    )
    st.stop()

# Redirect authenticated users straight to Dashboard (logo / direct URL visit)
if st.session_state.get("authenticated", False):
    st.switch_page("pages/2_Dashboard.py")

# ── Common CSS + page-specific overrides ──────────────────────────────────
inject_common_css()
st.markdown("""
<style>
/* ── Nav link base ── */
[data-testid="stPageLink-NavLink"] {
  color: #64748B !important; font-size: 0.9rem !important;
  font-weight: 500 !important; border: none !important;
  padding: 0 0 3px !important; text-decoration: none !important;
  background-color: transparent !important;
  background-image: linear-gradient(#4F46E5, #4F46E5) !important;
  background-size: 0% 2px !important;
  background-repeat: no-repeat !important;
  background-position: bottom left !important;
  transition: color .2s, background-size .35s ease !important;
}
[data-testid="stPageLink-NavLink"]:hover {
  color: #4F46E5 !important;
  background-size: 100% 2px !important;
}

/* ── Header nav links (raw <a> tags for Privacy / Terms) ── */
nav a {
  background-image: linear-gradient(#4F46E5, #4F46E5) !important;
  background-size: 0% 2px !important;
  background-repeat: no-repeat !important;
  background-position: bottom left !important;
  transition: color .2s, background-size .35s ease !important;
}
nav a:hover {
  color: #4F46E5 !important;
  background-size: 100% 2px !important;
}

/* ── Hero text ── */
.hero-badge {
  display: inline-block; background: #EEF2FF; color: #4F46E5;
  border-radius: 20px; padding: 4px 14px; font-size: 0.8rem;
  font-weight: 700; margin-bottom: 14px; letter-spacing: 0.03em;
}
.hero-headline {
  font-size: 2.6rem; font-weight: 800; color: #1E293B;
  line-height: 1.2; margin: 0 0 12px;
}
.hero-sub {
  font-size: 1.05rem; color: #4F46E5; font-weight: 700;
  letter-spacing: 0.04em; margin-bottom: 12px;
}
.hero-desc {
  font-size: 1rem; color: #475569; line-height: 1.7;
  margin-bottom: 22px; max-width: 480px;
}

/* ── Fit landing page in one viewport — no vertical scroll ── */
.main .block-container {
  padding-top: 0.5rem !important;
  padding-bottom: 0 !important;
}
/* Hide overflow only on wide screens where everything fits in one viewport */
@media (min-width: 769px) and (min-height: 501px) {
  [data-testid="stAppViewContainer"] {
    overflow-y: hidden !important;
  }
}
/* Always allow scroll on mobile / short screens so animation is reachable */
@media (max-width: 768px), (max-height: 500px) {
  [data-testid="stAppViewContainer"] {
    overflow-y: auto !important;
  }
}

/* ── Responsive — tablet ── */
@media (max-width: 900px) {
  .hero-headline { font-size: 2.1rem !important; }
  .hero-desc { max-width: 100% !important; }
}

/* ── Responsive — mobile ── */
@media (max-width: 600px) {
  .hero-headline { font-size: 1.6rem !important; }
  .hero-sub      { font-size: 0.9rem !important; }
  .hero-badge    { font-size: 0.72rem !important; }
  .hero-desc     { font-size: 0.9rem !important; margin-bottom: 14px !important; }
}
</style>
""", unsafe_allow_html=True)

# ── Page Header ────────────────────────────────────────────────────────────
# Pure HTML flex-row so both nav links stay inline on every screen size.
# Streamlit routes pages by stripping the numeric prefix from the filename:
#   pages/8_Privacy_Policy.py  → /Privacy_Policy
#   pages/9_Terms_Conditions.py → /Terms_Conditions
st.markdown(
    f'<div style="display:flex;align-items:center;justify-content:space-between;'
    'flex-wrap:wrap;gap:8px;padding:4px 0 10px;">'
    + LOGO_HTML
    + '<nav style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">'
    '<a href="/Privacy_Policy" target="_self" '
    'style="color:#64748B;font-size:0.9rem;font-weight:500;text-decoration:none;'
    'white-space:nowrap;">Privacy Policy</a>'
    '<a href="/Terms_Conditions" target="_self" '
    'style="color:#64748B;font-size:0.9rem;font-weight:500;text-decoration:none;'
    'white-space:nowrap;">Terms &amp; Conditions</a>'
    '</nav></div>',
    unsafe_allow_html=True,
)

# ── Hero Section ───────────────────────────────────────────────────────────
hero_left, hero_right = st.columns([2, 3], gap="large")

with hero_left:
    st.markdown("""
<div style="padding: 14px 0 12px;">
  <div class="hero-badge">✨ AI-Assisted · Human-Driven</div>
  <div class="hero-headline">Interview Evaluation,<br>Done Smarter</div>
  <div class="hero-sub">Upload · AI Analyses · You Decide</div>
  <div class="hero-desc">
    Let AI match candidate resumes against your configured tech stack and role
    requirements — surfacing clear, unbiased insights so your team can focus
    on what matters: making the <strong>right hire</strong>.
  </div>
</div>
""", unsafe_allow_html=True)
    if st.button("Start Evaluating →", width='content'):
            st.switch_page("pages/1_Auth.py")

with hero_right:
    # Sequential workflow animation:
    # Person (left) → uploads Resume → AI Robot processes → Result (right)
    # 8-second looping animation with 4 phases highlighted in step indicators.
    components.html("""
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}</style>
<div style="width:100%;display:flex;justify-content:center;padding:4px 0 0;">
<svg viewBox="20 10 540 288" xmlns="http://www.w3.org/2000/svg"
     style="width:100%;max-width:580px;height:auto;display:block;">
  <defs>
    <marker id="arrowHead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#818CF8"/>
    </marker>
  </defs>

  <!-- DASHED ORBIT RING — around person (active in phase 1) -->
  <circle cx="95" cy="120" r="72" fill="none" stroke="#E0E7FF"
          stroke-width="2.5" stroke-dasharray="8 6">
    <animate attributeName="stroke"
      values="#818CF8;#818CF8;#E0E7FF;#E0E7FF;#E0E7FF;#E0E7FF;#818CF8"
      keyTimes="0;0.25;0.32;0.5;0.7;0.99;1" dur="8s" repeatCount="indefinite"/>
    <animateTransform attributeName="transform" type="rotate"
      from="0 95 120" to="360 95 120" dur="20s" repeatCount="indefinite"/>
  </circle>

  <!-- DASHED ORBIT RING — around robot (active in phase 3) -->
  <circle cx="288" cy="115" r="80" fill="none" stroke="#E0E7FF"
          stroke-width="2.5" stroke-dasharray="10 7">
    <animate attributeName="stroke"
      values="#E0E7FF;#E0E7FF;#E0E7FF;#818CF8;#818CF8;#E0E7FF;#E0E7FF"
      keyTimes="0;0.35;0.5;0.55;0.72;0.78;1" dur="8s" repeatCount="indefinite"/>
    <animateTransform attributeName="transform" type="rotate"
      from="0 288 115" to="-360 288 115" dur="15s" repeatCount="indefinite"/>
  </circle>

  <!-- ═══════════════════════════════════
       PERSON AT COMPUTER — left, gently floating
  ════════════════════════════════════ -->
  <g>
    <animateTransform attributeName="transform" type="translate"
      values="0 0;0 -4;0 0" dur="3s" repeatCount="indefinite"/>

    <!-- chair back -->
    <rect x="68" y="89" width="54" height="62" rx="10" fill="#CBD5E1"/>
    <rect x="68" y="89" width="54" height="8"  rx="5"  fill="#94A3B8"/>

    <!-- desk surface -->
    <rect x="32" y="148" width="128" height="8" rx="3"
          fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1"/>

    <!-- keyboard -->
    <rect x="48" y="156" width="98" height="7" rx="3"
          fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.8"/>
    <rect x="52"  y="158" width="40" height="1.5" rx="0.75" fill="#94A3B8" opacity="0.5"/>
    <rect x="95"  y="158" width="12" height="1.5" rx="0.75" fill="#94A3B8" opacity="0.5"/>
    <rect x="110" y="158" width="32" height="1.5" rx="0.75" fill="#94A3B8" opacity="0.5"/>
    <rect x="52"  y="161" width="90" height="1.5" rx="0.75" fill="#94A3B8" opacity="0.4"/>

    <!-- monitor stand + base -->
    <rect x="91" y="134" width="8"  height="15" rx="3" fill="#64748B"/>
    <rect x="80" y="147" width="30" height="4"  rx="2" fill="#64748B"/>

    <!-- monitor outer frame -->
    <rect x="56" y="76" width="78" height="60" rx="7"
          fill="white" stroke="#334155" stroke-width="2"/>
    <!-- monitor screen -->
    <rect x="60" y="80" width="70" height="52" rx="5" fill="#1E293B"/>
    <!-- screen content lines -->
    <rect x="65" y="86"  width="38" height="3.5" rx="1.5" fill="#818CF8"/>
    <rect x="65" y="92"  width="54" height="3"   rx="1.5" fill="#818CF8" opacity="0.75"/>
    <rect x="65" y="98"  width="32" height="3"   rx="1.5" fill="#818CF8" opacity="0.55"/>
    <rect x="65" y="104" width="48" height="3"   rx="1.5" fill="#818CF8" opacity="0.4"/>
    <rect x="65" y="110" width="26" height="3"   rx="1.5" fill="#818CF8" opacity="0.3"/>
    <!-- blinking cursor -->
    <rect x="65" y="116" width="3" height="6" rx="1" fill="#818CF8">
      <animate attributeName="opacity" values="1;1;0;0;1" dur="1.2s" repeatCount="indefinite"/>
    </rect>

    <!-- torso (seated, visible behind/above desk) -->
    <rect x="73" y="96" width="44" height="54" rx="9" fill="#4F46E5"/>
    <path d="M91,96 L95,106 L99,96" fill="white" opacity="0.45"/>

    <!-- left upper arm -->
    <rect x="54" y="98" width="19" height="32" rx="9" fill="#4F46E5"/>
    <!-- left forearm (reaching toward keyboard) -->
    <rect x="42" y="124" width="28" height="12" rx="6" fill="#4F46E5"/>
    <!-- left hand on keyboard -->
    <ellipse cx="52" cy="154" rx="9" ry="6" fill="#FBBF24"/>

    <!-- right upper arm -->
    <rect x="117" y="98" width="19" height="32" rx="9" fill="#4F46E5"/>
    <!-- right forearm (reaching toward keyboard) -->
    <rect x="120" y="124" width="28" height="12" rx="6" fill="#4F46E5"/>
    <!-- right hand on keyboard -->
    <ellipse cx="136" cy="154" rx="9" ry="6" fill="#FBBF24"/>

    <!-- neck -->
    <rect x="91" y="79" width="8" height="18" rx="3" fill="#FBBF24"/>

    <!-- head -->
    <circle cx="95" cy="62" r="20" fill="#FBBF24"/>
    <!-- hair -->
    <ellipse cx="95" cy="51" rx="20" ry="10" fill="#2D3748"/>
    <rect x="75" y="48" width="40" height="7" fill="#2D3748"/>
    <!-- eyes (looking at screen) -->
    <circle cx="88"  cy="65" r="3.2" fill="#2D3748"/>
    <circle cx="102" cy="65" r="3.2" fill="#2D3748"/>
    <!-- eyebrows (focused) -->
    <path d="M84.5,59.5 Q88,57.5 91.5,59.5" fill="none" stroke="#2D3748"
          stroke-width="1.5" stroke-linecap="round"/>
    <path d="M98.5,59.5 Q102,57.5 105.5,59.5" fill="none" stroke="#2D3748"
          stroke-width="1.5" stroke-linecap="round"/>
    <!-- smile -->
    <path d="M88,74 Q95,79 102,74" fill="none" stroke="#2D3748"
          stroke-width="1.5" stroke-linecap="round"/>
  </g>
  <text x="95" y="200" text-anchor="middle" fill="#4F46E5"
        font-size="13" font-weight="700" font-family="Arial,sans-serif">YOU</text>

  <!-- ═══════════════════════════════════
       FLYING RESUME DOCUMENT
       Phase 1→2: appears near person's hand, then flies to robot
  ════════════════════════════════════ -->
  <g>
    <animate attributeName="opacity"
      values="0;0;1;1;1;0.3;0;0"
      keyTimes="0;0.06;0.12;0.32;0.44;0.48;0.55;1"
      dur="8s" repeatCount="indefinite"/>
    <animateTransform attributeName="transform" type="translate"
      values="128 82;128 82;128 82;248 100;260 100;260 100;128 82;128 82"
      keyTimes="0;0.06;0.12;0.44;0.48;0.55;0.56;1"
      dur="8s" calcMode="spline"
      keySplines="0 0 1 1;0.42 0 0.58 1;0.42 0 0.58 1;0 0 1 1;0 0 1 1;0 0 1 1;0 0 1 1"
      repeatCount="indefinite"/>
    <!-- document shape (drawn at local 0,0) -->
    <rect x="0" y="0" width="48" height="60" rx="5"
          fill="white" stroke="#4F46E5" stroke-width="2"/>
    <path d="M36,0 L48,12 L36,12 Z" fill="#C7D2FE"/>
    <line x1="36" y1="0"  x2="36" y2="12" stroke="#4F46E5" stroke-width="1.5"/>
    <line x1="36" y1="12" x2="48" y2="12" stroke="#4F46E5" stroke-width="1.5"/>
    <rect x="3" y="3" width="31" height="9" rx="2" fill="#4F46E5"/>
    <text x="18.5" y="9.5" text-anchor="middle" fill="white"
          font-size="5.5" font-weight="700" font-family="Arial,sans-serif">RESUME</text>
    <rect x="3" y="17" width="42" height="4"   rx="2"   fill="#C7D2FE"/>
    <rect x="3" y="25" width="34" height="3.5" rx="1.5" fill="#DDE3FA" opacity="0.85"/>
    <rect x="3" y="32" width="40" height="3.5" rx="1.5" fill="#DDE3FA" opacity="0.7"/>
    <rect x="3" y="39" width="28" height="3.5" rx="1.5" fill="#DDE3FA" opacity="0.6"/>
    <rect x="3" y="46" width="36" height="3.5" rx="1.5" fill="#DDE3FA" opacity="0.5"/>
    <rect x="3" y="53" width="24" height="3.5" rx="1.5" fill="#DDE3FA" opacity="0.4"/>
  </g>

  <!-- DASHED ARROW 1: Person → Robot (active in phase 2) -->
  <line x1="170" y1="130" x2="224" y2="130" stroke="#818CF8"
        stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arrowHead)">
    <animate attributeName="opacity"
      values="0.25;0.25;0.9;0.9;0.25;0.25;0.25"
      keyTimes="0;0.1;0.15;0.5;0.55;0.7;1" dur="8s" repeatCount="indefinite"/>
  </line>

  <!-- ═══════════════════════════════════
       AI ROBOT — center, offset float
  ════════════════════════════════════ -->
  <g>
    <animateTransform attributeName="transform" type="translate"
      values="0 0;0 -5;0 0" dur="3s" begin="1s" repeatCount="indefinite"/>
    <!-- antenna -->
    <rect x="285" y="26" width="6" height="17" rx="3" fill="#1A2870"/>
    <circle cx="288" cy="23" r="7" fill="#1A2870"/>
    <!-- head outer -->
    <rect x="258" y="43" width="60" height="52" rx="12" fill="white" stroke="#1A2870" stroke-width="2"/>
    <!-- head inner screen -->
    <rect x="263" y="48" width="50" height="42" rx="8" fill="#1A2870"/>
    <!-- eyes -->
    <circle cx="276" cy="72" r="9" fill="#F5C518"/>
    <circle cx="300" cy="72" r="9" fill="#F5C518"/>
    <circle cx="276" cy="72" r="5" fill="#1A2870"/>
    <circle cx="300" cy="72" r="5" fill="#1A2870"/>
    <!-- eye shine -->
    <circle cx="274" cy="69" r="2.5" fill="white" opacity="0.75"/>
    <circle cx="298" cy="69" r="2.5" fill="white" opacity="0.75"/>
    <!-- processing blink overlay (covers eyes briefly during phase 3) -->
    <rect x="263" y="48" width="50" height="42" rx="8" fill="#1A2870" opacity="0">
      <animate attributeName="opacity"
        values="0;0;0;0;0;1;0;1;0;0;0;0"
        keyTimes="0;0.4;0.45;0.5;0.52;0.53;0.54;0.55;0.57;0.65;0.8;1"
        dur="8s" repeatCount="indefinite"/>
    </rect>
    <!-- mouth LED (changes colour during processing) -->
    <rect x="278" y="84" width="20" height="4" rx="2" fill="#4ADE80">
      <animate attributeName="fill"
        values="#4ADE80;#4ADE80;#4ADE80;#FCD34D;#F87171;#FCD34D;#4ADE80;#4ADE80"
        keyTimes="0;0.4;0.5;0.55;0.6;0.65;0.7;1" dur="8s" repeatCount="indefinite"/>
    </rect>
    <!-- neck -->
    <rect x="285" y="95" width="6" height="10" rx="3" fill="#CBD5E1"/>
    <!-- body outer -->
    <rect x="250" y="105" width="76" height="62" rx="12"
          fill="white" stroke="#1A2870" stroke-width="1.5"/>
    <!-- body inner panel -->
    <rect x="256" y="111" width="64" height="50" rx="7" fill="#EEF2FF"/>
    <!-- body screen content (line shortens then extends during processing) -->
    <rect x="263" y="118" width="50" height="6" rx="3" fill="#C7D2FE">
      <animate attributeName="width"
        values="50;50;50;50;18;50;50;50;50"
        keyTimes="0;0.4;0.45;0.5;0.56;0.62;0.7;0.9;1" dur="8s" repeatCount="indefinite"/>
    </rect>
    <rect x="263" y="128" width="38" height="5" rx="2.5" fill="#C7D2FE" opacity="0.7"/>
    <rect x="263" y="137" width="46" height="5" rx="2.5" fill="#C7D2FE" opacity="0.5"/>
    <rect x="263" y="146" width="30" height="4" rx="2"   fill="#C7D2FE" opacity="0.4"/>
    <!-- arms -->
    <rect x="230" y="107" width="21" height="40" rx="10"
          fill="white" stroke="#1A2870" stroke-width="1.5"/>
    <circle cx="240" cy="147" r="10" fill="#1A2870"/>
    <rect x="326" y="107" width="21" height="40" rx="10"
          fill="white" stroke="#1A2870" stroke-width="1.5"/>
    <circle cx="336" cy="147" r="10" fill="#1A2870"/>
  </g>
  <text x="288" y="186" text-anchor="middle" fill="#4F46E5"
        font-size="12" font-weight="700" font-family="Arial,sans-serif">AI PROCESSING</text>

  <!-- ═══════════════════════════════════
       SPINNING GEARS — positioned to the right of robot
  ════════════════════════════════════ -->
  <!-- large gear (dark navy, CCW) — center (355, 148) -->
  <g>
    <animateTransform attributeName="transform" type="rotate"
      from="0 355 148" to="-360 355 148" dur="9s" repeatCount="indefinite"/>
    <polygon points="350.8,126.3 352.9,119.5 357.1,119.5 359.2,126.3 362.2,127.1 367.5,122.3 371.1,124.3 369.4,131.3 371.7,133.6 378.7,131.9 380.7,135.5 375.9,140.8 376.7,143.8 383.5,145.9 383.5,150.1 376.7,152.2 375.9,155.2 380.7,160.5 378.7,164.1 371.7,162.4 369.4,164.7 371.1,171.7 367.5,173.7 362.2,168.9 359.2,169.7 357.1,176.5 352.9,176.5 350.8,169.7 347.8,168.9 342.5,173.7 338.9,171.7 340.6,164.7 338.3,162.4 331.3,164.1 329.3,160.5 334.1,155.2 333.3,152.2 326.5,150.1 326.5,145.9 333.3,143.8 334.1,140.8 329.3,135.5 331.3,131.9 338.3,133.6 340.6,131.3 338.9,124.3 342.5,122.3 347.8,127.1"
          fill="#3547B4"/>
    <circle cx="355" cy="148" r="17" fill="white"/>
    <circle cx="355" cy="148" r="7"  fill="#3547B4"/>
  </g>
  <!-- small gear (red, CW) — center (337, 118) -->
  <g>
    <animateTransform attributeName="transform" type="rotate"
      from="0 337 118" to="360 337 118" dur="6s" repeatCount="indefinite"/>
    <polygon points="334.0,105.1 335.5,100.5 338.5,100.5 340.0,105.1 342.2,105.8 346.1,102.9 348.6,104.7 347.0,109.4 348.3,111.2 353.2,111.1 354.2,114.0 350.1,116.8 350.1,119.2 354.2,122.0 353.2,124.9 348.3,124.8 347.0,126.6 348.6,131.3 346.1,133.1 342.2,130.2 340.0,130.9 338.5,135.5 335.5,135.5 334.0,130.9 331.8,130.2 327.9,133.1 325.4,131.3 327.0,126.6 325.7,124.8 320.8,124.9 319.8,122.0 323.9,119.2 323.9,116.8 319.8,114.0 320.8,111.1 325.7,111.2 327.0,109.4 325.4,104.7 327.9,102.9 331.8,105.8"
          fill="#E05050"/>
    <circle cx="337" cy="118" r="10" fill="white"/>
    <circle cx="337" cy="118" r="4"  fill="#E05050"/>
  </g>

  <!-- DASHED ARROW 2: Robot → Result (active in phase 4) -->
  <line x1="395" y1="130" x2="436" y2="130" stroke="#818CF8"
        stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arrowHead)">
    <animate attributeName="opacity"
      values="0.25;0.25;0.25;0.25;0.9;0.9;0.25"
      keyTimes="0;0.1;0.5;0.62;0.68;0.88;1" dur="8s" repeatCount="indefinite"/>
  </line>

  <!-- ═══════════════════════════════════
       RESULT CARD — slides in from right in phase 4
  ════════════════════════════════════ -->
  <g>
    <animate attributeName="opacity"
      values="0;0;0;0;0;0.96;0.96;0"
      keyTimes="0;0.1;0.5;0.65;0.72;0.78;0.9;1" dur="8s" repeatCount="indefinite"/>
    <animateTransform attributeName="transform" type="translate"
      values="16 0;16 0;16 0;16 0;8 0;0 0;0 0;16 0"
      keyTimes="0;0.1;0.5;0.65;0.72;0.78;0.9;1" dur="8s" repeatCount="indefinite"/>
    <!-- card shadow -->
    <rect x="443" y="73" width="110" height="134" rx="12" fill="#0F172A" opacity="0.06"/>
    <!-- card body -->
    <rect x="440" y="70" width="110" height="134" rx="12"
          fill="white" stroke="#059669" stroke-width="2.5"/>
    <!-- green header -->
    <rect x="440" y="70" width="110" height="36" rx="12" fill="#059669"/>
    <rect x="440" y="90"  width="110" height="16"  fill="#059669"/>
    <!-- check icon -->
    <circle cx="463" cy="88" r="11" fill="white" opacity="0.9"/>
    <text x="463" y="92.5" text-anchor="middle" fill="#059669"
          font-size="12" font-weight="800" font-family="Arial,sans-serif">✓</text>
    <!-- RESULT label in header -->
    <text x="505" y="93" text-anchor="middle" fill="white"
          font-size="11" font-weight="800" font-family="Arial,sans-serif">RESULT</text>
    <!-- match score -->
    <text x="495" y="133" text-anchor="middle" fill="#059669"
          font-size="28" font-weight="800" font-family="Arial,sans-serif">87%</text>
    <text x="495" y="149" text-anchor="middle" fill="#64748B"
          font-size="9" font-family="Arial,sans-serif">Match Score</text>
    <!-- detail bars -->
    <rect x="452" y="160" width="88" height="6"   rx="3"   fill="#D1FAE5"/>
    <rect x="452" y="170" width="68" height="5"   rx="2.5" fill="#D1FAE5" opacity="0.75"/>
    <rect x="452" y="179" width="80" height="5"   rx="2.5" fill="#D1FAE5" opacity="0.55"/>
    <rect x="452" y="188" width="55" height="4"   rx="2"   fill="#D1FAE5" opacity="0.4"/>
    <!-- label below card -->
    <text x="495" y="220" text-anchor="middle" fill="#059669"
          font-size="12" font-weight="700" font-family="Arial,sans-serif">RESULT</text>
  </g>

  <!-- ═══════════════════════════════════
       STEP INDICATORS — bottom row
  ════════════════════════════════════ -->
  <!-- Step 1: YOU (active 0 → 0.25) -->
  <circle cx="95" cy="244" r="11">
    <animate attributeName="fill"
      values="#4F46E5;#4F46E5;#C7D2FE;#C7D2FE;#C7D2FE;#C7D2FE;#4F46E5"
      keyTimes="0;0.25;0.32;0.5;0.7;0.99;1" dur="8s" repeatCount="indefinite"/>
  </circle>
  <text x="95" y="248.5" text-anchor="middle" fill="white"
        font-size="11" font-weight="700" font-family="Arial,sans-serif">1</text>
  <text x="95" y="275" text-anchor="middle" fill="#64748B"
        font-size="12" font-weight="600" font-family="Arial,sans-serif">You</text>

  <line x1="109" y1="244" x2="213" y2="244" stroke="#C7D2FE" stroke-width="1.5"/>

  <!-- Step 2: UPLOAD (active 0.12 → 0.48) -->
  <circle cx="227" cy="244" r="11">
    <animate attributeName="fill"
      values="#C7D2FE;#C7D2FE;#4F46E5;#4F46E5;#C7D2FE;#C7D2FE;#C7D2FE"
      keyTimes="0;0.1;0.15;0.47;0.52;0.7;1" dur="8s" repeatCount="indefinite"/>
  </circle>
  <text x="227" y="248.5" text-anchor="middle" fill="white"
        font-size="11" font-weight="700" font-family="Arial,sans-serif">2</text>
  <text x="227" y="275" text-anchor="middle" fill="#64748B"
        font-size="12" font-weight="600" font-family="Arial,sans-serif">Upload</text>

  <line x1="241" y1="244" x2="345" y2="244" stroke="#C7D2FE" stroke-width="1.5"/>

  <!-- Step 3: AI (active 0.5 → 0.72) -->
  <circle cx="359" cy="244" r="11">
    <animate attributeName="fill"
      values="#C7D2FE;#C7D2FE;#C7D2FE;#4F46E5;#4F46E5;#C7D2FE;#C7D2FE"
      keyTimes="0;0.42;0.5;0.55;0.72;0.78;1" dur="8s" repeatCount="indefinite"/>
  </circle>
  <text x="359" y="248.5" text-anchor="middle" fill="white"
        font-size="11" font-weight="700" font-family="Arial,sans-serif">3</text>
  <text x="359" y="275" text-anchor="middle" fill="#64748B"
        font-size="12" font-weight="600" font-family="Arial,sans-serif">AI</text>

  <line x1="373" y1="244" x2="476" y2="244" stroke="#C7D2FE" stroke-width="1.5"/>

  <!-- Step 4: RESULT (active 0.72 → 0.95) -->
  <circle cx="490" cy="244" r="11">
    <animate attributeName="fill"
      values="#C7D2FE;#C7D2FE;#C7D2FE;#C7D2FE;#059669;#059669;#C7D2FE"
      keyTimes="0;0.6;0.65;0.72;0.78;0.95;1" dur="8s" repeatCount="indefinite"/>
  </circle>
  <text x="490" y="248.5" text-anchor="middle" fill="white"
        font-size="11" font-weight="700" font-family="Arial,sans-serif">4</text>
  <text x="490" y="275" text-anchor="middle" fill="#64748B"
        font-size="12" font-weight="600" font-family="Arial,sans-serif">Result</text>
</svg>
</div>
<script>
/* Resize the parent iframe to match the SVG's rendered height,
   eliminating blank space on tablet and mobile viewports. */
(function () {
  var svg = document.querySelector('svg');
  if (!svg) return;

  function fitIframeToSvg() {
    var h = svg.getBoundingClientRect().height;
    if (h < 20) return; /* SVG not yet laid out — height unreliable below 20 px */
    var targetH = Math.ceil(h) + 10; /* +10 px breathing room prevents a scrollbar */
    /* Shrink document so scrollbar never appears inside the iframe */
    document.documentElement.style.height = targetH + 'px';
    document.body.style.height = targetH + 'px';
    try {
      var frames = window.parent.document.getElementsByTagName('iframe');
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === window) {
          frames[i].style.height = targetH + 'px';
          frames[i].style.minHeight = '0';
          break;
        }
      }
    } catch (e) { /* cross-origin guard */ }
  }

  window.addEventListener('load', fitIframeToSvg);
  window.addEventListener('resize', fitIframeToSvg);
  /* Retry at increasing delays to handle slow/deferred SVG layout */
  [50, 150, 300, 600, 1000, 2000].forEach(function (t) { setTimeout(fitIframeToSvg, t); });
}());
</script>
""", height=320, scrolling=False)

    st.markdown(
        '<p style="text-align:center;color:#94A3B8;font-size:0.72rem;'
        'margin-top:4px;letter-spacing:0.01em;">'
        '* 87% is for illustration purposes only.</p>',
        unsafe_allow_html=True,
    )

# ── Footer ─────────────────────────────────────────────────────────────────
st.markdown(
    f'<p style="text-align:center;color:#94A3B8;font-size:0.75rem;'
    'border-top:1px solid #E2E8F0;padding-top:10px;margin-top:18px;">'
    f"© {datetime.now().year} Let's Evaluate · AI assists; humans decide.</p>",
    unsafe_allow_html=True,
)
