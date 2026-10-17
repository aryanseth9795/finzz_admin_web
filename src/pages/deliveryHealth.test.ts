import { describe, it, expect } from "vitest";
import {
  deliveryRate,
  topErrors,
  healthStatus,
  deviceCount,
  type HealthSummary,
} from "./deliveryHealth";

const summary = (over: Partial<HealthSummary> = {}): HealthSummary => ({
  total: 100,
  checked: 100,
  ok: 100,
  errors: {},
  ...over,
});

describe("deliveryRate", () => {
  it("is null when nothing was checked (no 0/0 NaN)", () => {
    expect(deliveryRate({ checked: 0, ok: 0 })).toBeNull();
  });

  it("is ok / checked as a fraction", () => {
    expect(deliveryRate({ checked: 4, ok: 1 })).toBe(0.25);
    expect(deliveryRate({ checked: 10, ok: 10 })).toBe(1);
    expect(deliveryRate({ checked: 10, ok: 0 })).toBe(0);
  });
});

describe("topErrors", () => {
  it("returns an empty list for no errors", () => {
    expect(topErrors({})).toEqual([]);
  });

  it("sorts by count descending and attaches readable labels", () => {
    expect(
      topErrors({ DeviceNotRegistered: 2, InvalidCredentials: 9, MessageTooBig: 5 }),
    ).toEqual([
      {
        code: "InvalidCredentials",
        count: 9,
        label: "Android credentials missing or wrong (FCM V1)",
      },
      { code: "MessageTooBig", count: 5, label: "Message too large" },
      {
        code: "DeviceNotRegistered",
        count: 2,
        label: "Device uninstalled or token expired",
      },
    ]);
  });

  it("labels the remaining known codes", () => {
    const labels = Object.fromEntries(
      topErrors({ MismatchSenderId: 3, MessageRateExceeded: 2 }).map((e) => [
        e.code,
        e.label,
      ]),
    );
    expect(labels).toEqual({
      MismatchSenderId: "Firebase project mismatch",
      MessageRateExceeded: "Sending too fast",
    });
  });

  it("falls back to the raw code for unknown errors", () => {
    expect(topErrors({ SomethingNew: 1 })).toEqual([
      { code: "SomethingNew", count: 1, label: "SomethingNew" },
    ]);
  });

  it("drops zero and non-finite counts and does not mutate its input", () => {
    const input = { A: 0, B: 2, C: Number.NaN };
    const copy = { ...input };
    expect(topErrors(input).map((e) => e.code)).toEqual(["B"]);
    expect(input).toEqual(copy);
  });
});

describe("healthStatus", () => {
  it("is idle when nothing was sent in the window", () => {
    expect(healthStatus(summary({ total: 0, checked: 0, ok: 0 }))).toBe("idle");
  });

  it("is healthy at or above 95%", () => {
    expect(healthStatus(summary())).toBe("healthy");
    expect(healthStatus(summary({ checked: 100, ok: 95 }))).toBe("healthy");
  });

  it("is degraded below 95% but at least 50%", () => {
    expect(healthStatus(summary({ checked: 100, ok: 94 }))).toBe("degraded");
    expect(healthStatus(summary({ checked: 100, ok: 50 }))).toBe("degraded");
  });

  it("is failing below 50%", () => {
    expect(healthStatus(summary({ checked: 100, ok: 49 }))).toBe("failing");
    expect(healthStatus(summary({ checked: 10, ok: 0 }))).toBe("failing");
  });

  it("is failing on any credential error even when the rate looks fine", () => {
    expect(
      healthStatus(summary({ checked: 100, ok: 99, errors: { InvalidCredentials: 1 } })),
    ).toBe("failing");
    expect(
      healthStatus(summary({ checked: 100, ok: 99, errors: { MismatchSenderId: 1 } })),
    ).toBe("failing");
  });

  it("does not fail on a zero-count credential entry", () => {
    expect(
      healthStatus(summary({ errors: { InvalidCredentials: 0 } })),
    ).toBe("healthy");
  });

  it("is not failing merely because nothing has been checked yet", () => {
    expect(healthStatus(summary({ total: 20, checked: 0, ok: 0 }))).toBe("healthy");
  });

  it("ignores non-credential errors for the status", () => {
    expect(
      healthStatus(summary({ checked: 100, ok: 97, errors: { DeviceNotRegistered: 3 } })),
    ).toBe("healthy");
  });
});

describe("deviceCount", () => {
  it("is 0 with no tokens at all", () => {
    expect(deviceCount({})).toBe(0);
    expect(deviceCount({ pushTokens: [], pushToken: "" })).toBe(0);
  });

  it("counts the legacy single token", () => {
    expect(deviceCount({ pushToken: "ExponentPushToken[a]" })).toBe(1);
  });

  it("counts every token in pushTokens", () => {
    expect(deviceCount({ pushTokens: ["a", "b", "c"] })).toBe(3);
  });

  it("does not double-count the legacy token when it is also in pushTokens", () => {
    expect(deviceCount({ pushTokens: ["a", "b"], pushToken: "a" })).toBe(2);
  });

  it("adds a legacy token that is missing from pushTokens", () => {
    expect(deviceCount({ pushTokens: ["a"], pushToken: "b" })).toBe(2);
  });

  it("de-duplicates repeats and ignores blank entries", () => {
    expect(deviceCount({ pushTokens: ["a", "a", "", "  "] })).toBe(1);
  });
});
