import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

/** Bump this whenever the report layout changes. Old reports whose stored
 * filename lacks this suffix will be automatically regenerated on next access. */
export const PDF_REPORT_VERSION = "2";

export type ReportQuestion = {
  category: string;
  question: string;
  code?: string;
  difficulty?: string;
  satisfaction?: string;
  notes?: string;
};

export type InterviewReportData = {
  candidateName: string;
  role: string;
  projectName?: string;
  round: string;
  interviewerName: string;
  decision: "yes" | "no" | string;
  justification: string;
  generatedAt: Date;
  techMatchScore?: number | null;
  aiRecommendation?: string;
  aiSummary?: string;
  strengths?: string[];
  concerns?: string[];
  questions: ReportQuestion[];
};

const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait
const MARGIN = 48;
const CONTENT_W = PAGE.w - MARGIN * 2;

const INK = rgb(0.11, 0.13, 0.18);
const FAINT = rgb(0.42, 0.45, 0.5);
const CYAN = rgb(0.08, 0.55, 0.7);
const GREEN = rgb(0.15, 0.55, 0.3);
const ORANGE = rgb(0.8, 0.42, 0.13);
const RED = rgb(0.72, 0.15, 0.15);
const RULE = rgb(0.88, 0.88, 0.85);
const NAVY = rgb(0.07, 0.1, 0.17);

/** Simple top-down layout engine over pdf-lib with automatic page breaks. */
class Writer {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  mono!: PDFFont;
  y = 0;
  pageNum = 0;
  footerTitle = "Internal Evaluation Report";

  async init() {
    this.doc = await PDFDocument.create();
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.mono = await this.doc.embedFont(StandardFonts.Courier);
    this.newPage();
  }

  newPage() {
    this.pageNum++;
    this.page = this.doc.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - MARGIN;
    // Footer rule on each page (except page 1 which has a bigger header)
    if (this.pageNum > 1) {
      this.page.drawLine({
        start: { x: MARGIN, y: 36 },
        end: { x: PAGE.w - MARGIN, y: 36 },
        thickness: 0.5,
        color: RULE,
      });
      this.page.drawText(`${this.footerTitle}  ·  Let's Evaluate  ·  Kanini`, {
        x: MARGIN,
        y: 22,
        size: 7.5,
        font: this.font,
        color: FAINT,
      });
    }
  }

  addFirstPageFooter(totalPages?: number) {
    void totalPages; // reserved for future use
    this.page.drawLine({
      start: { x: MARGIN, y: 36 },
      end: { x: PAGE.w - MARGIN, y: 36 },
      thickness: 0.5,
      color: RULE,
    });
    this.page.drawText(`${this.footerTitle}  ·  Let's Evaluate  ·  Kanini`, {
      x: MARGIN,
      y: 22,
      size: 7.5,
      font: this.font,
      color: FAINT,
    });
  }

  ensure(space: number) {
    if (this.y - space < MARGIN) this.newPage();
  }

  wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
    const lines: string[] = [];
    for (const raw of (text || "").split("\n")) {
      if (raw === "") {
        lines.push("");
        continue;
      }
      const words = raw.split(/\s+/);
      let line = "";
      for (const word of words) {
        // Hard-break words longer than the column.
        let w = word;
        while (font.widthOfTextAtSize(w, size) > maxW && w.length > 1) {
          let cut = w.length;
          while (
            cut > 1 &&
            font.widthOfTextAtSize(w.slice(0, cut), size) > maxW
          ) {
            cut--;
          }
          if (line) {
            lines.push(line);
            line = "";
          }
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        const trial = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(trial, size) > maxW && line) {
          lines.push(line);
          line = w;
        } else {
          line = trial;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  text(
    text: string,
    opts: {
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gap?: number;
      lineGap?: number;
    } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.font ?? this.font;
    const color = opts.color ?? INK;
    const indent = opts.indent ?? 0;
    const lineGap = opts.lineGap ?? 3;
    const maxW = CONTENT_W - indent;
    const lines = this.wrap(text, font, size, maxW);
    for (const line of lines) {
      this.ensure(size + lineGap);
      this.page.drawText(line, {
        x: MARGIN + indent,
        y: this.y - size,
        size,
        font,
        color,
      });
      this.y -= size + lineGap;
    }
    if (opts.gap) this.y -= opts.gap;
  }

  heading(label: string) {
    this.y -= 8;
    this.ensure(26);
    this.page.drawText(label.toUpperCase(), {
      x: MARGIN,
      y: this.y - 11,
      size: 11,
      font: this.bold,
      color: CYAN,
    });
    this.y -= 16;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE.w - MARGIN, y: this.y },
      thickness: 0.75,
      color: RULE,
    });
    this.y -= 10;
  }

  keyVal(label: string, value: string) {
    this.ensure(14);
    this.page.drawText(`${label}: `, {
      x: MARGIN,
      y: this.y - 10,
      size: 10,
      font: this.bold,
      color: FAINT,
    });
    const labelW = this.bold.widthOfTextAtSize(`${label}: `, 10);
    const lines = this.wrap(value || "—", this.font, 10, CONTENT_W - labelW);
    lines.forEach((line, i) => {
      if (i > 0) this.ensure(13);
      this.page.drawText(line, {
        x: MARGIN + (i === 0 ? labelW : 0),
        y: this.y - 10,
        size: 10,
        font: this.font,
        color: INK,
      });
      this.y -= 13;
    });
  }

  bullets(items: string[], color = INK) {
    for (const item of items) {
      const lines = this.wrap(item, this.font, 10, CONTENT_W - 14);
      lines.forEach((line, i) => {
        this.ensure(13);
        if (i === 0) {
          this.page.drawText("•", {
            x: MARGIN + 2,
            y: this.y - 10,
            size: 10,
            font: this.bold,
            color,
          });
        }
        this.page.drawText(line, {
          x: MARGIN + 14,
          y: this.y - 10,
          size: 10,
          font: this.font,
          color: INK,
        });
        this.y -= 13;
      });
    }
  }

  codeBlock(code: string) {
    const size = 8.5;
    const lines = this.wrap(code, this.mono, size, CONTENT_W - 16);
    const blockH = lines.length * (size + 3) + 12;
    this.ensure(blockH);
    const top = this.y;
    this.page.drawRectangle({
      x: MARGIN,
      y: top - blockH,
      width: CONTENT_W,
      height: blockH,
      color: rgb(0.96, 0.96, 0.94),
      borderColor: RULE,
      borderWidth: 0.5,
    });
    this.y -= 8;
    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN + 8,
        y: this.y - size,
        size,
        font: this.mono,
        color: INK,
      });
      this.y -= size + 3;
    }
    this.y -= 8;
  }
}

function satColor(sat?: string) {
  const s = (sat ?? "").toLowerCase();
  if (s.startsWith("satisf") && !s.startsWith("not")) return GREEN;
  if (s.startsWith("not")) return ORANGE;
  return FAINT;
}

export async function buildInterviewReportPdf(
  data: InterviewReportData,
): Promise<Buffer> {
  const w = new Writer();
  await w.init();
  w.footerTitle = `${data.candidateName}'s Internal Evaluation Report`;

  // ── Cover / title bar ──────────────────────────────────────────
  w.page.drawRectangle({
    x: 0,
    y: PAGE.h - 120,
    width: PAGE.w,
    height: 120,
    color: NAVY,
  });
  // Accent stripe
  w.page.drawRectangle({
    x: 0,
    y: PAGE.h - 120,
    width: 6,
    height: 120,
    color: CYAN,
  });
  // Centered title: "[Name]'s Internal Evaluation Report"
  const headerTitle = `${data.candidateName}'s Internal Evaluation Report`;
  const headerTitleSize = 15;
  const headerTitleW = w.bold.widthOfTextAtSize(headerTitle, headerTitleSize);
  w.page.drawText(headerTitle, {
    x: Math.max(MARGIN + 6, (PAGE.w - headerTitleW) / 2),
    y: PAGE.h - 34,
    size: headerTitleSize,
    font: w.bold,
    color: rgb(1, 1, 1),
  });
  // Role / project — centered
  const roleLineText = data.projectName
    ? `${data.role}  —  ${data.projectName}`
    : data.role;
  const roleLineW = w.font.widthOfTextAtSize(roleLineText, 10);
  w.page.drawText(roleLineText, {
    x: (PAGE.w - roleLineW) / 2,
    y: PAGE.h - 56,
    size: 10,
    font: w.font,
    color: rgb(0.7, 0.82, 0.95),
  });
  // Round · Date/Time — centered
  const roundDateText = `${data.round}  ·  ${data.generatedAt.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })}`;
  const roundDateW = w.font.widthOfTextAtSize(roundDateText, 9);
  w.page.drawText(roundDateText, {
    x: (PAGE.w - roundDateW) / 2,
    y: PAGE.h - 75,
    size: 9,
    font: w.font,
    color: rgb(0.55, 0.68, 0.8),
  });
  // Interviewer — centered
  const interviewerHeaderText = `Interviewer: ${data.interviewerName}`;
  const interviewerHeaderW = w.font.widthOfTextAtSize(interviewerHeaderText, 8.5);
  w.page.drawText(interviewerHeaderText, {
    x: (PAGE.w - interviewerHeaderW) / 2,
    y: PAGE.h - 93,
    size: 8.5,
    font: w.font,
    color: rgb(0.5, 0.62, 0.75),
  });
  w.y = PAGE.h - 120 - 18;

  // ── Decision banner ─────────────────────────────────────────────
  const isYes = data.decision === "yes";
  const isNo = data.decision === "no";
  const decBg = isYes ? rgb(0.9, 0.98, 0.9) : isNo ? rgb(0.99, 0.93, 0.88) : rgb(0.95, 0.95, 0.95);
  const decBorder = isYes ? GREEN : isNo ? ORANGE : FAINT;
  const decLabel = isYes
    ? "RECOMMENDATION: PROCEED TO NEXT ROUND"
    : isNo
      ? "RECOMMENDATION: DO NOT PROCEED"
      : String(data.decision || "PENDING").toUpperCase();
  w.ensure(44);
  w.page.drawRectangle({ x: MARGIN, y: w.y - 40, width: CONTENT_W, height: 40, color: decBg, borderColor: decBorder, borderWidth: 1.5 });
  const decW = w.bold.widthOfTextAtSize(decLabel, 12);
  w.page.drawText(decLabel, {
    x: MARGIN + (CONTENT_W - decW) / 2,
    y: w.y - 25,
    size: 12,
    font: w.bold,
    color: decBorder,
  });
  w.y -= 50;

  // ── Candidate & round details ──────────────────────────────────
  w.heading("Candidate & round details");
  w.keyVal("Candidate", data.candidateName);
  w.keyVal("Role", data.projectName ? `${data.role}  —  ${data.projectName}` : data.role);
  w.keyVal("Interviewer", data.interviewerName);
  w.keyVal("Interview round", data.round);
  w.keyVal("Date", data.generatedAt.toLocaleString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }));

  // ── AI analysis snapshot ───────────────────────────────────────
  if (
    data.techMatchScore != null ||
    data.aiRecommendation ||
    data.aiSummary ||
    (data.strengths && data.strengths.length) ||
    (data.concerns && data.concerns.length)
  ) {
    w.heading("AI analysis snapshot");
    if (data.techMatchScore != null) {
      w.keyVal("Tech match score", `${data.techMatchScore}%`);
    }
    if (data.aiRecommendation) {
      w.keyVal("AI recommendation", data.aiRecommendation);
    }
    if (data.aiSummary) {
      w.text(data.aiSummary, { gap: 5, color: INK });
    }
    if (data.strengths && data.strengths.length) {
      w.text("Identified strengths", { font: w.bold, size: 10, gap: 2 });
      w.bullets(data.strengths, GREEN);
      w.y -= 4;
    }
    if (data.concerns && data.concerns.length) {
      w.text("Concerns / gaps", { font: w.bold, size: 10, gap: 2 });
      w.bullets(data.concerns, ORANGE);
      w.y -= 4;
    }
  }

  // ── Assessment statistics ──────────────────────────────────────
  w.heading("Assessment summary");
  const satisfied = data.questions.filter(q => q.satisfaction?.toLowerCase().startsWith("satisf") && !q.satisfaction?.toLowerCase().startsWith("not")).length;
  const notSatisfied = data.questions.filter(q => q.satisfaction?.toLowerCase().startsWith("not")).length;
  const notAssessed = data.questions.length - satisfied - notSatisfied;

  w.ensure(62);
  const colW = CONTENT_W / 3;
  const statsY = w.y;
  // Stats boxes
  const statsData = [
    { label: "Satisfied", count: satisfied, color: GREEN, bg: rgb(0.9, 0.97, 0.88) },
    { label: "Not satisfied", count: notSatisfied, color: ORANGE, bg: rgb(0.99, 0.93, 0.88) },
    { label: "Not assessed", count: notAssessed, color: FAINT, bg: rgb(0.96, 0.96, 0.96) },
  ];
  statsData.forEach((s, i) => {
    const x = MARGIN + colW * i;
    w.page.drawRectangle({ x, y: statsY - 52, width: colW - 4, height: 52, color: s.bg, borderColor: s.color, borderWidth: 0.75 });
    const numW = w.bold.widthOfTextAtSize(String(s.count), 22);
    w.page.drawText(String(s.count), { x: x + (colW - 4 - numW) / 2, y: statsY - 28, size: 22, font: w.bold, color: s.color });
    const lblW = w.font.widthOfTextAtSize(s.label, 9);
    w.page.drawText(s.label, { x: x + (colW - 4 - lblW) / 2, y: statsY - 44, size: 9, font: w.font, color: s.color });
  });
  w.y = statsY - 62;

  // ── Questions ─────────────────────────────────────────────────
  w.heading(`Questions & assessment (${data.questions.length})`);
  if (data.questions.length === 0) {
    w.text("No questions were recorded for this round.", { color: FAINT });
  }
  data.questions.forEach((q, i) => {
    w.ensure(44);
    // Question number badge
    w.page.drawCircle({ x: MARGIN + 8, y: w.y - 9, size: 9, color: CYAN });
    w.page.drawText(String(i + 1), {
      x: MARGIN + (i + 1 < 10 ? 5 : 3),
      y: w.y - 12,
      size: 9,
      font: w.bold,
      color: rgb(1, 1, 1),
    });
    // Wrapped question text
    const qLines = w.wrap(q.question, w.bold, 10.5, CONTENT_W - 22);
    for (let qi = 0; qi < qLines.length; qi++) {
      if (qi > 0) { w.ensure(14); }
      w.page.drawText(qLines[qi], {
        x: MARGIN + 22,
        y: w.y - 12,
        size: 10.5,
        font: w.bold,
        color: INK,
      });
      if (qi < qLines.length - 1) w.y -= 14;
    }
    w.y -= 18;
    const meta = [q.category, q.difficulty].filter(Boolean).join("  ·  ");
    if (meta) {
      w.text(meta, { size: 8.5, color: FAINT, gap: 3, indent: 22 });
    }
    if (q.code) {
      w.y -= 2;
      w.codeBlock(q.code);
    }
    const sat = q.satisfaction?.trim();
    if (sat) {
      w.ensure(14);
      const satCol = satColor(sat);
      w.page.drawRectangle({
        x: MARGIN + 22,
        y: w.y - 17,
        width: w.bold.widthOfTextAtSize(`Assessment: ${sat}`, 9) + 10,
        height: 15,
        color: isYes && satCol === GREEN
          ? rgb(0.9, 0.97, 0.88)
          : satCol === ORANGE
            ? rgb(0.99, 0.93, 0.88)
            : rgb(0.95, 0.95, 0.95),
        borderColor: satCol,
        borderWidth: 0.5,
      });
      w.page.drawText(`Assessment: ${sat}`, {
        x: MARGIN + 27,
        y: w.y - 13,
        size: 9,
        font: w.bold,
        color: satCol,
      });
      w.y -= 20;
    }
    if (q.notes?.trim()) {
      const noteText = q.notes.trim();
      const noteFontSize = 9.5;
      const noteIndent = 22;
      const noteContentW = CONTENT_W - noteIndent - 12;
      const noteLines = w.wrap(noteText, w.font, noteFontSize, noteContentW);
      const noteBoxH = noteLines.length * (noteFontSize + 3.5) + 20;
      w.ensure(noteBoxH);
      const noteTop = w.y;
      // Amber highlight box
      w.page.drawRectangle({
        x: MARGIN + noteIndent, y: noteTop - noteBoxH,
        width: CONTENT_W - noteIndent, height: noteBoxH,
        color: rgb(1.0, 0.975, 0.84),
        borderColor: rgb(0.82, 0.65, 0.15), borderWidth: 0.75,
      });
      w.page.drawRectangle({
        x: MARGIN + noteIndent, y: noteTop - noteBoxH,
        width: 3, height: noteBoxH,
        color: rgb(0.82, 0.65, 0.15),
      });
      w.page.drawText("NOTES", {
        x: MARGIN + noteIndent + 8, y: noteTop - 10,
        size: 7.5, font: w.bold, color: rgb(0.65, 0.48, 0.08),
      });
      w.y = noteTop - 16;
      for (const nl of noteLines) {
        w.page.drawText(nl, {
          x: MARGIN + noteIndent + 8, y: w.y - noteFontSize,
          size: noteFontSize, font: w.font, color: rgb(0.2, 0.18, 0.05),
        });
        w.y -= noteFontSize + 3.5;
      }
      w.y -= 4;
    }
    w.y -= 6;
    // Divider between questions
    if (i < data.questions.length - 1) {
      w.page.drawLine({
        start: { x: MARGIN + 22, y: w.y },
        end: { x: PAGE.w - MARGIN, y: w.y },
        thickness: 0.4,
        color: RULE,
      });
      w.y -= 8;
    }
  });

  // ── Interviewer justification ──────────────────────────────────
  w.heading("Interviewer justification");
  const justText = data.justification?.trim() || "—";
  const justFontSize = 10;
  const justLines = w.wrap(justText, w.font, justFontSize, CONTENT_W - 24);
  const justBoxH = justLines.length * (justFontSize + 4) + 26;
  w.ensure(justBoxH + 6);
  const justTop = w.y;
  // Cyan highlight box
  w.page.drawRectangle({
    x: MARGIN, y: justTop - justBoxH,
    width: CONTENT_W, height: justBoxH,
    color: rgb(0.93, 0.96, 1.0),
    borderColor: CYAN, borderWidth: 1,
  });
  w.page.drawRectangle({
    x: MARGIN, y: justTop - justBoxH,
    width: 4, height: justBoxH,
    color: CYAN,
  });
  w.page.drawText("INTERVIEWER'S ASSESSMENT", {
    x: MARGIN + 12, y: justTop - 12,
    size: 7.5, font: w.bold, color: CYAN,
  });
  w.y = justTop - 20;
  for (const jl of justLines) {
    w.page.drawText(jl, {
      x: MARGIN + 12, y: w.y - justFontSize,
      size: justFontSize, font: w.font, color: INK,
    });
    w.y -= justFontSize + 4;
  }
  w.y -= 6;

  // Add footer to page 1
  w.addFirstPageFooter();

  const bytes = await w.doc.save();
  return Buffer.from(bytes);
}
