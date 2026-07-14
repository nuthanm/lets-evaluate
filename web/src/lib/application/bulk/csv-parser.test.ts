import { describe, it, expect } from "vitest";
import { parseCsvRows } from "@/lib/application/bulk/csv-parser";

describe("csv-parser", () => {
  it("parses simple CSV", () => {
    const rows = parseCsvRows("name,email\nAlice,alice@test.com\nBob,bob@test.com");
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Alice");
    expect(rows[0].email).toBe("alice@test.com");
  });

  it("handles quoted fields with commas", () => {
    const rows = parseCsvRows('name,email\n"Smith, Jr.",test@example.com');
    expect(rows[0].name).toBe("Smith, Jr.");
  });

  it("skips empty rows", () => {
    const rows = parseCsvRows("name,email\n\nAlice,a@test.com\n");
    expect(rows).toHaveLength(1);
  });
});
