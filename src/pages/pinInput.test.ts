import { describe, it, expect } from "vitest";
import {
  PIN_LENGTH,
  sanitizePinChar,
  applyPaste,
  pinValue,
  isComplete,
  formatRetry,
  wrongPinMessage,
} from "./pinInput";
import { describeLoginError } from "../api/adminApi";

describe("sanitizePinChar", () => {
  it("uppercases letters and keeps digits", () => {
    expect(sanitizePinChar("a")).toBe("A");
    expect(sanitizePinChar("Z")).toBe("Z");
    expect(sanitizePinChar("7")).toBe("7");
  });
  it("drops anything that is not alphanumeric", () => {
    expect(sanitizePinChar("-")).toBe("");
    expect(sanitizePinChar(" ")).toBe("");
    expect(sanitizePinChar("")).toBe("");
    expect(sanitizePinChar("é")).toBe("");
  });
});

describe("applyPaste", () => {
  it("sanitises, truncates to 6 and keeps order", () => {
    expect(applyPaste("ab-12 c9xyz")).toEqual(["A", "B", "1", "2", "C", "9"]);
  });
  it("pads short input with empty strings", () => {
    expect(applyPaste("ab1")).toEqual(["A", "B", "1", "", "", ""]);
    expect(applyPaste("")).toEqual(["", "", "", "", "", ""]);
  });
  it("always returns PIN_LENGTH cells", () => {
    expect(PIN_LENGTH).toBe(6);
    expect(applyPaste("!!!")).toHaveLength(PIN_LENGTH);
  });
});

describe("pinValue / isComplete", () => {
  it("joins cells", () => {
    expect(pinValue(["A", "B", "1", "2", "C", "9"])).toBe("AB12C9");
    expect(pinValue(["A", "", "1", "", "", ""])).toBe("A1");
  });
  it("is complete only when all 6 cells are filled", () => {
    expect(isComplete(["A", "B", "1", "2", "C", "9"])).toBe(true);
    expect(isComplete(["A", "B", "1", "2", "C", ""])).toBe(false);
    expect(isComplete(["", "", "", "", "", ""])).toBe(false);
    expect(isComplete(["A", "B"])).toBe(false);
  });
});

describe("formatRetry", () => {
  it("shows seconds under a minute", () => {
    expect(formatRetry(45)).toBe("45 s");
    expect(formatRetry(1)).toBe("1 s");
    expect(formatRetry(59)).toBe("59 s");
  });
  it("rounds minutes up from 60 seconds", () => {
    expect(formatRetry(60)).toBe("1 min");
    expect(formatRetry(61)).toBe("2 min");
    expect(formatRetry(720)).toBe("12 min");
  });
  it("clamps non-positive values", () => {
    expect(formatRetry(0)).toBe("0 s");
    expect(formatRetry(-5)).toBe("0 s");
  });
});

describe("describeLoginError", () => {
  const httpError = (status: number, data: unknown) => ({
    response: { status, data },
  });

  it("maps 401 to a wrong-PIN message, not 'session expired'", () => {
    const r = describeLoginError(
      httpError(401, { message: "Wrong PIN", attemptsLeft: 3 }),
    );
    expect(r.message).toBe("Wrong PIN");
    expect(r.attemptsLeft).toBe(3);
    expect(r.retryAfterSeconds).toBeUndefined();
    expect(r.message).not.toMatch(/session/i);
  });
  it("falls back to 'Wrong PIN' on a 401 with no body", () => {
    const r = describeLoginError(httpError(401, undefined));
    expect(r.message).toBe("Wrong PIN");
    expect(r.attemptsLeft).toBeUndefined();
  });
  it("maps 429 to the lockout message and retry seconds", () => {
    const r = describeLoginError(
      httpError(429, {
        message: "Too many attempts. Try again in 15 min",
        retryAfterSeconds: 900,
      }),
    );
    expect(r.message).toBe("Too many attempts. Try again in 15 min");
    expect(r.retryAfterSeconds).toBe(900);
    expect(r.attemptsLeft).toBeUndefined();
  });
  it("falls back to the Retry-After header when the body has no seconds", () => {
    const r = describeLoginError({
      response: {
        status: 429,
        data: { message: "Too many requests" },
        headers: { "retry-after": "120" },
      },
    });
    expect(r.retryAfterSeconds).toBe(120);
  });
  it("falls back to RateLimit-Reset when there is no Retry-After", () => {
    const r = describeLoginError({
      response: {
        status: 429,
        data: {},
        headers: { "ratelimit-reset": "45" },
      },
    });
    expect(r.retryAfterSeconds).toBe(45);
  });
  it("prefers the body's retryAfterSeconds over headers", () => {
    const r = describeLoginError({
      response: {
        status: 429,
        data: { retryAfterSeconds: 900 },
        headers: { "retry-after": "5" },
      },
    });
    expect(r.retryAfterSeconds).toBe(900);
  });
  it("reads headers from an AxiosHeaders-like object with get()", () => {
    const h = { get: (k: string) => (k.toLowerCase() === "retry-after" ? "30" : undefined) };
    const r = describeLoginError({ response: { status: 429, data: {}, headers: h } });
    expect(r.retryAfterSeconds).toBe(30);
  });
  it("ignores a non-numeric Retry-After header", () => {
    const r = describeLoginError({
      response: { status: 429, data: {}, headers: { "retry-after": "soon" } },
    });
    expect(r.retryAfterSeconds).toBeUndefined();
  });
  it("ignores non-numeric attempt/retry fields", () => {
    const r = describeLoginError(
      httpError(429, { message: "x", retryAfterSeconds: "soon" }),
    );
    expect(r.retryAfterSeconds).toBeUndefined();
  });
  it("uses the server message for other statuses", () => {
    expect(describeLoginError(httpError(500, { message: "Boom" })).message).toBe(
      "Boom",
    );
    expect(describeLoginError(httpError(500, {})).message).toMatch(/500/);
  });
  it("describes timeouts and unreachable servers", () => {
    expect(describeLoginError({ code: "ECONNABORTED" }).message).toMatch(
      /timed out/i,
    );
    expect(describeLoginError({ request: {} }).message).toMatch(/reach/i);
    expect(describeLoginError(new Error("x")).message).toMatch(/wrong/i);
  });
});

describe("wrongPinMessage", () => {
  it("shows attempts left with correct pluralisation", () => {
    expect(wrongPinMessage(3)).toBe("Wrong PIN · 3 attempts left");
    expect(wrongPinMessage(1)).toBe("Wrong PIN · 1 attempt left");
  });
  it("treats 0 attempts left as a lockout, not 'Wrong PIN'", () => {
    expect(wrongPinMessage(0)).toBe("Too many attempts");
  });
  it("falls back to plain 'Wrong PIN' when the count is unknown", () => {
    expect(wrongPinMessage(undefined)).toBe("Wrong PIN");
  });
});
