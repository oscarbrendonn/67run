import * as THREE from "three";
import type { Theme } from "./Themes";

/**
 * City-bridge silhouette — TWO TALL TOWERS + suspended deck + cables.
 * Reads as a real urban bridge (Brooklyn Bridge / Tower Bridge / Bosphorus
 * Köprüsü) rather than the old "4 sticks + slab" LEGO-style viaduct that
 * Oscar called out.
 *
 *   - Towers stand WAY OUTSIDE the road, 7m+ from center, so they never
 *     block the player's lane.
 *   - Deck (the gap player runs through) sits at DECK_Y = 5.8m, well
 *     above jump-peak ~3.3m, so jumping never collides with it.
 *   - Two parabolic main cables connect tower-to-tower, with a forest of
 *     thin vertical hangers dropping to the deck — the readable "bridge"
 *     visual signature.
 *   - Per-theme palette + tower style (gothic stone for USA, blue twin
 *     gothic for UK, modern white concrete for UAE, red wood for Japan).
 */

export function buildBridge(theme: Theme): THREE.Group {
  const palette = paletteFor(theme.id);
  const g = new THREE.Group();

  // --- Geometry constants ---
  const SPAN = 22;            // tower-to-tower distance
  const TOWER_X = 9.5;        // tower offset from road center (clears road+sidewalk+canal)
  const TOWER_HEIGHT = 14;    // tall — Brooklyn Bridge towers are ~84m, scaled here
  const DECK_Y = 5.8;
  const DECK_THICK = 0.5;
  const DECK_DEPTH = 2.4;     // along run direction
  const TOWER_BASE_W = 2.4;
  const TOWER_BASE_D = 2.0;
  const TOWER_TOP_W = 1.4;
  const TOWER_TOP_D = 1.2;

  const stoneMat = new THREE.MeshStandardMaterial({
    color: palette.stone,
    roughness: 0.78,
    metalness: 0.05,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: palette.trim,
    roughness: 0.6,
    metalness: 0.15,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: palette.cable,
    roughness: 0.4,
    metalness: 0.7,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.accent,
    roughness: 0.55,
    metalness: 0.05,
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: palette.lamp,
    roughness: 0.3,
    metalness: 0.5,
    emissive: palette.lamp,
    emissiveIntensity: 0.5,
  });

  // === Two towers (Brooklyn-style: tapered + arched cutouts) ===
  for (const sx of [-1, 1] as const) {
    const tx = sx * TOWER_X;

    // Tower body — slight taper from base to top for that gothic feel
    const towerGeo = new THREE.CylinderGeometry(
      TOWER_TOP_W * 0.5, // top radius (we'll scale-x to make rectangular feel)
      TOWER_BASE_W * 0.5, // base radius
      TOWER_HEIGHT,
      4,                  // 4 sides → square-ish, gothic
      1
    );
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.scale.set(1, 1, TOWER_BASE_D / TOWER_BASE_W);
    tower.rotation.y = Math.PI / 4; // align flat faces road-perpendicular
    tower.position.set(tx, TOWER_HEIGHT / 2, 0);
    tower.castShadow = true;
    tower.receiveShadow = true;
    g.add(tower);

    // Twin gothic arches cut out of each tower (decoration only — visual)
    // Implemented as two darker boxes inset on the road-facing face.
    for (const sz of [-1, 1] as const) {
      const archShade = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.2, 0.05),
        new THREE.MeshStandardMaterial({
          color: 0x111111,
          roughness: 0.9,
        })
      );
      archShade.position.set(tx, DECK_Y + 1.6, sz * (TOWER_BASE_D / 2 + 0.02));
      g.add(archShade);
      // Pointed top (gothic)
      const archTop = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.6, 4, 1),
        new THREE.MeshStandardMaterial({
          color: 0x111111,
          roughness: 0.9,
        })
      );
      archTop.rotation.y = Math.PI / 4;
      archTop.position.set(tx, DECK_Y + 2.95, sz * (TOWER_BASE_D / 2 + 0.02));
      g.add(archTop);
    }

    // Crenelated cap on top of tower (Tower-of-London / Brooklyn cap feel)
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(TOWER_TOP_W + 0.3, 0.4, TOWER_TOP_D + 0.3),
      trimMat
    );
    cap.position.set(tx, TOWER_HEIGHT + 0.2, 0);
    cap.castShadow = true;
    g.add(cap);
    // Pointed spire on top (gothic / Brooklyn-style)
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.6, 4),
      trimMat
    );
    spire.rotation.y = Math.PI / 4;
    spire.position.set(tx, TOWER_HEIGHT + 1.2, 0);
    spire.castShadow = true;
    g.add(spire);
  }

  // === Two main suspension cables — parabolic curve from tower-top to
  //     tower-top, sagging down to ~DECK_Y + 1.5m at midspan ===
  const towerTopY = TOWER_HEIGHT;
  const sagMidY = DECK_Y + 1.4;
  for (const sz of [-1, 1] as const) {
    const z = sz * (DECK_DEPTH / 2 + 0.05);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-TOWER_X, towerTopY, z),
      new THREE.Vector3(0, sagMidY, z),
      new THREE.Vector3(TOWER_X, towerTopY, z),
    ]);
    // Lower-tessellation tube (was 32 segments × 8 sides ≈ 256 verts, now
    // 12 × 6 ≈ 72). Cable is thin enough that the reduction is invisible
    // but the polygon savings × 2 cables × N bridges add up.
    const cableGeo = new THREE.TubeGeometry(curve, 12, 0.09, 6, false);
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.castShadow = false;
    g.add(cable);

    // Vertical hangers from cable down to deck — every ~2.2m (was 1.1m,
    // 16 hangers per cable × 2 cables = 32 cylinders. Halved → 16 total).
    // Visual density still reads as "Brooklyn Bridge cable forest".
    const HANGER_STEP = 2.2;
    for (let x = -TOWER_X + HANGER_STEP; x < TOWER_X - 0.01; x += HANGER_STEP) {
      // Parabola y at x: y = sagMidY + (towerTopY - sagMidY) * (x / TOWER_X)^2
      const t = x / TOWER_X;
      const yTop = sagMidY + (towerTopY - sagMidY) * t * t;
      const yBot = DECK_Y + DECK_THICK;
      const len = yTop - yBot;
      if (len <= 0.05) continue;
      const hanger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, len, 5),
        cableMat
      );
      hanger.position.set(x, (yTop + yBot) / 2, z);
      g.add(hanger);
    }
  }

  // === Deck — single wide slab spanning between towers ===
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(SPAN, DECK_THICK, DECK_DEPTH + 0.2),
    stoneMat
  );
  deck.position.set(0, DECK_Y + DECK_THICK / 2, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);

  // === Cornice + parapet rail on top of deck ===
  for (const sz of [-1, 1] as const) {
    const railBase = new THREE.Mesh(
      new THREE.BoxGeometry(SPAN, 0.18, 0.16),
      trimMat
    );
    railBase.position.set(
      0,
      DECK_Y + DECK_THICK + 0.09,
      sz * (DECK_DEPTH / 2 + 0.02)
    );
    g.add(railBase);
    // Top hand-rail
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(SPAN, 0.08, 0.16),
      trimMat
    );
    topRail.position.set(
      0,
      DECK_Y + DECK_THICK + 0.95,
      sz * (DECK_DEPTH / 2 + 0.02)
    );
    g.add(topRail);
    // Vertical posts (every ~1m)
    for (let x = -SPAN / 2 + 0.6; x <= SPAN / 2 - 0.6; x += 1.0) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.85, 0.08),
        trimMat
      );
      post.position.set(
        x,
        DECK_Y + DECK_THICK + 0.55,
        sz * (DECK_DEPTH / 2 + 0.02)
      );
      g.add(post);
    }
  }

  // === Lampposts every 4m along front rail ===
  for (let x = -SPAN / 2 + 2.5; x <= SPAN / 2 - 2.5; x += 4) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    pole.position.set(x, DECK_Y + DECK_THICK + 1.2, DECK_DEPTH / 2 + 0.02);
    g.add(pole);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 10),
      lampMat
    );
    bulb.position.set(x, DECK_Y + DECK_THICK + 2.05, DECK_DEPTH / 2 + 0.02);
    g.add(bulb);
  }

  // === Themed banner with "67" sign hung from front cable midspan ===
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.0),
    accentMat
  );
  banner.position.set(0, DECK_Y + DECK_THICK + 1.6, DECK_DEPTH / 2 + 0.18);
  g.add(banner);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.6),
    new THREE.MeshBasicMaterial({
      map: makeBigSignTexture("67", palette.lampHex(), palette.accentHex()),
      transparent: true,
    })
  );
  sign.position.set(0, DECK_Y + DECK_THICK + 1.6, DECK_DEPTH / 2 + 0.2);
  g.add(sign);

  return g;
}

/** Theme palettes — stone (towers), trim (caps), cable (suspension cables),
 *  accent (banner), lamp (lampposts).
 *  Picked to evoke each city's most iconic real-world bridge:
 *    USA  → Brooklyn Bridge (warm sandstone + gold cables)
 *    UK   → Tower Bridge (steel-blue + gold trim)
 *    UAE  → Sheikh Zayed Bridge (white concrete + cyan)
 *    Japan→ Rainbow Bridge / red Torii (vermillion red)
 *    Turkey→ Bosphorus Bridge (white deck + steel cables)
 *    France→ Pont Alexandre III (gold + cream stone)
 *    Brazil→ tropical green-yellow stone
 *    Russia→ pale stone with red star accents
 *    Egypt→ Qasr al-Nil (sandstone + bronze) */
function paletteFor(themeId: string): {
  stone: number;
  trim: number;
  cable: number;
  accent: number;
  lamp: number;
  lampHex: () => string;
  accentHex: () => string;
} {
  const palettes: Record<string, [number, number, number, number, number]> = {
    //         stone     trim      cable     accent    lamp
    usa:    [0xa0826b, 0xc4a987, 0xe8c170, 0xb8252e, 0xfff0b0], // Brooklyn warm
    brazil: [0xc8a878, 0xfedd00, 0x444444, 0x009b3a, 0xfff0c0],
    france: [0xe8dcc4, 0xd4af37, 0xd4af37, 0x4d7eff, 0xfff0d0], // Alexandre III gold
    japan:  [0xb8231a, 0x8a1a14, 0x222222, 0xff2e9c, 0xff8aff], // vermillion red
    turkey: [0xf0f0f4, 0xc8b8a0, 0x4a4a52, 0xff8a00, 0xffd070], // Bosphorus white
    uk:     [0x2a4a7a, 0xc8a878, 0x222222, 0xb8252e, 0xffe0a0], // Tower Bridge blue
    russia: [0xb8a888, 0xc83838, 0x222222, 0xffd257, 0xfff0c0],
    uae:    [0xfafaf8, 0xe8c898, 0x223344, 0xffd247, 0xffe0a0], // Sheikh Zayed white
    egypt:  [0xc8a060, 0x8a6a30, 0x444444, 0xffd230, 0xfff0b0],
    // Roman travertine + iron + ornate gilded statues (Ponte Sant'Angelo)
    italy:  [0xd8c0a0, 0xa88860, 0x4a4438, 0xc83838, 0xffd470],
    // Sydney Harbour Bridge (steel arch, "the coathanger")
    australia: [0x6a6e74, 0x484c52, 0x282c30, 0xff8a3a, 0xffe0a0],
    // Shanghai/Nanpu suspension — modern white concrete + red accents
    china:  [0xc8c0b8, 0xa89890, 0x4a3838, 0xff2030, 0xffd247],
    // Banpo Rainbow Bridge — concrete deck + multicolor LED strip
    korea:  [0xa8a8b0, 0x707080, 0x303040, 0xff5078, 0x2ed0ff],
  };
  const p = palettes[themeId] ?? palettes.usa;
  const toHex = (n: number) => "#" + n.toString(16).padStart(6, "0");
  return {
    stone: p[0], trim: p[1], cable: p[2], accent: p[3], lamp: p[4],
    lampHex: () => toHex(p[4]),
    accentHex: () => toHex(p[3]),
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
