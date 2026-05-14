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
// Anything that looks like local network (localhost, 127.x, or 192.168.x
// LAN IP) loads assets from local /models/ — fast, no internet needed.
// Electron (protocol = "file:") and real internet hosts both hit the
// jsDelivr CDN serving the 67run-assets repo. Without this Electron
// would try to read /models/ from inside the .app bundle and find nothing.
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

export const ASSET_BASE = isLocalish
  ? ""
  : "https://cdn.jsdelivr.net/gh/oscarbrendonn/67run-assets@main";
