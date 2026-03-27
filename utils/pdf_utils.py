import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Brand colours
INDIGO = colors.HexColor("#4F46E5")
INDIGO_LIGHT = colors.HexColor("#EEF2FF")
SLATE = colors.HexColor("#1E293B")
SLATE_LIGHT = colors.HexColor("#64748B")
WHITE = colors.white
GREEN = colors.HexColor("#16A34A")
AMBER = colors.HexColor("#D97706")
RED = colors.HexColor("#DC2626")
GRAY_BG = colors.HexColor("#F8FAFC")

STATUS_COLORS = {
    "Selected": GREEN,
    "Rejected": RED,
    "Hold": AMBER,
    "Pending": SLATE_LIGHT,
}


def _styles():
    base = getSampleStyleSheet()
    custom = {}
    custom["title"] = ParagraphStyle(
        "title", parent=base["Heading1"], fontSize=22, textColor=WHITE,
        spaceAfter=4, leading=26,
    )
    custom["subtitle"] = ParagraphStyle(
        "subtitle", parent=base["Normal"], fontSize=10, textColor=WHITE,
        spaceAfter=0,
    )
    custom["section"] = ParagraphStyle(
        "section", parent=base["Heading2"], fontSize=13, textColor=INDIGO,
        spaceBefore=12, spaceAfter=6, leading=16,
    )
    custom["body"] = ParagraphStyle(
        "body", parent=base["Normal"], fontSize=10, textColor=SLATE,
        spaceAfter=4, leading=14,
    )
    custom["small"] = ParagraphStyle(
        "small", parent=base["Normal"], fontSize=9, textColor=SLATE_LIGHT,
        spaceAfter=2,
    )
    custom["q_text"] = ParagraphStyle(
        "q_text", parent=base["Normal"], fontSize=10, textColor=SLATE,
        spaceAfter=2, leading=14, leftIndent=8,
    )
    custom["hint"] = ParagraphStyle(
        "hint", parent=base["Normal"], fontSize=9, textColor=SLATE_LIGHT,
        spaceAfter=6, leftIndent=16,
    )
    return custom


def generate_evaluation_pdf(evaluation_data: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=12 * mm,
        bottomMargin=18 * mm,
    )

    styles = _styles()
    story = []
    page_w = A4[0] - 36 * mm  # usable width

    # ── Header banner ──────────────────────────────────────────────────────
    header_data = [[
        Paragraph("🎯 Let's Evaluate", styles["title"]),
        Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M')} UTC",
            ParagraphStyle("hdr_r", parent=styles["subtitle"], alignment=TA_RIGHT),
        ),
    ]]
    header_table = Table(header_data, colWidths=[page_w * 0.65, page_w * 0.35])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INDIGO),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [INDIGO]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, -1), 14),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [6, 6, 0, 0]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # ── Candidate info card ────────────────────────────────────────────────
    status = evaluation_data.get("status", "Pending")
    status_color = STATUS_COLORS.get(status, SLATE_LIGHT)
    info_rows = [
        ["Candidate", evaluation_data.get("candidate_name", "—"),
         "Email", evaluation_data.get("candidate_email", "—")],
        ["Project", evaluation_data.get("project_name", "—"),
         "Role", evaluation_data.get("role_name", "—")],
        ["Interviewer", evaluation_data.get("interviewer_name") or "—",
         "Status", status],
    ]
    info_table = Table(
        [[Paragraph(f"<b>{r[0]}</b>", styles["small"]),
          Paragraph(str(r[1]), styles["body"]),
          Paragraph(f"<b>{r[2]}</b>", styles["small"]),
          Paragraph(str(r[3]), styles["body"])] for r in info_rows],
        colWidths=[page_w * 0.15, page_w * 0.35, page_w * 0.15, page_w * 0.35],
    )
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GRAY_BG),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 10))

    # ── AI Analysis Metrics ────────────────────────────────────────────────
    metrics = evaluation_data.get("initial_metrics", {})
    if metrics:
        story.append(Paragraph("AI Resume Analysis", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=INDIGO_LIGHT))
        story.append(Spacer(1, 4))

        score = metrics.get("tech_match_score", 0)
        exp = metrics.get("experience_level", "—")
        rec = metrics.get("recommendation", "—")
        rec_color = {"Proceed": GREEN, "Hold": AMBER, "Reject": RED}.get(rec, SLATE)

        # Derive matched/missing counts from tech_comparison for consistency
        tc_list = metrics.get("tech_comparison", [])
        if tc_list:
            matched_count = sum(1 for t in tc_list if t.get("status") == "Matched")
            missing_count = len(tc_list) - matched_count
        else:
            matched_count = len(metrics.get("matched_technologies", []))
            missing_count = len(metrics.get("missing_technologies", []))

        summary_rows = [
            [Paragraph("<b>Tech Match Score</b>", styles["small"]),
             Paragraph(f"<font color='#{INDIGO.hexval()[2:]}' size=14><b>{score}/100</b></font>", styles["body"]),
             Paragraph("<b>Experience Level</b>", styles["small"]),
             Paragraph(exp, styles["body"])],
            [Paragraph("<b>Recommendation</b>", styles["small"]),
             Paragraph(f"<b>{rec}</b>", ParagraphStyle("rec", parent=styles["body"], textColor=rec_color)),
             Paragraph("<b>Tech Coverage</b>", styles["small"]),
             Paragraph(f"Matched: {matched_count} / Missing: {missing_count}", styles["body"])],
            [Paragraph("<b>Summary</b>", styles["small"]),
             Paragraph(metrics.get("summary", "—"), styles["small"]),
             Paragraph("", styles["small"]),
             Paragraph("", styles["small"])],
        ]
        m_table = Table(summary_rows, colWidths=[page_w * 0.18, page_w * 0.32, page_w * 0.18, page_w * 0.32])
        m_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("SPAN", (1, 2), (3, 2)),
        ]))
        story.append(m_table)
        story.append(Spacer(1, 6))

        # Tech Stack Comparison table
        if tc_list:
            story.append(Paragraph("Tech Stack Comparison", styles["section"]))
            story.append(HRFlowable(width="100%", thickness=1, color=INDIGO_LIGHT))
            story.append(Spacer(1, 4))
            tc_header = [
                Paragraph("<b>Project Tech Stack</b>", styles["small"]),
                Paragraph("<b>Resume Tech Stack</b>", styles["small"]),
                Paragraph("<b>Match/Unmatch</b>", styles["small"]),
            ]
            tc_rows = [tc_header]
            for item in tc_list:
                tech = item.get("technology", "")
                status_val = item.get("status", "")
                resume_tech = tech if status_val == "Matched" else "Not matched"
                match_label = "Matched" if status_val == "Matched" else "Un Matched"
                match_color = GREEN if status_val == "Matched" else RED
                tc_rows.append([
                    Paragraph(tech, styles["body"]),
                    Paragraph(resume_tech, ParagraphStyle("rt", parent=styles["body"], textColor=GREEN if status_val == "Matched" else SLATE_LIGHT)),
                    Paragraph(match_label, ParagraphStyle("ml", parent=styles["body"], textColor=match_color)),
                ])
            tc_table = Table(tc_rows, colWidths=[page_w * 0.34, page_w * 0.34, page_w * 0.32])
            tc_style = [
                ("BACKGROUND", (0, 0), (-1, 0), INDIGO_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
            for ri, item in enumerate(tc_list, 1):
                if item.get("status") == "Matched":
                    tc_style.append(("BACKGROUND", (0, ri), (-1, ri), colors.HexColor("#F0FDF4")))
                else:
                    tc_style.append(("BACKGROUND", (0, ri), (-1, ri), colors.HexColor("#FFF7F7")))
            tc_table.setStyle(TableStyle(tc_style))
            story.append(tc_table)
            story.append(Spacer(1, 8))

        # Strengths & Concerns side by side
        strengths = metrics.get("strengths", [])
        concerns = metrics.get("concerns", [])

        sc_data = [[
            Paragraph("<b>💪 Strengths</b>", styles["small"]),
            Paragraph("<b>⚠️ Concerns</b>", styles["small"]),
        ], [
            Paragraph("<br/>".join(f"• {s}" for s in strengths) or "—", styles["small"]),
            Paragraph("<br/>".join(f"• {c}" for c in concerns) or "—", styles["small"]),
        ]]
        sc_table = Table(sc_data, colWidths=[page_w * 0.5, page_w * 0.5])
        sc_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), INDIGO_LIGHT),
            ("BACKGROUND", (0, 1), (-1, -1), WHITE),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(sc_table)
        story.append(Spacer(1, 10))

    q_sat = evaluation_data.get("q_satisfaction", {})

    def _sat_line(sat_key: str) -> str:
        sat = q_sat.get(sat_key, {})
        level = sat.get("level", "—")
        comment = sat.get("comment", "")
        if level and level != "—":
            return f"<i>Response: {level}</i>" + (f" — {comment}" if comment else "")
        return ""

    # ── Role-linked Questions ──────────────────────────────────────────────
    role_qs = evaluation_data.get("role_questions", [])
    if role_qs:
        story.append(Paragraph("Pre-Linked Role Questions", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=INDIGO_LIGHT))
        story.append(Spacer(1, 4))
        for i, q in enumerate(role_qs, 1):
            q_text = q.get("question_text", q.get("question", ""))
            story.append(Paragraph(f"<b>Q{i}.</b> {q_text}", styles["q_text"]))
            cat = q.get("category", "")
            if cat:
                story.append(Paragraph(f"<i>Category:</i> {cat}", styles["hint"]))
            sat_text = _sat_line(f"role_{q.get('id', i)}")
            if sat_text:
                story.append(Paragraph(sat_text, styles["hint"]))
        story.append(Spacer(1, 8))

    # ── Standard Questions ─────────────────────────────────────────────────
    std_qs = evaluation_data.get("standard_questions", [])
    if std_qs:
        story.append(Paragraph("Standard Interview Questions", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=INDIGO_LIGHT))
        story.append(Spacer(1, 4))
        for i, q in enumerate(std_qs, 1):
            story.append(Paragraph(f"<b>Q{i}.</b> {q.get('question', q.get('question_text', ''))}", styles["q_text"]))
            cat = q.get("category", "")
            hints = q.get("expected_answer_hints", "")
            if cat:
                story.append(Paragraph(f"<i>Category:</i> {cat}", styles["hint"]))
            if hints:
                story.append(Paragraph(f"<i>Hints:</i> {hints}", styles["hint"]))
            sat_text = _sat_line(f"std_{i}")
            if sat_text:
                story.append(Paragraph(sat_text, styles["hint"]))
        story.append(Spacer(1, 8))

    # ── Resume-based Questions ─────────────────────────────────────────────
    res_qs = evaluation_data.get("resume_questions", [])
    if res_qs:
        story.append(Paragraph("Resume-Based Questions", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=INDIGO_LIGHT))
        story.append(Spacer(1, 4))
        for i, q in enumerate(res_qs, 1):
            story.append(Paragraph(f"<b>Q{i}.</b> {q.get('question', q.get('question_text', ''))}", styles["q_text"]))
            cat = q.get("category", "")
            hints = q.get("expected_answer_hints", "")
            if cat:
                story.append(Paragraph(f"<i>Category:</i> {cat}", styles["hint"]))
            if hints:
                story.append(Paragraph(f"<i>Hints:</i> {hints}", styles["hint"]))
            sat_text = _sat_line(f"res_{i}")
            if sat_text:
                story.append(Paragraph(sat_text, styles["hint"]))
        story.append(Spacer(1, 8))

    # ── Comments ───────────────────────────────────────────────────────────
    comments = evaluation_data.get("comments", "")
    if comments:
        story.append(Paragraph("Evaluator Comments", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=INDIGO_LIGHT))
        story.append(Spacer(1, 4))
        story.append(Paragraph(comments, styles["body"]))
        story.append(Spacer(1, 8))

    # ── Footer ─────────────────────────────────────────────────────────────
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1")))
    story.append(Paragraph(
        "Generated by <b>Let's Evaluate</b> · Confidential Interview Document",
        ParagraphStyle("footer", parent=_styles()["small"], alignment=TA_CENTER, textColor=SLATE_LIGHT),
    ))

    doc.build(story)
    return buffer.getvalue()
