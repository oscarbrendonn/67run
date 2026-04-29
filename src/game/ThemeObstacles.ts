import * as THREE from "three";

/**
 * Theme-specific obstacle builders. Each one returns a Group + a collision height.
 * They sit on a 1.4-wide lane and should be visually fun + culturally on-theme.
 */

/**
 * How the player must avoid this obstacle:
 *  - "jump":  low (≤1.3m). Jumping clears it. Default for most props.
 *  - "slide": overhead (1.4–3.5m). Crossbar above head height — must slide under.
 *  - "lane":  tall solid (>2m, can't jump or slide). Must lane-change to avoid.
 */
export type DodgeType = "jump" | "slide" | "lane";

export interface ThemeObstacle {
  group: THREE.Group;
  height: number; // for collision Y check
  dodgeType: DodgeType;
}

const stone = (color: number, rough = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
const metal = (color: number) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });
const emit = (color: number, intensity = 1.6) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
  });

function shadowAll(g: THREE.Group) {
  g.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

/* ================================ USA ================================ */

export function buildHotdogCart(): ThemeObstacle {
  const g = new THREE.Group();
  const yellow = stone(0xfdc532);
  const red = stone(0xd42838);
  const dark = stone(0x1a1a1a);

  // Cart body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.9), yellow);
  body.position.y = 0.7;
  g.add(body);
  // Counter top
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.95), red);
  top.position.y = 1.08;
  g.add(top);
  // Striped umbrella (red+white)
  for (let i = 0; i < 8; i++) {
    const slice = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 0.45, 1, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4),
      i % 2 === 0 ? red : stone(0xffffff)
    );
    slice.position.y = 1.95;
    g.add(slice);
  }
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), dark);
  pole.position.y = 1.6;
  g.add(pole);
  // Wheels
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.4, 0.4]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.18, z);
      g.add(w);
    }
  }
  // "67 DOGS" sign on front
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.3),
    new THREE.MeshBasicMaterial({ map: makeSignTex("67 HOTDOGS", "#d42838", "#fff"), transparent: true })
  );
  sign.position.set(0, 0.7, 0.46);
  g.add(sign);

  shadowAll(g);
  // Cart body is ~1.2, umbrella is decoration — collision matches body so player can jump over
  return { group: g, height: 1.3, dodgeType: "jump" };
}

export function buildTrashBin(): ThemeObstacle {
  const g = new THREE.Group();
  const green = stone(0x2a4a2a);
  const dark = stone(0x141414);
  // Bin body (cylinder shape)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 1.2, 14), green);
  body.position.y = 0.6;
  g.add(body);
  // Lid
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.12, 14), dark);
  lid.position.y = 1.26;
  g.add(lid);
  // Handle
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), dark);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 1.34, 0);
  g.add(handle);
  // Trash bag sticking out
  const trash = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), stone(0x141414));
  trash.position.set(0.1, 1.4, 0.05);
  g.add(trash);
  shadowAll(g);
  return { group: g, height: 1.5, dodgeType: "jump" };
}

/* ================================ BRAZIL ================================ */

export function buildBeachUmbrella(): ThemeObstacle {
  const g = new THREE.Group();
  const stripeColors = [0x2aa0d8, 0xfdc532, 0xd84848];
  // Umbrella canopy (8 slices in stripes)
  for (let i = 0; i < 8; i++) {
    const slice = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 0.55, 1, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4),
      stone(stripeColors[i % 3])
    );
    slice.position.y = 1.7;
    g.add(slice);
  }
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), stone(0x6a4a2a));
  pole.position.y = 1.1;
  g.add(pole);
  // Sand pile base
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), stone(0xe8d8a8));
  base.scale.set(1, 0.4, 1);
  base.position.y = 0.15;
  g.add(base);
  // Ball at top
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), stone(0x141414));
  ball.position.y = 2.0;
  g.add(ball);
  shadowAll(g);
  // Pole goes to 2.0, but base sand is at 0.4 — player can jump over base
  return { group: g, height: 1.4, dodgeType: "jump" };
}

export function buildFruitStand(): ThemeObstacle {
  const g = new THREE.Group();
  const wood = stone(0x6a4020);
  // Table
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.9), wood);
  top.position.y = 0.85;
  g.add(top);
  for (const x of [-0.6, 0.6]) {
    for (const z of [-0.35, 0.35]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), wood);
      leg.position.set(x, 0.42, z);
      g.add(leg);
    }
  }
  // Fruits as colored spheres
  const fruits = [
    [0xffae1a, -0.4, 0.95, -0.2],
    [0xd84838, 0, 0.95, 0],
    [0x2a8a3a, 0.4, 0.95, -0.2],
    [0xffd230, -0.2, 1.05, 0.2],
    [0xff6080, 0.3, 1.05, 0.3],
    [0xa05828, -0.5, 0.95, 0.3],
    [0xf08828, 0.1, 1.15, -0.1],
  ] as const;
  for (const [c, x, y, z] of fruits) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), stone(c));
    fruit.position.set(x, y, z);
    g.add(fruit);
  }
  // Banana bunch (curved cylinder)
  const banana = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.18), stone(0xffd230));
  banana.position.set(0.5, 1.0, 0.2);
  banana.rotation.z = 0.2;
  g.add(banana);
  shadowAll(g);
  return { group: g, height: 1.4, dodgeType: "jump" };
}

/* ================================ FRANCE ================================ */

export function buildCafeTable(): ThemeObstacle {
  const g = new THREE.Group();
  const metalDark = metal(0x1a1a1a);
  const wood = stone(0x6a4a2a);
  const cream = stone(0xf4ece0);
  // Round table top
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 18), wood);
  top.position.y = 0.9;
  g.add(top);
  // Pedestal pole
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 10), metalDark);
  pedestal.position.y = 0.45;
  g.add(pedestal);
  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 18), metalDark);
  base.position.y = 0.025;
  g.add(base);
  // Two chairs back-to-back
  for (const xMul of [-1, 1]) {
    const chairX = xMul * 0.6;
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), cream);
    seat.position.set(chairX, 0.55, 0);
    g.add(seat);
    // Back rest
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.05), cream);
    back.position.set(chairX, 0.8, xMul * -0.18);
    g.add(back);
    // 4 legs
    for (const lx of [-0.15, 0.15]) {
      for (const lz of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), metalDark);
        leg.position.set(chairX + lx, 0.275, lz);
        g.add(leg);
      }
    }
  }
  // Wine bottle on table
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 10), stone(0x2a3a14));
  bottle.position.set(0, 1.07, 0);
  g.add(bottle);
  // Bottle neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.04, 0.1, 8), stone(0x2a3a14));
  neck.position.set(0, 1.27, 0);
  g.add(neck);
  // Croissant on table (small box)
  const croissant = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.04, 6, 10, Math.PI), stone(0xc8a058));
  croissant.position.set(0.2, 0.97, 0.2);
  croissant.rotation.x = Math.PI / 2;
  g.add(croissant);
  shadowAll(g);
  return { group: g, height: 1.3, dodgeType: "jump" };
}

export function buildBaguetteCart(): ThemeObstacle {
  const g = new THREE.Group();
  const wood = stone(0x6a4020);
  const baguette = stone(0xc89060);
  // Cart base
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.7), wood);
  base.position.y = 0.6;
  g.add(base);
  // Top counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.75), stone(0x4a2a18));
  counter.position.y = 0.88;
  g.add(counter);
  // Baguettes stacked
  for (let i = 0; i < 5; i++) {
    const bg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.7, 8), baguette);
    bg.rotation.z = Math.PI / 2;
    bg.position.set(-0.35 + i * 0.18, 1.0 + (i % 2) * 0.12, 0);
    g.add(bg);
  }
  // Wheels
  for (const x of [-0.55, 0.55]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), stone(0x1a1a1a));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.18, 0);
    g.add(w);
  }
  // Handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), wood);
  handle.position.set(-0.7, 1.15, 0);
  handle.rotation.z = -0.3;
  g.add(handle);
  shadowAll(g);
  return { group: g, height: 1.5, dodgeType: "jump" };
}

/* ================================ JAPAN ================================ */

export function buildRamenCart(): ThemeObstacle {
  const g = new THREE.Group();
  const red = stone(0xc83040);
  const dark = stone(0x1a1a1a);
  // Cart body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.85), red);
  body.position.y = 0.7;
  g.add(body);
  // Counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.9), dark);
  counter.position.y = 1.08;
  g.add(counter);
  // Roof poles
  for (const x of [-0.6, 0.6]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), dark);
    p.position.set(x, 1.6, 0.4);
    g.add(p);
  }
  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.6), red);
  roof.position.set(0, 2.05, 0.4);
  g.add(roof);
  // Lantern
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 14, 10),
    new THREE.MeshStandardMaterial({
      color: 0xff2a3a,
      emissive: 0xff2a3a,
      emissiveIntensity: 1.6,
    })
  );
  lantern.scale.y = 1.2;
  lantern.position.set(0, 1.85, 0.4);
  g.add(lantern);
  // Steam puff (white sphere on top)
  const steam = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
  );
  steam.position.set(0, 1.4, 0.05);
  g.add(steam);
  // Bowl on counter
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.12, 14),
    stone(0xf4f0e0)
  );
  bowl.position.set(0, 1.18, 0.05);
  g.add(bowl);
  // Wheels
  for (const x of [-0.55, 0.55]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.18, 0);
    g.add(w);
  }
  shadowAll(g);
  // Cart body 1.2, lantern decoration on top — collision at body height
  return { group: g, height: 1.4, dodgeType: "jump" };
}

export function buildVendingMachine(): ThemeObstacle {
  const g = new THREE.Group();
  const blue = stone(0x2a70a8);
  const dark = stone(0x141414);
  const glow = emit(0xffd070, 1.4);
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.7), blue);
  body.position.y = 0.9;
  g.add(body);
  // Display panel (lit)
  const display = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.04), glow);
  display.position.set(0, 1.05, 0.37);
  g.add(display);
  // Drink slots (3 rows × 4)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const colors = [0xff2030, 0x2030d0, 0x208030, 0xffaa00];
      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10),
        stone(colors[col])
      );
      can.position.set(-0.3 + col * 0.2, 0.65 + row * 0.32, 0.39);
      g.add(can);
    }
  }
  // Bottom dispenser slot
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.04), dark);
  slot.position.set(0, 0.35, 0.37);
  g.add(slot);
  // Top header
  const header = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.74), dark);
  header.position.y = 1.9;
  g.add(header);
  shadowAll(g);
  return { group: g, height: 2.0, dodgeType: "lane" };
}

/* ================================ TURKEY ================================ */

export function buildKebabCart(): ThemeObstacle {
  const g = new THREE.Group();
  const red = stone(0xc83838);
  const wood = stone(0x6a4020);
  const meat = stone(0xa84818);
  const flame = emit(0xff6a00, 2.2);
  // Cart body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.85), red);
  body.position.y = 0.7;
  g.add(body);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.9), wood);
  counter.position.y = 1.08;
  g.add(counter);
  // Vertical kebab spit
  const spit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.2, 10),
    metal(0xc8c8c8)
  );
  spit.position.set(0, 1.7, 0);
  g.add(spit);
  // Stacked kebab meat (cone-like rotation)
  for (let i = 0; i < 4; i++) {
    const layer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 - i * 0.025, 0.2 - i * 0.025, 0.22, 16),
      meat
    );
    layer.position.set(0, 1.32 + i * 0.22, 0);
    g.add(layer);
  }
  // Flame at base
  const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 8), flame);
  flame1.position.set(0, 1.18, 0);
  g.add(flame1);
  // Side burner
  const burner = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.35), metal(0x141414));
  burner.position.set(0, 1.18, 0);
  g.add(burner);
  // Wheels
  for (const x of [-0.55, 0.55]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), stone(0x141414));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.18, 0);
    g.add(w);
  }
  // Crescent flag on top
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), stone(0x141414));
  pole.position.set(0.4, 2.5, 0);
  g.add(pole);
  shadowAll(g);
  // Cart body 1.2, kebab spit decoration up to 2.5 — collision at body
  return { group: g, height: 1.4, dodgeType: "jump" };
}

export function buildCarpetStack(): ThemeObstacle {
  const g = new THREE.Group();
  const carpetColors = [0xc8302a, 0x9c2030, 0xd8742a, 0xa84a28];
  // Stacked rolled carpets
  for (let i = 0; i < 5; i++) {
    const carpet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 1.2, 10),
      stone(carpetColors[i % 4])
    );
    carpet.rotation.z = Math.PI / 2;
    carpet.position.set(0, 0.18 + i * 0.27, (i % 2) * 0.04 - 0.02);
    g.add(carpet);
  }
  // Hanging carpet on display
  const hangFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), stone(0x141414));
  hangFrame.position.set(0, 0.8, -0.4);
  g.add(hangFrame);
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.8),
    new THREE.MeshStandardMaterial({ map: makePatternTex(), side: THREE.DoubleSide })
  );
  display.position.set(0, 1.0, -0.4);
  g.add(display);
  shadowAll(g);
  return { group: g, height: 1.6, dodgeType: "jump" };
}

/* ================================ UK ================================ */

// Note: phone box is intentionally tall — must be lane-switched (cannot jump over)
export function buildPhoneBox(): ThemeObstacle {
  const g = new THREE.Group();
  const red = stone(0xc8302a);
  const dark = stone(0x141414);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x6a8aa8,
    roughness: 0.15,
    metalness: 0.6,
    transparent: true,
    opacity: 0.8,
  });
  // Body (box) — solid red sides
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.3, 0.9), red);
  body.position.y = 1.15;
  g.add(body);
  // Glass windows (front + sides)
  for (const z of [0.42, -0.42]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 1.4), glass);
    win.position.set(0, 1.4, z);
    if (z < 0) win.rotation.y = Math.PI;
    g.add(win);
  }
  for (const x of [0.42, -0.42]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 1.4), glass);
    win.position.set(x, 1.4, 0);
    win.rotation.y = Math.PI / 2;
    g.add(win);
  }
  // Top sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.25, 0.95), red);
  sign.position.y = 2.45;
  g.add(sign);
  // "TELEPHONE" text plate
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.18),
    new THREE.MeshBasicMaterial({ map: makeSignTex("TELEPHONE", "#fff", "#000"), transparent: true })
  );
  plate.position.set(0, 2.45, 0.48);
  g.add(plate);
  // Crown / cap
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.95), dark);
  cap.position.y = 2.6;
  g.add(cap);
  shadowAll(g);
  return { group: g, height: 2.65, dodgeType: "lane" };
}

export function buildMailbox(): ThemeObstacle {
  const g = new THREE.Group();
  const red = stone(0xc8302a);
  const dark = stone(0x141414);
  // Cylinder body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16), red);
  body.position.y = 0.75;
  g.add(body);
  // Top dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), red);
  dome.position.y = 1.5;
  g.add(dome);
  // Slot
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.05), dark);
  slot.position.set(0, 1.3, 0.4);
  g.add(slot);
  // ER cipher (Royal Mail)
  const cipher = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.18),
    new THREE.MeshBasicMaterial({ map: makeSignTex("ER", "#c8a02e", "transparent"), transparent: true })
  );
  cipher.position.set(0, 1.0, 0.41);
  g.add(cipher);
  shadowAll(g);
  return { group: g, height: 1.7, dodgeType: "jump" };
}

/* ================================ RUSSIA ================================ */

export function buildIcePatch(): ThemeObstacle {
  const g = new THREE.Group();
  const ice = new THREE.MeshStandardMaterial({
    color: 0xa8d8ff,
    roughness: 0.05,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  // Flat ice sheet
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.2), ice);
  sheet.position.y = 0.04;
  g.add(sheet);
  // Crystals/sharp ice points sticking up
  for (let i = 0; i < 6; i++) {
    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 + Math.random() * 0.05, 0.4 + Math.random() * 0.3, 6),
      ice
    );
    crystal.position.set(
      (Math.random() - 0.5) * 1.2,
      0.18 + Math.random() * 0.15,
      (Math.random() - 0.5) * 1.0
    );
    crystal.rotation.z = (Math.random() - 0.5) * 0.4;
    g.add(crystal);
  }
  shadowAll(g);
  return { group: g, height: 1.0, dodgeType: "jump" };
}

export function buildVodkaCrate(): ThemeObstacle {
  const g = new THREE.Group();
  const wood = stone(0x4a2a18);
  const glass = new THREE.MeshStandardMaterial({
    color: 0xe8f4f8,
    roughness: 0.15,
    metalness: 0.5,
    transparent: true,
    opacity: 0.7,
  });
  // Crate
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 0.9), wood);
  crate.position.y = 0.3;
  g.add(crate);
  // Wood plank lines
  for (let y = 0.1; y <= 0.5; y += 0.15) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.04, 0.92), stone(0x6a3a20));
    plank.position.y = y;
    g.add(plank);
  }
  // Bottles sticking out top
  for (let i = -2; i <= 2; i++) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.45, 10), glass);
    bottle.position.set(i * 0.22, 0.85, 0);
    g.add(bottle);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 8), glass);
    neck.position.set(i * 0.22, 1.13, 0);
    g.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), stone(0xc8a838));
    cap.position.set(i * 0.22, 1.22, 0);
    g.add(cap);
  }
  shadowAll(g);
  return { group: g, height: 1.4, dodgeType: "jump" };
}

/* ================================ UAE ================================ */

export function buildGoldStand(): ThemeObstacle {
  const g = new THREE.Group();
  const wood = stone(0x4a2a18);
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd247,
    metalness: 0.95,
    roughness: 0.18,
    emissive: 0x4a3008,
    emissiveIntensity: 0.4,
  });
  const velvet = stone(0x5a1818);
  // Stand
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.85), velvet);
  top.position.y = 1.0;
  g.add(top);
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.35, 0.35]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), wood);
      leg.position.set(x, 0.5, z);
      g.add(leg);
    }
  }
  // Gold pieces (jewelry, bars)
  // Gold bar 1
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.2), gold);
  bar1.position.set(-0.3, 1.07, 0);
  g.add(bar1);
  // Bar 2 (smaller, on top)
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.16), gold);
  bar2.position.set(-0.3, 1.16, 0);
  g.add(bar2);
  // Gold rings
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 14), gold);
    ring.position.set(0.2 + i * 0.15, 1.06, 0.15);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  // Necklace (curved)
  const neckl = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 8, 16, Math.PI), gold);
  neckl.position.set(0.3, 1.06, -0.1);
  neckl.rotation.x = Math.PI / 2;
  g.add(neckl);
  shadowAll(g);
  return { group: g, height: 1.4, dodgeType: "jump" };
}

export function buildPalmCrate(): ThemeObstacle {
  const g = new THREE.Group();
  const wood = stone(0x6a4020);
  const dates = stone(0x4a2810);
  // Crate
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.9), wood);
  crate.position.y = 0.25;
  g.add(crate);
  // Plank lines
  for (let y = 0.05; y <= 0.45; y += 0.12) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.03, 0.92), stone(0x4a2810));
    plank.position.y = y;
    g.add(plank);
  }
  // Pile of dates
  for (let i = 0; i < 25; i++) {
    const date = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), dates);
    date.scale.set(0.7, 1, 0.7);
    date.position.set(
      (Math.random() - 0.5) * 1.0,
      0.55 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.7
    );
    g.add(date);
  }
  shadowAll(g);
  return { group: g, height: 1.0, dodgeType: "jump" };
}

/* ============================== OVERHEADS ============================== */
/* Slide-under "overpass" obstacles — one themed per country.
   Each is two posts + a crossbar at head height. Player MUST slide. */

/** Generic overhead frame: two cylindrical posts + a crossbar with chamfered
 *  edges. Posts have square plinth bases for a "real" architectural look (not
 *  Lego-blocky). All themed overheads share this skeleton and stack their
 *  own decoration on top. */
function buildOverheadFrame(
  postColor: number,
  crossColor: number,
  crossY = 1.7
): { group: THREE.Group; postLeft: THREE.Mesh; postRight: THREE.Mesh; cross: THREE.Mesh } {
  const g = new THREE.Group();
  const postMat = stone(postColor, 0.7);
  const postDarkMat = stone(0x1a1a1a, 0.85);
  const crossMat = stone(crossColor, 0.6);
  // Posts at lane edges (lane width 1.85, so posts at x = ±0.95)
  const postH = crossY + 0.15;
  const makePost = (sx: number) => {
    // Square plinth base (chunky stone block)
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.18, 0.32),
      postDarkMat
    );
    plinth.position.set(sx * 0.95, 0.09, 0);
    g.add(plinth);
    // Tapered cylindrical pole (slightly narrower at top — adds depth)
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.13, postH - 0.18, 12),
      postMat
    );
    post.position.set(sx * 0.95, 0.18 + (postH - 0.18) / 2, 0);
    g.add(post);
    // Decorative ring near the top of the pole
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.02, 6, 12),
      postDarkMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(sx * 0.95, postH - 0.25, 0);
    g.add(ring);
    return post;
  };
  const postLeft = makePost(-1);
  const postRight = makePost(1);
  // Crossbar — beveled box (use ExtrudeGeometry on a chamfered rectangle)
  const cs = new THREE.Shape();
  const halfW = 1.05; // 2.1m wide
  const halfH = 0.18; // 0.36m tall
  const ch = 0.06;    // chamfer
  cs.moveTo(-halfW, -halfH + ch);
  cs.lineTo(-halfW, halfH - ch);
  cs.lineTo(-halfW + ch, halfH);
  cs.lineTo(halfW - ch, halfH);
  cs.lineTo(halfW, halfH - ch);
  cs.lineTo(halfW, -halfH + ch);
  cs.lineTo(halfW - ch, -halfH);
  cs.lineTo(-halfW + ch, -halfH);
  cs.lineTo(-halfW, -halfH + ch);
  const crossGeo = new THREE.ExtrudeGeometry(cs, {
    depth: 0.4,
    bevelEnabled: false,
  });
  crossGeo.translate(0, 0, -0.2);
  const cross = new THREE.Mesh(crossGeo, crossMat);
  cross.position.set(0, crossY, 0);
  g.add(cross);
  return { group: g, postLeft, postRight, cross };
}

export function buildUsaOverhead(): ThemeObstacle {
  // 67 entrance sign — yellow caution stripe + dark posts
  const f = buildOverheadFrame(0x1a1a1a, 0xffd257, 1.7);
  const g = f.group;
  // Yellow+black caution stripes on crossbar
  for (let i = -0.9; i <= 0.9; i += 0.36) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.36, 0.42),
      stone(0x141414)
    );
    stripe.position.set(i, 1.7, 0);
    stripe.rotation.y = 0.35;
    g.add(stripe);
  }
  // "67" sign panel above crossbar
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.6),
    new THREE.MeshBasicMaterial({
      map: makeSignTex("67", "#0b1a35", "#ffd257"),
      transparent: true,
    })
  );
  sign.position.set(0, 2.15, 0.21);
  g.add(sign);
  // Glowing red warning lights on posts
  const warnMat = new THREE.MeshStandardMaterial({
    color: 0xff2040,
    emissive: 0xff2040,
    emissiveIntensity: 2.2,
  });
  for (const x of [-0.95, 0.95]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), warnMat);
    w.position.set(x, 1.93, 0);
    g.add(w);
  }
  shadowAll(g);
  return { group: g, height: 2.5, dodgeType: "slide" };
}

export function buildBrazilOverhead(): ThemeObstacle {
  // Carnival banner — wooden posts + colorful cloth stretched between
  const f = buildOverheadFrame(0x6a4020, 0x6a4020, 1.7);
  const g = f.group;
  // Tall thin posts replace defaults (carnival style)
  // Cloth banner — striped Brazilian flag colors
  const stripeColors = [0x009b3a, 0xfedf00, 0x002776, 0xffffff];
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.35),
      new THREE.MeshStandardMaterial({
        color: stripeColors[i],
        side: THREE.DoubleSide,
        roughness: 0.95,
      })
    );
    stripe.position.set(0, 1.55 + i * 0.35, 0);
    // Slight wave
    stripe.rotation.x = (i % 2 === 0 ? 1 : -1) * 0.04;
    g.add(stripe);
  }
  // Tassels hanging
  for (let i = -0.8; i <= 0.8; i += 0.4) {
    const tassel = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.25, 6),
      stone(0xfedf00)
    );
    tassel.position.set(i, 1.45, 0);
    tassel.rotation.x = Math.PI;
    g.add(tassel);
  }
  shadowAll(g);
  return { group: g, height: 2.4, dodgeType: "slide" };
}

export function buildFranceOverhead(): ThemeObstacle {
  // Bistro awning — red + white striped cloth on metal frame
  const f = buildOverheadFrame(0x141414, 0xc83030, 1.65);
  const g = f.group;
  // Striped awning panel (curved by tilting)
  const stripes = [0xc83030, 0xf4ece0, 0xc83030, 0xf4ece0, 0xc83030];
  for (let i = 0; i < 5; i++) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.18),
      new THREE.MeshStandardMaterial({
        color: stripes[i],
        side: THREE.DoubleSide,
        roughness: 0.85,
      })
    );
    panel.position.set(0, 1.5 + i * 0.18, 0.05);
    panel.rotation.x = -0.18; // forward droop
    g.add(panel);
  }
  // Scalloped front edge (small triangles)
  for (let i = -0.9; i <= 0.9; i += 0.18) {
    const tri = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.15, 3),
      stone(0xc83030)
    );
    tri.position.set(i, 1.42, 0.18);
    tri.rotation.x = Math.PI;
    g.add(tri);
  }
  // "67" plaque on top
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.55),
    new THREE.MeshBasicMaterial({
      map: makeSignTex("67", "#1a1a1a", "#ffd257"),
      transparent: true,
    })
  );
  sign.position.set(0, 2.55, 0);
  g.add(sign);
  shadowAll(g);
  return { group: g, height: 2.6, dodgeType: "slide" };
}

export function buildJapanOverhead(): ThemeObstacle {
  // Torii gate spanning the lane — vermilion red wooden posts + black beams
  const g = new THREE.Group();
  const red = stone(0xc8302a, 0.7);
  const black = stone(0x1a1a1a, 0.7);
  // Two thicker posts
  for (const x of [-1.0, 1.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.4, 12), red);
    post.position.set(x, 1.2, 0);
    g.add(post);
    // Foot block
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), black);
    foot.position.set(x, 0.1, 0);
    g.add(foot);
  }
  // Horizontal red beam (nuki) — at slide-block height
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.3), red);
  nuki.position.set(0, 1.85, 0);
  g.add(nuki);
  // Top beam (kasagi) — black, with overhanging ends
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.22, 0.4), black);
  kasagi.position.set(0, 2.3, 0);
  // Slight upward curve at ends — fake with end caps
  for (const x of [-1.3, 1.3]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.42), black);
    cap.position.set(x, 2.4, 0);
    cap.rotation.z = x < 0 ? -0.4 : 0.4;
    g.add(cap);
  }
  g.add(kasagi);
  // White paper plaque (shimenawa-like)
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xfafaf2, roughness: 0.95, side: THREE.DoubleSide })
  );
  plaque.position.set(0, 2.05, 0.16);
  g.add(plaque);
  // "67" mark on the plaque (replacing kanji-ish text)
  const kanji = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.35),
    new THREE.MeshBasicMaterial({
      map: makeSignTex("67", "#fafaf2", "#c8302a"),
      transparent: true,
    })
  );
  kanji.position.set(0, 2.05, 0.17);
  g.add(kanji);
  shadowAll(g);
  return { group: g, height: 2.5, dodgeType: "slide" };
}

export function buildTurkeyOverhead(): ThemeObstacle {
  // Bazaar archway — stone columns + curved arch
  const g = new THREE.Group();
  const stoneTan = stone(0xc8a878, 0.85);
  const dark = stone(0x6a4828, 0.8);
  // Stone columns
  for (const x of [-1.0, 1.0]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.0, 14), stoneTan);
    col.position.set(x, 1.0, 0);
    g.add(col);
    // Capital (decorative top)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.45), dark);
    cap.position.set(x, 2.05, 0);
    g.add(cap);
  }
  // Curved arch — torus segment
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.18, 12, 18, Math.PI),
    stoneTan
  );
  arch.position.set(0, 2.15, 0);
  g.add(arch);
  // Geometric pattern panel above arch
  const patternMat = new THREE.MeshStandardMaterial({
    map: makePatternTex(),
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), patternMat);
  panel.position.set(0, 2.55, 0);
  g.add(panel);
  // Crescent + star on top
  const crescent = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.025, 8, 14, Math.PI * 1.2),
    stone(0xfafaf2)
  );
  crescent.position.set(0, 3.0, 0);
  crescent.rotation.z = -0.3;
  g.add(crescent);
  shadowAll(g);
  return { group: g, height: 3.0, dodgeType: "slide" };
}

export function buildUkOverhead(): ThemeObstacle {
  // Stone bridge arch — like a Thames footbridge
  const g = new THREE.Group();
  const stoneGray = stone(0x9a9088, 0.9);
  const darkStone = stone(0x4a4540, 0.9);
  // Two thick stone columns
  for (const x of [-1.05, 1.05]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.0, 0.5), stoneGray);
    col.position.set(x, 1.0, 0);
    g.add(col);
  }
  // Round arch (semi-circle torus segment)
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.22, 12, 18, Math.PI),
    stoneGray
  );
  arch.position.set(0, 2.0, 0);
  g.add(arch);
  // Brick lines under arch
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI;
    const r = 0.95;
    const brick = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.52), darkStone);
    brick.position.set(Math.cos(angle) * r, 2.0 + Math.sin(angle) * r, 0);
    brick.rotation.z = angle - Math.PI / 2;
    g.add(brick);
  }
  // Top parapet with battlements
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.5), stoneGray);
  top.position.set(0, 3.05, 0);
  g.add(top);
  for (let i = -1.0; i <= 1.0; i += 0.4) {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), stoneGray);
    merlon.position.set(i, 3.3, 0);
    g.add(merlon);
  }
  shadowAll(g);
  return { group: g, height: 3.4, dodgeType: "slide" };
}

export function buildRussiaOverhead(): ThemeObstacle {
  // Industrial pipe overpass — soviet style
  const g = new THREE.Group();
  const pipeMetal = metal(0x6a6256);
  const rust = stone(0x6a3020, 0.95);
  const dark = stone(0x1a1a1a, 0.7);
  // Two metal posts with rivets
  for (const x of [-1.0, 1.0]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.25), dark);
    post.position.set(x, 1.1, 0);
    g.add(post);
    // Rivets
    for (let y = 0.3; y < 2.0; y += 0.4) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), pipeMetal);
      rivet.position.set(x, y, 0.13);
      g.add(rivet);
    }
  }
  // Three horizontal pipes
  for (let i = 0; i < 3; i++) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 2.4, 14),
      pipeMetal
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 1.6 + i * 0.28, -0.05 + i * 0.05);
    g.add(pipe);
    // Rust patches
    if (i === 1) {
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), rust);
      r.scale.set(1.4, 0.5, 0.3);
      r.position.set(0.3, 1.88, 0.11);
      g.add(r);
    }
  }
  // Pressure gauge (round with red needle look)
  const gauge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.06, 16),
    stone(0xfafaf2)
  );
  gauge.rotation.x = Math.PI / 2;
  gauge.position.set(-0.55, 1.6, 0.18);
  g.add(gauge);
  // Soviet star plate with "67"
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.4),
    new THREE.MeshBasicMaterial({
      map: makeSignTex("67", "#7a1818", "#ffd230"),
      transparent: true,
    })
  );
  plate.position.set(0.45, 2.55, 0.13);
  g.add(plate);
  shadowAll(g);
  return { group: g, height: 2.7, dodgeType: "slide" };
}

export function buildUaeOverhead(): ThemeObstacle {
  // Arabesque pointed-arch gate with gold accents
  const g = new THREE.Group();
  const sand = stone(0xe8d8a8, 0.8);
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd247,
    metalness: 0.95,
    roughness: 0.18,
    emissive: 0x4a3008,
    emissiveIntensity: 0.4,
  });
  const dark = stone(0x4a2a18, 0.85);
  // Two posts with gold caps
  for (const x of [-1.0, 1.0]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.0, 0.3), sand);
    post.position.set(x, 1.0, 0);
    g.add(post);
    // Gold band at base
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.34), gold);
    band.position.set(x, 0.2, 0);
    g.add(band);
    // Gold cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.38), gold);
    cap.position.set(x, 2.05, 0);
    g.add(cap);
  }
  // Pointed-arch (two angled boxes meeting at top)
  for (const sideX of [-1, 1]) {
    const halfArch = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 0.32), sand);
    halfArch.position.set(sideX * 0.5, 2.45, 0);
    halfArch.rotation.z = sideX * -0.45;
    g.add(halfArch);
  }
  // Top decoration — geometric pattern
  const ornament = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), gold);
  ornament.position.set(0, 2.95, 0);
  g.add(ornament);
  // Inscription panel
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.5),
    new THREE.MeshBasicMaterial({
      map: makeSignTex("67", "#1a1a1a", "#ffd247"),
      transparent: true,
    })
  );
  sign.position.set(0, 1.9, 0.16);
  g.add(sign);
  shadowAll(g);
  return { group: g, height: 3.0, dodgeType: "slide" };
}

export function buildEgyptOverhead(): ThemeObstacle {
  // Antique pylon gate — two sloped pylons + lintel with hieroglyph cartouche
  const g = new THREE.Group();
  const sand = stone(0xd8b878, 0.85);
  const darkSand = stone(0xa07840, 0.85);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd230,
    metalness: 0.92,
    roughness: 0.18,
    emissive: 0x4a3008,
    emissiveIntensity: 0.45,
  });
  const lapis = stone(0x2870b8, 0.7);
  // Two sloped pylon towers (trapezoidal — wider at base than top)
  for (const x of [-1.0, 1.0]) {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.6, 0.45), sand);
    lower.position.set(x, 0.8, 0);
    g.add(lower);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.4), sand);
    upper.position.set(x, 1.95, 0);
    g.add(upper);
    // Hieroglyph stripes (3 horizontal bands)
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.1, 0.46),
        darkSand
      );
      band.position.set(x, 0.3 + i * 0.5, 0);
      g.add(band);
      // Tiny glyph squares on band
      for (const dz of [-0.16, 0, 0.16]) {
        const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), goldMat);
        glyph.position.set(x, 0.3 + i * 0.5, dz + 0.24);
        g.add(glyph);
      }
    }
  }
  // Crossbar lintel (gold-edged)
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 0.45), darkSand);
  lintel.position.set(0, 1.7, 0);
  g.add(lintel);
  // Gold edges on lintel (top + bottom)
  for (const dy of [-0.18, 0.18]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.06, 0.48), goldMat);
    edge.position.set(0, 1.7 + dy, 0);
    g.add(edge);
  }
  // Cartouche (oval frame) on lintel center, with "67"
  const cartouche = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.42),
    new THREE.MeshBasicMaterial({
      map: makeSignTex("67", "#2870b8", "#ffd230"),
      transparent: true,
    })
  );
  cartouche.position.set(0, 1.7, 0.24);
  g.add(cartouche);
  // Winged sun disk above lintel
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 18), goldMat);
  disk.rotation.x = Math.PI / 2;
  disk.position.set(0, 2.2, 0.18);
  g.add(disk);
  // Wings (flat planes spanning out)
  for (const sideX of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.08, 0.18),
      goldMat
    );
    wing.position.set(sideX * 0.45, 2.2, 0.18);
    wing.rotation.z = sideX * -0.18;
    g.add(wing);
  }
  // Cobras (uraeus) on top of each pylon
  for (const x of [-1.0, 1.0]) {
    const cobra = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 6), goldMat);
    cobra.position.set(x, 2.45, 0.05);
    g.add(cobra);
  }
  // Lapis-blue scarab beetle on lintel
  const scarab = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), lapis);
  scarab.scale.set(1.1, 0.5, 1.4);
  scarab.position.set(-0.85, 1.7, 0.23);
  g.add(scarab);
  const scarab2 = scarab.clone();
  scarab2.position.x = 0.85;
  g.add(scarab2);
  shadowAll(g);
  return { group: g, height: 2.6, dodgeType: "slide" };
}

/* ============================== EGYPT OBSTACLES ========================== */

export function buildSphinxStatue(): ThemeObstacle {
  // Mini sphinx — lion body crouched, pharaoh head. Lane-blocker.
  const g = new THREE.Group();
  const sand = stone(0xd8b070, 0.85);
  const darkSand = stone(0x9c7440, 0.85);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd230,
    metalness: 0.9,
    roughness: 0.2,
  });
  // Pedestal
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.7), darkSand);
  pedestal.position.y = 0.175;
  g.add(pedestal);
  // Lion body (crouched)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.5), sand);
  body.position.y = 0.75;
  g.add(body);
  // Front legs
  for (const x of [-0.3, 0.3]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), sand);
    leg.position.set(x, 0.6, 0.6);
    g.add(leg);
  }
  // Pharaoh head (cube + nemes headdress)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), sand);
  head.position.set(0, 1.5, 0.55);
  g.add(head);
  // Nemes headdress (striped cloth, gold + dark blue stripes)
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.1, 0.58),
      i % 2 === 0 ? goldMat : stone(0x2870b8, 0.7)
    );
    stripe.position.set(0, 1.55 + i * 0.1, 0.55);
    g.add(stripe);
  }
  // Beard (small box hanging from chin)
  const beard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.1), darkSand);
  beard.position.set(0, 1.32, 0.85);
  g.add(beard);
  shadowAll(g);
  return { group: g, height: 2.0, dodgeType: "lane" };
}

export function buildHieroStele(): ThemeObstacle {
  // Hieroglyph stele — short stone slab with gold inscriptions. Jumpable.
  const g = new THREE.Group();
  const sand = stone(0xc8a060, 0.9);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd230,
    metalness: 0.9,
    roughness: 0.22,
  });
  // Slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.25), sand);
  slab.position.y = 0.55;
  g.add(slab);
  // Rounded top
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 18, 1, false, 0, Math.PI), sand);
  cap.rotation.z = Math.PI / 2;
  cap.rotation.y = Math.PI / 2;
  cap.position.y = 1.1;
  g.add(cap);
  // Hieroglyph rows (gold tiny boxes)
  for (let row = 0; row < 4; row++) {
    for (let col = -1; col <= 1; col++) {
      const glyph = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.14, 0.04),
        goldMat
      );
      glyph.position.set(col * 0.22, 0.3 + row * 0.22, 0.14);
      g.add(glyph);
    }
  }
  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.4), stone(0x6a4828));
  base.position.y = 0.06;
  g.add(base);
  shadowAll(g);
  return { group: g, height: 1.3, dodgeType: "jump" };
}

export function buildAnkhPedestal(): ThemeObstacle {
  // Tall ankh symbol on pedestal — narrow, jumpable.
  const g = new THREE.Group();
  const sand = stone(0xd8b878, 0.85);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd230,
    metalness: 0.92,
    roughness: 0.18,
    emissive: 0x4a3008,
    emissiveIntensity: 0.4,
  });
  // Square pedestal
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.6), sand);
  ped.position.y = 0.275;
  g.add(ped);
  // Ankh shaft (vertical bar)
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), goldMat);
  shaft.position.y = 0.9;
  g.add(shaft);
  // Ankh crossbar (horizontal)
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.12), goldMat);
  cross.position.y = 1.0;
  g.add(cross);
  // Ankh loop (torus on top)
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 10, 18), goldMat);
  loop.position.y = 1.32;
  loop.rotation.y = Math.PI / 2;
  g.add(loop);
  // Decorative stripes on pedestal
  for (let i = 0; i < 2; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.04, 0.62),
      stone(0x9c7440)
    );
    stripe.position.y = 0.15 + i * 0.25;
    g.add(stripe);
  }
  shadowAll(g);
  return { group: g, height: 1.5, dodgeType: "jump" };
}

export function buildCanopicJars(): ThemeObstacle {
  // Set of 4 canopic jars on a low table — jumpable.
  const g = new THREE.Group();
  const wood = stone(0x6a4020, 0.85);
  const sand = stone(0xc8a060, 0.85);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd230,
    metalness: 0.85,
    roughness: 0.25,
  });
  const lapis = stone(0x2870b8, 0.7);
  // Table
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.6), wood);
  top.position.y = 0.55;
  g.add(top);
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), wood);
      leg.position.set(x, 0.275, z);
      g.add(leg);
    }
  }
  // Four canopic jars (each ~0.45m tall, different-shaped lids)
  for (let i = 0; i < 4; i++) {
    const x = -0.5 + i * 0.33;
    // Jar body (cylindrical)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.35, 12),
      sand
    );
    body.position.set(x, 0.76, 0);
    g.add(body);
    // Hieroglyph stripe
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.135, 0.06, 12),
      goldMat
    );
    stripe.position.set(x, 0.7, 0);
    g.add(stripe);
    // Different lid per jar (each god-headed)
    let lid: THREE.Mesh;
    if (i === 0) {
      // Falcon (Qebehsenuef)
      lid = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 8), goldMat);
      lid.position.set(x, 1.04, 0);
      g.add(lid);
    } else if (i === 1) {
      // Human (Imsety)
      lid = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), sand);
      lid.position.set(x, 1.0, 0);
      g.add(lid);
    } else if (i === 2) {
      // Jackal (Duamutef) — narrow snout
      lid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.22), lapis);
      lid.position.set(x, 1.02, 0);
      g.add(lid);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.18), lapis);
      snout.position.set(x, 1.0, 0.17);
      g.add(snout);
    } else {
      // Baboon (Hapi)
      lid = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), goldMat);
      lid.position.set(x, 1.02, 0);
      g.add(lid);
    }
  }
  shadowAll(g);
  return { group: g, height: 1.3, dodgeType: "jump" };
}

/* ================================ Helpers ================================ */

let signTexCache = new Map<string, THREE.Texture>();
function makeSignTex(text: string, bg: string, fg: string): THREE.Texture {
  const key = `${text}-${bg}-${fg}`;
  const hit = signTexCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 80;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 80);
  if (bg !== "transparent") {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 80);
  }
  ctx.fillStyle = fg;
  ctx.font = "900 50px -apple-system, Impact, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  signTexCache.set(key, tex);
  return tex;
}

let patternTexCache: THREE.Texture | null = null;
function makePatternTex(): THREE.Texture {
  if (patternTexCache) return patternTexCache;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#7a1818";
  ctx.fillRect(0, 0, 256, 256);
  // Diamond pattern
  ctx.fillStyle = "#d4a52a";
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 16, y);
      ctx.lineTo(x + 32, y + 16);
      ctx.lineTo(x + 16, y + 32);
      ctx.lineTo(x, y + 16);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.strokeStyle = "#1a0a0a";
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 16, y);
      ctx.lineTo(x + 32, y + 16);
      ctx.lineTo(x + 16, y + 32);
      ctx.lineTo(x, y + 16);
      ctx.closePath();
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  patternTexCache = tex;
  return tex;
}

/* ================================ Picker ================================ */

export type ThemeObstacleKind =
  | "hotdog" | "trash" | "umbrella" | "fruit"
  | "cafetable" | "baguette" | "ramen" | "vending"
  | "kebab" | "carpet" | "phonebox" | "mailbox"
  | "icepatch" | "vodka" | "goldstand" | "palmcrate"
  // NEW (overnight batch)
  | "usa_taxi" | "usa_hydrant" | "usa_newsstand"
  | "brazil_surfboard" | "brazil_drum" | "brazil_acai"
  | "france_winebarrel" | "france_bistroumbrella" | "france_arteasel"
  | "japan_smalltorii" | "japan_bento" | "japan_sakuratree"
  | "turkey_tea" | "turkey_simit" | "turkey_lokum"
  | "uk_doubledecker" | "uk_fishchips" | "uk_lampost"
  | "russia_samovar" | "russia_ushanka" | "russia_matryoshka"
  | "uae_oilbarrel" | "uae_datesyramid" | "uae_falcon"
  // Egypt — primitive only (sphinx, hieroglyph stele, ankh, canopic jars)
  | "egypt_sphinx" | "egypt_stele" | "egypt_ankh" | "egypt_canopic"
  // Overhead / overpass — slide-under (primitive only)
  | "usa_overhead" | "brazil_overhead" | "france_overhead" | "japan_overhead"
  | "turkey_overhead" | "uk_overhead" | "russia_overhead" | "uae_overhead"
  | "egypt_overhead";

/** Per-theme JUMP/LANE pool (the everyday obstacle mix). */
const THEME_POOL: Record<string, ThemeObstacleKind[]> = {
  usa: ["hotdog", "trash", "usa_taxi", "usa_hydrant", "usa_newsstand"],
  brazil: ["umbrella", "fruit", "brazil_surfboard", "brazil_drum", "brazil_acai"],
  france: ["cafetable", "baguette", "france_winebarrel", "france_bistroumbrella", "france_arteasel"],
  japan: ["ramen", "vending", "japan_smalltorii", "japan_bento", "japan_sakuratree"],
  turkey: ["kebab", "carpet", "turkey_tea", "turkey_simit", "turkey_lokum"],
  uk: ["phonebox", "mailbox", "uk_doubledecker", "uk_fishchips", "uk_lampost"],
  russia: ["icepatch", "vodka", "russia_samovar", "russia_ushanka", "russia_matryoshka"],
  uae: ["goldstand", "palmcrate", "uae_oilbarrel", "uae_datesyramid", "uae_falcon"],
  egypt: ["egypt_sphinx", "egypt_stele", "egypt_ankh", "egypt_canopic"],
};

/** Per-theme overhead / slide-under obstacle. */
const THEME_OVERHEAD: Record<string, ThemeObstacleKind> = {
  usa: "usa_overhead",
  brazil: "brazil_overhead",
  france: "france_overhead",
  japan: "japan_overhead",
  turkey: "turkey_overhead",
  uk: "uk_overhead",
  russia: "russia_overhead",
  uae: "uae_overhead",
  egypt: "egypt_overhead",
};

/** Kinds that are inherently tall — player CANNOT clear them by jumping.
 *  Must lane-change. Collision uses these heights to make jump fail. */
const LANE_KINDS = new Set<ThemeObstacleKind>([
  "usa_taxi", "usa_newsstand",
  "uk_doubledecker", "phonebox", "uk_lampost",
  "japan_sakuratree", "vending",
  "france_bistroumbrella", "france_arteasel",
  "brazil_surfboard",
  "egypt_sphinx",
]);

const SLIDE_KINDS = new Set<ThemeObstacleKind>([
  "usa_overhead", "brazil_overhead", "france_overhead", "japan_overhead",
  "turkey_overhead", "uk_overhead", "russia_overhead", "uae_overhead",
  "egypt_overhead",
]);

/** Look up the dodge type for a kind without building the mesh. */
export function getDodgeType(kind: ThemeObstacleKind): DodgeType {
  if (SLIDE_KINDS.has(kind)) return "slide";
  if (LANE_KINDS.has(kind)) return "lane";
  return "jump";
}

export function pickThemeObstacle(themeId: string): ThemeObstacleKind | null {
  const pool = THEME_POOL[themeId];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** The themed slide-under overpass for a given country (or null). */
export function pickThemeOverhead(themeId: string): ThemeObstacleKind | null {
  return THEME_OVERHEAD[themeId] ?? null;
}

export function buildThemeObstacle(kind: ThemeObstacleKind): ThemeObstacle {
  switch (kind) {
    case "hotdog": return buildHotdogCart();
    case "trash": return buildTrashBin();
    case "umbrella": return buildBeachUmbrella();
    case "fruit": return buildFruitStand();
    case "cafetable": return buildCafeTable();
    case "baguette": return buildBaguetteCart();
    case "ramen": return buildRamenCart();
    case "vending": return buildVendingMachine();
    case "kebab": return buildKebabCart();
    case "carpet": return buildCarpetStack();
    case "phonebox": return buildPhoneBox();
    case "mailbox": return buildMailbox();
    case "icepatch": return buildIcePatch();
    case "vodka": return buildVodkaCrate();
    case "goldstand": return buildGoldStand();
    case "palmcrate": return buildPalmCrate();
    // Overheads — primitive only (no GLB needed)
    case "usa_overhead": return buildUsaOverhead();
    case "brazil_overhead": return buildBrazilOverhead();
    case "france_overhead": return buildFranceOverhead();
    case "japan_overhead": return buildJapanOverhead();
    case "turkey_overhead": return buildTurkeyOverhead();
    case "uk_overhead": return buildUkOverhead();
    case "russia_overhead": return buildRussiaOverhead();
    case "uae_overhead": return buildUaeOverhead();
    case "egypt_overhead": return buildEgyptOverhead();
    case "egypt_sphinx": return buildSphinxStatue();
    case "egypt_stele": return buildHieroStele();
    case "egypt_ankh": return buildAnkhPedestal();
    case "egypt_canopic": return buildCanopicJars();
    // For NEW kinds (3D-only, no primitive), return a small generic placeholder
    // sized for the kind's dodge type. The GLB loader will swap to actual 3D
    // once /models/obstacles/<kind>.glb loads.
    default: return buildGenericPlaceholder(getDodgeType(kind));
  }
}

function buildGenericPlaceholder(dodgeType: DodgeType = "jump"): ThemeObstacle {
  const g = new THREE.Group();
  // Lane-blockers get a taller placeholder so the silhouette matches the
  // "you can't jump this" gameplay even before the GLB loads.
  const h = dodgeType === "lane" ? 2.4 : 1.2;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, h, 0.7),
    stone(0x444444, 0.8)
  );
  box.position.y = h / 2;
  g.add(box);
  shadowAll(g);
  return { group: g, height: h, dodgeType };
}
