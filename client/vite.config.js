import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
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
