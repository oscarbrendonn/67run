import * as THREE from "three";
import type { Theme } from "./Themes";

/**
 * Decorative bridge — MINIMAL viaduct style: 4 columns + thin deck on top.
 * Reads obviously as a "platform held up by pillars" so the player has zero
 * doubt they pass under it. NO WALLS, NO SOLID ARCH FACE — earlier version
 * looked like a closed grey wall blocking the road.
 *
 * The Meshy-generated themed bridge GLB (when downloaded) lazy-swaps this
 * placeholder via BridgeLoader.
 */

const stone = (color: number, rough = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
const metal = (color: number) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });

export function buildBridge(theme: Theme): THREE.Group {
  const palette = paletteFor(theme.id);
  const g = new THREE.Group();

  const SPAN = 22;
  const DECK_Y = 5.8;     // top of deck — well above player jump peak (~3.3)
  const DECK_THICK = 0.4;
  const DECK_DEPTH = 2.0; // along z (run direction)

  const stoneMat = stone(palette.stone, 0.85);
  const trimMat = stone(palette.trim, 0.75);
  const accentMat = stone(palette.accent, 0.55);
  const goldish = new THREE.MeshStandardMaterial({
    color: palette.lamp,
    roughness: 0.3,
    metalness: 0.6,
    emissive: palette.lamp,
    emissiveIntensity: 0.4,
  });

  // === 4 thin columns supporting the deck ===
  // Positioned at the canal edges, AWAY from the road. Player sees the
  // deck floating overhead held up by columns at the far sides — clearly
  // a passage, not a wall.
  const columnX = [-10, -4.0, 4.0, 10];
  const columnGeo = new THREE.CylinderGeometry(0.32, 0.42, DECK_Y, 12);
  for (const cx of columnX) {
    for (const sz of [-DECK_DEPTH / 2 + 0.2, DECK_DEPTH / 2 - 0.2]) {
      const col = new THREE.Mesh(columnGeo, stoneMat);
      col.position.set(cx, DECK_Y / 2, sz);
      col.castShadow = true;
      col.receiveShadow = true;
      g.add(col);
      // Small base plinth
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.2, 0.7),
        trimMat
      );
      plinth.position.set(cx, 0.1, sz);
      g.add(plinth);
      // Decorative cap on top of column
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.18, 0.65),
        trimMat
      );
      cap.position.set(cx, DECK_Y - 0.1, sz);
      g.add(cap);
    }
  }

  // === Deck (the platform on top) — single solid slab ===
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(SPAN, DECK_THICK, DECK_DEPTH + 0.3),
    stoneMat
  );
  deck.position.set(0, DECK_Y + DECK_THICK / 2, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);

  // === Cornice (decorative trim under deck edge) ===
  for (const sz of [-1, 1]) {
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(SPAN + 0.15, 0.16, 0.18),
      trimMat
    );
    cornice.position.set(0, DECK_Y - 0.05, sz * (DECK_DEPTH / 2 + 0.15));
    g.add(cornice);
  }

  // === Parapet rail on top of deck (low wall + balusters) ===
  for (const sz of [-1, 1]) {
    const railBase = new THREE.Mesh(
      new THREE.BoxGeometry(SPAN, 0.12, 0.14),
      stoneMat
    );
    railBase.position.set(
      0,
      DECK_Y + DECK_THICK + 0.06,
      sz * (DECK_DEPTH / 2 + 0.05)
    );
    g.add(railBase);
    // Balusters
    for (let x = -SPAN / 2 + 0.6; x <= SPAN / 2 - 0.6; x += 0.6) {
      const bal = new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.05, 0),
            new THREE.Vector2(0.08, 0.08),
            new THREE.Vector2(0.04, 0.2),
            new THREE.Vector2(0.07, 0.35),
            new THREE.Vector2(0.05, 0.5),
          ],
          8
        ),
        trimMat
      );
      bal.position.set(x, DECK_Y + DECK_THICK + 0.18, sz * (DECK_DEPTH / 2 + 0.05));
      g.add(bal);
    }
    // Top rail
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(SPAN, 0.08, 0.18),
      trimMat
    );
    topRail.position.set(
      0,
      DECK_Y + DECK_THICK + 0.78,
      sz * (DECK_DEPTH / 2 + 0.05)
    );
    g.add(topRail);
  }

  // === 4 corner lampposts ===
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8),
        metal(0x1a1a1a)
      );
      pole.position.set(
        sx * (SPAN / 2 - 0.4),
        DECK_Y + DECK_THICK + 0.7,
        sz * (DECK_DEPTH / 2 + 0.05)
      );
      g.add(pole);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 10),
        goldish
      );
      bulb.position.set(
        sx * (SPAN / 2 - 0.4),
        DECK_Y + DECK_THICK + 1.45,
        sz * (DECK_DEPTH / 2 + 0.05)
      );
      g.add(bulb);
    }
  }

  // === Themed banner draped over the front rail center (with "67") ===
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.95),
    accentMat
  );
  banner.position.set(0, DECK_Y + DECK_THICK + 0.5, DECK_DEPTH / 2 + 0.16);
  g.add(banner);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.55),
    new THREE.MeshBasicMaterial({
      map: makeBigSignTexture("67", palette.lampHex(), palette.accentHex()),
      transparent: true,
    })
  );
  sign.position.set(0, DECK_Y + DECK_THICK + 0.5, DECK_DEPTH / 2 + 0.18);
  g.add(sign);

  // Shadow opt-out for tiny pieces
  g.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    m.receiveShadow = true;
    const geo = m.geometry as any;
    if (geo?.parameters) {
      const p = geo.parameters;
      const big =
        (p.height && p.height > 0.5) ||
        (p.radius && p.radius > 0.3) ||
        (p.width && p.width > 4);
      if (m.castShadow === undefined) m.castShadow = !!big;
    }
  });

  return g;
}

function paletteFor(themeId: string): {
  stone: number;
  trim: number;
  accent: number;
  lamp: number;
  lampHex: () => string;
  accentHex: () => string;
} {
  const palettes: Record<string, [number, number, number, number]> = {
    usa:    [0x8a8a92, 0xb8b8c0, 0xb8252e, 0xfff0b0],
    brazil: [0xb89878, 0xfedd00, 0x009b3a, 0xfff0c0],
    france: [0xe8dcc4, 0xc8b898, 0x4d7eff, 0xfff0d0],
    japan:  [0x4a3a3a, 0xc83040, 0xff2e9c, 0xff8aff],
    turkey: [0xc8a878, 0xa88058, 0xff8a00, 0xffd070],
    uk:     [0x6a6a78, 0x484858, 0xb8252e, 0xffe0a0],
    russia: [0x9a8a78, 0xc83838, 0xffd257, 0xfff0c0],
    uae:    [0xe8c898, 0xfff0c8, 0xffd247, 0xffe0a0],
    egypt:  [0xd8b878, 0xa07840, 0xffd230, 0xfff0b0],
  };
  const p = palettes[themeId] ?? palettes.usa;
  const toHex = (n: number) => "#" + n.toString(16).padStart(6, "0");
  return {
    stone: p[0], trim: p[1], accent: p[2], lamp: p[3],
    lampHex: () => toHex(p[3]),
    accentHex: () => toHex(p[2]),
  };
}

const signCache = new Map<string, THREE.Texture>();
function makeBigSignTexture(text: string, fg: string, bg: string): THREE.Texture {
  const key = `${text}|${fg}|${bg}`;
  const cached = signCache.get(key);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 180;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 180);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 164);
  ctx.fillStyle = fg;
  ctx.font = "900 130px -apple-system, Impact, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 95);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, tex);
  return tex;
}
