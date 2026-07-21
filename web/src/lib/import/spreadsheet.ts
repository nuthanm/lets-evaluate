import * as XLSX from "xlsx";
import type { CsvRow } from "@/lib/application/bulk/csv-parser";

export const ACCEPTED_IMPORT_EXTENSIONS = [".csv", ".xlsx"] as const;
export const ACCEPTED_IMPORT_MIME =
  "text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export type ImportEntity = "projects" | "roles" | "locations" | "openings";

export function friendlyFormatError(filename: string) {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")).toLowerCase() : "";
  if (ext === ".xls") {
    return "We support .csv and .xlsx files. Please save your spreadsheet as .xlsx or export as CSV and try again.";
  }
  if (ext && !ACCEPTED_IMPORT_EXTENSIONS.includes(ext as (typeof ACCEPTED_IMPORT_EXTENSIONS)[number])) {
    return `Unsupported file type (${ext}). Please upload a .csv or .xlsx file.`;
  }
  return "Unsupported file format. Please upload a .csv or .xlsx file.";
}

export function isAcceptedImportFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_IMPORT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function parseSpreadsheetFile(file: File): Promise<CsvRow[]> {
  if (!isAcceptedImportFile(file)) {
    throw new Error(friendlyFormatError(file.name));
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const rows = parseGenericCsv(text);
    if (!rows.length) throw new Error("No data rows found. Check that your file has a header row and at least one data row.");
    return rows;
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The spreadsheet appears to be empty.");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!raw.length) throw new Error("No data rows found. Check that your file has a header row and at least one data row.");

  return raw.map((row) => {
    const out: CsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.trim().toLowerCase().replace(/\s+/g, "_")] = String(value ?? "").trim();
    }
    return out;
  });
}

export const IMPORT_FORMAT_NOTES: Record<
  ImportEntity,
  { columns: string; example: string; hint: string }
> = {
  projects: {
    columns: "name, tech_stack",
    example: "Payments Platform,\"React, Node, Postgres\"",
    hint: "tech_stack accepts comma-separated technologies in one cell.",
  },
  roles: {
    columns: "name, level, requirements, projects",
    example: "Backend Engineer,Senior,\"5+ yrs Node\",Payments Platform",
    hint: "projects is optional — comma-separated project names. Leave blank for roles without a project. Multiple projects are supported.",
  },
  locations: {
    columns: "name",
    example: "Chennai",
    hint: "One location per row.",
  },
  openings: {
    columns: "name, level, requirements, projects, status",
    example: "Senior Developer,Senior,\"Azure, C#\",Dnav,open",
    hint: "Creates roles linked to projects. status defaults to open. projects accepts comma-separated names.",
  },
};

function parseGenericCsv(text: string): CsvRow[] {
  const lines = splitCsvLines(text.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (!cols.some((c) => c.trim())) continue;
    const row: CsvRow = {};
    headers.forEach((h, j) => {
      row[h] = cols[j]?.trim() ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      if (current.trim()) lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

export type { CsvRow };
