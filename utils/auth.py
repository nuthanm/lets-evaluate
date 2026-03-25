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
    if not st.session_state.get("authenticated", False):
        st.warning("⚠️ Please log in to access this page.")
        st.stop()


def get_current_user() -> dict:
    return {
        "id": st.session_state.get("user_id", ""),
        "name": st.session_state.get("user_name", ""),
        "email": st.session_state.get("user_email", ""),
    }
