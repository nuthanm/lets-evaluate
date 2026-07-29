"""
Generate docs/proposal.pdf from docs/proposal.md using ReportLab.
Run from repo root: python scripts/generate_proposal_pdf.py
"""

import re
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
MD_PATH = ROOT / "docs" / "proposal.md"
PDF_PATH = ROOT / "docs" / "proposal.pdf"

# ── Colour palette ─────────────────────────────────────────────────────────────
BRAND_BLUE   = colors.HexColor("#1E40AF")  # indigo-800
BRAND_LIGHT  = colors.HexColor("#EFF6FF")  # blue-50
ACCENT       = colors.HexColor("#3B82F6")  # blue-500
GREY_TEXT    = colors.HexColor("#374151")  # gray-700
GREY_BORDER  = colors.HexColor("#E5E7EB")  # gray-200
HEADER_BG    = colors.HexColor("#1E3A8A")  # indigo-900
TABLE_HEAD   = colors.HexColor("#1E40AF")
TABLE_ALT    = colors.HexColor("#F0F7FF")

# ── Styles ─────────────────────────────────────────────────────────────────────
BASE = getSampleStyleSheet()

def style(name, parent="Normal", **kw):
    s = ParagraphStyle(name, parent=BASE[parent], **kw)
    return s

S_TITLE   = style("DocTitle",  "Title",   fontSize=22, textColor=colors.white,
                  spaceAfter=4, alignment=TA_CENTER, fontName="Helvetica-Bold")
S_SUB     = style("DocSub",    "Normal",  fontSize=11, textColor=colors.HexColor("#BFDBFE"),
                  spaceAfter=2, alignment=TA_CENTER)
S_H1      = style("H1",        "Heading1",fontSize=14, textColor=colors.white,
                  spaceBefore=14, spaceAfter=4, fontName="Helvetica-Bold",
                  backColor=BRAND_BLUE, leftIndent=-12, rightIndent=-12,
                  borderPadding=(6, 12, 6, 12))
S_H2      = style("H2",        "Heading2", fontSize=11, textColor=BRAND_BLUE,
                  spaceBefore=10, spaceAfter=3, fontName="Helvetica-Bold",
                  borderPadding=(2, 0, 2, 0))
S_H3      = style("H3",        "Heading3", fontSize=10, textColor=GREY_TEXT,
                  spaceBefore=6, spaceAfter=2, fontName="Helvetica-Bold")
S_BODY    = style("Body",       fontSize=9.5, textColor=GREY_TEXT,
                  spaceAfter=4, leading=14, alignment=TA_JUSTIFY)
S_BULLET  = style("Bullet",     fontSize=9.5, textColor=GREY_TEXT,
                  spaceAfter=3, leading=13, leftIndent=14, bulletIndent=4)
S_CODE    = style("Code",       fontSize=8.5, fontName="Courier",
                  textColor=colors.HexColor("#1F2937"), backColor=colors.HexColor("#F3F4F6"),
                  spaceAfter=4, leftIndent=10, borderPadding=4)
S_TH      = style("TH",         fontSize=9, textColor=colors.white,
                  fontName="Helvetica-Bold", alignment=TA_CENTER)
S_TD      = style("TD",         fontSize=8.5, textColor=GREY_TEXT, leading=12)
S_TD_BOLD = style("TDBold",     fontSize=8.5, textColor=GREY_TEXT,
                  fontName="Helvetica-Bold", leading=12)
S_CAPTION = style("Caption",    fontSize=8, textColor=colors.grey,
                  spaceAfter=2, alignment=TA_CENTER)

# ── Parser ─────────────────────────────────────────────────────────────────────

def inline(text: str) -> str:
    """Convert inline markdown (bold, italic, code, links) to ReportLab XML."""
    # Bold+italic
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<b><i>\1</i></b>', text)
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Italic
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
    # Inline code
    text = re.sub(r'`([^`]+)`',
                  r'<font name="Courier" size="8.5" color="#1D4ED8">\1</font>', text)
    # Links
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # Escape unescaped ampersands (not already &amp; etc.)
    text = re.sub(r'&(?!(amp|lt|gt|quot|apos);)', '&amp;', text)
    return text


def md_to_flowables(md_text: str):
    lines = md_text.splitlines()
    flowables = []
    i = 0
    in_table = False
    table_rows = []
    in_code = False
    code_lines = []

    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()

        # ── Fenced code block ────────────────────────────────────────────────
        if stripped.startswith("```"):
            if not in_code:
                in_code = True
                code_lines = []
            else:
                in_code = False
                flowables.append(Paragraph(
                    "<br/>".join(code_lines) or " ", S_CODE))
                flowables.append(Spacer(1, 4))
                code_lines = []
            i += 1
            continue

        if in_code:
            code_lines.append(stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
            i += 1
            continue

        # ── Markdown table ───────────────────────────────────────────────────
        if stripped.startswith("|"):
            if not in_table:
                in_table = True
                table_rows = []
            cells = [c.strip() for c in stripped.split("|")[1:-1]]
            # skip separator row
            if not all(re.match(r'^[-: ]+$', c) for c in cells):
                table_rows.append(cells)
            i += 1
            continue
        else:
            if in_table:
                flowables.append(_build_table(table_rows))
                flowables.append(Spacer(1, 6))
                table_rows = []
                in_table = False

        # ── Headings ─────────────────────────────────────────────────────────
        if stripped.startswith("#### "):
            flowables.append(Paragraph(inline(stripped[5:]), S_H3))
        elif stripped.startswith("### "):
            flowables.append(Paragraph(inline(stripped[4:]), S_H3))
        elif stripped.startswith("## "):
            text = inline(stripped[3:])
            flowables.append(Spacer(1, 4))
            flowables.append(HRFlowable(width="100%", thickness=0.5,
                                        color=GREY_BORDER, spaceAfter=2))
            flowables.append(Paragraph(text, S_H2))
        elif stripped.startswith("# "):
            text = inline(stripped[2:])
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph(text, S_H1))

        # ── Horizontal rule ──────────────────────────────────────────────────
        elif stripped.startswith("---"):
            flowables.append(HRFlowable(width="100%", thickness=1,
                                        color=GREY_BORDER, spaceAfter=4))

        # ── Bullet / list ────────────────────────────────────────────────────
        elif re.match(r'^[-*] ', stripped):
            txt = inline(stripped[2:])
            flowables.append(Paragraph(f"• &nbsp;{txt}", S_BULLET))

        # ── Numbered list ────────────────────────────────────────────────────
        elif re.match(r'^\d+\. ', stripped):
            txt = inline(re.sub(r'^\d+\. ', '', stripped))
            flowables.append(Paragraph(f"• &nbsp;{txt}", S_BULLET))

        # ── Blank line ───────────────────────────────────────────────────────
        elif stripped == "":
            flowables.append(Spacer(1, 4))

        # ── Normal paragraph ─────────────────────────────────────────────────
        else:
            flowables.append(Paragraph(inline(stripped), S_BODY))

        i += 1

    # flush any open table
    if in_table and table_rows:
        flowables.append(_build_table(table_rows))

    return flowables


def _build_table(rows):
    if not rows:
        return Spacer(1, 1)

    header = rows[0]
    data_rows = rows[1:]

    # Build paragraph cells
    def header_cell(text):
        return Paragraph(f"<b>{inline(text)}</b>", S_TH)

    def body_cell(text, row_idx, col_idx):
        s = S_TD_BOLD if col_idx == 0 else S_TD
        return Paragraph(inline(text), s)

    table_data = [[header_cell(c) for c in header]]
    for ri, row in enumerate(data_rows):
        # pad/trim to header length
        while len(row) < len(header):
            row.append("")
        row = row[:len(header)]
        table_data.append([body_cell(row[ci], ri, ci) for ci in range(len(row))])

    col_count = len(header)
    page_w = A4[0] - 3.6 * cm  # margins
    col_w = page_w / col_count

    t = Table(table_data, colWidths=[col_w] * col_count, repeatRows=1)
    style_cmds = [
        ("BACKGROUND",    (0, 0), (-1, 0),  TABLE_HEAD),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  9),
        ("BOTTOMPADDING", (0, 0), (-1, 0),  6),
        ("TOPPADDING",    (0, 0), (-1, 0),  6),
        ("GRID",          (0, 0), (-1, -1), 0.4, GREY_BORDER),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, TABLE_ALT]),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t


# ── Cover header ───────────────────────────────────────────────────────────────

def cover_header():
    # Blue banner
    banner_data = [[
        Paragraph("Let's Evaluate", S_TITLE),
    ]]
    banner = Table(banner_data, colWidths=[A4[0] - 3.6 * cm])
    banner.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), HEADER_BG),
        ("TOPPADDING",    (0, 0), (-1, -1), 18),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("ROUNDEDCORNERS", [6]),
    ]))

    sub_data = [[
        Paragraph("Project Proposal · Option B: Bring Your Own Use Case", S_SUB),
    ]]
    sub = Table(sub_data, colWidths=[A4[0] - 3.6 * cm])
    sub.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), BRAND_BLUE),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))

    return [banner, sub, Spacer(1, 14),
            HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceAfter=10)]


# ── Main ───────────────────────────────────────────────────────────────────────

def build_pdf():
    md_text = MD_PATH.read_text(encoding="utf-8")

    # Strip the first H1 line (we render it as cover banner instead)
    md_text = re.sub(r'^# .+\n', '', md_text, count=1)
    # Strip the bold subtitle line
    md_text = re.sub(r'^\*\*Category.+\*\*\n', '', md_text, count=1)

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title="Let's Evaluate — Project Proposal",
        author="Let's Evaluate Team",
        subject="Proposal for AI-Powered Technical Hiring Platform",
    )

    story = []
    story.extend(cover_header())
    story.extend(md_to_flowables(md_text))

    doc.build(story)
    print(f"PDF generated: {PDF_PATH}")


if __name__ == "__main__":
    build_pdf()
