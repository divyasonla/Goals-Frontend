import { describe, expect, it } from "vitest";
import { formatPhaseDate } from "./utils";

describe("formatPhaseDate", () => {
  it("formats date-only values without shifting their calendar date", () => {
    expect(formatPhaseDate("2026-10-18")).toBe("18 Oct 2026");
  });

  it("handles missing or invalid values safely", () => {
    expect(formatPhaseDate(null)).toBe("—");
    expect(formatPhaseDate("2026-02-31")).toBe("2026-02-31");
  });
});
