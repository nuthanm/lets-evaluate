import streamlit as st
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def login_user(user: dict):
    st.session_state["authenticated"] = True
    st.session_state["user_id"] = user["id"]
    st.session_state["user_name"] = user["name"]
    st.session_state["user_email"] = user["email"]


def logout_user():
    for key in ["authenticated", "user_id", "user_name", "user_email"]:
        st.session_state.pop(key, None)


def require_auth():
    # Handle sign-out triggered by the header link BEFORE checking auth status.
    # logout_user() is safe to call even when the session is already cleared
    # (it uses .pop(key, None)), so we process the param unconditionally and
    # redirect to the landing page without risking a spurious Auth redirect.
    if st.query_params.get("action") == "signout":
        logout_user()
        st.query_params.clear()
        st.switch_page("app.py")
    if not st.session_state.get("authenticated", False):
        st.switch_page("pages/1_Auth.py")


def get_current_user() -> dict:
    return {
        "id": st.session_state.get("user_id", ""),
        "name": st.session_state.get("user_name", ""),
        "email": st.session_state.get("user_email", ""),
    }
