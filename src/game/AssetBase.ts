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
const isLocalDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") &&
  window.location.port === "5173";

export const ASSET_BASE = isLocalDev
  ? ""
  : "https://cdn.jsdelivr.net/gh/oscarbrendonn/67run-assets@main";
