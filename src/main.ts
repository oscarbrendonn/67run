import { Game } from "./game/Game";
import { UI } from "./game/UI";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ui = new UI();
const game = new Game(canvas, ui);

// onStart awaits preload (UI shows "LOADING..." while assets fetch).
// Lets the player land in a fully 3D scene instead of seeing primitives
// flash for the first 1-3 seconds while CDN downloads complete.
ui.onStart(async () => {
  await game.assetsReady;
  game.start();
});
ui.onRetry(() => game.start());

game.init();

// Dev helper: expose for debugging in devtools
(window as any).__game = game;
