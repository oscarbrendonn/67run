/// <reference types="vite/client" />

declare module "*.jpg" {
  const url: string;
  export default url;
}

declare module "*.png" {
  const url: string;
  export default url;
}

/** Per-build cache-bust string, injected by vite.config.ts via `define`. */
declare const __BUILD_VERSION__: string;
