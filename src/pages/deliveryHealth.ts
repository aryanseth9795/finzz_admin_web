/**
 * Pure helpers for the Notifications "Delivery health" panel.
 *
 * Push "delivery" used to be invisible: the server reported how many messages
 * it HANDED to Expo, and nothing in the admin showed what Expo did with them.
 * A missing FCM credential therefore looked like success for weeks. These
 * helpers turn the server's last-24h receipt summary into a status the admin
 * can act on.
 */

export interface HealthSummary {
  /** Notifications sent in the window. */
  total: number;
  /** Receipts Expo has reported back on. */
  checked: number;
  /** Receipts that were "ok". */
  ok: number;
  /** Receipt error code -> count. */
  errors: Record<string, number>;
  lastError?: string;
}

export type HealthStatus = "healthy" | "degraded" | "failing" | "idle";

export interface ErrorRow {
  code: string;
  count: number;
  label: string;
}

const ERROR_LABELS: Record<string, string> = {
  InvalidCredentials: "Android credentials missing or wrong (FCM V1)",
  MismatchSenderId: "Firebase project mismatch",
  DeviceNotRegistered: "Device uninstalled or token expired",
  MessageTooBig: "Message too large",
  MessageRateExceeded: "Sending too fast",
};

/** Errors that mean nothing will be delivered until an admin fixes config. */
const CREDENTIAL_ERRORS = ["InvalidCredentials", "MismatchSenderId"];

const HEALTHY_RATE = 0.95;
const FAILING_RATE = 0.5;

/** ok / checked as a fraction (0..1), or null when nothing has been checked. */
export const deliveryRate = (s: {
  checked: number;
  ok: number;
}): number | null => (s.checked > 0 ? s.ok / s.checked : null);

/** Error codes with readable labels, most frequent first. */
export const topErrors = (errors: Record<string, number>): ErrorRow[] =>
  Object.entries(errors ?? {})
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .map(([code, count]) => ({
      code,
      count,
      label: ERROR_LABELS[code] ?? code,
    }))
    .sort((a, b) => b.count - a.count);

export const healthStatus = (s: HealthSummary): HealthStatus => {
  if (s.total === 0) return "idle";

  const hasCredentialError = CREDENTIAL_ERRORS.some(
    (code) => (s.errors?.[code] ?? 0) > 0,
  );
  const rate = deliveryRate(s);

  if (hasCredentialError || (rate !== null && rate < FAILING_RATE)) {
    return "failing";
  }
  if (rate !== null && rate < HEALTHY_RATE) return "degraded";
  return "healthy";
};

/** Number of distinct registered devices, across legacy and multi-device fields. */
export const deviceCount = (u: {
  pushTokens?: string[];
  pushToken?: string;
}): number => {
  const tokens = new Set<string>();
  for (const t of [...(u.pushTokens ?? []), u.pushToken]) {
    if (typeof t === "string" && t.trim()) tokens.add(t.trim());
  }
  return tokens.size;
};
