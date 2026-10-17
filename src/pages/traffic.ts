/** Pure helpers for the Traffic page. No React, no I/O. */

export const RANGE_OPTIONS = [7, 30, 90] as const;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** 0.237 -> "24%". Non-finite input renders as "0%" rather than "NaN%". */
export const pct = (x: number): string =>
  Number.isFinite(x) ? `${Math.round(x * 100)}%` : "0%";

/** Today (last entry) minus yesterday (the one before). Null if < 2 days. */
export const deltaVsYesterday = (
  days: { date: string; activeUsers: number }[],
): { value: number; label: string } | null => {
  if (days.length < 2) return null;
  const value = days[days.length - 1].activeUsers - days[days.length - 2].activeUsers;
  if (value === 0) return { value, label: "same as yesterday" };
  const sign = value > 0 ? "+" : "−";
  return { value, label: `${sign}${Math.abs(value)} vs yesterday` };
};

/** "2026-10-17" -> "17 Oct". Fixed English months; no locale. */
export const shortDate = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return iso;
  return `${Number(m[3])} ${MONTHS[month - 1]}`;
};

/** 1234 -> "1.2K", 999 -> "999", 1_500_000 -> "1.5M". */
export const compactNumber = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1000) return String(Math.round(n));
  const fmt = (v: number, suffix: string) =>
    `${(Math.round(v * 10) / 10).toString()}${suffix}`;
  if (n < 1_000_000) {
    const k = Math.round((n / 1000) * 10) / 10;
    // 999_960 rounds to 1000K; present it as 1M instead.
    return k >= 1000 ? fmt(n / 1_000_000, "M") : fmt(n / 1000, "K");
  }
  return fmt(n / 1_000_000, "M");
};

/** "just now" / "5 min ago" / "3 h ago" / "17 Oct". */
export const relativeTime = (iso: string, now: Date): string => {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 60_000) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${then.getDate()} ${MONTHS[then.getMonth()]}`;
};
