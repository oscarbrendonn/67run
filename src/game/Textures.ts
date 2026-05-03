import * as THREE from "three";

/** Cache so we don't regenerate expensive canvas textures every frame. */
const cache = new Map<string, THREE.Texture>();

function getOrMake(key: string, build: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = build();
  cache.set(key, tex);
  return tex;
}

/** Per-theme road texture — each country gets its own surface style.
 *  No more single shared asphalt for every map. Oscar: "her haritaya
 *  kendi yolunu yapacaksın". Returns a 1024px canvas tile, RepeatWrapping.
 *  Texture itself is clean (no cracks); 3D lane markings live in World.ts. */
export function makeAsphaltTexture(
  tint = 0x262833,
  themeId = "default"
): THREE.Texture {
  return getOrMake(`road-${themeId}-${tint}`, () => {
    const s = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const baseCol = new THREE.Color(tint);
    const baseRgb = `rgb(${(baseCol.r * 255) | 0},${(baseCol.g * 255) | 0},${
      (baseCol.b * 255) | 0
    })`;
    ctx.fillStyle = baseRgb;
    ctx.fillRect(0, 0, s, s);

    // Soft grain (every theme) — keeps the asphalt from looking flat/plastic
    const id = ctx.getImageData(0, 0, s, s);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(id, 0, 0);

    // Per-theme overlay — gives each country a unique road look without
    // ever drawing the random "çisili" cracks Oscar hated.
    switch (themeId) {
      case "italy":
      case "france":
      case "uk":
        // Cobblestone — uniform grid of dark-edged stone blocks.
        // Roma + Paris + London streets read as European old town.
        drawCobbleGrid(ctx, s);
        break;
      case "turkey":
        // Stone slabs — bigger cut-stone tiles, less regular than cobble.
        drawStoneSlabs(ctx, s);
        break;
      case "egypt":
        // Sand-blown old stone — soft tan blotches over base
        drawSandDrift(ctx, s, "rgba(180,140,80,0.18)");
        break;
      case "uae":
        // Modern Dubai concrete — large slab seams every ~quarter
        drawConcreteSlabs(ctx, s);
        break;
      case "australia":
        // Coastal concrete with light beach-sand drift
        drawConcreteSlabs(ctx, s);
        drawSandDrift(ctx, s, "rgba(190,160,110,0.1)");
        break;
      case "japan":
      case "china":
        // Wet night asphalt — dark + faint highlight streaks
        drawWetSheen(ctx, s);
        break;
      case "russia":
        // Cracked old soviet concrete — subtle expansion joints (no
        // cracks, just clean slab seams)
        drawConcreteSlabs(ctx, s);
        break;
      // usa / korea / brazil / default → smooth dark asphalt + soft
      // tone patches (covered below)
      default:
        for (let i = 0; i < 8; i++) {
          const r = 220 + Math.random() * 200;
          const x = Math.random() * s;
          const y = Math.random() * s;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, "rgba(0,0,0,0.1)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

function drawCobbleGrid(ctx: CanvasRenderingContext2D, s: number): void {
  const block = 96; // ~9 blocks across
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2.5;
  for (let y = 0; y < s; y += block) {
    // Brick-stagger every other row
    const offset = Math.floor(y / block) % 2 === 0 ? 0 : block / 2;
    for (let x = -offset; x < s; x += block) {
      // Rounded rectangle for the cobble
      const w = block * (0.92 + Math.random() * 0.06);
      const h = block * (0.92 + Math.random() * 0.06);
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 8);
      ctx.stroke();
      // Slight inner highlight
      ctx.fillStyle = `rgba(${200 + Math.random() * 30},${
        200 + Math.random() * 30
      },${200 + Math.random() * 30},0.04)`;
      ctx.fill();
    }
  }
}

function drawStoneSlabs(ctx: CanvasRenderingContext2D, s: number): void {
  // Larger, irregular cut stones (Istanbul style)
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 3;
  let y = 0;
  while (y < s) {
    const rowH = 140 + Math.random() * 80;
    let x = -Math.random() * 80;
    while (x < s) {
      const w = 130 + Math.random() * 100;
      ctx.beginPath();
      ctx.rect(x, y, w, rowH);
      ctx.stroke();
      x += w;
    }
    y += rowH;
  }
}

function drawConcreteSlabs(ctx: CanvasRenderingContext2D, s: number): void {
  // Big concrete slabs with expansion joints — modern road look
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 4;
  // Vertical seams every quarter
  for (let x = s / 4; x < s; x += s / 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, s);
    ctx.stroke();
  }
  // Horizontal seams every quarter
  for (let y = s / 4; y < s; y += s / 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y);
    ctx.stroke();
  }
}

function drawSandDrift(
  ctx: CanvasRenderingContext2D,
  s: number,
  color: string
): void {
  // Soft tan-colored blotches drifting across the road
  for (let i = 0; i < 18; i++) {
    const r = 180 + Math.random() * 220;
    const x = Math.random() * s;
    const y = Math.random() * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function drawWetSheen(ctx: CanvasRenderingContext2D, s: number): void {
  // Vertical reflective streaks (wet night asphalt — neon city look)
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * s;
    const w = 30 + Math.random() * 50;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(180,200,230,0.06)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, s);
  }
  // A few darker tone patches
  for (let i = 0; i < 6; i++) {
    const r = 250 + Math.random() * 200;
    const x = Math.random() * s;
    const y = Math.random() * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** Lush grass with scattered details */
export function makeGrassTexture(tint = 0x1e5a2a): THREE.Texture {
  return getOrMake(`grass-${tint}`, () => {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const col = new THREE.Color(tint);
    ctx.fillStyle = `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;
    ctx.fillRect(0, 0, s, s);
    // Scatter lighter blades
    for (let i = 0; i < 3000; i++) {
      const lighter = col.clone().offsetHSL(0, 0, 0.08 + Math.random() * 0.15);
      ctx.fillStyle = `rgb(${(lighter.r * 255) | 0},${(lighter.g * 255) | 0},${
        (lighter.b * 255) | 0
      })`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
    // Dark spots
    for (let i = 0; i < 800; i++) {
      const d = col.clone().offsetHSL(0, 0, -0.07);
      ctx.fillStyle = `rgb(${(d.r * 255) | 0},${(d.g * 255) | 0},${(d.b * 255) | 0})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
    // Occasional flowers
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? "#fff2b3" : "#ffb0c8";
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

/** Generates a sky gradient texture to use as scene background. */
export function makeSkyGradient(top: number, bottom: number): THREE.Texture {
  const key = `sky-${top}-${bottom}`;
  return getOrMake(key, () => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    const t = new THREE.Color(top);
    const b = new THREE.Color(bottom);
    g.addColorStop(
      0,
      `rgb(${(t.r * 255) | 0},${(t.g * 255) | 0},${(t.b * 255) | 0})`
    );
    g.addColorStop(
      1,
      `rgb(${(b.r * 255) | 0},${(b.g * 255) | 0},${(b.b * 255) | 0})`
    );
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}
