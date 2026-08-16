import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Freebuff preview: bind 0.0.0.0, HMR stays disabled, API is proxied to the
// backend workspace (default port 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.VITE_PORT) || 5173,
    hmr: false,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        // Backend routes are unprefixed (/projects, /healthz, ...), so the
        // /api mount point is stripped before forwarding.
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
