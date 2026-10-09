import { describe, it, expect } from "vitest";
import { validateReleaseForm, raisesMinimum, normalizeForm } from "./appReleaseForm";

const ok = {
  latestVersion: "1.1.0",
  minSupportedVersion: "1.0.0",
  apkUrl: "https://example.com/finzz.apk",
  releaseNotes: "",
};

describe("validateReleaseForm", () => {
  it("accepts a valid form", () => {
    expect(validateReleaseForm(ok)).toBeNull();
  });
  it("trims versions before validating", () => {
    expect(validateReleaseForm({ ...ok, latestVersion: " 1.1.0 " })).toBeNull();
    expect(normalizeForm({ ...ok, latestVersion: " 1.1.0 " }).latestVersion).toBe("1.1.0");
  });
  it("rejects bad versions, http URLs, and min > latest", () => {
    expect(validateReleaseForm({ ...ok, latestVersion: "1.1" })).toMatch(/version/i);
    expect(validateReleaseForm({ ...ok, apkUrl: "http://x.com/a.apk" })).toMatch(/https/i);
    expect(validateReleaseForm({ ...ok, minSupportedVersion: "1.2.0" })).toMatch(/minimum/i);
  });
});

describe("raisesMinimum", () => {
  it("detects an increased minimum (numeric compare)", () => {
    expect(raisesMinimum("1.9.0", "1.10.0")).toBe(true);
    expect(raisesMinimum("1.1.0", "1.1.0")).toBe(false);
    expect(raisesMinimum("0.0.0", "1.0.0")).toBe(true);
  });
});
