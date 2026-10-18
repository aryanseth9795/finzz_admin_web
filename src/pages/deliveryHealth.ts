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

export type HealthStatus =
  | "healthy"
  | "degraded"
  | "failing"
  | "idle"
  /** Sent, but Expo has not reported on enough receipts to judge yet. */
  | "pending";

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
/** Below this share of sends with receipts, the rate is not trustworthy yet. */
const MIN_CHECKED_SHARE = 0.2;

/** Uninstalled devices: a user fact, not a delivery fault. */
const UNINSTALL_ERROR = "DeviceNotRegistered";

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
  // A config problem is actionable even before most receipts have arrived.
  if (hasCredentialError) return "failing";

  // Receipts arrive ~15 min after sending. Until enough are in, "healthy"
  // would be a guess, so say so instead.
  if (s.checked === 0 || s.checked / s.total < MIN_CHECKED_SHARE) {
    return "pending";
  }

  // Uninstalls are excluded from the rate: they say nothing about delivery.
  const uninstalled = Math.min(
    Math.max(s.errors?.[UNINSTALL_ERROR] ?? 0, 0),
    s.checked,
  );
  const rate = deliveryRate({ checked: s.checked - uninstalled, ok: s.ok });

  if (rate !== null && rate < FAILING_RATE) return "failing";
  if (rate !== null && rate < HEALTHY_RATE) return "degraded";
  // On their own, uninstalls can raise the status to "degraded", never worse.
  if (uninstalled / s.checked > 1 - HEALTHY_RATE) return "degraded";
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

const PUSH_STATUS_LABELS: Record<string, string> = {
  registered: "Notifications on",
  unchanged: "Notifications on",
  "permission-denied": "Notifications blocked on phone",
  "not-a-device": "Not a physical device",
  "no-project-id": "App build is missing its Expo project ID",
  "token-error": "Couldn't get a push token",
  "upload-error": "Couldn't register the token with the server",
};

/** Human text for the `pushStatus.outcome` an app reported to the server. */
export const pushStatusLabel = (outcome: string): string =>
  PUSH_STATUS_LABELS[outcome] ?? outcome;

export type PushStatusTone = "success" | "warning" | "danger" | "info";

/** Badge colour for a reported outcome (matches the `.badge.*` classes). */
export const pushStatusTone = (outcome: string): PushStatusTone => {
  switch (outcome) {
    case "registered":
    case "unchanged":
      return "success";
    case "permission-denied":
    case "not-a-device":
      return "warning";
    case "no-project-id":
    case "token-error":
    case "upload-error":
      return "danger";
    default:
      return "info";
  }
};
