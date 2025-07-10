import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true, // Enable for Docker compatibility
      interval: 1000,
    },
    hmr: true, // Ensure HMR is enabled
  },
});
