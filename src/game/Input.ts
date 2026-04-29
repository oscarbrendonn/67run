export type InputEvent =
  | { type: "left" }
  | { type: "right" }
  | { type: "jump" }
  | { type: "slide" };

export class Input {
  private listeners: ((e: InputEvent) => void)[] = [];
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartT = 0;

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          this.emit({ type: "left" });
          break;
        case "ArrowRight":
        case "KeyD":
          this.emit({ type: "right" });
          break;
        case "ArrowUp":
        case "KeyW":
        case "Space":
          this.emit({ type: "jump" });
          break;
        case "ArrowDown":
        case "KeyS":
          this.emit({ type: "slide" });
          break;
      }
    });

    window.addEventListener(
      "touchstart",
      (e) => {
        const t = e.changedTouches[0];
        this.touchStartX = t.clientX;
        this.touchStartY = t.clientY;
        this.touchStartT = performance.now();
      },
      { passive: true }
    );

    window.addEventListener(
      "touchend",
      (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - this.touchStartX;
        const dy = t.clientY - this.touchStartY;
        const dt = performance.now() - this.touchStartT;
        if (dt > 700) return;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const threshold = 22;
        if (absX < threshold && absY < threshold) return;
        if (absX > absY) {
          this.emit({ type: dx > 0 ? "right" : "left" });
        } else {
          this.emit({ type: dy > 0 ? "slide" : "jump" });
        }
      },
      { passive: true }
    );
  }

  on(cb: (e: InputEvent) => void) {
    this.listeners.push(cb);
  }

  private emit(e: InputEvent) {
    for (const l of this.listeners) l(e);
  }
}
