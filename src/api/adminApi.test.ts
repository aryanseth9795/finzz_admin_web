import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { describeError, populatedUser, type AdminUser } from "./adminApi";

const httpError = (status: number, message?: string) => {
  const err = new AxiosError("Request failed");
  err.response = {
    status,
    statusText: "",
    data: message ? { message } : {},
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
