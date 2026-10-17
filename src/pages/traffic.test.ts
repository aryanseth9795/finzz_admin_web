import { describe, it, expect } from "vitest";
import {
  RANGE_OPTIONS,
  pct,
  deltaVsYesterday,
  shortDate,
  compactNumber,
  relativeTime,
} from "./traffic";

describe("RANGE_OPTIONS", () => {
  it("offers 7, 30 and 90 days", () => {
    expect([...RANGE_OPTIONS]).toEqual([7, 30, 90]);
  });
});

describe("pct", () => {
  it("rounds a 0..1 ratio to a whole percent", () => {
    expect(pct(0.237)).toBe("24%");
    expect(pct(0.234)).toBe("23%");
  });
  it("handles the bounds", () => {
    expect(pct(0)).toBe("0%");
    expect(pct(1)).toBe("100%");
  });
  it("never renders NaN", () => {
    expect(pct(NaN)).toBe("0%");
    expect(pct(Infinity)).toBe("0%");
  });
});

describe("deltaVsYesterday", () => {
  const d = (...counts: number[]) =>
    counts.map((activeUsers, i) => ({
      date: `2026-10-${String(10 + i).padStart(2, "0")}`,
      activeUsers,
    }));

  it("is null with fewer than two days", () => {
    expect(deltaVsYesterday([])).toBeNull();
    expect(deltaVsYesterday(d(5))).toBeNull();
  });
  it("reports an increase", () => {
    expect(deltaVsYesterday(d(1, 4, 7))).toEqual({
      value: 3,
      label: "+3 vs yesterday",
    });
  });
  it("reports a decrease with a true minus sign", () => {
    expect(deltaVsYesterday(d(9, 5, 3))).toEqual({
      value: -2,
      label: "−2 vs yesterday",
    });
  });
  it("reports no change", () => {
    expect(deltaVsYesterday(d(4, 6, 6))).toEqual({
      value: 0,
      label: "same as yesterday",
    });
  });
  it("compares only the last two entries", () => {
    expect(deltaVsYesterday(d(100, 2, 3))?.value).toBe(1);
  });
});

describe("shortDate", () => {
  it("formats as D Mon with English months", () => {
    expect(shortDate("2026-10-17")).toBe("17 Oct");
    expect(shortDate("2026-01-05")).toBe("5 Jan");
    expect(shortDate("2026-12-31")).toBe("31 Dec");
  });
  it("accepts a full ISO timestamp by reading the date part", () => {
    expect(shortDate("2026-03-09T23:59:59.000Z")).toBe("9 Mar");
  });
  it("returns the input untouched when it is not a date", () => {
    expect(shortDate("garbage")).toBe("garbage");
    expect(shortDate("")).toBe("");
  });
});

describe("compactNumber", () => {
  it("leaves values under 1000 alone", () => {
    expect(compactNumber(0)).toBe("0");
    expect(compactNumber(999)).toBe("999");
  });
  it("abbreviates thousands", () => {
    expect(compactNumber(1000)).toBe("1K");
    expect(compactNumber(1234)).toBe("1.2K");
    expect(compactNumber(45_600)).toBe("45.6K");
  });
  it("abbreviates millions", () => {
    expect(compactNumber(1_500_000)).toBe("1.5M");
    expect(compactNumber(2_000_000)).toBe("2M");
  });
  it("rolls over instead of printing 1000K", () => {
    expect(compactNumber(999_960)).toBe("1M");
  });
  it("is safe on bad input", () => {
    expect(compactNumber(NaN)).toBe("0");
    expect(compactNumber(-5)).toBe("0");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-10-17T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("says just now under a minute", () => {
    expect(relativeTime(ago(0), now)).toBe("just now");
    expect(relativeTime(ago(59_000), now)).toBe("just now");
  });
  it("treats a timestamp slightly in the future as just now", () => {
    expect(relativeTime(ago(-30_000), now)).toBe("just now");
  });
  it("reports minutes", () => {
    expect(relativeTime(ago(5 * 60_000), now)).toBe("5 min ago");
    expect(relativeTime(ago(59 * 60_000), now)).toBe("59 min ago");
  });
  it("reports hours", () => {
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe("3 h ago");
    expect(relativeTime(ago(23 * 3_600_000), now)).toBe("23 h ago");
  });
  it("falls back to a short date after a day", () => {
    // Midday UTC keeps the local calendar day stable across timezones.
    expect(relativeTime("2026-10-10T12:00:00.000Z", now)).toBe("10 Oct");
  });
  it("returns a dash for an unparseable timestamp", () => {
    expect(relativeTime("nope", now)).toBe("—");
  });
});
