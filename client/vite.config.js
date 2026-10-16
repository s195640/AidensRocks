import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import appVersion from "./appVersion.js";

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  // "hidden": .map files are generated but not linked from the code, so
  // browsers never ask for them. The prod build moves them off the public
  // site to the server, for readable error stack traces (Site Health).
  build: { sourcemap: "hidden" },
  server: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true, // prevent auto-port bumping

    watch: {
      usePolling: true, // ✅ For WSL2 / Docker compatibility
      interval: 300, // Adjust to reduce CPU
      ignored: ["**/node_modules/**", "**/.vite/**"],
    },

    hmr: {
      protocol: "ws", // ✅ WebSocket for hot reload
      host: "192.168.1.50", // ✅ Your LAN IP (or whatever matches Nginx)
      port: 4173, // Vite dev server port
      clientPort: 80, // ✅ Port client (browser) connects to via Nginx
    },
  },
});
