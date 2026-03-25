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
[data-testid="stPageLink-NavLink"] {
  color: #64748B !important; font-size: 0.9rem !important;
  font-weight: 500 !important; background: none !important;
  border: none !important; padding: 0 !important;
  text-decoration: none !important; transition: color .2s !important;
}
[data-testid="stPageLink-NavLink"]:hover { color: #4F46E5 !important; }
div[data-testid="column"]:first-child [data-testid="stPageLink-NavLink"] {
  font-size: 1.6rem !important; font-weight: 800 !important;
  color: #4F46E5 !important; line-height: 2 !important;
}
.hero-badge {
  display: inline-block; background: #EEF2FF; color: #4F46E5;
  border-radius: 20px; padding: 4px 14px; font-size: 0.8rem;
  font-weight: 700; margin-bottom: 18px; letter-spacing: 0.03em;
}
.hero-headline {
  font-size: 2.6rem; font-weight: 800; color: #1E293B;
  line-height: 1.2; margin: 0 0 14px;
}
.hero-sub {
  font-size: 1.05rem; color: #4F46E5; font-weight: 700;
  letter-spacing: 0.04em; margin-bottom: 16px;
}
.hero-desc {
  font-size: 1rem; color: #475569; line-height: 1.7;
  margin-bottom: 28px; max-width: 480px;
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
<div style="padding: 24px 0 20px;">
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
    # Man-and-Robot workplace animation
    # Robot (left) + Person (right) at shared desk with laptops, three spinning
    # gears in the centre representing AI processing, rotating dashed arcs, and
    # a pulsing speech-bubble — mirroring the LottieFiles animation the user shared.
    st.markdown("""
<div style="width:100%;max-width:580px;margin:8px auto 0;">
<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg"
     style="width:100%;height:auto;display:block;">
  <defs>
    <style>
      @keyframes floatRobot  {0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)}}
      @keyframes floatPerson {0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)}}
    </style>
  </defs>

  <!-- DASHED ROTATING ARCS -->
  <circle cx="152" cy="205" r="87" fill="none" stroke="#BFDBFE" stroke-width="3.5" stroke-dasharray="12,8">
    <animateTransform attributeName="transform" type="rotate"
      from="0 152 205" to="360 152 205" dur="16s" repeatCount="indefinite"/>
  </circle>
  <circle cx="428" cy="205" r="87" fill="none" stroke="#BFDBFE" stroke-width="3.5" stroke-dasharray="12,8">
    <animateTransform attributeName="transform" type="rotate"
      from="0 428 205" to="-360 428 205" dur="13s" repeatCount="indefinite"/>
  </circle>

  <!-- ROBOT (gently floating) -->
  <g style="animation:floatRobot 4s ease-in-out infinite;transform-origin:152px 220px;">
    <rect x="150" y="119" width="4"  height="20" rx="2"  fill="#1A2870"/>
    <circle cx="152" cy="115" r="7" fill="#1A2870"/>
    <rect x="120" y="139" width="64" height="53" rx="12" fill="white" stroke="#1A2870" stroke-width="2"/>
    <rect x="126" y="145" width="52" height="41" rx="8"  fill="#1A2870"/>
    <circle cx="141" cy="168" r="9" fill="#F5C518"/>
    <circle cx="163" cy="168" r="9" fill="#F5C518"/>
    <circle cx="141" cy="168" r="5" fill="#1A2870"/>
    <circle cx="163" cy="168" r="5" fill="#1A2870"/>
    <circle cx="139" cy="165" r="2.5" fill="white" opacity="0.75"/>
    <circle cx="161" cy="165" r="2.5" fill="white" opacity="0.75"/>
    <rect x="146" y="192" width="12" height="12" rx="4" fill="#CBD5E1"/>
    <rect x="110" y="204" width="84" height="63" rx="12" fill="white" stroke="#1A2870" stroke-width="1.5"/>
    <rect x="119" y="212" width="66" height="47" rx="6"  fill="#EEF2FF"/>
    <rect x="127" y="220" width="50" height="9"  rx="4"  fill="#C7D2FE"/>
    <rect x="132" y="234" width="40" height="7"  rx="3"  fill="#C7D2FE" opacity="0.7"/>
    <rect x="137" y="246" width="30" height="6"  rx="3"  fill="#C7D2FE" opacity="0.5"/>
    <rect x="86"  y="206" width="24" height="44" rx="11" fill="white" stroke="#1A2870" stroke-width="1.5"/>
    <circle cx="98"  cy="250" r="10" fill="#1A2870"/>
    <rect x="194" y="212" width="24" height="36" rx="11" fill="white" stroke="#1A2870" stroke-width="1.5"/>
    <circle cx="206" cy="248" r="10" fill="#1A2870"/>
  </g>

  <!-- PERSON (floating, offset phase) -->
  <g style="animation:floatPerson 4s ease-in-out 2s infinite;transform-origin:428px 220px;">
    <ellipse cx="428" cy="162" rx="31" ry="19" fill="#1A2870"/>
    <circle  cx="428" cy="179" r="27" fill="#F5A07A"/>
    <rect x="399" y="149" width="58" height="26" rx="11" fill="#1A2870"/>
    <circle  cx="401" cy="180" r="9"  fill="#F5A07A"/>
    <rect x="418" y="205" width="20" height="15" rx="5" fill="#F5A07A"/>
    <path d="M385,224 C384,218 406,214 428,214 C450,214 472,218 471,224 L474,287 L382,287 Z" fill="#D94FC4"/>
    <path d="M415,214 Q428,224 441,214" fill="none" stroke="#C030AA" stroke-width="2.5"/>
    <path d="M385,233 C377,251 375,269 379,284 L404,284" stroke="#D94FC4" stroke-width="16" stroke-linecap="round" fill="none"/>
    <path d="M471,233 C479,251 481,269 477,284 L452,284" stroke="#D94FC4" stroke-width="16" stroke-linecap="round" fill="none"/>
    <ellipse cx="382" cy="282" rx="13" ry="9" fill="#F5A07A"/>
    <ellipse cx="474" cy="282" rx="13" ry="9" fill="#F5A07A"/>
  </g>

  <!-- LAPTOP SCREENS (in front of characters) -->
  <g transform="translate(215,256) rotate(-14) translate(-32,-43)">
    <rect x="0" y="0" width="64" height="46" rx="4" fill="#2D3A9E"/>
    <rect x="3" y="3" width="58" height="40" rx="3" fill="#14183C"/>
    <rect x="8" y="11" width="46" height="5"  rx="2.5" fill="#5B82D9" opacity="0.85"/>
    <rect x="8" y="20" width="34" height="4"  rx="2"   fill="#5B82D9" opacity="0.65"/>
    <rect x="8" y="28" width="42" height="4"  rx="2"   fill="#5B82D9" opacity="0.5"/>
  </g>
  <g transform="translate(416,256) rotate(13) translate(-46,-47)">
    <rect x="0" y="0" width="92" height="53" rx="4" fill="#2D3A9E"/>
    <rect x="3" y="3" width="86" height="47" rx="3" fill="#14183C"/>
    <rect x="9" y="12" width="68" height="6"  rx="3"   fill="#5B82D9" opacity="0.85"/>
    <rect x="9" y="22" width="52" height="5"  rx="2.5" fill="#5B82D9" opacity="0.65"/>
    <rect x="9" y="31" width="62" height="5"  rx="2.5" fill="#5B82D9" opacity="0.5"/>
  </g>

  <!-- SPINNING GEARS — large (dark navy, CCW) -->
  <g>
    <animateTransform attributeName="transform" type="rotate"
      from="0 318 228" to="-360 318 228" dur="10s" repeatCount="indefinite"/>
    <polygon points="311.6,194.6 314.8,184.1 321.2,184.1 324.4,194.6 329.1,195.9 337.2,188.4 342.7,191.6 340.2,202.3 343.7,205.8 354.4,203.3 357.6,208.8 350.1,216.9 351.4,221.6 361.9,224.8 361.9,231.2 351.4,234.4 350.1,239.1 357.6,247.2 354.4,252.7 343.7,250.2 340.2,253.7 342.7,264.4 337.2,267.6 329.1,260.1 324.4,261.4 321.2,271.9 314.8,271.9 311.6,261.4 306.9,260.1 298.8,267.6 293.3,264.4 295.8,253.7 292.3,250.2 281.6,252.7 278.4,247.2 285.9,239.1 284.6,234.4 274.1,231.2 274.1,224.8 284.6,221.6 285.9,216.9 278.4,208.8 281.6,203.3 292.3,205.8 295.8,202.3 293.3,191.6 298.8,188.4 306.9,195.9"
          fill="#3547B4"/>
    <circle cx="318" cy="228" r="19" fill="white"/>
    <circle cx="318" cy="228" r="7"  fill="#3547B4"/>
  </g>
  <!-- medium (blue, CW) -->
  <g>
    <animateTransform attributeName="transform" type="rotate"
      from="0 258 205" to="360 258 205" dur="8.3s" repeatCount="indefinite"/>
    <polygon points="252.6,181.6 255.2,173.1 260.8,173.1 263.4,181.6 267.4,182.9 274.5,177.6 279.0,180.8 276.1,189.3 278.6,192.6 287.5,192.5 289.2,197.8 281.9,202.9 281.9,207.1 289.2,212.2 287.5,217.5 278.6,217.4 276.1,220.7 279.0,229.2 274.5,232.4 267.4,227.1 263.4,228.4 260.8,236.9 255.2,236.9 252.6,228.4 248.6,227.1 241.5,232.4 237.0,229.2 239.9,220.7 237.4,217.4 228.5,217.5 226.8,212.2 234.1,207.1 234.1,202.9 226.8,197.8 228.5,192.5 237.4,192.6 239.9,189.3 237.0,180.8 241.5,177.6 248.6,182.9"
          fill="#5B82D9"/>
    <circle cx="258" cy="205" r="14" fill="white"/>
    <circle cx="258" cy="205" r="5"  fill="#5B82D9"/>
  </g>
  <!-- small (red, CCW) -->
  <g>
    <animateTransform attributeName="transform" type="rotate"
      from="0 281 172" to="-360 281 172" dur="6.5s" repeatCount="indefinite"/>
    <polygon points="275.9,154.7 278.4,148.1 283.6,148.1 286.1,154.7 289.6,156.2 296.0,153.3 299.7,157.0 296.8,163.4 298.3,166.9 304.9,169.4 304.9,174.6 298.3,177.1 296.8,180.6 299.7,187.0 296.0,190.7 289.6,187.8 286.1,189.3 283.6,195.9 278.4,195.9 275.9,189.3 272.4,187.8 266.0,190.7 262.3,187.0 265.2,180.6 263.7,177.1 257.1,174.6 257.1,169.4 263.7,166.9 265.2,163.4 262.3,157.0 266.0,153.3 272.4,156.2"
          fill="#E05050"/>
    <circle cx="281" cy="172" r="10" fill="white"/>
    <circle cx="281" cy="172" r="4"  fill="#E05050"/>
  </g>

  <!-- SPEECH BUBBLE (pulses in and out above person) -->
  <g>
    <animate attributeName="opacity"
      values="0;0;1;1;1;1;0;0" keyTimes="0;0.1;0.2;0.5;0.75;0.85;0.95;1"
      dur="5s" repeatCount="indefinite"/>
    <rect x="368" y="88" width="148" height="78" rx="13" fill="#5B6EC4"/>
    <polygon points="396,166 380,194 424,166" fill="#5B6EC4"/>
    <rect x="383" y="105" width="118" height="8" rx="4" fill="white" opacity="0.9"/>
    <rect x="383" y="121" width="94"  height="8" rx="4" fill="white" opacity="0.9"/>
    <rect x="383" y="137" width="110" height="8" rx="4" fill="white" opacity="0.9"/>
  </g>

  <!-- LAPTOP BASES -->
  <rect x="183" y="281" width="74" height="8" rx="3" fill="#1A2870"/>
  <rect x="372" y="282" width="88" height="7" rx="3" fill="#1A2870"/>

  <!-- SHARED DESK BAR -->
  <rect x="40"  y="288" width="500" height="25" rx="12" fill="#2D3A9E"/>
  <rect x="50"  y="290" width="480" height="9"  rx="4"  fill="#5B82D9" opacity="0.28"/>
</svg>
</div>
""", unsafe_allow_html=True)

# ── How It Works ───────────────────────────────────────────────────────────
st.markdown("<br>", unsafe_allow_html=True)
st.divider()
st.markdown("### ⚙️ How It Works")

st.html("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; font-family: 'Inter', sans-serif; }
@keyframes archNodeIn {
  0%   { opacity: 0; transform: translateX(-14px) scale(0.94); }
  100% { opacity: 1; transform: translateX(0)     scale(1);    }
}
@keyframes archGlow {
  0%, 100% { box-shadow: 0 4px 20px rgba(79,70,229,0.2); }
  50%       { box-shadow: 0 4px 32px rgba(79,70,229,0.5); }
}
.arch-wrap { width:100%; padding:8px; box-sizing:border-box; }
.arch-flow {
  display:flex; flex-direction:row; align-items:center; justify-content:center;
  gap:6px; flex-wrap:nowrap; overflow-x:auto; padding:4px 0 12px;
}
.arch-card {
  background:white; border:2px solid #4F46E5; border-radius:14px; padding:14px 16px;
  display:flex; flex-direction:column; align-items:center; gap:5px;
  animation:archNodeIn .5s ease forwards; opacity:0;
  box-shadow:0 4px 14px rgba(0,0,0,.07); transition:transform .2s,box-shadow .2s;
  min-width:120px; flex-shrink:0; text-align:center;
}
.arch-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(79,70,229,.2);}
.arch-hero-card{background:linear-gradient(135deg,#EEF2FF,#F5F3FF);animation:archNodeIn .5s ease .05s forwards,archGlow 3s ease .6s infinite;min-width:140px;}
.arch-card-icon{font-size:1.7rem;line-height:1;}
.arch-card-title{font-size:.9rem;font-weight:700;color:#1E293B;}
.arch-card-sub{font-size:.7rem;color:#64748B;text-align:center;}
.arch-card-badge{font-size:.74rem;font-weight:700;padding:3px 12px;border-radius:20px;margin-bottom:2px;letter-spacing:.03em;}
.arch-card-items{display:flex;flex-direction:column;align-items:stretch;gap:4px;width:100%;}
.arch-card-items span{font-size:.72rem;color:#475569;background:#F8FAFC;border-radius:6px;padding:3px 10px;text-align:center;}
.arch-h-arrow{font-size:1.5rem;color:#4F46E5;flex-shrink:0;animation:archNodeIn .4s ease forwards;opacity:0;padding:0 2px;line-height:1;}
.arch-footer-row{display:flex;justify-content:center;margin-top:18px;}
.arch-card-auth{border-color:#7C3AED;} .arch-card-dash{border-color:#2563EB;}
.arch-card-setup{border-color:#0891B2;} .arch-card-eval{border-color:#7C3AED;}
.arch-card-output{border-color:#059669;}
.arch-card-principle{border-color:#4F46E5;background:linear-gradient(135deg,#EEF2FF,#F5F3FF);min-width:400px;}
</style>
<div class="arch-wrap">
  <div class="arch-flow">
    <div class="arch-card arch-hero-card" style="animation-delay:.05s">
      <div class="arch-card-icon">⚖️</div>
      <div class="arch-card-title">Let's Evaluate</div>
      <div class="arch-card-sub">AI Hiring Platform</div>
    </div>
    <div class="arch-h-arrow" style="animation-delay:.2s">→</div>
    <div class="arch-card arch-card-auth" style="animation-delay:.25s">
      <div class="arch-card-icon">🔐</div>
      <div class="arch-card-title">Authentication</div>
      <div class="arch-card-items"><span>Login</span><span>Register</span><span>Password Reset</span></div>
    </div>
    <div class="arch-h-arrow" style="animation-delay:.4s">→</div>
    <div class="arch-card arch-card-dash" style="animation-delay:.45s">
      <div class="arch-card-icon">📊</div>
      <div class="arch-card-title">Dashboard</div>
      <div class="arch-card-items"><span>Metrics</span><span>Quick Access</span></div>
    </div>
    <div class="arch-h-arrow" style="animation-delay:.6s">→</div>
    <div class="arch-card arch-card-setup" style="animation-delay:.65s">
      <div class="arch-card-badge" style="background:#EFF6FF;color:#0891B2">📋 Setup</div>
      <div class="arch-card-items"><span>📁 Projects</span><span>👥 Roles</span><span>❓ Questions</span></div>
    </div>
    <div class="arch-h-arrow" style="animation-delay:.8s">→</div>
    <div class="arch-card arch-card-eval" style="animation-delay:.85s">
      <div class="arch-card-badge" style="background:#F5F3FF;color:#7C3AED">🤖 Evaluate</div>
      <div class="arch-card-items"><span>📄 Resume Upload</span><span>🤖 AI Analysis</span><span>🧑‍💼 Evaluation</span></div>
    </div>
    <div class="arch-h-arrow" style="animation-delay:1.0s">→</div>
    <div class="arch-card arch-card-output" style="animation-delay:1.05s">
      <div class="arch-card-badge" style="background:#F0FDF4;color:#059669">📤 Output</div>
      <div class="arch-card-items"><span>📋 PDF Reports</span><span>📂 Archives</span></div>
    </div>
  </div>
  <div class="arch-footer-row">
    <div class="arch-card arch-card-principle" style="animation-delay:1.2s">
      <div class="arch-card-icon">🧠</div>
      <div class="arch-card-title">AI Assists · Humans Decide</div>
      <div class="arch-card-sub">OpenAI GPT-4o-mini · Privacy-first · Transparent · Accountable</div>
    </div>
  </div>
</div>
""")

# ── Footer ─────────────────────────────────────────────────────────────────
st.markdown("<br>", unsafe_allow_html=True)
st.markdown(
    '<p style="text-align:center;color:#94A3B8;font-size:0.8rem;'
    'border-top:1px solid #E2E8F0;padding-top:20px;margin-top:48px;">'
    "© 2025 Let's Evaluate · AI assists; humans decide.</p>",
    unsafe_allow_html=True,
)
