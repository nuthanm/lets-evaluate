import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { getBrand } from "@/lib/brand";

/** Bump this whenever the report layout changes. Old reports whose stored
 * filename lacks this suffix will be automatically regenerated on next access. */
export const PDF_REPORT_VERSION = "7";

export type ReportQuestion = {
  category: string;
  question: string;
  code?: string;
  difficulty?: string;
  satisfaction?: string;
  notes?: string;
};

export type ReportCodingExercise = {
  title: string;
  language: string;
  scenario: string;
  candidateCode: string;
  candidateNotes?: string;
  status: string;
  submittedAt?: string | null;
  pasteEvents?: number;
  blurEvents?: number;
  syncEvents?: number;
};

export type InterviewReportData = {
  candidateName: string;
  role: string;
  projectName?: string;
  round: string;
  assessorRole?: "interviewer" | "manager" | "hr" | string;
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
  codingExercise?: ReportCodingExercise | null;
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
const PURPLE = rgb(0.46, 0.33, 0.72);
const RULE = rgb(0.88, 0.88, 0.85);
const NAVY = rgb(0.07, 0.1, 0.17);

function sanitizePdfText(value: string): string {
  // Standard PDF built-in fonts only support WinAnsi-like glyphs.
  return (value ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, " ");
}

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
      const _brand = getBrand();
      this.page.drawText(sanitizePdfText(`${this.footerTitle}  ·  ${_brand.appTitle}  ·  ${_brand.orgName}`), {
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
    const _brandFp = getBrand();
    this.page.drawText(sanitizePdfText(`${this.footerTitle}  ·  ${_brandFp.appTitle}  ·  ${_brandFp.orgName}`), {
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
    for (const rawUnsafe of sanitizePdfText(text || "").split("\n")) {
      const raw = rawUnsafe;
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
  if (s.includes("not satisfied")) return ORANGE;
  if (s.includes("not assessed")) return FAINT;
  return FAINT;
}

type JustificationSection = { label: string; content: string };

function toPoints(content: string): string[] {
  const lines = sanitizePdfText(content || "")
    .split("\n")
    .map((l) => l.replace(/\*\*/g, "").trim())
    .filter(Boolean);
  const bullets = lines
    .map((l) => l.match(/^[-•*]\s+(.+)$/)?.[1] ?? null)
    .filter(Boolean) as string[];
  if (bullets.length > 1) return bullets;
  return sanitizePdfText(content || "")
    .replace(/\*\*/g, "")
    .split(/\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length > 15);
}

function parseJustificationSections(text: string): JustificationSection[] {
  const pattern = /(Overall Assessment|Question Performance|Strengths|Concerns \/ Gaps|Recommendation):\s*/gi;
  const sections: JustificationSection[] = [];
  let lastIndex = 0;
  let lastLabel = "";
  for (const m of text.matchAll(pattern)) {
    if (lastLabel && m.index !== undefined) {
      sections.push({
        label: lastLabel,
        content: text.slice(lastIndex, m.index).trim(),
      });
    }
    lastLabel = m[1];
    lastIndex = (m.index ?? 0) + m[0].length;
  }
  if (lastLabel) {
    sections.push({ label: lastLabel, content: text.slice(lastIndex).trim() });
  }
  return sections.length > 0 ? sections : [{ label: "Assessment", content: text.trim() }];
}

function normalizeReportLine(line: string): string {
  return sanitizePdfText(line)
    .replace(/\*\*/g, "")
    .replace(/^[-•]\s*/, "")
    .trim();
}

function sectionTheme(label: string) {
  switch (label) {
    case "Question Performance":
      return { bg: rgb(0.92, 0.97, 1), border: CYAN, title: CYAN };
    case "Strengths":
      return { bg: rgb(0.92, 0.98, 0.92), border: GREEN, title: GREEN };
    case "Concerns / Gaps":
      return { bg: rgb(1, 0.95, 0.9), border: ORANGE, title: ORANGE };
    case "Recommendation":
      return { bg: rgb(0.96, 0.94, 1), border: PURPLE, title: PURPLE };
    case "Overall Assessment":
    default:
      return { bg: rgb(0.94, 0.96, 1), border: NAVY, title: NAVY };
  }
}

type PerfEntry = {
  category: string;
  difficulty: string;
  question: string;
  outcome: string;
  notes: string;
};

function parseQuestionPerformance(content: string): PerfEntry[] {
  const entries: PerfEntry[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[-•]?\s*\*\*[^*]+\*\*:?\s*$/i.test(line)) continue;

    const mA = line.match(
      /^[-•\d.]*\s*\*\*([^*(]+?)(?:\s*\(([^)]+)\))?\*\*:\s*(.+?)\s+Outcome:\s*(Satisfied|Not satisfied|Not assessed)[,.]?\s*(?:Notes?:\s*(.+))?$/i,
    );
    if (mA) {
      entries.push({
        category: mA[1]?.trim() ?? "",
        difficulty: mA[2]?.trim() ?? "",
        question: mA[3]?.trim() ?? "",
        outcome: mA[4]?.trim() ?? "",
        notes: mA[5]?.trim() ?? "",
      });
      continue;
    }

    const mB = line.match(
      /^(?:\d+\.|[-•])\s*\[([^\]]+)\]\s*\(([^)]+)\)\s*(.+?)\s*[-–]\s*Outcome:\s*([^.N]+?)\.?\s*(?:Notes?:\s*(.+))?$/i,
    );
    if (mB) {
      entries.push({
        category: mB[1]?.trim() ?? "",
        difficulty: mB[2]?.trim() ?? "",
        question: mB[3]?.trim() ?? "",
        outcome: mB[4]?.trim() ?? "",
        notes: mB[5]?.trim() ?? "",
      });
      continue;
    }

    const mC = line.match(
      /^(?:\d+\.|[-•])\s*(.+?)\s*\(([^)]+)\)\s*[-–]\s*Outcome:\s*([^.N]+?)\.?\s*(?:Notes?:\s*(.+))?$/i,
    );
    if (mC) {
      entries.push({
        category: "",
        difficulty: mC[2]?.trim() ?? "",
        question: mC[1]?.trim() ?? "",
        outcome: mC[3]?.trim() ?? "",
        notes: mC[4]?.trim() ?? "",
      });
    }
  }
  return entries;
}

function renderGenericSectionCard(w: Writer, label: string, content: string) {
  const theme = sectionTheme(label);
  const title = label || "Assessment";
  const baseLines = content
    .split("\n")
    .map(normalizeReportLine)
    .filter(Boolean);
  const lines = baseLines.length > 0 ? baseLines : ["—"];
  const size = 10;
  const lineGap = 4;
  const wrapped = lines.map((line) => w.wrap(line, w.font, size, CONTENT_W - 24));
  const bodyRows = wrapped.reduce((sum, arr) => sum + arr.length, 0);
  const boxH = 22 + bodyRows * (size + lineGap) + 12;

  w.ensure(boxH + 6);
  const top = w.y;
  w.page.drawRectangle({
    x: MARGIN,
    y: top - boxH,
    width: CONTENT_W,
    height: boxH,
    color: theme.bg,
    borderColor: theme.border,
    borderWidth: 1,
  });
  w.page.drawRectangle({ x: MARGIN, y: top - boxH, width: 4, height: boxH, color: theme.border });
  w.page.drawText(title.toUpperCase(), {
    x: MARGIN + 12,
    y: top - 13,
    size: 7.5,
    font: w.bold,
    color: theme.title,
  });

  w.y = top - 22;
  for (const set of wrapped) {
    for (const line of set) {
      w.page.drawText(line, {
        x: MARGIN + 12,
        y: w.y - size,
        size,
        font: w.font,
        color: INK,
      });
      w.y -= size + lineGap;
    }
  }
  w.y -= 8;
}

function renderQuestionPerformanceCard(
  w: Writer,
  content: string,
  reportQuestions: ReportQuestion[] = [],
) {
  const parsed = parseQuestionPerformance(content);
  const fallback = reportQuestions.map((q) => ({
    category: q.category ?? "",
    difficulty: q.difficulty ?? "",
    question: q.question ?? "",
    outcome: q.satisfaction ?? "Not assessed",
    notes: q.notes ?? "",
  }));
  const entries = parsed.length > 0 ? parsed : fallback;

  if (entries.length === 0) {
    renderGenericSectionCard(w, "Question Performance", content);
    return;
  }

  const theme = sectionTheme("Question Performance");
  const isOk = (o: string) => {
    const v = (o ?? "").toLowerCase().trim();
    return v.startsWith("satisf") && !v.startsWith("not");
  };
  const isBad = (o: string) => (o ?? "").toLowerCase().includes("not satisfied");

  const groups = new Map<string, (PerfEntry & { idx: number })[]>();
  let idx = 0;
  for (const e of entries) {
    const key = normalizeReportLine(e.category) || "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ ...e, idx: ++idx });
  }

  const sectionHeaderH = 30;
  w.ensure(sectionHeaderH + 8);
  const top = w.y;
  w.page.drawRectangle({
    x: MARGIN,
    y: top - sectionHeaderH,
    width: CONTENT_W,
    height: sectionHeaderH,
    color: theme.bg,
    borderColor: theme.border,
    borderWidth: 1,
  });
  w.page.drawRectangle({ x: MARGIN, y: top - sectionHeaderH, width: 4, height: sectionHeaderH, color: theme.border });
  w.page.drawText("QUESTION PERFORMANCE", {
    x: MARGIN + 12,
    y: top - 13,
    size: 7.5,
    font: w.bold,
    color: theme.title,
  });
  const summaryText = `${entries.length} question${entries.length !== 1 ? "s" : ""}  ·  ${groups.size} categor${groups.size !== 1 ? "ies" : "y"}`;
  const summaryW = w.bold.widthOfTextAtSize(summaryText, 8);
  w.page.drawRectangle({
    x: PAGE.w - MARGIN - summaryW - 14,
    y: top - 22,
    width: summaryW + 8,
    height: 12,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.77, 0.84, 0.9),
    borderWidth: 0.5,
  });
  w.page.drawText(summaryText, {
    x: PAGE.w - MARGIN - summaryW - 10,
    y: top - 16,
    size: 8,
    font: w.bold,
    color: FAINT,
  });
  w.y = top - sectionHeaderH - 6;

  for (const [category, catEntries] of groups.entries()) {
    const satCount = catEntries.filter((e) => isOk(e.outcome)).length;
    const badCount = catEntries.filter((e) => isBad(e.outcome)).length;
    const naCount = catEntries.length - satCount - badCount;
    const allGood = satCount === catEntries.length;
    const anyBad = badCount > 0;

    const titleSize = 10;
    const textSize = 9.2;
    const metaSize = 8.4;
    let catH = 24;
    for (const e of catEntries) {
      const outcome = normalizeReportLine(e.outcome) || "Not assessed";
      const outText = isOk(outcome) ? "Satisfied" : isBad(outcome) ? "Not satisfied" : "Not assessed";
      const outW = w.bold.widthOfTextAtSize(outText, 7.2) + 8;
      const qMaxW = Math.max(160, CONTENT_W - 36 - outW - 16);
      const qLines = w.wrap(normalizeReportLine(e.question), w.font, textSize, qMaxW);
      catH += 14; // meta row
      catH += qLines.length * (textSize + 3) + 5;
      if (e.notes?.trim()) {
        catH += w.wrap(normalizeReportLine(e.notes), w.font, metaSize, CONTENT_W - 54).length * (metaSize + 2.6) + 4;
      }
      catH += 6;
    }

    w.ensure(catH + 8);
    const catTop = w.y;
    w.page.drawRectangle({
      x: MARGIN,
      y: catTop - catH,
      width: CONTENT_W,
      height: catH,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.87, 0.9, 0.9),
      borderWidth: 0.8,
    });

    const catHeaderBg = allGood ? rgb(0.9, 0.97, 0.9) : anyBad ? rgb(0.99, 0.93, 0.88) : rgb(0.97, 0.97, 0.95);
    w.page.drawRectangle({
      x: MARGIN,
      y: catTop - 24,
      width: CONTENT_W,
      height: 24,
      color: catHeaderBg,
      borderColor: rgb(0.87, 0.9, 0.9),
      borderWidth: 0.5,
    });

    const catPrefix = allGood ? "✓" : anyBad ? "!" : "-";
    w.page.drawText(`${catPrefix} ${category}`, {
      x: MARGIN + 8,
      y: catTop - 15,
      size: titleSize,
      font: w.bold,
      color: INK,
    });

    const chips: { text: string; bg: ReturnType<typeof rgb>; fg: ReturnType<typeof rgb> }[] = [];
    if (satCount > 0) chips.push({ text: `Satisfied ${satCount}`, bg: GREEN, fg: rgb(1, 1, 1) });
    if (badCount > 0) chips.push({ text: `Not satisfied ${badCount}`, bg: ORANGE, fg: rgb(1, 1, 1) });
    if (naCount > 0) chips.push({ text: `Not assessed ${naCount}`, bg: rgb(0.85, 0.86, 0.88), fg: rgb(0.22, 0.25, 0.3) });

    let chipX = PAGE.w - MARGIN - 8;
    for (let c = chips.length - 1; c >= 0; c--) {
      const chip = chips[c];
      const tw = w.bold.widthOfTextAtSize(chip.text, 7.2);
      const cw = tw + 8;
      chipX -= cw;
      w.page.drawRectangle({ x: chipX, y: catTop - 19, width: cw, height: 11, color: chip.bg, borderColor: chip.bg, borderWidth: 0.5 });
      w.page.drawText(chip.text, { x: chipX + 4, y: catTop - 14, size: 7.2, font: w.bold, color: chip.fg });
      chipX -= 4;
    }

    let y = catTop - 30;
    for (let i = 0; i < catEntries.length; i++) {
      const e = catEntries[i];
      const outcome = normalizeReportLine(e.outcome) || "Not assessed";
      const outCol = satColor(outcome);
      const diff = normalizeReportLine(e.difficulty);
      const outText = isOk(outcome) ? "Satisfied" : isBad(outcome) ? "Not satisfied" : "Not assessed";
      const outW = w.bold.widthOfTextAtSize(outText, 7.2) + 8;
      const qMaxW = Math.max(160, CONTENT_W - 36 - outW - 16);

      // Meta row: index + difficulty (left), outcome chip (right)
      w.page.drawCircle({ x: MARGIN + 10, y: y - 4, size: 4.5, color: rgb(0.9, 0.92, 0.93), borderColor: rgb(0.75, 0.78, 0.82), borderWidth: 0.4 });
      w.page.drawText(String(e.idx), {
        x: MARGIN + (e.idx < 10 ? 8.4 : 7),
        y: y - 6.5,
        size: 6.8,
        font: w.bold,
        color: rgb(0.28, 0.3, 0.35),
      });

      if (diff) {
        const diffW = w.bold.widthOfTextAtSize(diff, 7.2) + 7;
        const diffBg = /hard/i.test(diff) ? rgb(1, 0.93, 0.93) : /medium/i.test(diff) ? rgb(1, 0.96, 0.86) : rgb(0.9, 0.97, 0.92);
        const diffFg = /hard/i.test(diff) ? RED : /medium/i.test(diff) ? rgb(0.7, 0.48, 0.08) : GREEN;
        w.page.drawRectangle({ x: MARGIN + 18, y: y - 10, width: diffW, height: 10.5, color: diffBg, borderColor: diffBg, borderWidth: 0.4 });
        w.page.drawText(diff, { x: MARGIN + 21, y: y - 6, size: 7.2, font: w.bold, color: diffFg });
      }

      w.page.drawRectangle({
        x: PAGE.w - MARGIN - outW,
        y: y - 10,
        width: outW,
        height: 10.5,
        color: outCol === FAINT ? rgb(0.93, 0.93, 0.93) : outCol,
        borderColor: outCol === FAINT ? rgb(0.8, 0.8, 0.82) : outCol,
        borderWidth: 0.4,
      });
      w.page.drawText(outText, {
        x: PAGE.w - MARGIN - outW + 4,
        y: y - 6,
        size: 7.2,
        font: w.bold,
        color: outCol === FAINT ? rgb(0.35, 0.38, 0.42) : rgb(1, 1, 1),
      });

      y -= 14;
      const qLines = w.wrap(normalizeReportLine(e.question), w.font, textSize, qMaxW);
      for (const qLine of qLines) {
        w.page.drawText(qLine, { x: MARGIN + 18, y: y - textSize, size: textSize, font: w.font, color: INK });
        y -= textSize + 3;
      }

      const notes = normalizeReportLine(e.notes);
      if (notes) {
        for (const nLine of w.wrap(`Notes: ${notes}`, w.font, metaSize, CONTENT_W - 54)) {
          w.page.drawText(nLine, { x: MARGIN + 28, y: y - metaSize, size: metaSize, font: w.font, color: FAINT });
          y -= metaSize + 2.6;
        }
      }

      y -= 6;
      if (i < catEntries.length - 1) {
        w.page.drawLine({
          start: { x: MARGIN + 18, y: y + 2 },
          end: { x: PAGE.w - MARGIN - 8, y: y + 2 },
          thickness: 0.35,
          color: rgb(0.9, 0.9, 0.9),
        });
        y -= 4;
      }
    }

    w.y = catTop - catH - 8;
  }
}

function renderUiParityJustification(
  w: Writer,
  data: InterviewReportData,
  sections: JustificationSection[],
) {
  const overall = sections.find((s) => s.label === "Overall Assessment")?.content ?? "";
  const strengths = toPoints(sections.find((s) => s.label === "Strengths")?.content ?? "");
  const concerns = toPoints(sections.find((s) => s.label === "Concerns / Gaps")?.content ?? "");
  const recommendation = sections.find((s) => s.label === "Recommendation")?.content ?? "";

  const totalQ = data.questions.length;
  const satisfied = data.questions.filter((q) => {
    const s = (q.satisfaction ?? "").toLowerCase();
    return s.startsWith("satisf") && !s.startsWith("not");
  }).length;
  const notSat = data.questions.filter((q) => (q.satisfaction ?? "").toLowerCase().includes("not satisfied")).length;
  const notAssessed = totalQ - satisfied - notSat;
  const rawScore = totalQ > 0 ? (satisfied * 10 + notAssessed * 5) / totalQ : 0;
  const score = rawScore.toFixed(1);
  const confidence = totalQ > 0 ? Math.round((satisfied + notAssessed * 0.5) / totalQ * 100) : 0;
  const recLabel = data.decision === "yes" ? "Proceed" : data.decision === "no" ? "Do not proceed" : "Pending";
  const initials = (data.candidateName || "C")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "C";

  const aiLines = overall
    ? w.wrap(sanitizePdfText(overall), w.font, 8.2, CONTENT_W - 16).slice(0, 3)
    : [];
  const rowH = 34;
  const topPad = 8;
  const bottomPad = 8;
  const aiBlockH = aiLines.length > 0 ? 8 + 10 + aiLines.length * 10 + 2 : 0;
  const headerH = topPad + rowH + aiBlockH + bottomPad;
  w.ensure(headerH + 12);
  const top = w.y;
  w.page.drawRectangle({ x: MARGIN, y: top - headerH, width: CONTENT_W, height: headerH, color: rgb(1, 1, 1), borderColor: RULE, borderWidth: 0.8 });

  // Identity tile
  const idX = MARGIN + 8;
  const idY = top - topPad;
  const idW = 170;
  const idH = rowH;
  w.page.drawRectangle({ x: idX, y: idY - idH, width: idW, height: idH, color: rgb(0.91, 0.97, 1), borderColor: rgb(0.8, 0.9, 0.95), borderWidth: 0.6 });
  w.page.drawCircle({ x: idX + 16, y: idY - 17, size: 8.5, color: rgb(0.84, 0.94, 1) });
  w.page.drawText(initials, { x: idX + 12, y: idY - 20, size: 8.5, font: w.bold, color: CYAN });
  w.page.drawText(sanitizePdfText(data.candidateName), { x: idX + 30, y: idY - 13, size: 9.5, font: w.bold, color: INK });
  w.page.drawText(sanitizePdfText(data.role), { x: idX + 30, y: idY - 24, size: 7.5, font: w.font, color: FAINT });

  // Score tile
  const scoreX = idX + idW + 8;
  const scoreW = 90;
  w.page.drawRectangle({
    x: scoreX,
    y: idY - idH,
    width: scoreW,
    height: idH,
    color: rawScore >= 8 ? rgb(0.91, 0.98, 0.93) : rawScore >= 5 ? rgb(1, 0.96, 0.89) : rgb(1, 0.92, 0.92),
    borderColor: rgb(0.85, 0.88, 0.9),
    borderWidth: 0.6,
  });
  w.page.drawText("OVERALL SCORE", { x: scoreX + 6, y: idY - 10, size: 6.8, font: w.bold, color: FAINT });
  w.page.drawText(score, { x: scoreX + 6, y: idY - 24, size: 14, font: w.bold, color: rawScore >= 8 ? GREEN : rawScore >= 5 ? rgb(0.72, 0.5, 0.1) : RED });
  w.page.drawText("/10", { x: scoreX + 32, y: idY - 24, size: 7.2, font: w.bold, color: FAINT });

  // Recommendation + confidence + summary
  const rcX = scoreX + scoreW + 8;
  const rcW = CONTENT_W - (rcX - MARGIN) - 8;
  w.page.drawRectangle({ x: rcX, y: idY - idH, width: rcW, height: idH, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.86, 0.9, 0.95), borderWidth: 0.6 });
  w.page.drawText("RECOMMENDATION", { x: rcX + 6, y: idY - 10, size: 6.8, font: w.bold, color: FAINT });
  w.page.drawRectangle({ x: rcX + 74, y: idY - 16, width: 58, height: 10, color: data.decision === "yes" ? rgb(0.88, 0.97, 0.9) : data.decision === "no" ? rgb(1, 0.92, 0.88) : rgb(0.94, 0.94, 0.94) });
  w.page.drawText(sanitizePdfText(recLabel), { x: rcX + 78, y: idY - 11.5, size: 7, font: w.bold, color: data.decision === "yes" ? GREEN : data.decision === "no" ? ORANGE : FAINT });
  w.page.drawText("CONFIDENCE", { x: rcX + 6, y: idY - 24, size: 6.8, font: w.bold, color: FAINT });
  w.page.drawText(`${confidence}%`, { x: rcX + 54, y: idY - 24, size: 8.5, font: w.bold, color: confidence >= 70 ? GREEN : confidence >= 40 ? rgb(0.72, 0.5, 0.1) : ORANGE });

  // AI summary row (dynamic height to avoid overlap)
  if (aiLines.length > 0) {
    const aiY = idY - idH - 8;
    w.page.drawText("AI SUMMARY", { x: MARGIN + 8, y: aiY, size: 7.2, font: w.bold, color: CYAN });
    let ay = aiY - 10;
    for (const ln of aiLines) {
      w.page.drawText(ln, { x: MARGIN + 8, y: ay, size: 8.2, font: w.font, color: INK });
      ay -= 10;
    }
  }
  w.y = top - headerH - 10;

  // Stats row (4 tiles)
  const statsH = 34;
  const gap = 6;
  const colW = (CONTENT_W - gap * 3) / 4;
  const statsY = w.y;
  const stats = [
    { label: "Strengths", value: String(strengths.length), bg: rgb(0.92, 0.98, 0.92), color: GREEN, sub: "Key positive areas" },
    { label: "Concerns / Gaps", value: String(concerns.length), bg: rgb(1, 0.95, 0.9), color: ORANGE, sub: "Areas that need exploration" },
    { label: "Questions", value: String(totalQ), bg: rgb(0.92, 0.97, 1), color: CYAN, sub: "Total questions asked" },
    { label: "Confidence", value: `${confidence}%`, bg: rgb(0.96, 0.94, 1), color: PURPLE, sub: "AI confidence in evaluation" },
  ];
  stats.forEach((s, i) => {
    const x = MARGIN + i * (colW + gap);
    w.page.drawRectangle({ x, y: statsY - statsH, width: colW, height: statsH, color: s.bg, borderColor: s.color, borderWidth: 0.5 });
    w.page.drawText(s.value, { x: x + 6, y: statsY - 14, size: 12, font: w.bold, color: s.color });
    w.page.drawText(s.label, { x: x + 6, y: statsY - 24, size: 7.5, font: w.bold, color: INK });
    w.page.drawText(s.sub, { x: x + 6, y: statsY - 31, size: 6.5, font: w.font, color: FAINT });
  });
  w.y = statsY - statsH - 8;

  const qSection = sections.find((s) => s.label === "Question Performance");
  const strengthSection = sections.find((s) => s.label === "Strengths");
  const concernSection = sections.find((s) => s.label === "Concerns / Gaps");
  const recSection = sections.find((s) => s.label === "Recommendation");

  // --- UI-like split layout: left Question Performance, right Strengths/Concerns ---
  if (qSection) {
    const parsed = parseQuestionPerformance(qSection.content);
    const fallback = data.questions.map((q) => ({
      category: q.category ?? "",
      difficulty: q.difficulty ?? "",
      question: q.question ?? "",
      outcome: q.satisfaction ?? "Not assessed",
      notes: q.notes ?? "",
    }));
    const entries = parsed.length > 0 ? parsed : fallback;

    const leftX = MARGIN;
    const gutter = 8;
    const leftW = Math.floor(CONTENT_W * 0.66);
    const rightX = leftX + leftW + gutter;
    const rightW = CONTENT_W - leftW - gutter;

    const groups = new Map<string, (PerfEntry & { idx: number })[]>();
    let idx = 0;
    for (const e of entries) {
      const key = normalizeReportLine(e.category) || "General";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ ...e, idx: ++idx });
    }

    const isOk = (o: string) => {
      const v = (o ?? "").toLowerCase().trim();
      return v.startsWith("satisf") && !v.startsWith("not");
    };
    const isBad = (o: string) => (o ?? "").toLowerCase().includes("not satisfied");

    const headerH = 26;
    let leftH = headerH + 10;
    for (const [cat, catEntries] of groups.entries()) {
      void cat;
      leftH += 22;
      for (const e of catEntries) {
        const outcome = normalizeReportLine(e.outcome) || "Not assessed";
        const outText = isOk(outcome) ? "Satisfied" : isBad(outcome) ? "Not satisfied" : "Not assessed";
        const outW = w.bold.widthOfTextAtSize(outText, 7.2) + 8;
        const qMaxW = Math.max(140, leftW - 26 - outW - 14);
        leftH += 14;
        leftH += w.wrap(normalizeReportLine(e.question), w.font, 8.8, qMaxW).length * 11;
        if (e.notes?.trim()) leftH += w.wrap(`Notes: ${normalizeReportLine(e.notes)}`, w.font, 8, leftW - 34).length * 9.5;
        leftH += 6;
      }
      leftH += 6;
    }

    const pointsToHeight = (pts: string[], width: number) => {
      const bodyW = width - 16;
      let h = 26;
      const show = pts.length > 0 ? pts : ["-"];
      for (const p of show) h += w.wrap(`• ${sanitizePdfText(p)}`, w.font, 8.2, bodyW).length * 10;
      return h + 8;
    };

    const strengthsH = pointsToHeight(strengths, rightW);
    const concernsH = pointsToHeight(concerns, rightW);
    const rightH = strengthsH + concernsH + 8;
    const blockH = Math.max(leftH, rightH);

    w.ensure(blockH + 12);
    const topY = w.y;

    // Left: Question performance header
    w.page.drawRectangle({ x: leftX, y: topY - headerH, width: leftW, height: headerH, color: rgb(0.92, 0.97, 1), borderColor: CYAN, borderWidth: 1 });
    w.page.drawRectangle({ x: leftX, y: topY - headerH, width: 3, height: headerH, color: CYAN });
    w.page.drawText("QUESTION PERFORMANCE", { x: leftX + 8, y: topY - 17, size: 8.2, font: w.bold, color: CYAN });
    const summaryText = `${entries.length} question${entries.length !== 1 ? "s" : ""}  ·  ${groups.size} category`;
    const sw = w.bold.widthOfTextAtSize(summaryText, 7.5);
    w.page.drawRectangle({ x: leftX + leftW - sw - 12, y: topY - 21, width: sw + 8, height: 12, color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.85, 0.87, 0.9), borderWidth: 0.5 });
    w.page.drawText(summaryText, { x: leftX + leftW - sw - 8, y: topY - 15, size: 7.5, font: w.bold, color: FAINT });

    let y = topY - headerH - 8;
    for (const [category, catEntries] of groups.entries()) {
      const satCount = catEntries.filter((e) => isOk(e.outcome)).length;
      const badCount = catEntries.filter((e) => isBad(e.outcome)).length;
      const naCount = catEntries.length - satCount - badCount;

      w.page.drawRectangle({ x: leftX, y: y - 20, width: leftW, height: 20, color: rgb(0.96, 0.96, 0.94), borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 0.5 });
      w.page.drawText(`- ${sanitizePdfText(category)}`, { x: leftX + 8, y: y - 14, size: 9, font: w.bold, color: INK });
      let chipX = leftX + leftW - 8;
      const chips = [
        satCount > 0 ? { t: `Satisfied ${satCount}`, bg: GREEN, fg: rgb(1, 1, 1) } : null,
        badCount > 0 ? { t: `Not satisfied ${badCount}`, bg: ORANGE, fg: rgb(1, 1, 1) } : null,
        naCount > 0 ? { t: `Not assessed ${naCount}`, bg: rgb(0.88, 0.89, 0.9), fg: rgb(0.25, 0.28, 0.32) } : null,
      ].filter(Boolean) as { t: string; bg: ReturnType<typeof rgb>; fg: ReturnType<typeof rgb> }[];
      for (let c = chips.length - 1; c >= 0; c--) {
        const tw = w.bold.widthOfTextAtSize(chips[c].t, 7.2);
        const cw = tw + 8;
        chipX -= cw;
        w.page.drawRectangle({ x: chipX, y: y - 16, width: cw, height: 11, color: chips[c].bg, borderColor: chips[c].bg, borderWidth: 0.3 });
        w.page.drawText(chips[c].t, { x: chipX + 4, y: y - 11.5, size: 7.2, font: w.bold, color: chips[c].fg });
        chipX -= 4;
      }
      y -= 24;

      for (let i = 0; i < catEntries.length; i++) {
        const e = catEntries[i];
        const outcome = normalizeReportLine(e.outcome) || "Not assessed";
        const outText = isOk(outcome) ? "Satisfied" : isBad(outcome) ? "Not satisfied" : "Not assessed";
        const outW = w.bold.widthOfTextAtSize(outText, 7.2) + 8;
        const qMaxW = Math.max(140, leftW - 26 - outW - 14);

        w.page.drawCircle({ x: leftX + 8.5, y: y - 3.5, size: 4.4, color: rgb(0.93, 0.94, 0.95), borderColor: rgb(0.78, 0.8, 0.83), borderWidth: 0.4 });
        w.page.drawText(String(e.idx), { x: leftX + (e.idx < 10 ? 7 : 5.8), y: y - 6, size: 6.7, font: w.bold, color: rgb(0.3, 0.34, 0.38) });

        const diff = normalizeReportLine(e.difficulty);
        if (diff) {
          const dw = w.bold.widthOfTextAtSize(diff, 7) + 6;
          const dbg = /hard/i.test(diff) ? rgb(1, 0.93, 0.93) : /medium/i.test(diff) ? rgb(1, 0.96, 0.86) : rgb(0.9, 0.97, 0.92);
          const dfg = /hard/i.test(diff) ? RED : /medium/i.test(diff) ? rgb(0.7, 0.48, 0.08) : GREEN;
          w.page.drawRectangle({ x: leftX + 15, y: y - 10, width: dw, height: 10, color: dbg, borderColor: dbg, borderWidth: 0.2 });
          w.page.drawText(diff, { x: leftX + 18, y: y - 6, size: 7, font: w.bold, color: dfg });
        }

        const outCol = satColor(outcome);
        w.page.drawRectangle({
          x: leftX + leftW - outW - 8,
          y: y - 10,
          width: outW,
          height: 10,
          color: outCol === FAINT ? rgb(0.93, 0.93, 0.93) : outCol,
          borderColor: outCol === FAINT ? rgb(0.8, 0.8, 0.82) : outCol,
          borderWidth: 0.2,
        });
        w.page.drawText(outText, {
          x: leftX + leftW - outW - 4,
          y: y - 6,
          size: 7,
          font: w.bold,
          color: outCol === FAINT ? rgb(0.35, 0.38, 0.42) : rgb(1, 1, 1),
        });

        y -= 13;
        const qLines = w.wrap(normalizeReportLine(e.question), w.font, 8.8, qMaxW);
        for (const ql of qLines) {
          w.page.drawText(ql, { x: leftX + 16, y: y - 8.8, size: 8.8, font: w.font, color: INK });
          y -= 11;
        }
        if (e.notes?.trim()) {
          const nLines = w.wrap(`Notes: ${normalizeReportLine(e.notes)}`, w.font, 8, leftW - 34);
          for (const nl of nLines) {
            w.page.drawText(nl, { x: leftX + 24, y: y - 8, size: 8, font: w.font, color: FAINT });
            y -= 9.5;
          }
        }
        y -= 5;
        if (i < catEntries.length - 1) {
          w.page.drawLine({ start: { x: leftX + 16, y: y + 1 }, end: { x: leftX + leftW - 8, y: y + 1 }, thickness: 0.3, color: rgb(0.9, 0.9, 0.9) });
          y -= 4;
        }
      }
      y -= 4;
    }

    // Right sidebar cards
    const drawSidebarCard = (
      title: string,
      points: string[],
      yTop: number,
      theme: { bg: ReturnType<typeof rgb>; border: ReturnType<typeof rgb>; title: ReturnType<typeof rgb> },
    ) => {
      const bodyW = rightW - 16;
      const rows = (points.length > 0 ? points : ["-"]).flatMap((p) => w.wrap(`• ${sanitizePdfText(p)}`, w.font, 8.2, bodyW));
      const h = 24 + rows.length * 10 + 8;
      w.page.drawRectangle({ x: rightX, y: yTop - h, width: rightW, height: h, color: theme.bg, borderColor: theme.border, borderWidth: 0.7 });
      w.page.drawText(title.toUpperCase(), { x: rightX + 8, y: yTop - 15, size: 8, font: w.bold, color: theme.title });
      let yy = yTop - 26;
      for (const r of rows) {
        w.page.drawText(r, { x: rightX + 8, y: yy - 8.2, size: 8.2, font: w.font, color: INK });
        yy -= 10;
      }
      return h;
    };

    let rightY = topY;
    const sh = drawSidebarCard("Strengths", strengths, rightY, { bg: rgb(0.92, 0.98, 0.92), border: GREEN, title: GREEN });
    rightY -= sh + 8;
    const ch = drawSidebarCard("Concerns / Gaps", concerns, rightY, { bg: rgb(1, 0.95, 0.9), border: ORANGE, title: ORANGE });

    const consumed = Math.max(topY - y, sh + ch + 8);
    w.y = topY - consumed - 8;
  }

  if (recSection || recommendation) {
    renderGenericSectionCard(w, "Recommendation", recSection?.content || recommendation || "-");
  }
}

export async function buildInterviewReportPdf(
  data: InterviewReportData,
): Promise<Buffer> {
  const w = new Writer();
  await w.init();
  w.footerTitle = `${data.candidateName}'s Internal Evaluation Report`;

  const roleHint = (data.assessorRole ?? data.round ?? "").toLowerCase();
  const assessorLabel = roleHint.includes("manager")
    ? "Manager"
    : roleHint.includes("hr")
      ? "HR panelist"
      : "Interviewer";
  const assessmentSectionTitle = roleHint.includes("manager")
    ? "Manager justification"
    : roleHint.includes("hr")
      ? "HR justification"
      : "Interviewer justification";
  const assessmentBadgeTitle = roleHint.includes("manager")
    ? "MANAGER ASSESSMENT"
    : roleHint.includes("hr")
      ? "HR ASSESSMENT"
      : "INTERVIEWER'S ASSESSMENT";

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
  const headerTitle = sanitizePdfText(`${data.candidateName}'s Internal Evaluation Report`);
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
  const roleLineText = sanitizePdfText(data.projectName
    ? `${data.role}  —  ${data.projectName}`
    : data.role);
  const roleLineW = w.font.widthOfTextAtSize(roleLineText, 10);
  w.page.drawText(roleLineText, {
    x: (PAGE.w - roleLineW) / 2,
    y: PAGE.h - 56,
    size: 10,
    font: w.font,
    color: rgb(0.7, 0.82, 0.95),
  });
  // Round · Date/Time — centered
  const roundDateText = sanitizePdfText(`${data.round}  ·  ${data.generatedAt.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })}`);
  const roundDateW = w.font.widthOfTextAtSize(roundDateText, 9);
  w.page.drawText(roundDateText, {
    x: (PAGE.w - roundDateW) / 2,
    y: PAGE.h - 75,
    size: 9,
    font: w.font,
    color: rgb(0.55, 0.68, 0.8),
  });
  // Interviewer — centered
  const interviewerHeaderText = sanitizePdfText(`${assessorLabel}: ${data.interviewerName}`);
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
  const decLabel = sanitizePdfText(isYes
    ? "RECOMMENDATION: PROCEED TO NEXT ROUND"
    : isNo
      ? "RECOMMENDATION: DO NOT PROCEED"
      : String(data.decision || "PENDING").toUpperCase());
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
  w.keyVal(assessorLabel, data.interviewerName);
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

  // ── Coding exercise submission ────────────────────────────────
  if (data.codingExercise) {
    const ce = data.codingExercise;
    w.heading("Coding exercise");
    w.keyVal("Title", ce.title || "-");
    w.keyVal("Language", ce.language || "-");
    w.keyVal("Status", ce.status || "-");
    if (ce.submittedAt) w.keyVal("Submitted", ce.submittedAt);
    if (ce.scenario?.trim()) {
      w.text(ce.scenario.trim(), { size: 9.5, color: FAINT, gap: 4 });
    }
    if (ce.candidateCode?.trim()) {
      w.y -= 2;
      w.codeBlock(ce.candidateCode);
    }
    if (ce.candidateNotes?.trim()) {
      w.text(`Candidate notes: ${ce.candidateNotes.trim()}`, {
        size: 9.5,
        color: FAINT,
        gap: 4,
      });
    }
    const activityBits = [
      typeof ce.pasteEvents === "number" ? `Pastes: ${ce.pasteEvents}` : null,
      typeof ce.blurEvents === "number" ? `Tab blurs: ${ce.blurEvents}` : null,
      typeof ce.syncEvents === "number" ? `Sync heartbeats: ${ce.syncEvents}` : null,
    ].filter(Boolean);
    if (activityBits.length) {
      w.text(activityBits.join("  ·  "), { size: 8.5, color: FAINT, gap: 4 });
    }
  }

  // ── Role-specific assessment justification ─────────────────────
  w.heading(assessmentSectionTitle);
  const justText = sanitizePdfText(data.justification?.trim() || "-");
  const sections = parseJustificationSections(justText);

  try {
    if (sections.length === 1 && sections[0]?.label === "Assessment") {
      renderGenericSectionCard(w, assessmentBadgeTitle, sections[0].content || "-");
    } else {
      renderUiParityJustification(w, data, sections);
    }
  } catch {
    renderGenericSectionCard(w, assessmentBadgeTitle, justText || "-");
  }

  // Add footer to page 1
  w.addFirstPageFooter();

  const bytes = await w.doc.save();
  return Buffer.from(bytes);
}
