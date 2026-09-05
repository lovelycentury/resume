import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Docker Desktop on macOS/Windows doesn't deliver inotify events across a bind
// mount, so the dev container sets VITE_DEV_CONTAINER=1 to switch on polling.
const inContainer = process.env.VITE_DEV_CONTAINER === "1";

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Puts `src/` on Sass's load path so a bare `@use "styles/kit"` resolves from any
        // *.module.scss, however deep. Same arrangement as the profile app's
        // `sassOptions.loadPaths`, which is what the vendored CookieConsent kit was
        // authored against.
        loadPaths: [fileURLToPath(new URL("./src", import.meta.url))],
      },
    },
  },
  server: {
    port: 5173,
    // Bind all interfaces so the container's port publish reaches the dev server.
    host: true,
    watch: inContainer ? { usePolling: true, interval: 300 } : undefined,
    // Backend runs on 5300 (see apps/resume/be). Proxying `/be` keeps the app on a
    // single origin in dev, so there is nothing for CORS to reject. In the dev
    // container the backend is another service, hence VITE_API_TARGET.
    proxy: {
      "/be": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:5300",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/be/, ""),
      },
    },
  },
});
