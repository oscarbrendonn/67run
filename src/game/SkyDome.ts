import * as THREE from "three";
import type { Theme } from "./Themes";

/**
 * Half-sphere sky dome with a per-country atmospheric texture (canvas
 * gradient + procedural clouds / sun / moon / stars / heat haze).
 *
 * The dome sits at radius 180 around the player. The horizon ring (95-130)
 * fits inside, and actual buildings (~10m off road) are right next to the
 * camera. Together they layer a real-feeling sky-to-street depth.
 *
 * Each theme has a distinct mood:
 *   - usa:    clear blue daytime with white clouds
 *   - brazil: tropical sunset orange/pink with sun
 *   - france: pale overcast with thin clouds
 *   - japan:  deep purple night with moon + neon glow at horizon
 *   - turkey: warm dusk orange with thin clouds
 *   - uk:     grey overcast British weather
 *   - russia: cold pale blue with subtle snow shimmer
 *   - uae:    bright desert sun in golden sky
 *   - egypt:  hazy golden afternoon with heat shimmer
 */
export class SkyDome {
  group: THREE.Group;
  private mat: THREE.MeshBasicMaterial;
  private dome: THREE.Mesh;
  private texCache = new Map<string, THREE.Texture>();

  constructor(theme: Theme) {
    const tex = this.getOrMakeTexture(theme.id);
    this.mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false, // sky must not fade with fog
    });
    // Half-sphere — flat bottom (only sky above horizon)
    const geo = new THREE.SphereGeometry(180, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    this.dome = new THREE.Mesh(geo, this.mat);
    this.dome.renderOrder = -10; // render before everything else
    this.group = new THREE.Group();
    this.group.add(this.dome);
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.group);
  }

  /** Switch to a new country's sky texture (instant — Game.ts blends fog/lights
   *  separately for the smooth color transition). */
  setTheme(theme: Theme) {
    this.mat.map = this.getOrMakeTexture(theme.id);
    this.mat.needsUpdate = true;
  }

  /** Keep the dome centred on the player. */
  follow(playerZ: number) {
    this.group.position.z = playerZ;
  }

  private getOrMakeTexture(themeId: string): THREE.Texture {
    const hit = this.texCache.get(themeId);
    if (hit) return hit;
    const t = makeSkyTexture(themeId);
    this.texCache.set(themeId, t);
    return t;
  }
}

function makeSkyTexture(themeId: string): THREE.Texture {
  const W = 2048;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  // === Vertical gradient — top of dome at canvas top, horizon at bottom ===
  const palette = paletteFor(themeId);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, palette.top);
  grad.addColorStop(0.45, palette.mid);
  grad.addColorStop(1, palette.horizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // === Decorative layers per theme ===
  switch (themeId) {
    case "usa":
      drawCumulusClouds(ctx, W, H, 35, 0.65);
      drawSun(ctx, 1700, 100, 60, "#fff8d0", "#fff8d0", 0.6);
      break;
    case "brazil":
      // Daytime — white-yellow sun + soft cumulus clouds (was sunset orange)
      drawCumulusClouds(ctx, W, H, 28, 0.6);
      drawSun(ctx, 1700, 110, 55, "#ffffff", "#fff5d8", 0.55);
      break;
    case "france":
      drawOvercast(ctx, W, H);
      drawWispClouds(ctx, W, H, 22, 0.5);
      break;
    case "japan":
      drawStars(ctx, W, H, 320);
      drawMoon(ctx, 1700, 110);
      // Subtle neon glow at city-skyline horizon (Tokyo signature)
      drawNeonGlowHorizon(ctx, W, H);
      break;
    case "turkey":
      drawCumulusClouds(ctx, W, H, 22, 0.55);
      drawSun(ctx, 1600, 130, 50, "#ffffff", "#fff5d8", 0.5);
      break;
    case "uk":
      drawOvercast(ctx, W, H);
      drawWispClouds(ctx, W, H, 30, 0.4);
      break;
    case "russia":
      drawSnowyHaze(ctx, W, H);
      drawWispClouds(ctx, W, H, 18, 0.4);
      break;
    case "uae":
      drawCumulusClouds(ctx, W, H, 12, 0.45);
      drawSun(ctx, 1600, 140, 60, "#ffffff", "#fff5d8", 0.65);
      break;
    case "egypt":
      drawCumulusClouds(ctx, W, H, 14, 0.5);
      drawSun(ctx, 1500, 160, 55, "#ffffff", "#fff5d8", 0.55);
      break;
    case "italy":
      drawCumulusClouds(ctx, W, H, 30, 0.6);
      drawSun(ctx, 1700, 110, 55, "#ffffff", "#fff5d8", 0.55);
      break;
    case "australia":
      drawCumulusClouds(ctx, W, H, 24, 0.55);
      drawSun(ctx, 1600, 130, 60, "#ffffff", "#fff5d8", 0.6);
      break;
    case "china":
      drawStars(ctx, W, H, 280);
      drawNeonGlowHorizon(ctx, W, H);
      break;
    case "korea":
      drawCumulusClouds(ctx, W, H, 26, 0.55);
      drawSun(ctx, 1600, 130, 50, "#ffffff", "#fff5d8", 0.5);
      break;
  }

  // === Birds — small specks for daytime themes ===
  if (themeId === "usa" || themeId === "france" || themeId === "uk" || themeId === "brazil") {
    ctx.strokeStyle = "rgba(20, 20, 20, 0.55)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * W;
      const y = 30 + Math.random() * 200;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y - 3);
      ctx.lineTo(x + 12, y);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // The dome wraps once around — no horizontal repeat.
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

interface SkyPalette {
  top: string;
  mid: string;
  horizon: string;
}

function paletteFor(themeId: string): SkyPalette {
  // Daytime BLUE skies for every country (Oscar: "hava her yerde mavi
  // olacak, böyle sarı falan yapma"). Japan stays night/black with a
  // subtle horizon neon (his "Japonya'da akşam siyah olabilir").
  switch (themeId) {
    case "usa":
      return { top: "#1a4a90", mid: "#5aa0e0", horizon: "#cae8ff" };
    case "brazil":
      return { top: "#1a5aa0", mid: "#5aa8e0", horizon: "#c8e4f8" };
    case "france":
      return { top: "#6a7898", mid: "#a8b8cc", horizon: "#dce2ec" };
    case "japan":
      return { top: "#020410", mid: "#070a1a", horizon: "#0e1428" };
    case "turkey":
      return { top: "#2a5a90", mid: "#7aa8c8", horizon: "#cee2ec" };
    case "uk":
      return { top: "#5a6878", mid: "#8a98a8", horizon: "#c0c8d0" };
    case "russia":
      return { top: "#3a5078", mid: "#7a90b0", horizon: "#bcc4d0" };
    case "uae":
      return { top: "#2a5e90", mid: "#7ab0d0", horizon: "#d0e4ec" };
    case "egypt":
      return { top: "#3a6890", mid: "#88b4cc", horizon: "#d4e4ec" };
    case "italy":
      return { top: "#1a5a9a", mid: "#5aa0d8", horizon: "#c8e0f0" };
    case "australia":
      return { top: "#1a78c0", mid: "#5ab8e8", horizon: "#d8eef8" };
    case "china":
      return { top: "#080c1c", mid: "#15203a", horizon: "#2a3458" };
    case "korea":
      return { top: "#2a6aa8", mid: "#7ab0d4", horizon: "#cce0ec" };
    default:
      return { top: "#1a4a90", mid: "#5aa0e0", horizon: "#cae8ff" };
  }
}

function drawCumulusClouds(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  count: number,
  opacity: number
): void {
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  for (let i = 0; i < count; i++) {
    const cx = Math.random() * W;
    const cy = 40 + Math.random() * (H * 0.55);
    const baseR = 30 + Math.random() * 60;
    // Cluster of overlapping ellipses for fluffy cloud shape
    for (let j = 0; j < 6; j++) {
      const dx = (Math.random() - 0.5) * baseR * 1.2;
      const dy = (Math.random() - 0.5) * baseR * 0.4;
      const r = baseR * (0.5 + Math.random() * 0.6);
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy + dy, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWispClouds(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  count: number,
  opacity: number
): void {
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  for (let i = 0; i < count; i++) {
    const cx = Math.random() * W;
    const cy = 50 + Math.random() * (H * 0.6);
    const w = 80 + Math.random() * 200;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w, 8 + Math.random() * 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOvercast(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  // Add a uniform grey overlay (the gradient already has grey base,
  // this adds extra cloud-cover dampening).
  ctx.fillStyle = "rgba(170, 175, 180, 0.35)";
  ctx.fillRect(0, 0, W, H * 0.7);
}

function drawSun(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  coreColor: string,
  glowColor: string,
  opacity: number
): void {
  // Outer glow halo
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 4);
  halo.addColorStop(0, hexToRgba(glowColor, opacity * 0.55));
  halo.addColorStop(1, hexToRgba(glowColor, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(cx - radius * 4, cy - radius * 4, radius * 8, radius * 8);
  // Core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  core.addColorStop(0, hexToRgba("#ffffff", opacity));
  core.addColorStop(0.5, hexToRgba(coreColor, opacity));
  core.addColorStop(1, hexToRgba(glowColor, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawMoon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Halo
  const halo = ctx.createRadialGradient(cx, cy, 30, cx, cy, 120);
  halo.addColorStop(0, "rgba(220, 230, 255, 0.4)");
  halo.addColorStop(1, "rgba(220, 230, 255, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 120, cy - 120, 240, 240);
  // Body
  ctx.fillStyle = "rgba(248, 240, 220, 0.95)";
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fill();
  // Craters
  ctx.fillStyle = "rgba(180, 170, 150, 0.5)";
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 28;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * W;
    const y = Math.random() * (H * 0.55); // upper half only
    const sz = Math.random() * 1.5 + 0.5;
    const tw = 0.4 + Math.random() * 0.6;
    ctx.fillStyle = `rgba(255, 255, 255, ${tw})`;
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNeonGlowHorizon(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): void {
  // Pink/cyan glow at horizon (Tokyo neon city below the sky)
  const grad = ctx.createLinearGradient(0, H * 0.7, 0, H);
  grad.addColorStop(0, "rgba(0, 0, 0, 0)");
  grad.addColorStop(0.5, "rgba(255, 50, 180, 0.15)");
  grad.addColorStop(1, "rgba(80, 200, 255, 0.25)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.7, W, H * 0.3);
}

function drawSnowyHaze(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): void {
  // Cool whitish horizon haze
  const grad = ctx.createLinearGradient(0, H * 0.6, 0, H);
  grad.addColorStop(0, "rgba(255, 255, 255, 0)");
  grad.addColorStop(1, "rgba(220, 230, 245, 0.45)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);
  // Falling snow specks
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  for (let i = 0; i < 80; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDesertHaze(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): void {
  // Heat haze / sand glow at horizon
  const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
  grad.addColorStop(0, "rgba(255, 220, 150, 0)");
  grad.addColorStop(1, "rgba(255, 200, 130, 0.4)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
  // Dust particles
  ctx.fillStyle = "rgba(255, 220, 150, 0.18)";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(0, H * 0.7 + i * 8, W, 4);
  }
}

function hexToRgba(hex: string, a: number): string {
  // Quick hex → rgba
  const c = new THREE.Color(hex);
  return `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)}, ${a})`;
}
