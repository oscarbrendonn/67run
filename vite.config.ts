import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const USE_CDN = process.env.CDN_BUILD === "1";
// Unique per-build version stamped into the bundle. Used as a cache-bust
// query on every GLB fetch so browsers can never serve a stale model.
const BUILD_VERSION = String(Date.now());

export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  plugins: [viteSingleFile()],
  server: {
    host: true,
    port: 5173,
    // Allow tunnel hosts (cloudflared, ngrok, localtunnel) to reach the dev server
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    // Disable browser cache so Oscar always sees the latest build / GLBs
    // (no more "linkler eski mav gösteriyor" — that was the browser
    // serving stale cached assets).
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  },
  build: {
    target: "es2020",
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: {
      external: USE_CDN
        ? [
            /^three(\/.*)?$/,
            /^postprocessing(\/.*)?$/,
          ]
        : undefined,
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        ...(USE_CDN
          ? {
              paths: (id: string) => {
                if (id === "three") return "https://esm.sh/three@0.170.0";
                if (id.startsWith("three/"))
                  return `https://esm.sh/three@0.170.0/${id.slice(6)}`;
                if (id === "postprocessing")
                  return "https://esm.sh/postprocessing@6.36.4?deps=three@0.170.0";
                return id;
              },
            }
          : {}),
      },
    },
  },
});
