import streamlit as st
from utils.database import init_db
from utils.ui import inject_common_css, render_authenticated_sidebar, render_page_logo, BRAND

# ── Must be the very first Streamlit call ──────────────────────────────────
_is_auth = st.session_state.get("authenticated", False)
st.set_page_config(
    page_title="Let's Evaluate",
    page_icon="⚖️",
    layout="wide",
    # Expanded for authenticated users (eliminates the blinking >) — collapsed for guests
    initial_sidebar_state="expanded" if _is_auth else "collapsed",
)

init_db()

# ── Sidebar (authenticated users only) ────────────────────────────────────
if _is_auth:
    render_authenticated_sidebar()

# ── Common CSS + page-specific overrides ──────────────────────────────────
inject_common_css()
st.markdown("""
<style>
/* ── Nav link base ── */
[data-testid="stPageLink-NavLink"] {
  color: #64748B !important; font-size: 0.9rem !important;
  font-weight: 500 !important; background: none !important;
  border: none !important; padding: 0 !important;
  text-decoration: none !important; transition: color .2s !important;
}
[data-testid="stPageLink-NavLink"]:hover { color: #4F46E5 !important; }

/* ── Brand logo — bigger & clearly recognizable ── */
div[data-testid="column"]:first-child [data-testid="stPageLink-NavLink"] {
  font-size: 2rem !important; font-weight: 800 !important;
  color: #4F46E5 !important; line-height: 2 !important;
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
[data-testid="stAppViewContainer"] {
  overflow-y: hidden !important;
}
/* Re-enable scroll on very small screens where content may not fit */
@media (max-height: 500px) {
  [data-testid="stAppViewContainer"] {
    overflow-y: auto !important;
  }
}

/* ── Responsive — tablet ── */
@media (max-width: 900px) {
  div[data-testid="column"]:first-child [data-testid="stPageLink-NavLink"] {
    font-size: 1.6rem !important;
  }
  .hero-headline { font-size: 2.1rem !important; }
  .hero-desc { max-width: 100% !important; }
}

/* ── Responsive — mobile ── */
@media (max-width: 600px) {
  div[data-testid="column"]:first-child [data-testid="stPageLink-NavLink"] {
    font-size: 1.3rem !important;
  }
  .hero-headline { font-size: 1.6rem !important; }
  .hero-sub      { font-size: 0.9rem !important; }
  .hero-badge    { font-size: 0.72rem !important; }
  .hero-desc     { font-size: 0.9rem !important; margin-bottom: 14px !important; }
}
</style>
""", unsafe_allow_html=True)

# ── Page Header ────────────────────────────────────────────────────────────
hcol1, hcol2, hcol3 = st.columns([4, 1, 1])
with hcol1:
    st.page_link("app.py", label="⚖️ Let's Evaluate")
with hcol2:
    st.page_link("pages/8_Privacy_Policy.py", label="Privacy Policy")
with hcol3:
    st.page_link("pages/9_Terms_Conditions.py", label="Terms & Conditions")

# ── Hero Section ───────────────────────────────────────────────────────────
hero_left, hero_right = st.columns([11, 9], gap="large")

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
    if _is_auth:
        if st.button("Go to Dashboard →", use_container_width=False):
            st.switch_page("pages/2_Dashboard.py")
    else:
        if st.button("Start Evaluating →", use_container_width=False):
            st.switch_page("pages/1_Auth.py")

with hero_right:
    # Sequential workflow animation:
    # Person (left) → uploads Resume → AI Robot processes → Result (right)
    # 8-second looping animation with 4 phases highlighted in step indicators.
    st.markdown("""
<div style="width:100%;max-width:580px;margin:4px auto 0;">
<svg viewBox="0 0 580 285" xmlns="http://www.w3.org/2000/svg"
     style="width:100%;height:auto;display:block;">
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
       PERSON — left, gently floating
  ════════════════════════════════════ -->
  <g>
    <animateTransform attributeName="transform" type="translate"
      values="0 0;0 -5;0 0" dur="3s" repeatCount="indefinite"/>
    <!-- head -->
    <circle cx="95" cy="72" r="22" fill="#FBBF24"/>
    <!-- hair -->
    <ellipse cx="95" cy="60" rx="22" ry="11" fill="#2D3748"/>
    <!-- eyes -->
    <circle cx="88" cy="75" r="3.5" fill="#2D3748"/>
    <circle cx="102" cy="75" r="3.5" fill="#2D3748"/>
    <!-- smile -->
    <path d="M88,84 Q95,92 102,84" fill="none" stroke="#2D3748"
          stroke-width="2" stroke-linecap="round"/>
    <!-- body / shirt -->
    <rect x="71" y="94" width="48" height="50" rx="11" fill="#4F46E5"/>
    <path d="M90,94 L95,104 L100,94" fill="white" opacity="0.5"/>
    <!-- arms -->
    <rect x="53" y="96" width="18" height="40" rx="9" fill="#4F46E5"/>
    <rect x="119" y="96" width="18" height="40" rx="9" fill="#4F46E5"/>
    <!-- hands -->
    <circle cx="62"  cy="136" r="9" fill="#FBBF24"/>
    <circle cx="128" cy="136" r="9" fill="#FBBF24"/>
    <!-- legs -->
    <rect x="77"  y="142" width="14" height="36" rx="7" fill="#1E3A5F"/>
    <rect x="99"  y="142" width="14" height="36" rx="7" fill="#1E3A5F"/>
  </g>
  <text x="95" y="200" text-anchor="middle" fill="#4F46E5"
        font-size="10" font-weight="700" font-family="Arial,sans-serif">YOU</text>

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
      values="124 96;124 96;124 96;248 102;260 102;260 102;124 96;124 96"
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
        font-size="9" font-weight="700" font-family="Arial,sans-serif">AI PROCESSING</text>

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
          font-size="10" font-weight="700" font-family="Arial,sans-serif">RESULT</text>
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
  <text x="95" y="263" text-anchor="middle" fill="#64748B"
        font-size="10" font-family="Arial,sans-serif">You</text>

  <line x1="109" y1="244" x2="176" y2="244" stroke="#C7D2FE" stroke-width="1.5"/>

  <!-- Step 2: UPLOAD (active 0.12 → 0.48) -->
  <circle cx="190" cy="244" r="11">
    <animate attributeName="fill"
      values="#C7D2FE;#C7D2FE;#4F46E5;#4F46E5;#C7D2FE;#C7D2FE;#C7D2FE"
      keyTimes="0;0.1;0.15;0.47;0.52;0.7;1" dur="8s" repeatCount="indefinite"/>
  </circle>
  <text x="190" y="248.5" text-anchor="middle" fill="white"
        font-size="11" font-weight="700" font-family="Arial,sans-serif">2</text>
  <text x="190" y="263" text-anchor="middle" fill="#64748B"
        font-size="10" font-family="Arial,sans-serif">Upload</text>

  <line x1="204" y1="244" x2="279" y2="244" stroke="#C7D2FE" stroke-width="1.5"/>

  <!-- Step 3: AI (active 0.5 → 0.72) -->
  <circle cx="293" cy="244" r="11">
    <animate attributeName="fill"
      values="#C7D2FE;#C7D2FE;#C7D2FE;#4F46E5;#4F46E5;#C7D2FE;#C7D2FE"
      keyTimes="0;0.42;0.5;0.55;0.72;0.78;1" dur="8s" repeatCount="indefinite"/>
  </circle>
  <text x="293" y="248.5" text-anchor="middle" fill="white"
        font-size="11" font-weight="700" font-family="Arial,sans-serif">3</text>
  <text x="293" y="263" text-anchor="middle" fill="#64748B"
        font-size="10" font-family="Arial,sans-serif">AI</text>

  <line x1="307" y1="244" x2="396" y2="244" stroke="#C7D2FE" stroke-width="1.5"/>

  <!-- Step 4: RESULT (active 0.72 → 0.95) -->
  <circle cx="410" cy="244" r="11">
    <animate attributeName="fill"
      values="#C7D2FE;#C7D2FE;#C7D2FE;#C7D2FE;#059669;#059669;#C7D2FE"
      keyTimes="0;0.6;0.65;0.72;0.78;0.95;1" dur="8s" repeatCount="indefinite"/>
  </circle>
  <text x="410" y="248.5" text-anchor="middle" fill="white"
        font-size="11" font-weight="700" font-family="Arial,sans-serif">4</text>
  <text x="410" y="263" text-anchor="middle" fill="#64748B"
        font-size="10" font-family="Arial,sans-serif">Result</text>
</svg>
</div>
""", unsafe_allow_html=True)

# ── Footer ─────────────────────────────────────────────────────────────────
st.markdown(
    '<p style="text-align:center;color:#94A3B8;font-size:0.75rem;'
    'border-top:1px solid #E2E8F0;padding-top:10px;margin-top:18px;">'
    "© 2025 Let's Evaluate · AI assists; humans decide.</p>",
    unsafe_allow_html=True,
)
