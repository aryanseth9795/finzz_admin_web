import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

/**
 * Component and unit tests for the admin panel.
 *
 * jsdom rather than a real browser: every bug these guard is a logic or
 * accessibility-semantics bug — a pagination window that never slid, a render
 * that threw and blanked the app, a dialog that trapped no focus — and all of
 * them are observable through the DOM without a browser engine.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
