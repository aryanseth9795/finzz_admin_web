export interface ReleaseForm {
  latestVersion: string;
  minSupportedVersion: string;
  apkUrl: string;
  releaseNotes: string;
}

const SEMVER = /^\d+\.\d+\.\d+$/;

const compare = (a: string, b: string) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  return 0;
};

export const normalizeForm = (f: ReleaseForm): ReleaseForm => ({
  latestVersion: f.latestVersion.trim(),
  minSupportedVersion: f.minSupportedVersion.trim(),
  apkUrl: f.apkUrl.trim(),
  releaseNotes: f.releaseNotes,
});

/** Mirrors the server schema. Returns an error message, or null when valid. */
export const validateReleaseForm = (raw: ReleaseForm): string | null => {
  const f = normalizeForm(raw);
  if (!SEMVER.test(f.latestVersion)) return "Latest version must look like 1.2.3";
  if (!SEMVER.test(f.minSupportedVersion)) return "Minimum version must look like 1.2.3";
  if (!f.apkUrl.startsWith("https://")) return "APK URL must use https";
  if (compare(f.minSupportedVersion, f.latestVersion) > 0)
    return "Minimum version cannot exceed latest version";
  if (f.releaseNotes.length > 1000) return "Release notes must be 1000 characters or fewer";
  return null;
};

/** True when saving would block installs that are allowed today. */
export const raisesMinimum = (liveMin: string, nextMin: string): boolean =>
  SEMVER.test(liveMin) && SEMVER.test(nextMin) && compare(nextMin, liveMin) > 0;
