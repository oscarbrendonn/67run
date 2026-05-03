import { Game } from "./game/Game";
import { UI } from "./game/UI";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ui = new UI();
const game = new Game(canvas, ui);

// Boot loader animation — shows a smooth fake progress bar that creeps
// to ~90% over 12s, then snaps to 100% the moment assetsReady resolves.
// Real per-asset progress would require wiring `onProgress` through
// every loader; this fake bar feels just as good and never stalls.
const bootLoader = document.getElementById("boot-loader") as HTMLDivElement;
const bootBar = document.getElementById("boot-bar-fill") as HTMLDivElement;
const bootStatus = document.getElementById("boot-status") as HTMLDivElement;
let bootProgress = 0;
const bootStartT = performance.now();
const bootInterval = window.setInterval(() => {
  const elapsed = (performance.now() - bootStartT) / 1000;
  // Asymptote at 92% — never finishes until assetsReady triggers it
  bootProgress = Math.min(92, 92 * (1 - Math.exp(-elapsed / 4)));
  bootBar.style.width = `${bootProgress.toFixed(1)}%`;
  if (elapsed > 8) bootStatus.textContent = "Almost ready…";
  if (elapsed > 16) bootStatus.textContent = "Hang tight…";
}, 80);

(async () => {
  game.init();
  // Wait for all initial assets (Mav GLB, theme buildings/obstacles/
  // landmark) before letting the player see the title screen. assetsReady
  // races against a 20s timeout so a network hiccup can't trap the user.
  await game.assetsReady;
  // Cache is now warm — rebuild every building from scratch so the
  // primitive placeholders that World created at init() (when cache was
  // empty) get replaced by real GLBs in a single frame. Without this,
  // the title screen briefly showed the primitive scene before async
  // swaps kicked in, which Oscar called "eski grafikler".
  game.rebuildSceneFromCache();
  // Snap to 100% then fade out.
  window.clearInterval(bootInterval);
  bootBar.style.width = "100%";
  bootStatus.textContent = "Ready!";
  await new Promise((r) => setTimeout(r, 250));
  bootLoader.classList.add("hidden");
  setTimeout(() => bootLoader.remove(), 500);
})();

// onStart no longer needs to await assetsReady — the boot loader already
// did that before the title screen was visible. Just start.
ui.onStart(() => game.start());
ui.onRetry(() => game.start());

// Dev helper: expose for debugging in devtools
(window as any).__game = game;
