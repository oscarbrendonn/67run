import * as THREE from "three";
import type { Theme } from "./Themes";

const stoneMat = (color: number, emissive = 0x000000) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive, emissiveIntensity: emissive ? 0.2 : 0 });

const metalMat = (color: number) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.85 });

const emissiveMat = (color: number, intensity = 1.2) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });

/** Builds a landmark scaled to be visible from ~100m away. Returns a group centered at base. */
export function buildLandmark(kind: Theme["landmark"]): THREE.Group {
  switch (kind) {
    case "eiffel":
      return buildEiffel();
    case "liberty":
      return buildLiberty();
    case "christ":
      return buildChrist();
    case "pagoda":
      return buildPagoda();
    case "bigben":
      return buildBigBen();
    case "basil":
      return buildBasil();
    case "hagia":
      return buildHagia();
    case "burj":
      return buildBurj();
    case "pyramids":
      return buildPyramids();
    case "colosseum":
      return buildColosseum();
    case "opera":
      return buildOpera();
    case "pearl":
      return buildPearlTower();
    case "seoultower":
      return buildSeoulTower();
  }
}

/** Roman Colosseum — circular ring of arches, 4 tiers tapering, weathered stone */
function buildColosseum(): THREE.Group {
  const g = new THREE.Group();
  const stone = stoneMat(0xc8a878);
  const stoneDark = stoneMat(0x886848);
  const RADIUS = 12;
  const HEIGHT_PER_TIER = 4.5;
  const TIERS = 4;
  // Outer wall as a 24-sided polygon (looks circular at distance)
  for (let t = 0; t < TIERS; t++) {
    const r = RADIUS - t * 0.6;
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r + 0.3, HEIGHT_PER_TIER, 24, 1, true),
      stone
    );
    ring.position.y = HEIGHT_PER_TIER / 2 + t * HEIGHT_PER_TIER;
    g.add(ring);
    // Arches — small dark boxes around the perimeter to suggest archway openings
    const archCount = 24;
    for (let a = 0; a < archCount; a++) {
      const ang = (a / archCount) * Math.PI * 2;
      const arch = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, HEIGHT_PER_TIER * 0.7, 0.4),
        stoneDark
      );
      arch.position.set(
        Math.cos(ang) * (r - 0.1),
        HEIGHT_PER_TIER / 2 + t * HEIGHT_PER_TIER,
        Math.sin(ang) * (r - 0.1)
      );
      arch.rotation.y = -ang;
      g.add(arch);
    }
  }
  // Partially-collapsed top ring (signature ruined look)
  const ruinAng = Math.PI * 1.2; // missing wedge
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2;
    if (Math.abs(((ang - 0) + Math.PI * 2) % (Math.PI * 2)) < ruinAng) continue;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.2, 0.6),
      stone
    );
    block.position.set(
      Math.cos(ang) * RADIUS,
      TIERS * HEIGHT_PER_TIER + 0.6,
      Math.sin(ang) * RADIUS
    );
    block.rotation.y = -ang;
    g.add(block);
  }
  return g;
}

/** Sydney Opera House — overlapping white shell roofs on a podium */
function buildOpera(): THREE.Group {
  const g = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.55,
    metalness: 0.05,
  });
  const podiumMat = stoneMat(0xc0a890);
  // Podium base
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(20, 2, 11),
    podiumMat
  );
  podium.position.y = 1;
  g.add(podium);
  // Shells — half-spheres tilted to look like sails. 3 clusters of 3 shells.
  const shellPositions: [number, number, number, number, number][] = [
    // [x, z, scaleX, scaleZ, tiltZ]
    [-6, -1, 3.5, 4.5, 0.15],
    [-3.5, 0.5, 3, 4, 0.18],
    [-1, 1.5, 2.5, 3.2, 0.22],
    [1.5, -1, 3, 4, -0.15],
    [4, 0.5, 2.7, 3.6, -0.2],
    [6, 1.5, 2.2, 3, -0.24],
  ];
  for (const [x, z, sx, sz, tilt] of shellPositions) {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      shellMat
    );
    shell.scale.set(sx, sz * 1.2, sz * 0.7);
    shell.position.set(x, 2, z);
    shell.rotation.x = -tilt * 0.5;
    shell.rotation.z = tilt;
    g.add(shell);
  }
  return g;
}

/** Shanghai Oriental Pearl Tower — tripod legs with pink/red orbs */
function buildPearlTower(): THREE.Group {
  const g = new THREE.Group();
  const concreteMat = stoneMat(0xc8c0b8);
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xc8284a,
    roughness: 0.45,
    metalness: 0.35,
    emissive: 0x6a1020,
    emissiveIntensity: 0.4,
  });
  // Three tapered legs angled inward at the base, meeting at first orb
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.55, 8, 8),
      concreteMat
    );
    leg.position.set(Math.cos(ang) * 1.2, 4, Math.sin(ang) * 1.2);
    leg.rotation.z = Math.cos(ang) * 0.18;
    leg.rotation.x = Math.sin(ang) * -0.18;
    g.add(leg);
  }
  // Lower (large) orb
  const orb1 = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 12), orbMat);
  orb1.position.y = 9;
  g.add(orb1);
  // Spine between orbs
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 22, 10),
    concreteMat
  );
  spine.position.y = 22;
  g.add(spine);
  // Mid orb (smaller)
  const orb2 = new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 10), orbMat);
  orb2.position.y = 28;
  g.add(orb2);
  // Top spire
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.3, 8, 8),
    concreteMat
  );
  spire.position.y = 36;
  g.add(spire);
  // Antenna
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, 3, 6),
    concreteMat
  );
  antenna.position.y = 41.5;
  g.add(antenna);
  return g;
}

/** N Seoul Tower — Namsan mountain communications tower */
function buildSeoulTower(): THREE.Group {
  const g = new THREE.Group();
  const concreteMat = stoneMat(0xe0e0e0);
  const observMat = new THREE.MeshStandardMaterial({
    color: 0x8a4a8a,
    roughness: 0.4,
    metalness: 0.4,
    emissive: 0x4a1a4a,
    emissiveIntensity: 0.5,
  });
  // Tapered concrete shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 1.2, 18, 12),
    concreteMat
  );
  shaft.position.y = 9;
  g.add(shaft);
  // Observation deck (the iconic disc)
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.0, 1.6, 14),
    observMat
  );
  deck.position.y = 19;
  g.add(deck);
  // Inner ring (lit windows)
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.3, 14),
    emissiveMat(0xffd28a, 1.5)
  );
  ring.position.y = 19;
  g.add(ring);
  // Upper antenna shaft
  const upperShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.35, 8, 8),
    concreteMat
  );
  upperShaft.position.y = 24;
  g.add(upperShaft);
  // Antenna spike
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.18, 6, 6),
    concreteMat
  );
  antenna.position.y = 31;
  g.add(antenna);
  return g;
}

function buildEiffel(): THREE.Group {
  const g = new THREE.Group();
  const beam = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.55, metalness: 0.7 });
  const darkBeam = new THREE.MeshStandardMaterial({ color: 0x5a4528, roughness: 0.55, metalness: 0.7 });

  // Build tapered 4-leg tower in tiers with criss-cross bracing
  // Each tier: a rectangular frame (4 verticals, 4 horizontals) + X-bracing on each face
  // Width tapers from wide base to narrow tip
  const levels = [
    { y: 0, w: 7.5, h: 8 },     // tier 0 base
    { y: 8, w: 6.2, h: 6 },     // tier 1
    { y: 14, w: 5.0, h: 5 },    // tier 2 (1st platform)
    { y: 19, w: 3.4, h: 7 },    // tier 3 (tapering middle)
    { y: 26, w: 2.2, h: 6 },    // tier 4 (2nd platform)
    { y: 32, w: 1.2, h: 5 },    // tier 5 (top section)
  ];

  const strut = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, thickness: number, m: THREE.Material) => {
    const dx = x2 - x1,
      dy = y2 - y1,
      dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, thickness), m);
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    mesh.lookAt(x2, y2, z2);
    mesh.rotateX(Math.PI / 2);
    return mesh;
  };

  // For each tier, add 4 vertical legs + X-bracing on each of the 4 faces
  for (let ti = 0; ti < levels.length; ti++) {
    const t = levels[ti];
    const next = levels[ti + 1];
    const nextW = next ? next.w : t.w * 0.6;
    const yb = t.y;
    const yt = t.y + t.h;
    const c = [-1, 1];
    // Vertical legs (tapered from t.w to nextW)
    for (const sx of c) {
      for (const sz of c) {
        g.add(
          strut(
            (sx * t.w) / 2,
            yb,
            (sz * t.w) / 2,
            (sx * nextW) / 2,
            yt,
            (sz * nextW) / 2,
            0.35 - ti * 0.035,
            beam
          )
        );
      }
    }
    // X-bracing on 4 faces
    const braceTh = 0.18 - ti * 0.02;
    // Split height into 2 bracing segments for tight lattice look
    const segments = ti < 3 ? 2 : 1;
    for (let seg = 0; seg < segments; seg++) {
      const ya = yb + (t.h * seg) / segments;
      const yc = yb + (t.h * (seg + 1)) / segments;
      const wAtYa = lerp(t.w, nextW, seg / segments);
      const wAtYc = lerp(t.w, nextW, (seg + 1) / segments);
      // Front/back (z = ±w/2), x varies
      for (const sz of c) {
        g.add(
          strut(
            -wAtYa / 2,
            ya,
            (sz * wAtYa) / 2,
            wAtYc / 2,
            yc,
            (sz * wAtYc) / 2,
            braceTh,
            darkBeam
          )
        );
        g.add(
          strut(
            wAtYa / 2,
            ya,
            (sz * wAtYa) / 2,
            -wAtYc / 2,
            yc,
            (sz * wAtYc) / 2,
            braceTh,
            darkBeam
          )
        );
      }
      // Left/right faces (x = ±w/2), z varies
      for (const sx of c) {
        g.add(
          strut(
            (sx * wAtYa) / 2,
            ya,
            -wAtYa / 2,
            (sx * wAtYc) / 2,
            yc,
            wAtYc / 2,
            braceTh,
            darkBeam
          )
        );
        g.add(
          strut(
            (sx * wAtYa) / 2,
            ya,
            wAtYa / 2,
            (sx * wAtYc) / 2,
            yc,
            -wAtYc / 2,
            braceTh,
            darkBeam
          )
        );
      }
      // Horizontal ties at seg boundaries
      for (const sz of c) {
        g.add(
          strut(
            -wAtYa / 2,
            ya,
            (sz * wAtYa) / 2,
            wAtYa / 2,
            ya,
            (sz * wAtYa) / 2,
            braceTh * 0.9,
            darkBeam
          )
        );
      }
      for (const sx of c) {
        g.add(
          strut(
            (sx * wAtYa) / 2,
            ya,
            -wAtYa / 2,
            (sx * wAtYa) / 2,
            ya,
            wAtYa / 2,
            braceTh * 0.9,
            darkBeam
          )
        );
      }
    }
  }

  // Observation decks (wider platforms)
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x3a2a14, roughness: 0.7 });
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.45, 8), deckMat);
  deck1.position.y = 14;
  g.add(deck1);
  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 4.5), deckMat);
  deck2.position.y = 26;
  g.add(deck2);

  // Ground-level arch (characteristic Eiffel curve on each face)
  const archMat = darkBeam;
  for (let side = 0; side < 4; side++) {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.22, 8, 20, Math.PI),
      archMat
    );
    torus.position.y = 4.5;
    torus.rotation.y = (side / 4) * Math.PI * 2;
    torus.rotation.x = Math.PI / 2;
    torus.position.x = Math.cos((side / 4) * Math.PI * 2) * 0;
    torus.position.z = Math.sin((side / 4) * Math.PI * 2) * 0;
    g.add(torus);
  }

  // Top spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.5, 6, 8), beam);
  spire.position.y = 40;
  g.add(spire);

  // Antenna
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3, 6), beam);
  antenna.position.y = 44;
  g.add(antenna);

  // Warm beacon glow
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 12),
    emissiveMat(0xffd257, 3.0)
  );
  beacon.position.y = 46;
  g.add(beacon);

  return g;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildLiberty(): THREE.Group {
  const g = new THREE.Group();
  const stone = stoneMat(0x5a7068);
  const statue = stoneMat(0x6fb89a);

  // Pedestal
  const base = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 10), stone);
  base.position.y = 1;
  g.add(base);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 6), stone);
  ped.position.y = 6;
  g.add(ped);
  const ped2 = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), stone);
  ped2.position.y = 12;
  g.add(ped2);

  // Body (robe)
  const body = new THREE.Mesh(new THREE.ConeGeometry(2.5, 10, 10), statue);
  body.position.y = 19;
  g.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 14), statue);
  head.position.y = 24.8;
  g.add(head);

  // Crown (spikes)
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI - Math.PI / 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 6), statue);
    spike.position.set(Math.cos(ang) * 1.1, 26.4, Math.sin(ang) * 1.1);
    g.add(spike);
  }

  // Right arm raised with torch
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 6, 10), statue);
  arm.position.set(1.8, 23.5, 0);
  arm.rotation.z = -0.4;
  g.add(arm);

  // Torch flame
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.5, 10), statue);
  torch.position.set(3.7, 27, 0);
  g.add(torch);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.8, 10),
    emissiveMat(0xffd257, 2.8)
  );
  flame.position.set(3.7, 29, 0);
  g.add(flame);

  // Left arm holding tablet
  const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 5, 10), statue);
  lArm.position.set(-1.2, 21.5, 0.3);
  lArm.rotation.z = 0.6;
  g.add(lArm);
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 0.3), statue);
  tablet.position.set(-2.6, 19.5, 0.3);
  tablet.rotation.z = 0.3;
  g.add(tablet);

  return g;
}

function buildChrist(): THREE.Group {
  const g = new THREE.Group();
  const mountain = stoneMat(0x3a3028);
  const stone = stoneMat(0xe8dcc4);

  // Mountain base
  const mount = new THREE.Mesh(new THREE.ConeGeometry(14, 14, 8), mountain);
  mount.position.y = 7;
  g.add(mount);

  // Pedestal
  const ped = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), stone);
  ped.position.y = 15;
  g.add(ped);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 1.5), stone);
  body.position.y = 21;
  g.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), stone);
  head.position.y = 26;
  g.add(head);

  // Arms spread wide (iconic cross pose)
  const lArm = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 1), stone);
  lArm.position.set(-2.8, 23.5, 0);
  g.add(lArm);
  const rArm = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 1), stone);
  rArm.position.set(2.8, 23.5, 0);
  g.add(rArm);

  // Robe draping
  const robeL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 1), stone);
  robeL.position.set(-4.8, 21.5, 0);
  g.add(robeL);
  const robeR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 1), stone);
  robeR.position.set(4.8, 21.5, 0);
  g.add(robeR);

  return g;
}

function buildPagoda(): THREE.Group {
  const g = new THREE.Group();
  const wood = stoneMat(0x8a2a2a);
  const roof = stoneMat(0x4a1010);
  const gold = metalMat(0xffd257);

  // 5 tiers of decreasing size
  for (let i = 0; i < 5; i++) {
    const w = 6 - i * 0.9;
    const h = 3;
    const y = i * 4 + 2;
    // Tier body
    const tier = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), wood);
    tier.position.y = y;
    g.add(tier);
    // Curved roof (wider than tier, flat cone)
    const roofMesh = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.85, 1.2, 4),
      roof
    );
    roofMesh.position.y = y + h / 2 + 0.6;
    roofMesh.rotation.y = Math.PI / 4;
    g.add(roofMesh);
  }
  // Top spire
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4, 8), gold);
  spire.position.y = 24;
  g.add(spire);

  return g;
}

function buildBigBen(): THREE.Group {
  const g = new THREE.Group();
  const stone = stoneMat(0xc8a878);
  const roof = stoneMat(0x4a3028);
  const face = emissiveMat(0xfff0c8, 1.8);

  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(5, 18, 5), stone);
  base.position.y = 9;
  g.add(base);

  // Clock section (wider, with 4 faces)
  const clockBlock = new THREE.Mesh(new THREE.BoxGeometry(6.2, 5, 6.2), stone);
  clockBlock.position.y = 20.5;
  g.add(clockBlock);

  // Clock faces on 4 sides
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const face1 = new THREE.Mesh(new THREE.CircleGeometry(1.8, 20), face);
    face1.position.set(Math.cos(ang) * 3.15, 20.5, Math.sin(ang) * 3.15);
    face1.lookAt(
      new THREE.Vector3(Math.cos(ang) * 10, 20.5, Math.sin(ang) * 10)
    );
    g.add(face1);
    // Hands
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.05), stoneMat(0x000000));
    hour.position.copy(face1.position);
    hour.position.add(new THREE.Vector3(Math.cos(ang) * 0.06, 0, Math.sin(ang) * 0.06));
    hour.quaternion.copy(face1.quaternion);
    g.add(hour);
  }

  // Spire
  const upper = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 4), stone);
  upper.position.y = 25;
  g.add(upper);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.8, 8, 4), roof);
  spire.position.y = 31;
  spire.rotation.y = Math.PI / 4;
  g.add(spire);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.5, 8), metalMat(0xffd257));
  finial.position.y = 36.5;
  g.add(finial);

  return g;
}

function buildBasil(): THREE.Group {
  const g = new THREE.Group();
  const wall = stoneMat(0xc88858);
  const domeColors = [0xd42838, 0x2ea060, 0xffd257, 0x3a5a9c, 0xa03ac8];

  // Central tower
  const central = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 4), wall);
  central.position.y = 5;
  g.add(central);

  // Central onion dome
  const cDome = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 16, 12),
    stoneMat(domeColors[0])
  );
  cDome.scale.y = 1.3;
  cDome.position.y = 12.5;
  g.add(cDome);
  const cSpire = new THREE.Mesh(new THREE.ConeGeometry(0.25, 3, 8), metalMat(0xffd257));
  cSpire.position.y = 17;
  g.add(cSpire);

  // 4 smaller towers with colored domes around
  const positions = [
    [3.5, 0, 0],
    [-3.5, 0, 0],
    [0, 0, 3.5],
    [0, 0, -3.5],
  ];
  positions.forEach(([x, , z], i) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 7, 2.2), wall);
    tower.position.set(x, 3.5, z);
    g.add(tower);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 14, 10),
      stoneMat(domeColors[(i + 1) % domeColors.length])
    );
    dome.scale.y = 1.3;
    dome.position.set(x, 8.3, z);
    g.add(dome);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.8, 6), metalMat(0xffd257));
    sp.position.set(x, 10.8, z);
    g.add(sp);
  });

  return g;
}

function buildHagia(): THREE.Group {
  const g = new THREE.Group();
  const wall = stoneMat(0xd8b888);
  const domeMat = stoneMat(0x8a8890);

  // Main square
  const base = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 14), wall);
  base.position.y = 4;
  g.add(base);

  // Central dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), domeMat);
  dome.scale.y = 0.7;
  dome.position.y = 11;
  g.add(dome);
  const domeTop = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 10), metalMat(0xffd257));
  domeTop.position.y = 14.8;
  g.add(domeTop);

  // Half domes
  const hd1 = new THREE.Mesh(new THREE.SphereGeometry(3.2, 14, 10, 0, Math.PI), domeMat);
  hd1.position.set(0, 9, 5.5);
  hd1.rotation.y = Math.PI;
  g.add(hd1);
  const hd2 = new THREE.Mesh(new THREE.SphereGeometry(3.2, 14, 10, 0, Math.PI), domeMat);
  hd2.position.set(0, 9, -5.5);
  g.add(hd2);

  // 4 minarets
  const positions = [
    [7, 0, 7],
    [-7, 0, 7],
    [7, 0, -7],
    [-7, 0, -7],
  ];
  positions.forEach(([x, , z]) => {
    const min = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 16, 12), wall);
    min.position.set(x, 8, z);
    g.add(min);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.5, 12), wall);
    cap.position.set(x, 17, z);
    g.add(cap);
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.06, 6, 10),
      metalMat(0xffd257)
    );
    crescent.position.set(x, 18.8, z);
    g.add(crescent);
  });

  return g;
}

function buildBurj(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xcfd8e8,
    roughness: 0.3,
    metalness: 0.6,
  });
  const emMat = emissiveMat(0x28b8ff, 0.4);

  // Tiered tapering spire (simplified Burj Khalifa)
  let prevW = 6;
  let y = 0;
  for (let i = 0; i < 10; i++) {
    const h = 5 - i * 0.25;
    const w = prevW * 0.93;
    const tier = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), i % 3 === 2 ? emMat : mat);
    tier.position.y = y + h / 2;
    g.add(tier);
    y += h;
    prevW = w;
  }
  // Antenna spire
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 8, 8), mat);
  spire.position.y = y + 4;
  g.add(spire);

  return g;
}

function buildPyramids(): THREE.Group {
  const g = new THREE.Group();
  const stone = stoneMat(0xc89868);
  const p1 = new THREE.Mesh(new THREE.ConeGeometry(8, 12, 4), stone);
  p1.position.set(0, 6, 0);
  p1.rotation.y = Math.PI / 4;
  g.add(p1);
  const p2 = new THREE.Mesh(new THREE.ConeGeometry(6, 9, 4), stone);
  p2.position.set(-11, 4.5, 4);
  p2.rotation.y = Math.PI / 4;
  g.add(p2);
  const p3 = new THREE.Mesh(new THREE.ConeGeometry(4.5, 7, 4), stone);
  p3.position.set(9, 3.5, 5);
  p3.rotation.y = Math.PI / 4;
  g.add(p3);
  return g;
}
