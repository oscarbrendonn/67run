/**
 * Where to fetch 3D model assets from at runtime.
 *
 * Production: jsDelivr CDN serving the `oscarbrendonn/67run-assets` GitHub
 * repo. jsDelivr is fast, geographically distributed, and cached forever
 * per Git tag/commit so we just bump the URL when assets change.
 *
 * Dev: when running `vite dev` against localhost, models are served from
 * the local `public/models/` folder so iteration is instant. We pick this
 * via the dev origin (5173) so production builds still hit the CDN.
 */
// Asset routing has 3 modes:
//   1. Electron (file: protocol) → use the bundled /models/ folder inside
//      the .app. Index.html is at file:///path/to/dist/index.html so the
//      base is its parent directory. Zero network at runtime.
//   2. Local dev (vite at localhost / LAN IP) → use empty base so URLs
//      resolve to vite's /models/ (public folder).
//   3. Production web (oscarbrendonn.github.io/...) → jsDelivr CDN.
const h =
  typeof window !== "undefined" ? window.location.hostname : "";
const proto =
  typeof window !== "undefined" ? window.location.protocol : "";
const isElectronFile = proto === "file:";
const isLocalish =
  !isElectronFile &&
  (h === "localhost" ||
    h === "127.0.0.1" ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    h === "");

function computeBase(): string {
  if (isElectronFile) {
    // Strip the trailing /index.html so URLs like `${ASSET_BASE}/models/...`
    // resolve to the sibling models/ folder inside the app bundle.
    const href = typeof window !== "undefined" ? window.location.href : "";
    return href.replace(/\/[^/]*$/, "");
  }
  if (isLocalish) return "";
  return "https://cdn.jsdelivr.net/gh/oscarbrendonn/67run-assets@main";
}

export const ASSET_BASE = computeBase();
