import * as THREE from "three";
import { buildFlagPole } from "./Flags";
import { loadFlagModel } from "./FlagLoader";
import type { Theme } from "./Themes";

/** Build a themed "prop" piece — lamppost, tree, sign — to be placed along the track. */
export function buildStreetProp(theme: Theme, slot: number): THREE.Group {
  const kinds = kindsForTheme(theme);
  const kind = kinds[slot % kinds.length];
  switch (kind) {
    case "lamp":
      return buildLamppost(theme);
    case "tree":
      return buildTree(theme);
    case "palm":
      return buildPalmTree();
    case "pine":
      return buildPineTree();
    case "cherry":
      return buildCherryBlossom();
    case "sign":
      return buildSign(theme);
    case "bench":
      return buildBench(theme);
    case "hydrant":
      return buildHydrant();
    case "torii":
      return buildTorii();
    case "lantern":
      return buildPaperLantern();
    case "bistro":
      return buildBistroSign();
    case "parisLamp":
      return buildParisLamp();
    case "bamboo":
      return buildBamboo();
    case "taxi":
      return buildTaxi();
    case "flag": {
      // Build canvas flag as placeholder; lazy-swap with 3D GLB if available
      const placeholder = buildFlagPole(theme.id);
      loadFlagModel(theme.id).then((glb) => {
        if (!glb) return;
        // Swap children: keep placeholder's transform, replace inner content
        while (placeholder.children.length > 0) {
          placeholder.remove(placeholder.children[0]);
        }
        placeholder.add(glb);
      });
      return placeholder;
    }
    case "bear":
      return buildBear();
    case "snowpine":
      return buildSnowyPine();
    case "snowman":
      return buildSnowman();
    case "firebarrel":
      return buildFireBarrel();
    case "obelisk":
      return buildSideObelisk();
    case "bushCluster":
      return buildBushCluster(theme);
    case "hedge":
      return buildHedge(theme);
  }
}

type PropKind =
  | "lamp"
  | "tree"
  | "palm"
  | "pine"
  | "cherry"
  | "sign"
  | "bench"
  | "hydrant"
  | "torii"
  | "lantern"
  | "bistro"
  | "parisLamp"
  | "bamboo"
  | "taxi"
  | "flag"
  | "bear"
  | "snowpine"
  | "snowman"
  | "firebarrel"
  | "obelisk"
  | "bushCluster"
  | "hedge";

function kindsForTheme(theme: Theme): PropKind[] {
  // Flags REMOVED from periodic props — they only appear at country-entry
  // (Game.checkThemeSwitch → world.spawnFlagPair). Oscar: "Bayrak her yerde
  // olmayacak. Bayrak, sadece ülkeye girerken olacak."
  switch (theme.id) {
    case "usa":
      return ["lamp", "tree", "hedge", "bushCluster", "tree", "hydrant", "sign", "lamp", "tree", "hedge", "bench", "tree", "bushCluster", "lamp", "tree", "bushCluster"];
    case "brazil":
      return ["palm", "palm", "hedge", "bushCluster", "palm", "lamp", "palm", "tree", "bench", "palm", "hedge", "palm", "bushCluster", "palm", "lamp", "palm"];
    case "france":
      return ["parisLamp", "bushCluster", "bistro", "hedge", "tree", "parisLamp", "bushCluster", "tree", "bistro", "bench", "hedge", "tree", "parisLamp", "tree", "bushCluster", "bistro"];
    case "japan":
      return ["lantern", "bushCluster", "torii", "lantern", "cherry", "hedge", "lantern", "cherry", "bushCluster", "lantern", "cherry", "torii", "bamboo", "lantern", "bushCluster", "cherry"];
    case "turkey":
      return ["lamp", "bushCluster", "lantern", "hedge", "tree", "bushCluster", "sign", "lamp", "tree", "hedge", "bench", "tree", "lantern", "lamp", "bushCluster", "tree"];
    case "uk":
      return ["parisLamp", "bushCluster", "hedge", "tree", "parisLamp", "bench", "bushCluster", "tree", "bistro", "hedge", "parisLamp", "tree", "lamp", "tree", "bushCluster", "bistro"];
    case "russia":
      return ["snowpine", "bushCluster", "snowman", "snowpine", "bear", "firebarrel", "snowpine", "bushCluster", "snowpine", "snowman", "snowpine", "lamp", "snowpine", "bushCluster", "snowpine", "snowman"];
    case "uae":
      return ["palm", "palm", "hedge", "palm", "lamp", "bushCluster", "sign", "palm", "bench", "palm", "hedge", "palm", "lamp", "palm", "bushCluster", "palm"];
    case "egypt":
      return ["palm", "obelisk", "palm", "hedge", "obelisk", "bushCluster", "lamp", "palm", "bench", "palm", "hedge", "palm", "obelisk", "palm", "bushCluster", "obelisk"];
    case "italy":
      return ["lamp", "tree", "bushCluster", "bistro", "hedge", "tree", "lamp", "bushCluster", "bench", "tree", "bistro", "hedge", "lamp", "tree", "bushCluster", "tree"];
    case "australia":
      return ["palm", "tree", "bushCluster", "lamp", "hedge", "palm", "tree", "bushCluster", "bench", "palm", "lamp", "hedge", "tree", "palm", "bushCluster", "lamp"];
    case "china":
      return ["lantern", "bushCluster", "lamp", "lantern", "hedge", "lamp", "bushCluster", "lantern", "bench", "lamp", "lantern", "hedge", "bushCluster", "lantern", "lamp", "bushCluster"];
    case "korea":
      return ["lamp", "tree", "bushCluster", "lantern", "hedge", "tree", "lamp", "bushCluster", "sign", "lamp", "tree", "hedge", "bench", "lantern", "tree", "lamp"];
    default:
      return ["lamp", "tree", "sign", "bushCluster", "hedge"];
  }
}

const mat = (color: number, opts: { rough?: number; metal?: number; emissive?: number; ei?: number } = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.75,
    metalness: opts.metal ?? 0.05,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.ei ?? 0,
  });

function buildLamppost(theme: Theme): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5, 8), mat(0x111118, { metal: 0.4 }));
  pole.position.y = 2.5;
  g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.4, 8), mat(0x222230, { metal: 0.4 }));
  base.position.y = 0.2;
  g.add(base);
  // Arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), mat(0x111118, { metal: 0.4 }));
  arm.position.set(0.6, 4.9, 0);
  g.add(arm);
  // Bulb housing
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    mat(0xfff2c0, { emissive: 0xfff2c0, ei: 3.2 })
  );
  bulb.position.set(1.2, 4.8, 0);
  g.add(bulb);
  return g;
}

function buildTree(theme: Theme): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2, 8), mat(0x5a3a20));
  trunk.position.y = 1;
  g.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.4, 0),
    mat(theme.grass === 0x1a3a24 ? 0x2a7a3a : 0x3a8a4a)
  );
  leaves.position.y = 2.7;
  g.add(leaves);
  const leaves2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0, 0),
    mat(0x2a6a3a)
  );
  leaves2.position.set(0.4, 2.4, 0.3);
  g.add(leaves2);
  return g;
}

function buildPineTree(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.4, 8), mat(0x4a2a1a));
  trunk.position.y = 0.7;
  g.add(trunk);
  const mcol = 0x2a5a3a;
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.3 - i * 0.22, 1.1, 8),
      mat(mcol)
    );
    cone.position.y = 1.5 + i * 0.85;
    g.add(cone);
  }
  return g;
}

function buildPalmTree(): THREE.Group {
  // Tropikal palmiye — uzun kıvrık gövde + 11 yaprak (was 7) + hindistan
  // cevizi salkımı. Daha büyük ve hava verici (Oscar: "Brezilya'nın kendi
  // havasını vermesi lazım").
  const g = new THREE.Group();
  const TRUNK_H = 7.0; // was 5.0
  const segs = 6;
  const segH = TRUNK_H / segs;
  // Gövde — segmentlere bölüp her segmenti hafif farklı eğip üst üste
  // koyarak doğal "kıvrık" tropikal palmiye silüeti
  const lean = (Math.random() - 0.5) * 0.6; // overall lean direction
  let yCursor = 0;
  let xCursor = 0;
  for (let s = 0; s < segs; s++) {
    const r1 = 0.36 - (s / segs) * 0.18; // taper
    const r2 = r1 - 0.025;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(r2, r1, segH * 1.05, 10),
      mat(0x6a4a2a, { rough: 0.85 })
    );
    // Her segment hafif daha eğik → kümülatif curve
    const curve = lean * (s / segs) * 0.18;
    seg.rotation.z = curve;
    seg.position.set(xCursor, yCursor + segH / 2, 0);
    g.add(seg);
    // Halka detay (palmiye bilezikleri)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r1 + 0.02, 0.04, 6, 14),
      mat(0x4a3018, { rough: 0.95 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(xCursor + curve * segH * 0.5, yCursor + segH * 0.85, 0);
    g.add(ring);
    yCursor += segH;
    xCursor += Math.sin(curve) * segH;
  }
  const topY = yCursor;
  const topX = xCursor;
  // Yapraklar — 11 fronds, daha geniş ve uzun, alçaktan yukarı
  // yelpaze gibi açılırlar
  const FROND_COUNT = 11;
  for (let i = 0; i < FROND_COUNT; i++) {
    const ang = (i / FROND_COUNT) * Math.PI * 2 + Math.random() * 0.15;
    const len = 2.6 + Math.random() * 0.8;
    const frond = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, len, 5),
      mat(0x3a7a3a, { rough: 0.7 })
    );
    // Yatay düzlemde yelpaze + hafif sarkan uçlar
    const droop = 0.85 + Math.random() * 0.4;
    frond.position.set(
      topX + Math.cos(ang) * 1.05,
      topY + 0.25 - droop * 0.15,
      Math.sin(ang) * 1.05
    );
    frond.rotation.z = Math.cos(ang) * droop;
    frond.rotation.x = Math.sin(ang) * -droop;
    frond.rotation.y = ang;
    g.add(frond);
    // Yaprak ortasındaki nervure (orta damar) — koyu gölgesi için ince mesh
    const vein = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, len * 0.8, 4),
      mat(0x2a4a22, { rough: 0.95 })
    );
    vein.position.copy(frond.position);
    vein.rotation.copy(frond.rotation);
    g.add(vein);
  }
  // Hindistan cevizi salkımı — 5 koyu kahve top
  for (let i = 0; i < 5; i++) {
    const coco = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      mat(0x3a2010, { rough: 0.6 })
    );
    const a = Math.random() * Math.PI * 2;
    const r = 0.32 + Math.random() * 0.15;
    coco.position.set(topX + Math.cos(a) * r, topY - 0.35, Math.sin(a) * r);
    g.add(coco);
  }
  return g;
}

function buildCherryBlossom(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.2, 8), mat(0x3a2010));
  trunk.position.y = 1.1;
  g.add(trunk);
  // Puffball pink blossoms
  const positions: [number, number, number, number][] = [
    [0, 2.8, 0, 1.3],
    [0.7, 2.5, 0.3, 0.9],
    [-0.6, 2.6, 0.2, 0.85],
    [0.3, 3.1, -0.5, 0.95],
    [-0.4, 2.4, -0.4, 0.8],
  ];
  for (const [x, y, z, r] of positions) {
    const puff = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 1),
      mat(0xffb6c7, { rough: 0.55 })
    );
    puff.position.set(x, y, z);
    g.add(puff);
  }
  return g;
}

function buildSign(theme: Theme): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 3, 6), mat(0x222228));
  pole.position.y = 1.5;
  g.add(pole);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.0, 0.1),
    mat(theme.neonA, { emissive: theme.neonA, ei: 0.8 })
  );
  board.position.y = 2.7;
  g.add(board);
  // "67" on board via canvas texture on a thin plane
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.7),
    new THREE.MeshBasicMaterial({ map: make67Texture(), transparent: true })
  );
  label.position.set(0, 2.7, 0.06);
  g.add(label);
  return g;
}

function buildBench(theme: Theme): THREE.Group {
  const g = new THREE.Group();
  const legMat = mat(0x111118, { metal: 0.4 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), mat(0x6a4a2a));
  seat.position.y = 0.55;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), mat(0x6a4a2a));
  back.position.set(0, 0.85, -0.2);
  g.add(back);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.5), legMat);
  legL.position.set(-0.8, 0.3, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.8;
  g.add(legR);
  return g;
}

function buildHydrant(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.9, 10), mat(0xd42838));
  body.position.y = 0.45;
  g.add(body);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0xd42838));
  top.position.y = 0.95;
  g.add(top);
  const valve1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8), mat(0x222228));
  valve1.rotation.z = Math.PI / 2;
  valve1.position.set(0.3, 0.6, 0);
  g.add(valve1);
  const valve2 = valve1.clone();
  valve2.position.set(-0.3, 0.6, 0);
  g.add(valve2);
  return g;
}

function buildTorii(): THREE.Group {
  const g = new THREE.Group();
  const redMat = mat(0xd42838, { rough: 0.55 });
  const blackMat = mat(0x1a1a1a, { rough: 0.85 });
  // Top crossbeam (curved top beam — use two tiered boxes)
  const topBeam1 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 0.4), redMat);
  topBeam1.position.set(0, 4.1, 0);
  g.add(topBeam1);
  const topBeam2 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.25, 0.3), redMat);
  topBeam2.position.set(0, 4.5, 0);
  g.add(topBeam2);
  // End caps curving up
  const capL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.35), redMat);
  capL.position.set(-2.5, 4.55, 0);
  capL.rotation.z = 0.3;
  g.add(capL);
  const capR = capL.clone();
  capR.position.x = 2.5;
  capR.rotation.z = -0.3;
  g.add(capR);
  // Lower crossbeam
  const lower = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.22, 0.3), blackMat);
  lower.position.set(0, 3.4, 0);
  g.add(lower);
  // Two pillars
  const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 4, 10), redMat);
  pillarL.position.set(-1.8, 2, 0);
  g.add(pillarL);
  const pillarR = pillarL.clone();
  pillarR.position.x = 1.8;
  g.add(pillarR);
  // Japanese char-like placeholder in middle
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({
    map: makeToriiPlateTexture(), transparent: true
  }));
  plate.position.set(0, 3.75, 0.21);
  g.add(plate);
  return g;
}

function buildPaperLantern(): THREE.Group {
  const g = new THREE.Group();
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.5, 8), mat(0x1a1a1a));
  pole.position.y = 1.75;
  g.add(pole);
  // Horizontal arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), mat(0x1a1a1a));
  arm.position.set(0.45, 3.3, 0);
  g.add(arm);
  // Red paper lantern sphere
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xff2a3a,
    emissive: 0xff2a3a,
    emissiveIntensity: 1.6,
    roughness: 0.8,
  });
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), lanternMat);
  lantern.scale.y = 1.2;
  lantern.position.set(0.85, 3.0, 0);
  g.add(lantern);
  // Ribbed stripes (darker bands)
  for (let y = -0.25; y <= 0.25; y += 0.12) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.012, 6, 16),
      mat(0x6a0a1a)
    );
    band.position.set(0.85, 3.0 + y, 0);
    band.rotation.x = Math.PI / 2;
    g.add(band);
  }
  // Tassel
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), mat(0xffd257));
  tassel.position.set(0.85, 2.55, 0);
  g.add(tassel);
  return g;
}

function buildBistroSign(): THREE.Group {
  const g = new THREE.Group();
  // Base pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6), mat(0x1a1a1a));
  pole.position.y = 1.6;
  g.add(pole);
  // Ornate top
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(0x1a1a1a, { metal: 0.4 }));
  cap.position.y = 3.3;
  g.add(cap);
  // Hanging sign board
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.9, 0.05),
    mat(0x3a1a10, { rough: 0.55 })
  );
  frame.position.set(0.7, 2.6, 0);
  g.add(frame);
  // Café text
  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.75),
    new THREE.MeshBasicMaterial({ map: makeCafeTexture(), transparent: true })
  );
  text.position.set(0.7, 2.6, 0.03);
  g.add(text);
  // Dark side for hang
  const hangArm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), mat(0x1a1a1a));
  hangArm.position.set(0.35, 3.1, 0);
  g.add(hangArm);
  return g;
}

function buildParisLamp(): THREE.Group {
  const g = new THREE.Group();
  const black = mat(0x0d0d12, { metal: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 5, 8), black);
  pole.position.y = 2.5;
  g.add(pole);
  // Ornate base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.6, 10), black);
  base.position.y = 0.3;
  g.add(base);
  // Pole rings (ornate)
  for (const y of [1.2, 2.0]) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.12, 10),
      black
    );
    ring.position.y = y;
    g.add(ring);
  }
  // Curvy lantern arms (3 sides)
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), black);
    arm.position.set(Math.cos(ang) * 0.25, 4.9, Math.sin(ang) * 0.25);
    arm.rotation.y = ang;
    g.add(arm);
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.5, 0.34),
      black
    );
    housing.position.set(Math.cos(ang) * 0.55, 4.8, Math.sin(ang) * 0.55);
    g.add(housing);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.4, 0.26),
      new THREE.MeshStandardMaterial({
        color: 0xfff2c0,
        emissive: 0xfff2c0,
        emissiveIntensity: 2.8,
      })
    );
    glow.position.set(Math.cos(ang) * 0.55, 4.8, Math.sin(ang) * 0.55);
    g.add(glow);
  }
  // Top finial
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), black);
  finial.position.y = 5.3;
  g.add(finial);
  return g;
}

function buildBamboo(): THREE.Group {
  const g = new THREE.Group();
  const bambooMat = mat(0x2a7a3a, { rough: 0.85 });
  for (let i = 0; i < 5; i++) {
    const h = 3 + Math.random() * 2;
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, h, 6),
      bambooMat
    );
    const a = (i / 5) * Math.PI * 2;
    stalk.position.set(Math.cos(a) * 0.25, h / 2, Math.sin(a) * 0.25);
    g.add(stalk);
    // Node segments
    for (let y = 0.5; y < h; y += 0.8) {
      const node = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.02, 6, 10),
        mat(0x1a4a2a)
      );
      node.position.set(Math.cos(a) * 0.25, y, Math.sin(a) * 0.25);
      node.rotation.x = Math.PI / 2;
      g.add(node);
    }
    // Top leaves
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.8, 4),
      bambooMat
    );
    leaf.position.set(Math.cos(a) * 0.25, h + 0.2, Math.sin(a) * 0.25);
    g.add(leaf);
  }
  return g;
}

function buildTaxi(): THREE.Group {
  const g = new THREE.Group();
  const yellow = mat(0xffd200, { rough: 0.55 });
  const black = mat(0x0d0d12, { rough: 0.6 });
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.6), yellow);
  body.position.y = 0.6;
  g.add(body);
  // Cabin (taller middle)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.0), yellow);
  cabin.position.set(0, 1.1, 0);
  g.add(cabin);
  // Windows (dark)
  const winF = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.45, 0.1), black);
  winF.position.set(0, 1.1, 1.0);
  g.add(winF);
  const winB = winF.clone();
  winB.position.z = -1.0;
  g.add(winB);
  // Taxi sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.18, 0.9),
    new THREE.MeshStandardMaterial({
      color: 0xffd200,
      emissive: 0xffd200,
      emissiveIntensity: 1.2,
    })
  );
  sign.position.set(0, 1.48, 0);
  g.add(sign);
  // Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12);
  for (const [x, z] of [[-0.75, 1.2], [0.75, 1.2], [-0.75, -1.2], [0.75, -1.2]]) {
    const w = new THREE.Mesh(wheelGeom, black);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.3, z);
    g.add(w);
  }
  return g;
}

function buildBear(): THREE.Group {
  const g = new THREE.Group();
  const fur = mat(0x5a3a20, { rough: 0.95 });
  const darkFur = mat(0x3a2414, { rough: 0.95 });
  const snout = mat(0x8a6040, { rough: 0.9 });
  const black = mat(0x111111, { rough: 0.5 });

  // Body (plump, elongated)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), fur);
  body.scale.set(1.0, 0.85, 1.45);
  body.position.y = 0.9;
  g.add(body);

  // Back hump
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), darkFur);
  hump.scale.set(1, 0.8, 0.9);
  hump.position.set(0, 1.35, 0.2);
  g.add(hump);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), fur);
  head.scale.set(1, 0.95, 0.95);
  head.position.set(0, 1.3, -1.25);
  g.add(head);

  // Snout
  const snoutMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), snout);
  snoutMesh.scale.set(1, 0.7, 1.1);
  snoutMesh.position.set(0, 1.15, -1.6);
  g.add(snoutMesh);

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), black);
  nose.position.set(0, 1.22, -1.8);
  g.add(nose);

  // Eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), black);
  eyeL.position.set(-0.18, 1.45, -1.55);
  g.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.18;
  g.add(eyeR);

  // Ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fur);
  earL.scale.set(1, 0.9, 0.6);
  earL.position.set(-0.35, 1.75, -1.1);
  g.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.35;
  g.add(earR);
  const innerEarL = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    mat(0x6a3020)
  );
  innerEarL.scale.set(1, 0.9, 0.5);
  innerEarL.position.set(-0.35, 1.75, -1.02);
  g.add(innerEarL);
  const innerEarR = innerEarL.clone();
  innerEarR.position.x = 0.35;
  g.add(innerEarR);

  // Legs (4)
  const legGeom = new THREE.CylinderGeometry(0.2, 0.22, 0.65, 10);
  const positions: Array<[number, number, number]> = [
    [-0.5, 0.35, -0.8],
    [0.5, 0.35, -0.8],
    [-0.5, 0.35, 0.7],
    [0.5, 0.35, 0.7],
  ];
  for (const [x, y, z] of positions) {
    const leg = new THREE.Mesh(legGeom, fur);
    leg.position.set(x, y, z);
    g.add(leg);
    const paw = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 10, 8),
      darkFur
    );
    paw.scale.set(1, 0.5, 1.1);
    paw.position.set(x, 0.07, z);
    g.add(paw);
  }

  // Rotate so bear faces outward from the track
  g.rotation.y = Math.PI / 2;
  // Random slight rotation
  g.rotation.y += (Math.random() - 0.5) * 0.6;
  return g;
}

function buildSnowman(): THREE.Group {
  const g = new THREE.Group();
  const snowMat = mat(0xf6faff, { rough: 0.95 });
  const darkMat = mat(0x141414);
  const orangeMat = mat(0xff7a2a);
  const redMat = mat(0xd42838);
  // Bottom ball
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), snowMat);
  bottom.position.y = 0.55;
  g.add(bottom);
  // Middle ball
  const middle = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), snowMat);
  middle.position.y = 1.4;
  g.add(middle);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), snowMat);
  head.position.y = 2.05;
  g.add(head);
  // Eyes (coal)
  for (const x of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), darkMat);
    eye.position.set(x, 2.13, 0.25);
    g.add(eye);
  }
  // Carrot nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), orangeMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.04, 0.4);
  g.add(nose);
  // Mouth — coal buttons in smile arc
  for (let i = -2; i <= 2; i++) {
    const coal = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), darkMat);
    const a = (i / 5) * 1.2;
    coal.position.set(Math.sin(a) * 0.17, 1.93 - Math.abs(i) * 0.015, Math.cos(a) * 0.2);
    g.add(coal);
  }
  // Body buttons
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), darkMat);
    btn.position.set(0, 1.15 + i * 0.15, 0.4);
    g.add(btn);
  }
  // Arms — stick branches
  const armMat = mat(0x4a2010);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.8, 6), armMat);
    arm.position.set(side * 0.5, 1.5, 0);
    arm.rotation.z = side * 0.6;
    g.add(arm);
  }
  // Red scarf
  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.07, 8, 16),
    redMat
  );
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.75;
  g.add(scarf);
  // Scarf tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.08), redMat);
  tail.position.set(0.1, 1.5, 0.3);
  tail.rotation.z = 0.2;
  g.add(tail);
  // Ushanka-style Russian hat (fur hat)
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.1, 12),
    mat(0x3a2818)
  );
  hatBrim.position.y = 2.33;
  g.add(hatBrim);
  const hatTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.28, 0.3, 12),
    mat(0x3a2818)
  );
  hatTop.position.y = 2.5;
  g.add(hatTop);
  const redStar = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.05, 5),
    new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff2030, emissiveIntensity: 1.5 })
  );
  redStar.position.y = 2.68;
  g.add(redStar);
  return g;
}

function buildFireBarrel(): THREE.Group {
  const g = new THREE.Group();
  const barrelMat = mat(0x4a2818, { rough: 0.85 });
  const rustMat = mat(0x6a3818);
  // Barrel body
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.45, 1.0, 14),
    barrelMat
  );
  barrel.position.y = 0.5;
  g.add(barrel);
  // Rust band
  const band1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.04, 6, 14),
    rustMat
  );
  band1.rotation.x = Math.PI / 2;
  band1.position.y = 0.3;
  g.add(band1);
  const band2 = band1.clone();
  band2.position.y = 0.75;
  g.add(band2);
  // Fire — glowing orange cone + emissive core
  const fireMat = new THREE.MeshBasicMaterial({
    color: 0xff8a00,
    transparent: true,
    opacity: 0.85,
  });
  const fire = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.9, 10),
    fireMat
  );
  fire.position.y = 1.45;
  g.add(fire);
  const fireCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.7, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd257 })
  );
  fireCore.position.y = 1.4;
  g.add(fireCore);
  // Emissive warm ambient point (fake via glow cone)
  const warmGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshBasicMaterial({
      color: 0xff6a0a,
      transparent: true,
      opacity: 0.18,
    })
  );
  warmGlow.position.y = 1.3;
  g.add(warmGlow);
  // Logs sticking out
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.5, 6),
      mat(0x3a2010)
    );
    log.position.set(Math.cos(a) * 0.15, 1.15, Math.sin(a) * 0.15);
    log.rotation.z = Math.cos(a) * 0.4;
    log.rotation.x = Math.sin(a) * 0.4;
    g.add(log);
  }
  return g;
}

function buildSnowyPine(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, 1.4, 8),
    mat(0x3a2010)
  );
  trunk.position.y = 0.7;
  g.add(trunk);
  const needleMat = mat(0x1e4530, { rough: 0.95 });
  const snowMat = mat(0xf4f8fc, { rough: 0.95 });
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.3 - i * 0.22, 1.1, 8),
      needleMat
    );
    cone.position.y = 1.5 + i * 0.85;
    g.add(cone);
    // Snow cap on cone
    const snowCap = new THREE.Mesh(
      new THREE.ConeGeometry((1.3 - i * 0.22) * 0.85, 0.35, 8),
      snowMat
    );
    snowCap.position.y = 1.5 + i * 0.85 + 0.35;
    g.add(snowCap);
  }
  // Snow on ground around trunk
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    snowMat
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  g.add(ground);
  return g;
}

/** Dense bush/foliage cluster — 3-5 fluffy spheres in a tight group. Fills
 *  gaps between buildings to mimic Subway-Surfers greenery density. */
function buildBushCluster(theme: Theme): THREE.Group {
  const g = new THREE.Group();
  // Foliage tone reflects the theme's grass color (greener for tropical,
  // muted for cold themes). Use 3 close green tones for natural variation.
  const baseGreen = theme.id === "russia"
    ? 0x244530
    : theme.id === "egypt" || theme.id === "uae"
    ? 0x6a7a32 // dry, olive-tan
    : theme.id === "japan"
    ? 0x2a5a3a
    : 0x2a8a3a; // bright tropical default
  const tones = [
    baseGreen,
    new THREE.Color(baseGreen).offsetHSL(0, 0, 0.05).getHex(),
    new THREE.Color(baseGreen).offsetHSL(0, 0, -0.05).getHex(),
  ];
  // Shared geo for all spheres in this cluster — minor perf win
  const sphereGeo = new THREE.SphereGeometry(0.55, 10, 8);
  const count = 3 + Math.floor(Math.random() * 3); // 3–5 puffs
  for (let i = 0; i < count; i++) {
    const m = mat(tones[i % 3], { rough: 0.95 });
    const puff = new THREE.Mesh(sphereGeo, m);
    const r = 0.45 + Math.random() * 0.35; // 0.45-0.8m
    puff.scale.setScalar(r * 1.4);
    puff.position.set(
      (Math.random() - 0.5) * 1.2,
      r * 0.7,
      (Math.random() - 0.5) * 1.0
    );
    // Big puffs receive but don't cast (perf — too many would slow shadow pass)
    puff.receiveShadow = true;
    g.add(puff);
  }
  // Small visible dirt patch under cluster
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 12),
    mat(0x4a3a1c, { rough: 1 })
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.01;
  g.add(dirt);
  return g;
}

/** Low rectangular hedge — a 2.5m long privet wall along the road. */
function buildHedge(theme: Theme): THREE.Group {
  const g = new THREE.Group();
  const greenColor = theme.id === "russia"
    ? 0x2a4a30
    : theme.id === "egypt" || theme.id === "uae"
    ? 0x788a40
    : theme.id === "japan"
    ? 0x2a5a3a
    : 0x2a8a3a;
  const m = mat(greenColor, { rough: 0.95 });
  // Main hedge body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 0.55), m);
  body.position.y = 0.43;
  body.receiveShadow = true;
  g.add(body);
  // Add fluffy spheres on top to break the boxy silhouette
  const puffGeo = new THREE.SphereGeometry(0.3, 8, 6);
  for (let x = -1.0; x <= 1.0; x += 0.4) {
    const puff = new THREE.Mesh(puffGeo, m);
    puff.scale.setScalar(0.85 + Math.random() * 0.25);
    puff.position.set(x + (Math.random() - 0.5) * 0.1, 0.85 + Math.random() * 0.05, 0);
    g.add(puff);
  }
  return g;
}

function buildSideObelisk(): THREE.Group {
  // Roadside obelisk decoration — Egypt theme accent
  const g = new THREE.Group();
  const sand = mat(0xd8b878, { rough: 0.85 });
  const darkSand = mat(0xa07840, { rough: 0.85 });
  const goldMat = mat(0xffd230, { metal: 0.92, rough: 0.18, emissive: 0x4a3008, ei: 0.4 });
  // Two-tier base
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.4), darkSand);
  base1.position.y = 0.175;
  g.add(base1);
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), sand);
  base2.position.y = 0.5;
  g.add(base2);
  // Tapered shaft (4-sided)
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.32, 5.5, 4),
    sand
  );
  shaft.position.y = 3.4;
  shaft.rotation.y = Math.PI / 4;
  g.add(shaft);
  // Pyramidion (gold cap)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 4), goldMat);
  cap.position.y = 6.4;
  cap.rotation.y = Math.PI / 4;
  g.add(cap);
  // Hieroglyph stripe bands
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.24, 0.08, 4),
      darkSand
    );
    band.position.y = 1.4 + i * 1.4;
    band.rotation.y = Math.PI / 4;
    g.add(band);
  }
  return g;
}

let toriiPlateCache: THREE.Texture | null = null;
function makeToriiPlateTexture(): THREE.Texture {
  if (toriiPlateCache) return toriiPlateCache;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#ffd257";
  ctx.font = "900 90px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("六七", 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  toriiPlateCache = tex;
  return tex;
}

let cafeTexCache: THREE.Texture | null = null;
function makeCafeTexture(): THREE.Texture {
  if (cafeTexCache) return cafeTexCache;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fde4b5";
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = "#c49b4a";
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 244, 148);
  ctx.fillStyle = "#2a1810";
  ctx.font = "900 60px 'Playfair Display', serif, -apple-system";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CAFÉ 67", 128, 68);
  ctx.font = "700 20px -apple-system, Inter, Arial";
  ctx.fillText("PARIS", 128, 112);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  cafeTexCache = tex;
  return tex;
}

let _67Texture: THREE.Texture | null = null;
function make67Texture(): THREE.Texture {
  if (_67Texture) return _67Texture;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = "#111";
  ctx.font = "900 110px -apple-system, Inter, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("67", 128, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  _67Texture = tex;
  return tex;
}
