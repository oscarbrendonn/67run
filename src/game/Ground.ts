import * as THREE from "three";

/**
 * Per-theme procedural ground textures for the strip between road and
 * grass. Each country gets its own surface — Russia=snow, Egypt=sand,
 * Brazil=grass, France/UK=cobblestone, etc. — generated once on a canvas
 * and cached.
 *
 * All textures are tileable via RepeatWrapping. Textures are deliberately
 * lower brightness than the previous flat white sidewalk to avoid the
 * "irritatingly bright" feel Oscar called out.
 */

export interface GroundMaterial {
  /** Color/diffuse map (canvas texture). */
  map: THREE.Texture;
  /** Optional normalMap for relief. */
  normalMap?: THREE.Texture;
  /** Material roughness override. */
  roughness: number;
  /** Color tint that multiplies the diffuse map. Use 0xffffff for "no tint" — */
  /** the texture itself carries the color. */
  tint: number;
}

/** All themes share a clean concrete sidewalk for now (Oscar: "her harita
 *  için birşey bulcam, NYC'de ilk deneyeceğim"). Per-theme snow/sand/grass
 *  variants kept below as functions so we can switch them on later. */
let sharedConcrete: GroundMaterial | null = null;
export function getGroundMaterial(_themeId: string): GroundMaterial {
  if (sharedConcrete) return sharedConcrete;
  sharedConcrete = makeConcrete();
  return sharedConcrete;
}

function makeSnow(): GroundMaterial {
  const c = canvas(256);
  const ctx = c.getContext("2d")!;
  // Off-white base — slightly cool blue tone
  ctx.fillStyle = "#e8eef5";
  ctx.fillRect(0, 0, 256, 256);
  // Subtle blue shadow patches (uneven snow)
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 10 + Math.random() * 30;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(160, 180, 210, 0.18)");
    grad.addColorStop(1, "rgba(160, 180, 210, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Compacted boot prints (darker dots)
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = "rgba(170, 180, 200, 0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 8, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sparkle highlights (snowflake glints)
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  return {
    map: tileable(c, 8, 18),
    roughness: 0.85,
    tint: 0xffffff, // texture carries its color
  };
}

function makeSand(): GroundMaterial {
  const c = canvas(256);
  const ctx = c.getContext("2d")!;
  // Warm sand base
  ctx.fillStyle = "#c8a878";
  ctx.fillRect(0, 0, 256, 256);
  // Color variation (lighter and darker sand patches)
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 12 + Math.random() * 28;
    const lighter = Math.random() > 0.5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, lighter
      ? "rgba(232, 200, 140, 0.5)"
      : "rgba(150, 110, 60, 0.4)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Sand grain noise
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const dark = Math.random() > 0.5;
    ctx.fillStyle = dark
      ? `rgba(120, 90, 50, 0.3)`
      : `rgba(232, 210, 160, 0.4)`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  // Ripple lines (windswept sand)
  ctx.strokeStyle = "rgba(150, 110, 60, 0.18)";
  ctx.lineWidth = 0.8;
  for (let yy = 0; yy < 256; yy += 14) {
    ctx.beginPath();
    for (let x = 0; x < 256; x += 4) {
      const y = yy + Math.sin(x * 0.06 + yy * 0.04) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // A few stones / debris
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = `rgb(${100 + Math.floor(Math.random() * 40)}, ${80 + Math.floor(Math.random() * 30)}, ${50 + Math.floor(Math.random() * 20)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + Math.random() * 2, 1 + Math.random() * 2, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return {
    map: tileable(c, 6, 14),
    roughness: 0.95,
    tint: 0xffffff,
  };
}

function makeJungleGrass(): GroundMaterial {
  const c = canvas(256);
  const ctx = c.getContext("2d")!;
  // Lush deep green base
  ctx.fillStyle = "#2a6a2a";
  ctx.fillRect(0, 0, 256, 256);
  // Patches of varying green
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 14 + Math.random() * 32;
    const tone = Math.floor(60 + Math.random() * 80);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${tone - 30}, ${tone + 30}, ${tone - 30}, 0.55)`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Brown dirt patches (worn paths)
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 18 + Math.random() * 24;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(120, 80, 40, 0.5)");
    grad.addColorStop(1, "rgba(120, 80, 40, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Grass blade hatching
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const dark = Math.random() > 0.5;
    ctx.strokeStyle = dark ? "rgba(20, 60, 20, 0.5)" : "rgba(120, 200, 80, 0.4)";
    const len = 2 + Math.random() * 5;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  return {
    map: tileable(c, 8, 18),
    roughness: 0.95,
    tint: 0xffffff,
  };
}

function makeCobblestone(tintHex: number): GroundMaterial {
  const c = canvas(256);
  const ctx = c.getContext("2d")!;
  // Dark mortar background
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, 256, 256);
  // Stones — irregular ovals, brick-pattern offset
  const size = 26;
  for (let row = 0; row < 256 / size + 2; row++) {
    const offsetX = (row % 2) * size / 2;
    for (let col = 0; col < 256 / size + 2; col++) {
      const cx = col * size + offsetX + size / 2;
      const cy = row * size + size / 2;
      const w = size - 4 + Math.random() * 4;
      const h = size - 4 + Math.random() * 4;
      const tone = 90 + Math.floor(Math.random() * 70);
      ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone - 5})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, (Math.random() - 0.5) * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Highlight on top of stone
      const hi = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, w / 2);
      hi.addColorStop(0, `rgba(255, 255, 255, 0.18)`);
      hi.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = hi;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return {
    map: tileable(c, 5, 12),
    roughness: 0.85,
    tint: tintHex,
  };
}

function makeStoneSlabs(): GroundMaterial {
  const c = canvas(256);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3a302a";
  ctx.fillRect(0, 0, 256, 256);
  // 4×4 grid of large slabs
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * 64 + 3;
      const y = row * 64 + 3;
      const tone = 150 + Math.floor(Math.random() * 30);
      ctx.fillStyle = `rgb(${tone}, ${tone - 18}, ${tone - 50})`;
      ctx.fillRect(x, y, 58, 58);
      // Internal stone speckle
      for (let i = 0; i < 30; i++) {
        const sx = x + Math.random() * 58;
        const sy = y + Math.random() * 58;
        ctx.fillStyle = `rgba(${tone - 30}, ${tone - 50}, ${tone - 70}, 0.35)`;
        ctx.fillRect(sx, sy, 1, 1);
      }
      // Crack/edge highlight
      ctx.strokeStyle = "rgba(80, 60, 40, 0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, 56, 56);
    }
  }
  return {
    map: tileable(c, 4, 10),
    roughness: 0.9,
    tint: 0xffffff,
  };
}

function makeWetAsphalt(): GroundMaterial {
  const c = canvas(256);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1a1a20";
  ctx.fillRect(0, 0, 256, 256);
  // Asphalt grain
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const tone = 25 + Math.floor(Math.random() * 35);
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone + 6})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  // Wet shine reflections (faint blue-purple from neon signs)
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 6 + Math.random() * 18;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const neon = Math.random();
    if (neon < 0.4) {
      grad.addColorStop(0, "rgba(255, 100, 200, 0.18)"); // pink
    } else if (neon < 0.7) {
      grad.addColorStop(0, "rgba(80, 200, 255, 0.18)"); // cyan
    } else {
      grad.addColorStop(0, "rgba(255, 200, 80, 0.18)"); // yellow
    }
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return {
    map: tileable(c, 6, 14),
    roughness: 0.35,
    tint: 0xffffff,
  };
}

function makeConcrete(): GroundMaterial {
  const c = canvas(256);
  const ctx = c.getContext("2d")!;
  // Mid-grey concrete (NOT bright white — Oscar's complaint)
  ctx.fillStyle = "#7a7a7e";
  ctx.fillRect(0, 0, 256, 256);
  // Grain
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const tone = 100 + Math.floor(Math.random() * 50);
    ctx.fillStyle = `rgba(${tone}, ${tone}, ${tone + 5}, 0.5)`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Stains
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 8 + Math.random() * 20;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(40, 40, 40, 0.18)");
    grad.addColorStop(1, "rgba(40, 40, 40, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Expansion joints (every 64px = ~3.5m on full strip width 5.5m)
  ctx.strokeStyle = "rgba(20, 20, 20, 0.55)";
  ctx.lineWidth = 1.2;
  for (let y = 64; y < 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  // Small embedded gravel dots
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const tone = 55 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + Math.random() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return {
    map: tileable(c, 6, 14),
    roughness: 0.92,
    tint: 0xffffff,
  };
}

function canvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

function tileable(c: HTMLCanvasElement, repeatU: number, repeatV: number): THREE.Texture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatU, repeatV);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
