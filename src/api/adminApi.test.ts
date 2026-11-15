import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { describeError, populatedUser, type AdminUser } from "./adminApi";

const httpError = (status: number, message?: string, errors?: unknown) => {
  const err = new AxiosError("Request failed");
  err.response = {
    status,
    statusText: "",
    data: {
      ...(message ? { message } : {}),
      ...(errors !== undefined ? { errors } : {}),
    },
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return err;
};

/**
 * ADM-005/ADM-026. Every page hand-rolled
 * `error.response?.data?.message || "Failed to …"`, collapsing a timeout, an
 * offline browser and a server fault into one unhelpful string — when it
 * surfaced at all, which for most pages was never.
 */
describe("describeError", () => {
  it("prefers the server's own message", () => {
    expect(describeError(httpError(400, "Year and month are required"))).toBe(
      "Year and month are required",
    );
  });

  it("names an expired session rather than showing a raw 401", () => {
    // The single most common failure once the 24h cookie lapses. Previously
    // this rendered as a generic error, a blank page, or nothing at all.
    expect(describeError(httpError(401))).toBe(
      "Your session expired. Please sign in again.",
    );
  });

  it("falls back to the status when the body carries no message", () => {
    expect(describeError(httpError(500))).toBe("Request failed (500)");
  });

  it("distinguishes a timeout from a server fault", () => {
    const err = new AxiosError("timeout");
    err.code = "ECONNABORTED";
    expect(describeError(err)).toMatch(/timed out/i);
  });

  it("distinguishes an unreachable server from a rejected request", () => {
    const err = new AxiosError("Network Error");
    err.request = {};
    expect(describeError(err)).toMatch(/could not reach the server/i);
  });

  it("names the first failing field on a 400 validation error", () => {
    // The Expenses page sent limit=200 against a schema capped at 100; the
    // toast said only "Validation error", which gave no hint which field.
    const err = httpError(400, "Validation error", [
      { field: "limit", message: "Too big: expected number to be <=100" },
      { field: "page", message: "Expected number" },
    ]);
    expect(describeError(err)).toBe(
      "Validation error — limit: Too big: expected number to be <=100",
    );
  });

  it("omits the field name when the validation error has none", () => {
    const err = httpError(400, "Validation error", [
      { field: "", message: "Invalid body" },
    ]);
    expect(describeError(err)).toBe("Validation error — Invalid body");
  });

  it("keeps the plain message for a 400 with an empty or malformed errors list", () => {
    expect(describeError(httpError(400, "Validation error", []))).toBe(
      "Validation error",
    );
    expect(describeError(httpError(400, "Validation error", "nope"))).toBe(
      "Validation error",
    );
  });

  it("ignores an errors list on non-400 statuses", () => {
    const err = httpError(500, "Server error", [
      { field: "limit", message: "x" },
    ]);
    expect(describeError(err)).toBe("Server error");
  });

  it("never returns undefined for an unrecognised value", () => {
    for (const value of [null, undefined, "boom", 42, new Error("x"), {}]) {
      expect(typeof describeError(value)).toBe("string");
      expect(describeError(value).length).toBeGreaterThan(0);
    }
  });
});

/**
 * The same class of bug as the mobile client's reversed transaction
 * direction: a reference that arrives either populated or as a bare id, read
 * as though it were always populated.
 */
describe("populatedUser — narrowing a reference", () => {
  const user: AdminUser = { _id: "u1", name: "Alice", phone: "+919876543210" };

  it("returns the object when populated", () => {
    expect(populatedUser(user)).toEqual(user);
  });

  it("returns null for a bare id string", () => {
    // `("u1").name` is undefined, not an error — which is exactly why the bug
    // rendered "Unknown" instead of throwing, and so went unnoticed.
    expect(populatedUser("u1")).toBeNull();
  });

  it("returns null for a deleted reference", () => {
    // `populate` resolves a deleted user to null; `.name` on it throws.
    expect(populatedUser(null)).toBeNull();
    expect(populatedUser(undefined)).toBeNull();
  });

  it("makes the unsafe access safe at every call site", () => {
    const rows: Array<AdminUser | string | null> = [user, "u2", null];
    // The shape the table renders. Previously `r.name` on the string and the
    // null produced "no name" and a TypeError respectively.
    const names = rows.map((r) => populatedUser(r)?.name ?? "—");
    expect(names).toEqual(["Alice", "—", "—"]);
  });
});
