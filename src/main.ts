import { Game } from "./game/Game";
import { UI } from "./game/UI";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ui = new UI();
const game = new Game(canvas, ui);

ui.onStart(() => game.start());
ui.onRetry(() => game.start());

game.init();

// Dev helper: expose for debugging in devtools
(window as any).__game = game;
