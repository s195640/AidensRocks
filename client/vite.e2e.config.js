/* eslint-env node */
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Production build served by `vite preview` for the Playwright suite, with
// /api and /media proxied to the E2E API (server/tests/e2eServer.mjs).
// Separate from vite.config.js so the dev server's LAN/Nginx HMR setup is
// untouched. See data/ai-build-docs/regression-testing/RUNBOOK.md.
const api = `http://127.0.0.1:${process.env.E2E_API_PORT || 8001}`;

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist-e2e" },
  preview: {
    host: "127.0.0.1",
    port: 4174,
    strictPort: true,
    proxy: {
      "/api": api,
      "/media": api,
    },
  },
});
