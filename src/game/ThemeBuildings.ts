import * as THREE from "three";
import type { Theme } from "./Themes";

/**
 * Generates architecturally distinct buildings per country theme.
 * Each theme has 3-5 building variants that match the city's real architecture.
 */

export interface ThemeBuilding {
  group: THREE.Group;
  mainMaterials: THREE.MeshStandardMaterial[];
  accentMaterials: THREE.MeshStandardMaterial[];
}

const stone = (color: number, rough = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
const glass = (color: number) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.15,
    metalness: 0.85,
  });
const emit = (color: number, intensity = 0.8) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
  });

/** Stable per-slot pseudo-random hash via Murmur3 finalizer. Proper
 *  avalanche so adjacent slots scatter across the modulo space — fixes the
 *  "every 4th slot is the same type" period collapse the old Knuth hash
 *  produced (visible as repeating buildings every 28m). */
function hash32(slot: number, salt: number = 0): number {
  let x = slot ^ (salt * 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

function pickType<T extends string>(slot: number, types: readonly T[]): T {
  return types[hash32(slot) % types.length];
}

/** Stable per-slot float in [0,1) — for randomized but stable heights. */
function slotRand(slot: number, salt: number = 0): number {
  return hash32(slot, salt) / 4294967295;
}

/** Add a triangular-prism (gabled) roof on top of a building body.
 *  Creates a peaked silhouette + small chimney for that classic streetside
 *  look (Subway Surfers / European row house vibe). */
function addGabledRoof(
  g: THREE.Group,
  width: number,
  depth: number,
  baseY: number,
  roofColor: number,
  opts: { ridgeFraction?: number; addChimney?: boolean; overhang?: number } = {}
): void {
  const ridge = width * (opts.ridgeFraction ?? 0.42);
  const overhang = opts.overhang ?? 0.18;
  // Triangular extrusion shape (cross-section of the gable)
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 - overhang, 0);
  shape.lineTo(0, ridge);
  shape.lineTo(width / 2 + overhang, 0);
  shape.lineTo(-width / 2 - overhang, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth + overhang * 2,
    bevelEnabled: false,
  });
  const mat = stone(roofColor, 0.85);
  const roof = new THREE.Mesh(geo, mat);
  roof.position.set(0, baseY, -depth / 2 - overhang);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  // Optional chimney (small dark box near one end of the ridge)
  if (opts.addChimney !== false) {
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 1.2, 0.45),
      stone(0x3a2418, 0.95)
    );
    chimney.position.set(
      width * 0.3 * (Math.random() < 0.5 ? -1 : 1),
      baseY + ridge * 0.65 + 0.6,
      0
    );
    chimney.castShadow = true;
    g.add(chimney);
    // Chimney cap
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.1, 0.55),
      stone(0x2a1a10, 0.95)
    );
    cap.position.set(chimney.position.x, baseY + ridge * 0.65 + 1.25, 0);
    g.add(cap);
  }
}

/** Add a ground-floor storefront — recessed glass + awning + door + sign.
 *  This is what gives a building "real shop street" feel rather than a plain
 *  wall. Apply to mid-rise apartments and row houses. */
function addStorefront(
  g: THREE.Group,
  width: number,
  depth: number,
  awningColor: number,
  signText: string,
  signBg: string,
  signFg: string
): void {
  const z = depth / 2;
  // Recessed window darkens area below 2m — frame out a darker rectangle
  const recess = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.4, 1.7, 0.04),
    stone(0x141820, 0.5)
  );
  recess.position.set(0, 1.0, z + 0.005);
  g.add(recess);
  // Glow from inside (warm interior light)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.6, 1.5),
    new THREE.MeshStandardMaterial({
      color: 0xffd070,
      emissive: 0xffd070,
      emissiveIntensity: 0.85,
      roughness: 1,
    })
  );
  glow.position.set(0, 1.0, z + 0.03);
  g.add(glow);
  // Mullion bars (vertical dividers in shopfront window)
  for (let x = -width / 2 + 0.5; x < width / 2; x += (width - 0.4) / 4) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.7, 0.05),
      stone(0x1a1a1a, 0.6)
    );
    bar.position.set(x, 1.0, z + 0.05);
    g.add(bar);
  }
  // Door (offset to one side)
  const doorMat = stone(0x4a2a18, 0.7);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 1.7, 0.06),
    doorMat
  );
  const doorX = width * 0.28 * (Math.random() < 0.5 ? -1 : 1);
  door.position.set(doorX, 0.85, z + 0.06);
  g.add(door);
  // Door handle (gold dot)
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshStandardMaterial({
      color: 0xffd257,
      metalness: 0.9,
      roughness: 0.2,
    })
  );
  handle.position.set(doorX + 0.22, 0.95, z + 0.1);
  g.add(handle);
  // Awning — striped fabric extending out from the wall
  const awningGeo = new THREE.BoxGeometry(width - 0.2, 0.18, 0.7);
  const awning = new THREE.Mesh(awningGeo, stone(awningColor, 0.85));
  awning.position.set(0, 2.05, z + 0.4);
  awning.rotation.x = -0.18; // slight downward tilt
  g.add(awning);
  // Awning underside trim (white stripes)
  for (let x = -width / 2 + 0.4; x < width / 2 - 0.2; x += 0.55) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.72),
      stone(0xfafaf2, 0.85)
    );
    stripe.position.set(x, 2.05, z + 0.41);
    stripe.rotation.x = -0.18;
    g.add(stripe);
  }
  // Sign panel above awning
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.7, 0.42),
    new THREE.MeshBasicMaterial({
      map: makeShopSignTexture(signText, signBg, signFg),
      transparent: true,
    })
  );
  sign.position.set(0, 2.55, z + 0.06);
  g.add(sign);
  // Sidewalk strip at ground level (concrete band in front of door)
  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.2, 0.05, 0.5),
    stone(0x9a9a9a, 0.95)
  );
  sidewalk.position.set(0, 0.025, z + 0.6);
  g.add(sidewalk);
}

const shopSignCache = new Map<string, THREE.Texture>();
function makeShopSignTexture(text: string, bg: string, fg: string): THREE.Texture {
  const k = `${text}|${bg}|${fg}`;
  const cached = shopSignCache.get(k);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  // Border
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);
  // Text
  ctx.fillStyle = fg;
  ctx.font = "900 72px -apple-system, Impact, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  shopSignCache.set(k, tex);
  return tex;
}

/** Add a flat-roof clutter layer (water tank / AC / satellite dish) for
 *  modern flat-top buildings — adds vertical interest without a peaked roof. */
function addRoofClutter(
  g: THREE.Group,
  width: number,
  depth: number,
  topY: number
): void {
  // Water tank (cylinder) — common on NYC / mid-rise rooftops
  if (Math.random() < 0.6) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.6, 1.2, 12),
      stone(0x6a4a2a, 0.95)
    );
    tank.position.set(
      (Math.random() - 0.5) * width * 0.5,
      topY + 0.6,
      (Math.random() - 0.5) * depth * 0.3
    );
    tank.castShadow = true;
    g.add(tank);
  }
  // AC unit
  if (Math.random() < 0.5) {
    const ac = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.6),
      stone(0xa8a8b0, 0.85)
    );
    ac.position.set(
      (Math.random() - 0.5) * width * 0.6,
      topY + 0.2,
      (Math.random() - 0.5) * depth * 0.4
    );
    g.add(ac);
  }
  // Antenna (thin pole)
  if (Math.random() < 0.4) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6),
      stone(0x1a1a1a)
    );
    pole.position.set(
      (Math.random() - 0.5) * width * 0.3,
      topY + 0.8,
      (Math.random() - 0.5) * depth * 0.2
    );
    g.add(pole);
  }
}

export function buildThemeBuilding(theme: Theme, slot: number): ThemeBuilding {
  switch (theme.id) {
    case "usa":
      return buildNYC(slot);
    case "brazil":
      return buildRio(slot);
    case "france":
      return buildParis(slot);
    case "japan":
      return buildTokyo(slot);
    case "turkey":
      return buildIstanbul(slot);
    case "uk":
      return buildLondon(slot);
    case "russia":
      return buildMoscow(slot);
    case "uae":
      return buildDubai(slot);
    case "egypt":
      return buildCairo(slot);
    default:
      return fallback();
  }
}

/* ============================================================ */
/*                            NYC                                */
/* ============================================================ */

function buildNYC(slot: number): ThemeBuilding {
  // 4 visually-distinct NYC variants:
  //   skyscraper  — tall blue mirrored glass tower
  //   deco        — vintage tan limestone setback (Empire State style)
  //   brownstone  — short red brick row house with stoop
  //   warehouse   — red brick warehouse with flat roof + loading dock
  const types = ["skyscraper", "deco", "brownstone", "warehouse"];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  if (t === "skyscraper") {
    // Classic NYC glass-and-steel tower (20-35m)
    const h = 20 + Math.random() * 20;
    const mat = glass(0x6a7a94);
    mainMats.push(mat);
    const w = 5 + Math.random() * 3;
    const d = 4 + Math.random() * 3;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    g.add(body);
    // Window grid via window band strips
    const windowMat = emit(0xffe08a, 0.6);
    accentMats.push(windowMat);
    for (let y = 1.2; y < h - 1; y += 1.3) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.98, 0.35, d + 0.02),
        windowMat
      );
      band.position.y = y;
      g.add(band);
    }
    // Rooftop water tower
    if (Math.random() < 0.6) {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.9, 1.6, 12),
        stone(0x5a3a24)
      );
      tank.position.y = h + 0.8;
      g.add(tank);
      const tankRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.95, 0.6, 12),
        stone(0x3a2014)
      );
      tankRoof.position.y = h + 1.9;
      g.add(tankRoof);
    }
    // Antenna
    if (Math.random() < 0.4) {
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.1, 2, 6),
        stone(0x1a1a1a)
      );
      ant.position.y = h + 1;
      g.add(ant);
    }
  } else if (t === "deco") {
    // Art Deco setback building (Empire State style, stepped)
    const mat = stone(0x8a7a5a);
    mainMats.push(mat);
    const tiers = [
      { w: 7, d: 5, h: 10 },
      { w: 5.5, d: 4.2, h: 8 },
      { w: 4, d: 3.2, h: 6 },
      { w: 2.5, d: 2, h: 5 },
    ];
    let y = 0;
    for (const tier of tiers) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(tier.w, tier.h, tier.d),
        mat
      );
      box.position.y = y + tier.h / 2;
      g.add(box);
      y += tier.h;
    }
    // Ornate spire top
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 3, 8),
      stone(0x5a4838)
    );
    spire.position.y = y + 1.5;
    g.add(spire);
    // Emissive lit windows rows
    const winMat = emit(0xffd070, 0.5);
    accentMats.push(winMat);
    for (let yy = 1.2; yy < y; yy += 1.4) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 0.25, 4.6),
        winMat
      );
      band.position.y = yy;
      g.add(band);
    }
  } else if (t === "brownstone") {
    // 4-story brick brownstone
    const h = 8 + Math.random() * 3;
    const mat = stone(0x8a4a2a);
    mainMats.push(mat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, h, 4), mat);
    body.position.y = h / 2;
    g.add(body);
    // Window rows — painted on via emissive
    const win = emit(0xfff0c8, 0.4);
    accentMats.push(win);
    for (let y = 1.5; y < h - 0.5; y += 2) {
      for (let x = -2; x <= 2; x += 2) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.1), win);
        w.position.set(x, y, 2.01);
        g.add(w);
      }
    }
    // Roof: NYC brownstones traditionally have peaked stoops + flat tar
    // tops with parapets. Mix 50/50 — gabled for visual variety, flat-with
    // -clutter for the rest.
    if (Math.random() < 0.55) {
      addGabledRoof(g, 6, 4, h, 0x4a2a18, { ridgeFraction: 0.4, addChimney: true });
    } else {
      // Flat roof edge (traditional brownstone parapet)
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 0.3, 4.2),
        stone(0x4a2a18)
      );
      roof.position.y = h;
      g.add(roof);
      addRoofClutter(g, 6, 4, h + 0.15);
    }
    // Ground-floor storefront (recessed glass + awning + sign).
    // Mostly real shop names; "67" appears rarely as easter-egg.
    const shops = ["DELI", "BAGELS", "PIZZA", "DINER", "COFFEE", "BOOKS",
                   "BARBER", "GROCERY", "BAKERY", "67 CAFE"];
    addStorefront(g, 6, 4, 0xb8252e, shops[Math.floor(Math.random() * shops.length)], "#fff", "#b8252e");
    // Fire escape
    const fe = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, h - 2, 1.0),
      stone(0x0a0a0a)
    );
    fe.position.set(3.05, h / 2, 0);
    g.add(fe);
  } else {
    // Industrial red brick warehouse — visually distinct from glass+stone
    // (was glassTower, but it looked similar to skyscraper). Squat, wide,
    // industrial roll-up door + signage.
    const h = 6 + Math.random() * 3;
    const w = 7 + Math.random() * 1.5;
    const d = 4.5;
    const brick = stone(0x8a3a28, 0.95);
    mainMats.push(brick);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brick);
    body.position.y = h / 2;
    g.add(body);
    // Horizontal brick courses (texture suggestion)
    for (let y = 0.4; y < h - 0.3; y += 0.7) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.08, 0.04, d + 0.04),
        stone(0x5a2a18, 0.95)
      );
      line.position.y = y;
      g.add(line);
    }
    // Big roll-up loading door (corrugated metal)
    const doorMat = stone(0x6a6a72, 0.6);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.6, 0.06),
      doorMat
    );
    door.position.set(-w * 0.18, 1.3, d / 2 + 0.04);
    g.add(door);
    // Door corrugation lines
    for (let y = 0.2; y < 2.4; y += 0.18) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(2.55, 0.04, 0.07),
        stone(0x4a4a52, 0.6)
      );
      line.position.set(-w * 0.18, y, d / 2 + 0.07);
      g.add(line);
    }
    // Small office windows on the upper portion
    const winMat = emit(0xfff0c8, 0.45);
    accentMats.push(winMat);
    for (let x = w * 0.05; x < w / 2 - 0.4; x += 0.95) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.05), winMat);
      win.position.set(x, h * 0.55, d / 2 + 0.04);
      g.add(win);
    }
    // Flat roof + parapet edge
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.15, 0.25, d + 0.15),
      stone(0x4a2418, 0.9)
    );
    parapet.position.y = h + 0.12;
    g.add(parapet);
    addRoofClutter(g, w, d, h + 0.25);
    // Sign on facade — same brick building can host any kind of business
    // in real NYC (lofts, cafes, galleries, offices, shops). Pick from a
    // wide mix so 5 of these next to each other feel like a normal block,
    // not 5 warehouses. "67" appears occasionally as easter-egg.
    const buildingSigns = [
      // Food & drink
      "CAFE", "DELI", "PIZZA", "BAR", "BAGELS", "DINER", "67 CAFE",
      // Shops
      "BOOKS", "BARBER", "GROCERY", "BAKERY", "FLOWERS", "SHOES",
      // Workspaces / lofts
      "LOFTS", "OFFICE", "STUDIO", "GALLERY", "67 CO.",
      // Industrial (kept rare)
      "WAREHOUSE", "STORAGE", "FREIGHT",
      // Misc
      "MOTEL", "HOTEL", "BANK", "PHARMACY",
    ];
    const warehouseSign = buildingSigns[Math.floor(Math.random() * buildingSigns.length)];
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.55, 0.6),
      new THREE.MeshBasicMaterial({
        map: makeShopSignTexture(warehouseSign, "#1a1a1a", "#ffd257"),
        transparent: true,
      })
    );
    sign.position.set(0, h - 0.5, d / 2 + 0.05);
    g.add(sign);
  }

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

/* ============================================================ */
/*                            PARIS                              */
/* ============================================================ */

function buildParis(slot: number): ThemeBuilding {
  // Haussmann: 5-story cream facades with mansard roofs
  const types = ["haussmann", "haussmannWide", "cafeHouse"];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  const facadeColor = 0xe8d7b0 + Math.floor(Math.random() * 0x0a0a0a);
  const facadeMat = stone(facadeColor, 0.85);
  mainMats.push(facadeMat);
  const roofMat = stone(0x3a2a20);
  mainMats.push(roofMat);
  const winMat = emit(0xffe0a0, 0.5);
  accentMats.push(winMat);

  if (t === "cafeHouse") {
    // 2-3 story cafe building with awning
    const h = 6;
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, h, 4), facadeMat);
    body.position.y = h / 2;
    g.add(body);
    // Striped awning
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.25, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xc8304a, roughness: 0.7 })
    );
    awning.position.set(0, 2.2, 2.4);
    awning.rotation.x = -0.25;
    g.add(awning);
    // Windows
    for (let y = 2; y < h - 0.5; y += 2) {
      for (let x = -1.8; x <= 1.8; x += 1.8) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.1), winMat);
        w.position.set(x, y + 1.5, 2.01);
        g.add(w);
      }
    }
    // Mansard roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(6.3, 0.8, 4.3),
      roofMat
    );
    roof.position.y = h + 0.4;
    g.add(roof);
    return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
  }

  const h = t === "haussmannWide" ? 12 : 11;
  const w = t === "haussmannWide" ? 8 : 6;
  const d = 4;

  // Cream facade body
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat);
  body.position.y = h / 2;
  g.add(body);

  // Floor cornices (horizontal lines)
  for (let y = 2.5; y < h; y += 2.2) {
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.1, 0.15, d + 0.12),
      stone(0xc8b890)
    );
    cornice.position.y = y;
    g.add(cornice);
  }

  // Tall arched windows with wrought iron balconies
  for (let y = 2; y < h - 1; y += 2.2) {
    const winCount = t === "haussmannWide" ? 4 : 3;
    for (let xi = 0; xi < winCount; xi++) {
      const x = -w / 2 + (w / (winCount + 1)) * (xi + 1);
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.5, 0.1),
        winMat
      );
      win.position.set(x, y + 0.4, d / 2 + 0.01);
      g.add(win);
      // Small balcony rail on 2nd floor
      if (y > 3.8 && y < 5.5) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.35, 0.08),
          stone(0x141414)
        );
        rail.position.set(x, y - 0.25, d / 2 + 0.08);
        g.add(rail);
      }
    }
  }

  // Mansard roof — angled trapezoid
  const mansard = new THREE.Mesh(
    new THREE.CylinderGeometry(w * 0.6, w * 0.5 + 0.1, 2, 4),
    roofMat
  );
  mansard.rotation.y = Math.PI / 4;
  mansard.position.y = h + 1;
  g.add(mansard);
  // Small roof windows (dormers)
  for (let xi = 0; xi < 3; xi++) {
    const dormer = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.4),
      facadeMat
    );
    dormer.position.set(-w / 4 + (xi * w) / 4, h + 0.6, d / 2 + 0.2);
    g.add(dormer);
    const dorWin = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.35, 0.05),
      winMat
    );
    dorWin.position.set(-w / 4 + (xi * w) / 4, h + 0.65, d / 2 + 0.42);
    g.add(dorWin);
  }

  // Chimney
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.5, 0.6),
    stone(0x8a6b58)
  );
  chimney.position.set(-w / 3, h + 1.8, -d / 4);
  g.add(chimney);

  // Ground-floor storefront (Parisian patisserie / boutique)
  const parisShops = ["BOULANGERIE", "PATISSERIE", "FROMAGER", "BISTRO", "LIBRAIRIE", "CAFÉ", "FLEURS", "67 CAFÉ"];
  addStorefront(
    g,
    w,
    d,
    0x3a4a8a,
    parisShops[Math.floor(Math.random() * parisShops.length)],
    "#1a2040",
    "#fafaf2"
  );

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

/* ============================================================ */
/*                            TOKYO                              */
/* ============================================================ */

function buildTokyo(slot: number): ThemeBuilding {
  const types = ["neonTower", "pachinko", "tall", "pagoda"];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  const bodyMat = stone(0x2a2038);
  mainMats.push(bodyMat);

  if (t === "neonTower") {
    // Tall narrow neon tower
    const h = 16 + Math.random() * 12;
    const w = 3 + Math.random() * 1.5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), bodyMat);
    body.position.y = h / 2;
    g.add(body);
    // Vertical neon sign strip on side
    const neonColors = [0xff2e9c, 0x2ee0ff, 0xffd257, 0x9c2eff];
    const signColor = neonColors[Math.floor(Math.random() * neonColors.length)];
    const signMat = emit(signColor, 1.2);
    accentMats.push(signMat);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, h * 0.75, 0.2),
      signMat
    );
    sign.position.set(w / 2 + 0.2, h / 2, 0);
    g.add(sign);
    // Horizontal neon bands
    for (let y = 3; y < h; y += 2.5) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.05, 0.15, w * 0.8 + 0.02),
        emit(Math.random() < 0.5 ? 0xff2e9c : 0x2ee0ff, 0.9)
      );
      band.position.y = y;
      g.add(band);
    }
    // Small rooftop antenna + red warning light
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 1.4, 6),
      stone(0x1a1a1a)
    );
    ant.position.y = h + 0.7;
    g.add(ant);
    const warningLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      emit(0xff2030, 3.0)
    );
    warningLight.position.y = h + 1.5;
    g.add(warningLight);
  } else if (t === "pachinko") {
    // Shorter dense Tokyo building with many small lit windows
    const h = 10 + Math.random() * 6;
    const w = 5 + Math.random() * 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), bodyMat);
    body.position.y = h / 2;
    g.add(body);
    // Horizontal neon sign near top
    const topSignMat = emit(Math.random() < 0.5 ? 0xff8a00 : 0xff2e9c, 1.4);
    accentMats.push(topSignMat);
    const topSign = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.9, 1.3, 0.4),
      topSignMat
    );
    topSign.position.set(0, h - 0.9, 2.12);
    g.add(topSign);
    // Tiny window grid
    const winMat = emit(0xfff0b0, 0.6);
    accentMats.push(winMat);
    for (let y = 1.2; y < h - 2; y += 0.9) {
      for (let x = -w / 2 + 0.7; x <= w / 2 - 0.5; x += 0.7) {
        const w0 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.08), winMat);
        w0.position.set(x, y, 2.02);
        g.add(w0);
      }
    }
  } else if (t === "pagoda") {
    // Mini pagoda-style building
    const roofMat = stone(0x8a2a2a);
    mainMats.push(roofMat);
    for (let i = 0; i < 4; i++) {
      const w = 4 - i * 0.5;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 2, w), bodyMat);
      tier.position.y = 1 + i * 3;
      g.add(tier);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(w * 0.85, 1, 4),
        roofMat
      );
      roof.position.y = 2.5 + i * 3;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
    }
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd257, metalness: 0.8, roughness: 0.2 })
    );
    spire.position.y = 14;
    g.add(spire);
  } else {
    // Tall thin tokyo building
    const h = 20 + Math.random() * 15;
    const w = 3.5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.9), bodyMat);
    body.position.y = h / 2;
    g.add(body);
    // Side-mounted vertical lit signage
    const signMat = emit(0xff2e9c, 1.2);
    accentMats.push(signMat);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, h * 0.8, 0.15),
      signMat
    );
    sign.position.set(-w / 2 - 0.2, h / 2, 0);
    g.add(sign);
  }

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

/* ============================================================ */
/*                           RIO                                 */
/* ============================================================ */

function buildRio(slot: number): ThemeBuilding {
  const types = ["favela", "beachfront", "colorfulHouse"];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  if (t === "favela") {
    // Stacked colorful favela blocks climbing up
    const favelaColors = [0xd8685a, 0xe8c470, 0x8a9c5a, 0xc88a5a, 0x70a0a8, 0xc8b890];
    for (let i = 0; i < 8 + Math.floor(Math.random() * 6); i++) {
      const color = favelaColors[Math.floor(Math.random() * favelaColors.length)];
      const mat = stone(color, 0.9);
      mainMats.push(mat);
      const w = 1.4 + Math.random() * 1.4;
      const h = 1.4 + Math.random() * 1.6;
      const d = 1.4 + Math.random() * 1.2;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      const x = (Math.random() - 0.5) * 5;
      const z = (Math.random() - 0.5) * 3;
      const y = Math.random() * 4.5;
      box.position.set(x, y + h / 2, z);
      g.add(box);
      // Tin roof
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w * 1.1, 0.08, d * 1.1),
        stone(0x6a5040)
      );
      roof.position.set(x, y + h + 0.04, z);
      g.add(roof);
      // Small window
      if (Math.random() < 0.7) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.4, 0.05),
          emit(0xffd080, 0.4)
        );
        win.position.set(x, y + h * 0.6, z + d / 2 + 0.01);
        g.add(win);
      }
    }
  } else if (t === "beachfront") {
    // White/cream Copacabana-style apartment
    const h = 15 + Math.random() * 8;
    const mat = stone(0xf4ece0);
    mainMats.push(mat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, h, 4), mat);
    body.position.y = h / 2;
    g.add(body);
    // Balconies on each floor
    const balMat = stone(0xe8d8b8);
    mainMats.push(balMat);
    for (let y = 2; y < h - 1; y += 2) {
      const bal = new THREE.Mesh(
        new THREE.BoxGeometry(5.3, 0.12, 0.8),
        balMat
      );
      bal.position.set(0, y, 2.3);
      g.add(bal);
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(5.3, 0.5, 0.08),
        stone(0x2a2a2a)
      );
      rail.position.set(0, y + 0.3, 2.65);
      g.add(rail);
    }
    // Rooftop equipment
    const rooftop = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.8, 2),
      stone(0xa89880)
    );
    rooftop.position.set(0, h + 0.4, 0);
    g.add(rooftop);
  } else {
    // Small colorful bright house
    const palette = [0x2aa0d8, 0xd8c028, 0xd84848, 0x3aa870, 0xd87a1a];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const mat = stone(color, 0.85);
    mainMats.push(mat);
    const h = 4 + Math.random() * 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(4, h, 3.5), mat);
    body.position.y = h / 2;
    g.add(body);
    // Terracotta tile roof (pyramid)
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 1.5, 4),
      stone(0xa04828)
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + 0.7;
    g.add(roof);
    // Door + window
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.6, 0.05),
      stone(0x3a2010)
    );
    door.position.set(0, 0.8, 1.78);
    g.add(door);
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.05),
      emit(0xffe0a0, 0.4)
    );
    win.position.set(-1.4, 2.2, 1.78);
    g.add(win);
    const win2 = win.clone();
    win2.position.x = 1.4;
    g.add(win2);
  }

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

/* ============================================================ */
/*                           MOSCOW                              */
/* ============================================================ */

function buildMoscow(slot: number): ThemeBuilding {
  const types = ["stalin", "apartment", "onionChurch"];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  if (t === "stalin") {
    // Seven Sisters Stalinist tower — stepped with central spire
    const mat = stone(0x9a7868, 0.85);
    mainMats.push(mat);
    const snowMat = stone(0xe8e8e8);
    // Base block
    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 7), mat);
    base.position.y = 4;
    g.add(base);
    // Middle tier
    const mid = new THREE.Mesh(new THREE.BoxGeometry(7, 10, 5), mat);
    mid.position.y = 13;
    g.add(mid);
    // Upper tier
    const upper = new THREE.Mesh(new THREE.BoxGeometry(4.5, 8, 3.5), mat);
    upper.position.y = 22;
    g.add(upper);
    // Spire
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 2.5), mat);
    tower.position.y = 28;
    g.add(tower);
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 6, 4),
      mat
    );
    spire.rotation.y = Math.PI / 4;
    spire.position.y = 33;
    g.add(spire);
    // Red star on top
    const star = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.4, 5),
      emit(0xff2030, 1.4)
    );
    star.position.y = 36.3;
    g.add(star);
    // Snow caps on each tier
    for (const [w, d, y] of [[10, 7, 8], [7, 5, 18], [4.5, 3.5, 26], [2.5, 2.5, 30]]) {
      const snow = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.2, 0.3, d + 0.2),
        snowMat
      );
      snow.position.y = y;
      g.add(snow);
    }
    // Window rows
    const win = emit(0xffd0a0, 0.4);
    accentMats.push(win);
    for (let y = 1.5; y < 7.5; y += 1.6) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.3, 7.1), win);
      band.position.y = y;
      g.add(band);
    }
  } else if (t === "onionChurch") {
    // St Basil's-inspired ornate building with colored domes
    const wallMat = stone(0xc88858);
    mainMats.push(wallMat);
    const central = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 4), wallMat);
    central.position.y = 5;
    g.add(central);
    const domeColors = [0xd42838, 0x2ea060, 0xffd257, 0x3a5a9c, 0xa03ac8];
    const cDomeMat = stone(domeColors[0]);
    mainMats.push(cDomeMat);
    const cDome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), cDomeMat);
    cDome.scale.y = 1.3;
    cDome.position.y = 12;
    g.add(cDome);
    const cSpire = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd257, metalness: 0.85, roughness: 0.2 })
    );
    cSpire.position.y = 15.5;
    g.add(cSpire);
    // 4 small towers around
    for (const [x, z, ci] of [
      [3, 0, 1],
      [-3, 0, 2],
      [0, 3, 3],
      [0, -3, 4],
    ] as const) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), wallMat);
      tower.position.set(x, 3, z);
      g.add(tower);
      const dMat = stone(domeColors[ci]);
      mainMats.push(dMat);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), dMat);
      dome.scale.y = 1.3;
      dome.position.set(x, 7.2, z);
      g.add(dome);
    }
  } else {
    // Standard Moscow concrete apartment block
    const mat = stone(0x8a8a88);
    mainMats.push(mat);
    const h = 14 + Math.random() * 4;
    const w = 7 + Math.random() * 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), mat);
    body.position.y = h / 2;
    g.add(body);
    // Snow on top
    const snow = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.2, 0.3, 4.2),
      stone(0xeeeee8)
    );
    snow.position.y = h + 0.15;
    g.add(snow);
    // Window grid
    const winMat = emit(0xffe0a0, 0.3);
    accentMats.push(winMat);
    for (let y = 1.2; y < h - 1; y += 1.1) {
      for (let x = -w / 2 + 0.7; x < w / 2 - 0.5; x += 0.9) {
        if (Math.random() < 0.85) {
          const w0 = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.6, 0.08),
            winMat
          );
          w0.position.set(x, y, 2.02);
          g.add(w0);
        }
      }
    }
  }

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

/* ============================================================ */
/*                          ISTANBUL                             */
/* ============================================================ */

function buildIstanbul(slot: number): ThemeBuilding {
  // Reduced mosque frequency — too many camis was overwhelming.
  // 1 mosque per 8 buildings, rest are ottoman houses + domed mid-rises
  const types = [
    "ottomanHouse", "domedBuilding", "ottomanHouse", "mosque",
    "domedBuilding", "ottomanHouse", "ottomanHouse", "domedBuilding",
  ];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  const sandstone = stone(0xd8b888);
  mainMats.push(sandstone);
  const domeMat = stone(0x8a8890);
  mainMats.push(domeMat);

  if (t === "mosque") {
    // Ottoman mosque: square base + dome + 2 minarets
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 8), sandstone);
    base.position.y = 3;
    g.add(base);
    // Dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.5, 20, 14), domeMat);
    dome.scale.y = 0.75;
    dome.position.y = 8;
    g.add(dome);
    const domeTop = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 1.5, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd257, metalness: 0.85, roughness: 0.2 })
    );
    domeTop.position.y = 11.5;
    g.add(domeTop);
    // Half-domes on each side
    for (const [x, z] of [[0, 4], [0, -4], [4, 0], [-4, 0]] as const) {
      const hd = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        domeMat
      );
      hd.position.set(x, 6, z);
      g.add(hd);
    }
    // 2 minarets
    for (const x of [-5.5, 5.5]) {
      const min = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 14, 12),
        sandstone
      );
      min.position.set(x, 7, 0);
      g.add(min);
      // Balcony ring
      const bal = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.08, 6, 14),
        sandstone
      );
      bal.position.set(x, 10, 0);
      bal.rotation.x = Math.PI / 2;
      g.add(bal);
      // Top cap
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.6, 2.2, 12),
        sandstone
      );
      cap.position.set(x, 15, 0);
      g.add(cap);
      const crescent = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.05, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0xffd257, metalness: 0.85, roughness: 0.2 })
      );
      crescent.position.set(x, 16.5, 0);
      g.add(crescent);
    }
  } else if (t === "ottomanHouse") {
    // 3-story Ottoman-era house with red tile roof + wood trim
    const h = 7;
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, h, 4), sandstone);
    body.position.y = h / 2;
    g.add(body);
    // Wood balcony/oriel window on front
    const oriel = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2, 0.9),
      stone(0x7a4a28)
    );
    oriel.position.set(0, 5, 2.4);
    g.add(oriel);
    // Red tile pyramid roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 1.8, 4),
      stone(0xa0482a)
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + 0.9;
    g.add(roof);
    // Window grid
    const winMat = emit(0xffe0a0, 0.45);
    accentMats.push(winMat);
    for (let y = 1.5; y < h - 1; y += 2) {
      for (let x = -1.5; x <= 1.5; x += 1.5) {
        const w0 = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.8, 0.05),
          winMat
        );
        w0.position.set(x, y, 2.02);
        g.add(w0);
      }
    }
  } else {
    // Mid-rise with dome top
    const h = 9;
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, h, 5), sandstone);
    body.position.y = h / 2;
    g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 10), domeMat);
    dome.scale.y = 0.7;
    dome.position.y = h + 1;
    g.add(dome);
    const domeFinial = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd257, metalness: 0.8, roughness: 0.25 })
    );
    domeFinial.position.y = h + 3;
    g.add(domeFinial);
    const winMat = emit(0xffd090, 0.5);
    accentMats.push(winMat);
    for (let y = 1.5; y < h - 0.5; y += 2) {
      for (let x = -1.5; x <= 1.5; x += 1.5) {
        const w0 = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.9, 0.05),
          winMat
        );
        w0.position.set(x, y, 2.52);
        g.add(w0);
      }
    }
  }

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

/* ============================================================ */
/*                          LONDON                               */
/* ============================================================ */

function buildLondon(slot: number): ThemeBuilding {
  const types = ["victorianBrick", "georgianRow", "modernGlass"];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  if (t === "victorianBrick") {
    // Red brick Victorian with chimneys
    const brick = stone(0x7a3a2a, 0.95);
    mainMats.push(brick);
    const trim = stone(0xe8dcc4);
    mainMats.push(trim);
    const h = 8 + Math.random() * 3;
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, h, 4), brick);
    body.position.y = h / 2;
    g.add(body);
    // White trim windows
    const winMat = emit(0xfff0c0, 0.45);
    accentMats.push(winMat);
    for (let y = 2; y < h - 1; y += 2) {
      for (let x = -2; x <= 2; x += 2) {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 1.3, 0.05),
          trim
        );
        frame.position.set(x, y, 2.01);
        g.add(frame);
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 1.1, 0.08),
          winMat
        );
        win.position.set(x, y, 2.03);
        g.add(win);
      }
    }
    // Peaked tile roof between two chimneys (Victorian streetside silhouette)
    addGabledRoof(g, 6, 4, h, 0x4a2818, { ridgeFraction: 0.38, addChimney: false });
    // Two chimneys on roof (rebuilt above the gable now)
    for (const x of [-2.2, 2.2]) {
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.4, 0.6),
        brick
      );
      chimney.position.set(x, h + 0.7, 0);
      g.add(chimney);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.12, 0.75),
        trim
      );
      cap.position.set(x, h + 1.46, 0);
      g.add(cap);
    }
  } else if (t === "georgianRow") {
    // Elegant 4-story white stucco Georgian
    const stuccoMat = stone(0xf5f0e6);
    mainMats.push(stuccoMat);
    const h = 9;
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, h, 4), stuccoMat);
    body.position.y = h / 2;
    g.add(body);
    // Black door
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.8, 0.05),
      stone(0x0a0a0a)
    );
    door.position.set(0, 0.9, 2.02);
    g.add(door);
    // Tall sash windows
    const winMat = emit(0xffe8c0, 0.4);
    accentMats.push(winMat);
    for (let y = 2.5; y < h - 0.5; y += 2) {
      for (let x = -1.5; x <= 1.5; x += 1.5) {
        const w0 = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 1.3, 0.05),
          winMat
        );
        w0.position.set(x, y, 2.02);
        g.add(w0);
      }
    }
    // Railing at roof
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.3, 4),
      stone(0x1a1a1a)
    );
    rail.position.y = h - 0.2;
    g.add(rail);
  } else {
    // Modern London skyscraper — slightly curved glass tower
    const h = 22 + Math.random() * 14;
    const glassMat = glass(0x6a8aa8);
    mainMats.push(glassMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(5, h, 5), glassMat);
    body.position.y = h / 2;
    g.add(body);
    // Angled top (London "Gherkin" / "Walkie Talkie" vibe)
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 3, 2, 8),
      glassMat
    );
    top.position.y = h + 1;
    g.add(top);
    // Window bands
    const winBand = emit(0x9abcd8, 0.8);
    accentMats.push(winBand);
    for (let y = 1.5; y < h - 1; y += 1.5) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(5.02, 0.25, 5.02),
        winBand
      );
      band.position.y = y;
      g.add(band);
    }
  }

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

/* ============================================================ */
/*                           DUBAI                               */
/* ============================================================ */

function buildDubai(slot: number): ThemeBuilding {
  const types = ["glassTower", "curvedModern", "sandstone"];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  if (t === "glassTower") {
    // Tall gleaming glass tower with tapered top
    const h = 25 + Math.random() * 20;
    const baseW = 4 + Math.random() * 1;
    const mat = glass(0xcfdde8);
    mainMats.push(mat);
    // Tapered tiers
    let y = 0;
    let w = baseW;
    while (y < h) {
      const th = 4 + Math.random() * 2;
      const tier = new THREE.Mesh(
        new THREE.BoxGeometry(w, th, w * 0.9),
        mat
      );
      tier.position.y = y + th / 2;
      g.add(tier);
      y += th;
      w *= 0.95;
    }
    // Emissive edge lights
    const edgeMat = emit(0x28b8ff, 1.0);
    accentMats.push(edgeMat);
    for (const [x, z] of [
      [baseW / 2 - 0.1, baseW * 0.4],
      [-baseW / 2 + 0.1, baseW * 0.4],
      [baseW / 2 - 0.1, -baseW * 0.4],
      [-baseW / 2 + 0.1, -baseW * 0.4],
    ] as const) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, h - 2, 0.1),
        edgeMat
      );
      edge.position.set(x, (h - 2) / 2, z);
      g.add(edge);
    }
    // Spire
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.35, 6, 8),
      mat
    );
    spire.position.y = h + 3;
    g.add(spire);
  } else if (t === "curvedModern") {
    // Curved/wavy profile (suggest a sail or wave)
    const h = 18 + Math.random() * 8;
    const mat = glass(0xe8d8c0);
    mainMats.push(mat);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 2.2, h, 16, 1, false, 0, Math.PI),
      mat
    );
    body.position.y = h / 2;
    g.add(body);
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, h, 0.3),
      mat
    );
    backWall.position.y = h / 2;
    backWall.position.z = 0;
    g.add(backWall);
    // Gold accent at top
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.8, 3),
      new THREE.MeshStandardMaterial({
        color: 0xffd257,
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    top.position.y = h + 0.4;
    g.add(top);
  } else {
    // Low sandstone building (souq style)
    const mat = stone(0xe8c898);
    mainMats.push(mat);
    const h = 5 + Math.random() * 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, h, 4), mat);
    body.position.y = h / 2;
    g.add(body);
    // Small domes on top
    for (const x of [-1.5, 0, 1.5]) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 10, 8),
        stone(0xc8a878)
      );
      dome.scale.y = 0.7;
      dome.position.set(x, h + 0.35, 0);
      g.add(dome);
    }
    // Arched windows
    const winMat = emit(0xffd070, 0.5);
    accentMats.push(winMat);
    for (let x = -2; x <= 2; x += 2) {
      const arch = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.5, 0.05),
        winMat
      );
      arch.position.set(x, h / 2 + 0.3, 2.02);
      g.add(arch);
    }
  }

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

/* ============================================================ */
/*                            CAIRO                              */
/* ============================================================ */

function buildCairo(slot: number): ThemeBuilding {
  // Cairo mix: limestone apartments, blue-domed mosques, papyrus-column
  // government buildings, and the occasional small step-pyramid monument.
  const types = [
    "cairoApartment", "obelisk", "cairoApartment", "blueMosque",
    "cairoApartment", "papyrusBuilding", "stepPyramid", "cairoApartment",
  ];
  const t = pickType(slot, types);
  const g = new THREE.Group();
  const mainMats: THREE.MeshStandardMaterial[] = [];
  const accentMats: THREE.MeshStandardMaterial[] = [];

  const sand = stone(0xd8b878);
  const darkSand = stone(0xa07840);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd230,
    metalness: 0.92,
    roughness: 0.18,
    emissive: 0x4a3008,
    emissiveIntensity: 0.5,
  });
  const lapis = stone(0x2870b8);
  const turquoise = stone(0x28a8b8);
  mainMats.push(sand, darkSand);
  accentMats.push(goldMat, lapis);

  if (t === "cairoApartment") {
    // 4-7 story limestone apartment with arched windows + balconies
    const h = 8 + Math.random() * 8;
    const w = 5 + Math.random() * 2;
    const d = 4 + Math.random() * 1.5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sand);
    body.position.y = h / 2;
    g.add(body);
    // Window grid — arched (suggested with darker rectangles + small arch caps)
    const winMat = stone(0x4a3a28);
    accentMats.push(winMat);
    const floors = Math.floor(h / 2.5);
    for (let f = 0; f < floors; f++) {
      const wy = 1.6 + f * 2.5;
      const cols = Math.floor(w / 1.0);
      for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + 0.5 + c * (w / cols);
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.95, 0.05),
          winMat
        );
        win.position.set(wx, wy, d / 2 + 0.02);
        g.add(win);
        // Arch top
        const arch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12, 1, false, 0, Math.PI),
          winMat
        );
        arch.rotation.x = Math.PI / 2;
        arch.position.set(wx, wy + 0.5, d / 2 + 0.02);
        g.add(arch);
      }
    }
    // Mashrabiya wooden balconies on alternate floors (gold-brown)
    for (let f = 0; f < floors; f += 2) {
      if (Math.random() < 0.6) {
        const bal = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.8, 0.35, 0.5),
          darkSand
        );
        bal.position.set(0, 1.0 + f * 2.5, d / 2 + 0.25);
        g.add(bal);
        // Lattice railings
        for (let lx = -w / 3; lx <= w / 3; lx += 0.18) {
          const slat = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.4, 0.04),
            darkSand
          );
          slat.position.set(lx, 1.2 + f * 2.5, d / 2 + 0.45);
          g.add(slat);
        }
      }
    }
    // Flat roof with small parapet
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2),
      sand
    );
    parapet.position.y = h + 0.2;
    g.add(parapet);
    // Satellite dish (modern Cairo skyline)
    if (Math.random() < 0.5) {
      const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.42, 0.08, 14),
        stone(0xeeeeee)
      );
      dish.rotation.z = 0.5;
      dish.position.set((Math.random() - 0.5) * w * 0.6, h + 0.6, 0);
      g.add(dish);
    }
    // Extra rooftop clutter — water tank + AC for densely-populated feel
    addRoofClutter(g, w, d, h + 0.4);
    // Ground-floor storefront — Cairo street shop with Arabic-style signage
    const egyptShops = ["SOUK", "BAZAAR", "SPICE", "PAPYRUS", "BAKERY", "TEA", "DATES", "67 SOUK"];
    addStorefront(
      g,
      w,
      d,
      0x9c4828,
      egyptShops[Math.floor(Math.random() * egyptShops.length)],
      "#3a1408",
      "#ffd230"
    );
  } else if (t === "blueMosque") {
    // Mosque with vibrant turquoise/lapis dome (like Mohammed Ali style)
    const base = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 7), sand);
    base.position.y = 2.5;
    g.add(base);
    // Big lapis dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.0, 22, 14), lapis);
    dome.scale.y = 0.85;
    dome.position.y = 6.5;
    g.add(dome);
    // Gold finial
    const finialPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8),
      goldMat
    );
    finialPole.position.y = 9.5;
    g.add(finialPole);
    const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), goldMat);
    finialBall.position.y = 10.2;
    g.add(finialBall);
    // Crescent on top
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.04, 8, 14, Math.PI * 1.2),
      goldMat
    );
    crescent.position.y = 10.6;
    crescent.rotation.z = -0.4;
    g.add(crescent);
    // Half domes
    for (const [x, z] of [[0, 3.5], [0, -3.5], [3.5, 0], [-3.5, 0]] as const) {
      const hd = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        turquoise
      );
      hd.position.set(x, 5, z);
      g.add(hd);
    }
    // Tall single minaret (Cairo style — slim octagonal)
    const min = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 13, 8),
      sand
    );
    min.position.set(4.5, 6.5, -3);
    g.add(min);
    // Minaret cap (small dome + spire)
    const minCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), sand);
    minCap.position.set(4.5, 13.6, -3);
    g.add(minCap);
    // Balcony ring
    const bal = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.06, 6, 14),
      darkSand
    );
    bal.position.set(4.5, 10, -3);
    bal.rotation.x = Math.PI / 2;
    g.add(bal);
    // Entry arch on facade
    const archDoor = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.2, 0.1),
      darkSand
    );
    archDoor.position.set(0, 1.1, 3.55);
    g.add(archDoor);
  } else if (t === "stepPyramid") {
    // Small Djoser-style step pyramid as a roadside monument
    const layers = 5;
    const baseW = 5.0;
    const stepH = 1.2;
    for (let i = 0; i < layers; i++) {
      const w = baseW * (1 - i / layers);
      const layer = new THREE.Mesh(
        new THREE.BoxGeometry(w, stepH, w),
        i % 2 === 0 ? sand : darkSand
      );
      layer.position.y = stepH / 2 + i * stepH;
      g.add(layer);
    }
    // Hieroglyph plaque on front
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.6, 0.06),
      goldMat
    );
    plaque.position.set(0, 1.3, 2.55);
    g.add(plaque);
    // Two small obelisks flanking
    for (const x of [-3.4, 3.4]) {
      const ob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0, 0.18, 3.5, 4),
        sand
      );
      ob.position.set(x, 1.75, 0);
      g.add(ob);
    }
  } else if (t === "obelisk") {
    // Standalone obelisk on a tiered base
    const base1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 2.6), darkSand);
    base1.position.y = 0.3;
    g.add(base1);
    const base2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.8), sand);
    base2.position.y = 0.85;
    g.add(base2);
    // Tapered shaft (4-sided)
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.45, 11, 4),
      sand
    );
    shaft.position.y = 6.6;
    shaft.rotation.y = Math.PI / 4;
    g.add(shaft);
    // Pyramidion (gold cap)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 4), goldMat);
    cap.position.y = 12.4;
    cap.rotation.y = Math.PI / 4;
    g.add(cap);
    // Hieroglyph bands (3 horizontal stripes on shaft)
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.32, 0.12, 4),
        darkSand
      );
      band.position.y = 2 + i * 3;
      band.rotation.y = Math.PI / 4;
      g.add(band);
    }
  } else if (t === "papyrusBuilding") {
    // Government building with papyrus-style columns out front
    const h = 8 + Math.random() * 4;
    const w = 6 + Math.random() * 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4.5), sand);
    body.position.y = h / 2;
    g.add(body);
    // Papyrus columns (cylindrical with bell-shaped tops)
    const colCount = 4;
    for (let i = 0; i < colCount; i++) {
      const cx = -w / 2 + (w / (colCount - 1)) * i;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, h * 0.85, 12),
        sand
      );
      col.position.set(cx, h * 0.425, 2.7);
      g.add(col);
      // Bell-shaped capital
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 0.7, 12, 1, true),
        darkSand
      );
      cap.position.set(cx, h * 0.85 + 0.35, 2.7);
      g.add(cap);
      // Lotus crown on top
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.5, 12),
        goldMat
      );
      crown.position.set(cx, h * 0.85 + 0.95, 2.7);
      g.add(crown);
    }
    // Pediment frieze
    const frieze = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.4, 0.5, 0.3),
      goldMat
    );
    frieze.position.set(0, h * 0.95, 2.85);
    g.add(frieze);
    // Hieroglyph squares on frieze
    for (let i = -w / 3; i <= w / 3; i += 0.6) {
      const glyph = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.04),
        darkSand
      );
      glyph.position.set(i, h * 0.95, 3.02);
      g.add(glyph);
    }
  }

  return { group: g, mainMaterials: mainMats, accentMaterials: accentMats };
}

function fallback(): ThemeBuilding {
  const g = new THREE.Group();
  const mat = stone(0x555);
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 4), mat);
  body.position.y = 5;
  g.add(body);
  return { group: g, mainMaterials: [mat], accentMaterials: [] };
}
