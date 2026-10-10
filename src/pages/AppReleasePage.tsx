import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  getAppReleaseApi,
  updateAppReleaseApi,
  describeError,
  type AppRelease,
} from "../api/adminApi";
import {
  validateReleaseForm,
  normalizeForm,
  raisesMinimum,
  type ReleaseForm,
} from "./appReleaseForm";

const EMPTY: ReleaseForm = {
  latestVersion: "",
  minSupportedVersion: "",
  apkUrl: "",
  releaseNotes: "",
};

export default function AppReleasePage() {
  const [live, setLive] = useState<AppRelease | null>(null);
  const [form, setForm] = useState<ReleaseForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    getAppReleaseApi()
      .then((res) => {
        const r = res.data.release;
        setLive(r);
        setForm({
          latestVersion: r.latestVersion,
          minSupportedVersion: r.minSupportedVersion,
          apkUrl: r.apkUrl,
          releaseNotes: r.releaseNotes,
        });
      })
      .catch((e) => setError(describeError(e)));
  }, []);

  const set = (key: keyof ReleaseForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateAppReleaseApi(normalizeForm(form));
      setLive(res.data.release);
      toast.success("Release saved");
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateReleaseForm(form);
    if (problem) {
      setError(problem);
      return;
    }
    if (
      live &&
      raisesMinimum(live.minSupportedVersion, normalizeForm(form).minSupportedVersion)
    ) {
      setConfirming(true);
      return;
    }
    void save();
  };

  return (
    <>
      <div className="page-header">
        <motion.h1
          className="page-title"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          App Release
        </motion.h1>
        <p className="page-subtitle">
          Control which app builds may run. Installs below the minimum version
          are blocked until they update.
        </p>
      </div>

      <div className="page-content">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="card-title">
            <Smartphone
              size={18}
              style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }}
            />
            Live release
          </h3>
          {live ? (
            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
              Latest <strong>{live.latestVersion}</strong> · Minimum{" "}
              <strong>{live.minSupportedVersion}</strong>
              {live.updatedAt
                ? ` · updated ${new Date(live.updatedAt).toLocaleString()}`
                : " · never published"}
            </p>
          ) : (
            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
              Loading…
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="rel-latest" className="form-label">
                Latest version
              </label>
              <input
                id="rel-latest"
                className="form-input"
                placeholder="e.g. 1.1.0"
                value={form.latestVersion}
                onChange={(e) => set("latestVersion")(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="rel-min" className="form-label">
                Minimum supported version
              </label>
              <input
                id="rel-min"
                className="form-input"
                placeholder="e.g. 1.1.0"
                value={form.minSupportedVersion}
                onChange={(e) => set("minSupportedVersion")(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="rel-url" className="form-label">
                APK download URL (https)
              </label>
              <input
                id="rel-url"
                className="form-input"
                placeholder="https://github.com/…/finzz.apk"
                value={form.apkUrl}
                onChange={(e) => set("apkUrl")(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="rel-notes" className="form-label">
                Release notes
              </label>
              <textarea
                id="rel-notes"
                className="form-input"
                rows={4}
                maxLength={1000}
                value={form.releaseNotes}
                onChange={(e) => set("releaseNotes")(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" style={{ color: "var(--danger, #ef4444)", marginBottom: 12 }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={saving || !live}>
              {saving ? "Saving…" : "Save release"}
            </button>
          </form>
        </motion.div>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Block older app versions?"
          message={`Every install below v${normalizeForm(form).minSupportedVersion} will be blocked until it updates. Continue?`}
          confirmLabel="Save and block"
          destructive
          onConfirm={save}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
