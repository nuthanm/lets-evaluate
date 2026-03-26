import random
import string
from datetime import datetime, timezone, timedelta

import streamlit as st

from utils.database import (
    init_db, get_user_by_email, create_user,
    create_password_reset, get_valid_reset, mark_reset_used,
    update_user_password,
)
from utils.auth import hash_password, verify_password, login_user, require_auth, get_current_user
from utils.email_utils import send_password_reset_email
from utils.ui import inject_common_css, render_page_logo, LOGO_HTML, create_logo_favicon

st.set_page_config(
    page_title="Let's Evaluate – Auth",
    page_icon=create_logo_favicon(),
    layout="wide",
    initial_sidebar_state="collapsed",
)
init_db()

# Redirect authenticated users straight to dashboard
if st.session_state.get("authenticated", False):
    st.switch_page("pages/2_Dashboard.py")

# ── CSS ────────────────────────────────────────────────────────────────────
inject_common_css()
st.markdown("""
<style>
/* ── Auth page layout ── */
.auth-page-header {
  text-align: center;
  padding: 32px 0 24px;
}
.auth-tagline {
  color: #64748B;
  font-size: 0.95rem;
  margin-top: 8px;
}

/* ── Auth card ── */
.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 4px;
}
.auth-sub { color: #64748B; font-size: 0.9rem; margin-bottom: 20px; }

/* ── Column card styling ── */
[data-testid="column"] > div:first-child > div:first-child {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 16px;
  padding: 28px 24px;
}

/* ── Vertical divider ── */
.auth-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}
.auth-divider-line {
  width: 1px;
  height: 80%;
  background: linear-gradient(to bottom, transparent, #CBD5E1, transparent);
}
.auth-divider-or {
  position: absolute;
  background: #fff;
  color: #94A3B8;
  font-size: 0.8rem;
  padding: 6px 8px;
  border-radius: 50%;
  border: 1px solid #E2E8F0;
}

.divider-text {
  text-align: center; color: #94A3B8; font-size: 0.85rem; margin: 8px 0;
}

/* ── CTA button ── */
.stButton > button {
  border-radius: 10px !important;
  font-weight: 600 !important;
}
</style>
""", unsafe_allow_html=True)

# ── Session state init ─────────────────────────────────────────────────────
if "auth_view" not in st.session_state:
    st.session_state["auth_view"] = "login"
if "reset_email" not in st.session_state:
    st.session_state["reset_email"] = ""
if "reset_step" not in st.session_state:
    st.session_state["reset_step"] = 1
if "reset_user_id" not in st.session_state:
    st.session_state["reset_user_id"] = ""

view = st.session_state["auth_view"]

# ── Brand header ────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="auth-page-header">
  <div style="display:flex;justify-content:center;">{LOGO_HTML}</div>
  <div class="auth-tagline">AI-assisted · Human-driven · Interview platform</div>
</div>
""", unsafe_allow_html=True)

# ===========================================================================
# FORGOT PASSWORD (full-width centred)
# ===========================================================================
if view == "forgot":
    _, mid, _ = st.columns([1, 2, 1])
    with mid:
        st.markdown('<div class="auth-title">🔑 Reset Password</div>', unsafe_allow_html=True)

        step = st.session_state["reset_step"]

        if step == 1:
            st.markdown('<div class="auth-sub">Enter your account email to receive a reset code.</div>', unsafe_allow_html=True)
            fp_email = st.text_input("Email address", key="fp_email_input")
            provider = st.selectbox("Email provider", ["gmail", "outlook", "yahoo"], key="fp_provider")

            col_send, col_back = st.columns(2)
            with col_send:
                if st.button("📧 Send Code", use_container_width=True, type="primary"):
                    user = get_user_by_email(fp_email)
                    if not user:
                        st.error("No account found with that email.")
                    else:
                        passcode = "".join(random.choices(string.digits, k=6))
                        expires = datetime.now(timezone.utc) + timedelta(minutes=15)
                        create_password_reset(user["id"], passcode, expires)
                        ok, err = send_password_reset_email(fp_email, passcode, provider)
                        if ok:
                            st.session_state["reset_email"] = fp_email
                            st.session_state["reset_user_id"] = user["id"]
                            st.session_state["reset_step"] = 2
                            st.success("Code sent! Check your email.")
                            st.rerun()
                        else:
                            st.error(f"Failed to send email: {err}")
            with col_back:
                if st.button("← Back to Login", use_container_width=True):
                    st.session_state["auth_view"] = "login"
                    st.session_state["reset_step"] = 1
                    st.rerun()

        else:
            st.markdown('<div class="auth-sub">Enter the 6-digit code sent to your email and choose a new password.</div>', unsafe_allow_html=True)
            code = st.text_input("6-digit code", max_chars=6, key="fp_code")
            new_pw = st.text_input("New password", type="password", key="fp_newpw")
            conf_pw = st.text_input("Confirm new password", type="password", key="fp_confpw")

            col_reset, col_back = st.columns(2)
            with col_reset:
                if st.button("🔒 Reset Password", use_container_width=True, type="primary"):
                    if new_pw != conf_pw:
                        st.error("Passwords do not match.")
                    elif len(new_pw) < 8:
                        st.error("Password must be at least 8 characters.")
                    else:
                        uid = st.session_state["reset_user_id"]
                        reset = get_valid_reset(uid, code)
                        if not reset:
                            st.error("Invalid or expired code. Please try again.")
                        else:
                            update_user_password(uid, hash_password(new_pw))
                            mark_reset_used(reset["id"])
                            st.success("Password reset! Please log in.")
                            st.session_state["auth_view"] = "login"
                            st.session_state["reset_step"] = 1
                            st.rerun()
            with col_back:
                if st.button("← Back", use_container_width=True):
                    st.session_state["reset_step"] = 1
                    st.rerun()

# ===========================================================================
# LOGIN + REGISTER (two columns)
# ===========================================================================
else:
    left, mid_col, right = st.columns([10, 1, 10], gap="small")

    # ── LEFT: Login ────────────────────────────────────────────────────────
    with left:
        st.markdown('<div class="auth-title">👋 Welcome Back</div>', unsafe_allow_html=True)
        st.markdown('<div class="auth-sub">Sign in to your Let\'s Evaluate account</div>', unsafe_allow_html=True)

        login_email = st.text_input("Email", key="login_email")
        login_pass = st.text_input("Password", type="password", key="login_pass")

        if st.button("🚀 Sign In", use_container_width=True, type="primary", key="btn_login"):
            if not login_email or not login_pass:
                st.error("Please fill in all fields.")
            else:
                user = get_user_by_email(login_email)
                if not user or not verify_password(login_pass, user["password_hash"]):
                    st.error("Invalid email or password.")
                elif not user.get("is_active", True):
                    st.error("Account is deactivated.")
                else:
                    login_user(user)
                    st.success("Logged in!")
                    st.switch_page("pages/2_Dashboard.py")

        st.markdown('<div class="divider-text">— or —</div>', unsafe_allow_html=True)

        col_fp, col_reg = st.columns(2)
        with col_fp:
            if st.button("🔑 Forgot Password?", use_container_width=True, key="btn_forgot"):
                st.session_state["auth_view"] = "forgot"
                st.session_state["reset_step"] = 1
                st.rerun()
        with col_reg:
            if st.button("📝 Register", use_container_width=True, key="btn_to_reg"):
                st.session_state["auth_view"] = "register"
                st.rerun()

    # ── MIDDLE: Vertical divider ───────────────────────────────────────────
    with mid_col:
        st.markdown("""
        <div class="auth-divider">
          <div class="auth-divider-line"></div>
        </div>
        """, unsafe_allow_html=True)

    # ── RIGHT: Register ────────────────────────────────────────────────────
    with right:
        st.markdown('<div class="auth-title">✨ Create Account</div>', unsafe_allow_html=True)
        st.markdown('<div class="auth-sub">Join Let\'s Evaluate and start hiring smarter</div>', unsafe_allow_html=True)

        reg_name = st.text_input("Full name", key="reg_name")
        reg_email = st.text_input("Email", key="reg_email")
        reg_pass = st.text_input("Password", type="password", key="reg_pass",
                                  help="Minimum 8 characters")
        reg_conf = st.text_input("Confirm password", type="password", key="reg_conf")

        if st.button("🎉 Create Account", use_container_width=True, type="primary", key="btn_register"):
            if not all([reg_name, reg_email, reg_pass, reg_conf]):
                st.error("Please fill in all fields.")
            elif reg_pass != reg_conf:
                st.error("Passwords do not match.")
            elif len(reg_pass) < 8:
                st.error("Password must be at least 8 characters.")
            elif get_user_by_email(reg_email):
                st.error("An account with this email already exists.")
            else:
                new_user = create_user(reg_email, reg_name, hash_password(reg_pass))
                login_user({**new_user, "email": reg_email, "name": reg_name})
                st.success("Account created! Redirecting…")
                st.switch_page("pages/2_Dashboard.py")

        st.markdown('<div class="divider-text">Already have an account?</div>', unsafe_allow_html=True)
        if st.button("← Back to Sign In", use_container_width=True, key="btn_to_login"):
            st.session_state["auth_view"] = "login"
            st.rerun()
