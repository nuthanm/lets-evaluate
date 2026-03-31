"""Bulk Actions — Export and Import questions, roles, and projects.

Export: Download all your questions, roles, and projects as a JSON file that
        can be shared with others or used as a backup.

Import: Upload a previously exported JSON file to add questions, roles, and
        projects to your account.  Duplicate detection prevents double-entries.

        ℹ️  If a role referenced by an imported question does not yet exist in
            your account, it will be created automatically and mapped to that
            question.
"""

import json
import html as _html
from collections import deque

import streamlit as st
from utils.auth import require_auth
from utils.database import export_data_for_user, import_data_for_user
from utils.ui import inject_common_css, render_authenticated_sidebar

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Bulk Actions · Let's Evaluate",
    page_icon="📤",
    layout="wide",
    initial_sidebar_state="expanded",
)

require_auth()
inject_common_css()
render_authenticated_sidebar()

user_id = st.session_state.get("user_id", "")

# ── Page header ───────────────────────────────────────────────────────────────
st.markdown(
    """
    <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);
                border-radius:16px;padding:28px 32px 24px;margin-bottom:24px;">
      <h1 style="color:white;font-size:2rem;font-weight:800;margin:0 0 6px;">
        📤 Bulk Actions
      </h1>
      <p style="color:rgba(255,255,255,.85);font-size:1rem;margin:0;">
        Export your questions, roles, and projects for sharing or backup — or
        import a file to load them in bulk.
      </p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_export, tab_import = st.tabs(["⬇️ Export", "⬆️ Import"])

# ═════════════════════════════════════════════════════════════════════════════
# EXPORT TAB
# ═════════════════════════════════════════════════════════════════════════════
with tab_export:
    st.markdown(
        """
        <div style="background:white;border-radius:12px;padding:24px 28px;
                    box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:20px;">
          <h3 style="margin:0 0 8px;font-size:1.15rem;color:#1E293B;">
            Export your data
          </h3>
          <p style="margin:0;color:#64748B;font-size:0.92rem;line-height:1.6;">
            Downloads a single <strong>JSON</strong> file containing all your
            projects, roles, and questions.  You can share this file with
            colleagues so they can import it into their own accounts.
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col_btn, col_info = st.columns([2, 5])
    with col_btn:
        if st.button("🔄 Prepare Export", use_container_width=True):
            with st.spinner("Collecting data…"):
                export_payload = export_data_for_user(user_id)
            st.session_state["export_payload"] = export_payload

    if "export_payload" in st.session_state:
        payload = st.session_state["export_payload"]
        n_proj = len(payload.get("projects", []))
        n_role = len(payload.get("roles", []))
        n_q    = len(payload.get("questions", []))

        st.markdown(
            f"""
            <div style="background:#F0FDF4;border:1.5px solid #86EFAC;
                        border-radius:10px;padding:16px 20px;margin:12px 0;">
              <strong style="color:#166534;">✅ Ready to download</strong>
              <ul style="margin:8px 0 0;color:#166534;font-size:0.9rem;">
                <li>{n_proj} project{"s" if n_proj != 1 else ""}</li>
                <li>{n_role} role{"s" if n_role != 1 else ""}</li>
                <li>{n_q} question{"s" if n_q != 1 else ""}</li>
              </ul>
            </div>
            """,
            unsafe_allow_html=True,
        )

        json_bytes = json.dumps(payload, indent=2, default=str).encode("utf-8")
        exported_at = payload.get("exported_at", "export")[:10]
        st.download_button(
            label="⬇️ Download JSON",
            data=json_bytes,
            file_name=f"lets_evaluate_export_{exported_at}.json",
            mime="application/json",
            use_container_width=True,
        )

# ═════════════════════════════════════════════════════════════════════════════
# IMPORT TAB
# ═════════════════════════════════════════════════════════════════════════════
with tab_import:
    st.markdown(
        """
        <div style="background:white;border-radius:12px;padding:24px 28px;
                    box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:20px;">
          <h3 style="margin:0 0 8px;font-size:1.15rem;color:#1E293B;">
            Import from a JSON file
          </h3>
          <p style="margin:0;color:#64748B;font-size:0.92rem;line-height:1.6;">
            Upload a <strong>JSON</strong> file that was previously exported
            from Let's Evaluate.  Duplicates are automatically detected and
            skipped so existing data is never overwritten.
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Note about auto-role creation
    st.info(
        "ℹ️ **Note:** If a question references a role that does not yet exist "
        "in your account, the role will be **created automatically** and mapped "
        "to that question.",
        icon=None,
    )

    uploaded_file = st.file_uploader(
        "Choose a JSON export file",
        type=["json"],
        help="Upload a .json file exported from Let's Evaluate",
    )

    if uploaded_file is not None:
        # Parse and preview
        try:
            raw = uploaded_file.read()
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            st.error(f"❌ Could not parse the file: {exc}")
            st.stop()

        n_proj = len(data.get("projects", []))
        n_role = len(data.get("roles", []))
        n_q    = len(data.get("questions", []))

        st.markdown(
            f"""
            <div style="background:#EEF2FF;border:1.5px solid #A5B4FC;
                        border-radius:10px;padding:16px 20px;margin:12px 0;">
              <strong style="color:#3730A3;">📋 File preview</strong>
              <ul style="margin:8px 0 0;color:#3730A3;font-size:0.9rem;">
                <li>{n_proj} project{"s" if n_proj != 1 else ""}</li>
                <li>{n_role} role{"s" if n_role != 1 else ""}</li>
                <li>{n_q} question{"s" if n_q != 1 else ""}</li>
              </ul>
            </div>
            """,
            unsafe_allow_html=True,
        )

        if n_proj + n_role + n_q == 0:
            st.warning("⚠️ The file contains no importable records.")
        else:
            if st.button("🚀 Start Import", use_container_width=False):
                st.markdown("---")
                st.markdown("#### Import progress")

                total_steps = n_proj + n_role + n_q
                progress_bar = st.progress(0)
                status_placeholder = st.empty()
                log_lines: deque[str] = deque(maxlen=50)

                def _on_progress(current: int, total: int, message: str):
                    pct = int((current / max(total, 1)) * 100)
                    progress_bar.progress(pct)
                    safe_msg = _html.escape(message)
                    log_lines.append(safe_msg)
                    # Show last 5 lines to keep the UI tidy
                    visible = list(log_lines)[-5:]
                    status_placeholder.markdown(
                        "<br>".join(
                            f'<span style="font-size:0.85rem;color:#475569;">'
                            f'▸ {line}</span>'
                            for line in visible
                        ),
                        unsafe_allow_html=True,
                    )

                with st.spinner("Importing…"):
                    try:
                        summary = import_data_for_user(
                            user_id=user_id,
                            data=data,
                            progress_callback=_on_progress,
                        )
                    except Exception as exc:
                        st.error(f"❌ Import failed: {exc}")
                        st.stop()

                progress_bar.progress(100)
                status_placeholder.empty()

                p_created = summary["projects"]["created"]
                p_skipped = summary["projects"]["skipped"]
                r_created = summary["roles"]["created"]
                r_skipped = summary["roles"]["skipped"]
                q_created = summary["questions"]["created"]
                q_skipped = summary["questions"]["skipped"]
                q_auto    = summary["questions"]["auto_roles"]

                auto_msg = (
                    f"<li>🔧 {q_auto} role{"s" if q_auto != 1 else ""} "
                    f"auto-created for missing roles</li>"
                    if q_auto else ""
                )

                st.markdown(
                    f"""
                    <div style="background:#F0FDF4;border:1.5px solid #86EFAC;
                                border-radius:10px;padding:20px 24px;margin-top:16px;">
                      <strong style="color:#166534;font-size:1.05rem;">
                        ✅ Import complete
                      </strong>
                      <ul style="margin:10px 0 0;color:#166534;font-size:0.9rem;
                                 line-height:1.8;">
                        <li>📁 Projects — {p_created} created, {p_skipped} skipped (already exist)</li>
                        <li>👥 Roles — {r_created} created, {r_skipped} skipped (already exist)</li>
                        <li>❓ Questions — {q_created} imported, {q_skipped} skipped (duplicates)</li>
                        {auto_msg}
                      </ul>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
