import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import mavPhotoUrl from "../assets/mav.jpg";

export interface CharacterOptions {
  skin?: number;
  hair?: number;
  hairStyle?: "messy" | "hood";
  shirt?: number;
  shirtLogo?: "67" | null;
  pants?: number;
  shoes?: number;
  hoodColor?: number;
  mouth?: "open" | "frown" | "smile";
  eyes?: number;
  brows?: number;
  /** Use an actual photo (from /mav.jpg) as the face texture. */
  photoFace?: boolean;
}

export interface CharacterRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  height: number;
}

/* ------------------------- Proportions ------------------------- */
const H_SHOE = 0.2;
const H_LEG = 0.95;
const H_HIP = 0.2;
const H_TORSO = 0.75;
const H_NECK = 0.12;

const Y_LEG_PIVOT = H_SHOE + H_LEG;
const Y_HIP_CENTER = Y_LEG_PIVOT + H_HIP / 2;
const Y_TORSO_CENTER = Y_LEG_PIVOT + H_HIP + H_TORSO / 2;
const Y_NECK_CENTER = Y_LEG_PIVOT + H_HIP + H_TORSO + H_NECK / 2;
const Y_HEAD_CENTER = Y_LEG_PIVOT + H_HIP + H_TORSO + H_NECK + 0.48;
const Y_SHOULDER = Y_LEG_PIVOT + H_HIP + H_TORSO - 0.1;

/* ------------------------- Materials ------------------------- */
const rbox = (w: number, h: number, d: number, r = 0.06) =>
  new RoundedBoxGeometry(w, h, d, 4, r);

const mat = (
  color: number,
  opts: { rough?: number; metal?: number; emissive?: number; map?: THREE.Texture } = {}
) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.75,
    metalness: opts.metal ?? 0.02,
    emissive: opts.emissive ?? 0x000000,
    map: opts.map,
  });

function addShadow(obj: THREE.Object3D) {
  obj.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

/* ============================================================ */
/*               Main Character Builder                           */
/* ============================================================ */

export function buildCharacter(opts: CharacterOptions = {}): CharacterRig {
  const skin = opts.skin ?? 0xf6c6a0;
  const skinDarker = darker(skin, 0.07);
  const hair = opts.hair ?? 0xd8a850;
  const hairDark = darker(hair, 0.12);
  const shirt = opts.shirt ?? 0xf4f1ea;
  const pants = opts.pants ?? 0x223052;
  const shoes = opts.shoes ?? 0xffffff;
  const mouth = opts.mouth ?? "open";
  const hairStyle = opts.hairStyle ?? "messy";
  const hood = opts.hoodColor ?? 0x7a0d1f;
  const showLogo = (opts.shirtLogo ?? "67") === "67";
  const usePhoto = opts.photoFace ?? false;

  const skinMat = new THREE.MeshStandardMaterial({
    color: skin,
    roughness: 0.78,
    metalness: 0,
  });
  const skinShadowMat = new THREE.MeshStandardMaterial({
    color: skinDarker,
    roughness: 0.8,
  });
  const shirtMat = mat(shirt, { rough: 0.78 });
  const pantsMat = mat(pants, { rough: 0.82 });
  const shoeMat = mat(shoes, { rough: 0.5 });
  const soleMat = mat(0x111111, { rough: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({
    color: hair,
    roughness: 0.45,
    metalness: 0.05,
  });
  const hairDarkMat = new THREE.MeshStandardMaterial({
    color: hairDark,
    roughness: 0.5,
  });

  const root = new THREE.Group();

  /* ============================ LEGS ============================ */
  const makeLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, Y_LEG_PIVOT, 0);

    // Thigh (slightly tapered via scale)
    const thigh = new THREE.Mesh(rbox(0.3, H_LEG * 0.5, 0.3, 0.1), pantsMat);
    thigh.position.y = -H_LEG * 0.25;
    leg.add(thigh);

    // Knee hint (darker strip)
    const knee = new THREE.Mesh(rbox(0.31, 0.05, 0.31, 0.02), mat(darker(pants, 0.08)));
    knee.position.y = -H_LEG * 0.5;
    leg.add(knee);

    // Calf (slightly narrower)
    const calf = new THREE.Mesh(rbox(0.28, H_LEG * 0.5, 0.28, 0.1), pantsMat);
    calf.position.y = -H_LEG * 0.75;
    leg.add(calf);

    // Sneaker body
    const shoe = new THREE.Mesh(rbox(0.36, H_SHOE, 0.58, 0.1), shoeMat);
    shoe.position.set(0, -H_LEG - H_SHOE / 2 + 0.02, 0.08);
    leg.add(shoe);

    // Sole
    const sole = new THREE.Mesh(rbox(0.38, 0.06, 0.6, 0.03), soleMat);
    sole.position.set(0, -H_LEG - H_SHOE + 0.05, 0.08);
    leg.add(sole);

    // Swoosh / laces accent
    const accent = new THREE.Mesh(
      rbox(0.3, 0.06, 0.12, 0.03),
      mat(0xff2e63, { rough: 0.4 })
    );
    accent.position.set(0, -H_LEG - H_SHOE / 2 + 0.02, 0.28);
    leg.add(accent);

    // Tongue of shoe
    const shoeTongue = new THREE.Mesh(
      rbox(0.22, 0.06, 0.18, 0.04),
      mat(darker(shoes, 0.06))
    );
    shoeTongue.position.set(0, -H_LEG - H_SHOE * 0.2, 0.28);
    leg.add(shoeTongue);

    return leg;
  };

  const leftLeg = makeLeg(-0.2);
  const rightLeg = makeLeg(0.2);

  /* ============================ HIPS + TORSO ============================ */
  const body = new THREE.Group();

  // Hip block (pants waistband — slightly wider than legs)
  const hips = new THREE.Mesh(rbox(0.88, H_HIP, 0.52, 0.1), pantsMat);
  hips.position.y = Y_HIP_CENTER;
  body.add(hips);

  // Belt
  const belt = new THREE.Mesh(
    rbox(0.92, 0.07, 0.55, 0.02),
    mat(0x2a1d10, { rough: 0.6 })
  );
  belt.position.y = Y_HIP_CENTER + H_HIP / 2 - 0.02;
  body.add(belt);
  const buckle = new THREE.Mesh(
    rbox(0.12, 0.09, 0.08, 0.02),
    mat(0xc8a85a, { metal: 0.85, rough: 0.25 })
  );
  buckle.position.set(0, Y_HIP_CENTER + H_HIP / 2 - 0.02, 0.29);
  body.add(buckle);

  // Torso — v-taper (wider top)
  const torsoTex = makeShirtTexture(shirt);
  const torsoMat = mat(0xffffff, { map: torsoTex, rough: 0.78 });
  const torsoLower = new THREE.Mesh(rbox(0.88, H_TORSO * 0.5, 0.5, 0.12), torsoMat);
  torsoLower.position.y = Y_TORSO_CENTER - H_TORSO * 0.25;
  body.add(torsoLower);
  const torsoUpper = new THREE.Mesh(rbox(0.95, H_TORSO * 0.5, 0.54, 0.12), torsoMat);
  torsoUpper.position.y = Y_TORSO_CENTER + H_TORSO * 0.25;
  body.add(torsoUpper);

  // 67 chest decal
  if (showLogo) {
    const decal = build67ShirtDecal();
    body.add(decal);
  }

  // Neck (smooth cylinder) — use rbox for soft look
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, H_NECK, 14),
    skinMat
  );
  neck.position.y = Y_NECK_CENTER;
  body.add(neck);

  // T-shirt collar V
  const collar = new THREE.Mesh(rbox(0.45, 0.07, 0.45, 0.02), mat(darker(shirt, 0.1)));
  collar.position.y = Y_NECK_CENTER - H_NECK / 2 + 0.02;
  body.add(collar);

  /* ============================ ARMS ============================ */
  const makeArm = (xOff: number, side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(xOff, Y_SHOULDER, 0);

    // Shoulder pad (round sphere cap for organic look)
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 10),
      shirtMat
    );
    shoulder.position.y = -0.04;
    arm.add(shoulder);

    // Upper arm (bicep) — tapered box
    const upper = new THREE.Mesh(rbox(0.2, 0.38, 0.22, 0.08), shirtMat);
    upper.position.y = -0.24;
    arm.add(upper);

    // Elbow joint
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 10),
      skinMat
    );
    elbow.position.y = -0.45;
    arm.add(elbow);

    // Forearm (exposed skin, rolled-up sleeves)
    const forearm = new THREE.Mesh(rbox(0.18, 0.28, 0.2, 0.08), skinMat);
    forearm.position.y = -0.62;
    arm.add(forearm);

    // Wristband
    const wristband = new THREE.Mesh(
      rbox(0.2, 0.05, 0.22, 0.02),
      mat(0xff2e63)
    );
    wristband.position.y = -0.77;
    arm.add(wristband);

    // Hand (with slight inner grip)
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 10),
      skinMat
    );
    hand.scale.set(0.9, 1, 0.9);
    hand.position.y = -0.87;
    arm.add(hand);

    return arm;
  };

  const leftArm = makeArm(-0.55, -1);
  const rightArm = makeArm(0.55, 1);

  /* ============================ HEAD ============================ */
  const head = new THREE.Group();
  head.position.y = Y_HEAD_CENTER;

  // Cranium — big round sphere (child proportions)
  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 28, 22),
    skinMat
  );
  cranium.scale.set(1.0, 1.02, 0.98);
  cranium.position.y = 0.04;
  head.add(cranium);

  // Chin/jaw transition (subtle squish below)
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 20, 14),
    skinShadowMat
  );
  jaw.scale.set(0.92, 0.38, 0.88);
  jaw.position.set(0, -0.3, 0.03);
  head.add(jaw);

  // Ears (small organic)
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), skinMat);
  earL.scale.set(0.4, 1, 0.95);
  earL.position.set(-0.45, -0.04, -0.02);
  head.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.45;
  head.add(earR);

  // Face decal — actual photo of Mav (if photoFace) or cartoon texture
  const faceTex = usePhoto
    ? makeMavPhotoFace()
    : makeCartoonFace(mouth, { skin, hair });
  const faceDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.98),
    new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: true,
      depthWrite: false,
      toneMapped: true,
    })
  );
  faceDecal.position.set(0, 0.03, 0.465);
  head.add(faceDecal);

  /* --------------------------- Hair --------------------------- */
  if (hairStyle === "messy") {
    // Main hair cap — a scaled sphere covering top half of cranium
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2 + 0.2),
      hairMat
    );
    cap.position.y = 0.08;
    cap.scale.set(1.04, 1.0, 1.04);
    head.add(cap);

    // Messy spikes on top — varied clumps using sphere chunks
    const spikes: Array<[number, number, number, number, number, number, number]> = [
      //  x,    y,    z,    sx,   sy,   sz,   rz
      [-0.18, 0.48, 0.12, 0.9, 1.2, 0.9, 0.4],
      [0.22, 0.5, 0.1, 0.8, 1.1, 0.9, -0.3],
      [0.0, 0.52, 0.25, 1.1, 1.0, 0.7, 0.1],
      [-0.08, 0.55, -0.1, 0.9, 1.3, 0.9, -0.2],
      [0.3, 0.44, -0.08, 0.8, 1.1, 0.9, 0.6],
      [-0.3, 0.42, -0.1, 0.8, 1.1, 0.9, -0.6],
      [0.15, 0.48, -0.22, 0.8, 1.0, 0.9, 0.3],
      [-0.15, 0.5, -0.22, 0.8, 1.0, 0.9, -0.3],
    ];
    for (const [x, y, z, sx, sy, sz, rz] of spikes) {
      const spike = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 12, 10),
        hairMat
      );
      spike.position.set(x, y, z);
      spike.scale.set(sx, sy, sz);
      spike.rotation.z = rz;
      head.add(spike);
    }

    // Front bangs — fall over forehead
    const bang1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      hairMat
    );
    bang1.scale.set(1.3, 0.55, 0.4);
    bang1.position.set(0, 0.3, 0.36);
    bang1.rotation.x = -0.2;
    head.add(bang1);
    // Left sweep
    const sweepL = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 14, 12),
      hairMat
    );
    sweepL.scale.set(0.7, 1.1, 0.6);
    sweepL.position.set(-0.24, 0.15, 0.32);
    sweepL.rotation.z = 0.6;
    head.add(sweepL);
    // Right sweep
    const sweepR = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 14, 12),
      hairMat
    );
    sweepR.scale.set(0.7, 1.1, 0.6);
    sweepR.position.set(0.24, 0.15, 0.32);
    sweepR.rotation.z = -0.6;
    head.add(sweepR);

    // Back hair — a denser cap at back
    const backHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 12),
      hairDarkMat
    );
    backHair.scale.set(1, 0.9, 0.5);
    backHair.position.set(0, 0.08, -0.25);
    head.add(backHair);
  } else if (hairStyle === "hood") {
    const hoodMat = mat(hood, { rough: 0.85 });
    const hoodShape = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 14, 0, Math.PI * 2, 0, Math.PI / 2 + 0.4),
      hoodMat
    );
    hoodShape.scale.set(1.15, 1.1, 1.15);
    hoodShape.position.y = 0.05;
    head.add(hoodShape);
    // Open front of hood (darker interior shadow)
    const hoodShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.6),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5,
      })
    );
    hoodShadow.position.set(0, 0.1, 0.41);
    head.add(hoodShadow);
  }

  /* ============================ ASSEMBLE ============================ */
  body.add(leftLeg);
  body.add(rightLeg);
  body.add(leftArm);
  body.add(rightArm);

  root.add(body);
  root.add(head);

  addShadow(root);

  return {
    root,
    body,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    height: Y_HEAD_CENTER + 0.55,
  };
}

/* ========================= Animations ========================= */

export function animateRun(rig: CharacterRig, t: number, speed = 1) {
  const s = t * speed * 0.02;
  const swing = Math.sin(s) * 1.1;
  rig.leftArm.rotation.x = swing;
  rig.rightArm.rotation.x = -swing;
  rig.leftLeg.rotation.x = -swing * 0.9;
  rig.rightLeg.rotation.x = swing * 0.9;
  const bob = Math.abs(Math.sin(s)) * 0.06;
  rig.body.position.y = bob;
  rig.head.position.y = Y_HEAD_CENTER + bob;
  rig.head.rotation.z = Math.sin(s) * 0.04;
  rig.head.rotation.x = -bob * 0.3;
  // subtle lateral sway
  rig.body.position.x = Math.sin(s * 0.5) * 0.02;
}

export function poseIdle(rig: CharacterRig) {
  rig.leftArm.rotation.x = 0;
  rig.rightArm.rotation.x = 0;
  rig.leftLeg.rotation.x = 0;
  rig.rightLeg.rotation.x = 0;
  rig.body.position.set(0, 0, 0);
  rig.head.position.y = Y_HEAD_CENTER;
  rig.head.rotation.set(0, 0, 0);
}

export function poseJump(rig: CharacterRig) {
  rig.leftArm.rotation.x = -0.9;
  rig.rightArm.rotation.x = -0.9;
  rig.leftLeg.rotation.x = -0.5;
  rig.rightLeg.rotation.x = 0.4;
}

export function poseSlide(rig: CharacterRig) {
  rig.leftArm.rotation.x = -1.6;
  rig.rightArm.rotation.x = -1.6;
  rig.leftLeg.rotation.x = 0.5;
  rig.rightLeg.rotation.x = 0.5;
}

/* ========================= Textures ========================= */

/* ========================= Real Mav Photo Face ========================= */

let mavPhotoTexCache: THREE.CanvasTexture | null = null;
function makeMavPhotoFace(): THREE.Texture {
  if (mavPhotoTexCache) return mavPhotoTexCache;
  // Create an empty canvas texture immediately — photo fills in async when loaded
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  // Placeholder — solid transparent
  ctx.clearRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  mavPhotoTexCache = tex;

  // Load the actual photo and draw it with soft circular mask
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.clearRect(0, 0, 512, 512);
    // Determine cropping — center the face (Mav is center-top in the photo)
    // Photo ~aspect ratio 1.5:1 — crop to roughly square around face area
    const iw = img.width;
    const ih = img.height;
    // The face is roughly in the center horizontally and upper-center vertically.
    // Crop a square region from center, slightly shifted up to center on face.
    const cropSize = Math.min(iw, ih) * 0.85;
    const cropX = (iw - cropSize) / 2;
    const cropY = Math.max(0, (ih - cropSize) / 2 - cropSize * 0.05);
    // Draw on canvas filling the full 512x512
    ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, 512, 512);
    // Apply soft circular mask to fade edges
    ctx.globalCompositeOperation = "destination-in";
    const grad = ctx.createRadialGradient(256, 256, 150, 256, 256, 250);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.95)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    // Boost contrast slightly
    ctx.globalCompositeOperation = "source-over";
    // Update texture
    tex.needsUpdate = true;
  };
  img.onerror = () => {
    console.warn("Failed to load Mav photo — falling back to cartoon face");
  };
  img.src = mavPhotoUrl;
  return tex;
}

/* ========================= Cartoon Face ========================= */

let cartoonFaceCache = new Map<string, THREE.Texture>();
function makeCartoonFace(
  mouth: "open" | "frown" | "smile",
  opts: { skin: number; hair: number }
): THREE.Texture {
  const key = `${mouth}-${opts.skin}-${opts.hair}`;
  const hit = cartoonFaceCache.get(key);
  if (hit) return hit;

  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);

  const cx = S / 2; // center x
  const cy = S / 2; // center y (eye baseline)

  // Soft edge alpha mask — face only visible over center oval
  const mask = ctx.createRadialGradient(cx, cy, S * 0.3, cx, cy, S * 0.48);
  mask.addColorStop(0, "rgba(0,0,0,0)");
  mask.addColorStop(0.75, "rgba(0,0,0,0)");
  mask.addColorStop(1, "rgba(0,0,0,1)");

  // ---------------------------- Cheeks (blush) ----------------------------
  const blushL = ctx.createRadialGradient(cx - 220, cy + 160, 10, cx - 220, cy + 160, 140);
  blushL.addColorStop(0, "rgba(255, 140, 160, 0.7)");
  blushL.addColorStop(1, "rgba(255, 140, 160, 0)");
  ctx.fillStyle = blushL;
  ctx.fillRect(cx - 360, cy + 20, 280, 280);
  const blushR = ctx.createRadialGradient(cx + 220, cy + 160, 10, cx + 220, cy + 160, 140);
  blushR.addColorStop(0, "rgba(255, 140, 160, 0.7)");
  blushR.addColorStop(1, "rgba(255, 140, 160, 0)");
  ctx.fillStyle = blushR;
  ctx.fillRect(cx + 80, cy + 20, 280, 280);

  // ---------------------------- Freckles ----------------------------
  ctx.fillStyle = "rgba(140, 85, 50, 0.55)";
  const freckles: [number, number, number][] = [
    [-150, 100, 4],
    [-120, 140, 3],
    [-80, 110, 5],
    [-40, 150, 3],
    [40, 140, 4],
    [80, 120, 3],
    [120, 150, 5],
    [150, 110, 3],
    [-100, 180, 3],
    [100, 180, 3],
    [-60, 90, 3],
    [60, 100, 3],
  ];
  for (const [fx, fy, fr] of freckles) {
    ctx.beginPath();
    ctx.arc(cx + fx, cy + fy, fr, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------------------------- Eyes ----------------------------
  const eyeY = cy - 20;
  const eyeDX = 155;
  const eyeRX = 95;
  const eyeRY = 115;

  // Eye socket subtle shadow
  ctx.fillStyle = "rgba(180, 120, 100, 0.25)";
  ellipse(ctx, cx - eyeDX, eyeY + 10, eyeRX + 10, eyeRY + 6);
  ellipse(ctx, cx + eyeDX, eyeY + 10, eyeRX + 10, eyeRY + 6);

  // Sclera (white part) — almond-shaped
  ctx.fillStyle = "#fefefe";
  ellipse(ctx, cx - eyeDX, eyeY, eyeRX, eyeRY);
  ellipse(ctx, cx + eyeDX, eyeY, eyeRX, eyeRY);

  // Clip to eye shape & draw iris (big, excited look)
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDX;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeRX, eyeRY, 0, 0, Math.PI * 2);
    ctx.clip();
    // Iris (big wide-eyed look — filling most of the sclera)
    const iris = ctx.createRadialGradient(ex, eyeY + 15, 10, ex, eyeY + 15, 85);
    iris.addColorStop(0, "#5a8ec8");
    iris.addColorStop(0.7, "#2b5d8a");
    iris.addColorStop(1, "#14324a");
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(ex, eyeY + 15, 78, 0, Math.PI * 2);
    ctx.fill();
    // Iris ring (darker edge)
    ctx.strokeStyle = "#0a1a2a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ex, eyeY + 15, 78, 0, Math.PI * 2);
    ctx.stroke();
    // Pupil
    ctx.fillStyle = "#080808";
    ctx.beginPath();
    ctx.arc(ex, eyeY + 15, 38, 0, Math.PI * 2);
    ctx.fill();
    // Big highlight (upper left)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex - 25, eyeY - 10, 22, 0, Math.PI * 2);
    ctx.fill();
    // Small secondary highlight (bottom right)
    ctx.beginPath();
    ctx.arc(ex + 22, eyeY + 35, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Eye outline (cartoon bold stroke)
  ctx.strokeStyle = "#1a1410";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(cx - eyeDX, eyeY, eyeRX, eyeRY, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + eyeDX, eyeY, eyeRX, eyeRY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Eyelashes (short strokes above eye)
  ctx.strokeStyle = "#1a1410";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDX;
    for (let a = -0.4; a < 0.5; a += 0.12) {
      ctx.beginPath();
      const sx = ex + Math.sin(a) * eyeRX * 0.95;
      const sy = eyeY - Math.cos(a) * eyeRY * 0.95;
      const dx = sx + Math.sin(a) * 18;
      const dy = sy - Math.cos(a) * 22;
      ctx.moveTo(sx, sy);
      ctx.lineTo(dx, dy);
      ctx.stroke();
    }
  }

  // ---------------------------- Eyebrows ----------------------------
  const browColor = hexToRgb(darker(opts.hair, 0.25));
  ctx.fillStyle = `rgb(${browColor.r}, ${browColor.g}, ${browColor.b})`;
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDX;
    ctx.save();
    ctx.translate(ex, eyeY - eyeRY - 30);
    ctx.rotate(side * -0.18);
    // Thick bold eyebrow shape
    ctx.beginPath();
    ctx.moveTo(-90, 10);
    ctx.quadraticCurveTo(-60, -25, 60, -18);
    ctx.quadraticCurveTo(90, -15, 95, 10);
    ctx.quadraticCurveTo(60, 20, -60, 18);
    ctx.quadraticCurveTo(-95, 25, -90, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------- Nose ----------------------------
  // Subtle "less than" bump between eyes
  ctx.strokeStyle = "rgba(180, 110, 90, 0.45)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 100);
  ctx.lineTo(cx - 32, cy + 150);
  ctx.lineTo(cx - 5, cy + 170);
  ctx.stroke();
  // Nostril dots
  ctx.fillStyle = "rgba(90, 50, 40, 0.55)";
  ctx.beginPath();
  ctx.arc(cx - 28, cy + 175, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 10, cy + 175, 6, 0, Math.PI * 2);
  ctx.fill();

  // ---------------------------- Mouth ----------------------------
  const mouthY = cy + 280;
  if (mouth === "open") {
    // Big laughing mouth
    // Outer lip outline
    ctx.fillStyle = "#1a0606";
    ellipse(ctx, cx, mouthY, 150, 110);
    // Inner mouth cavity (slightly smaller, darker red)
    ctx.fillStyle = "#501818";
    ellipse(ctx, cx, mouthY + 5, 135, 95);
    // Upper teeth (bright white strip)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx - 130, mouthY - 85);
    ctx.lineTo(cx + 130, mouthY - 85);
    ctx.lineTo(cx + 120, mouthY - 25);
    ctx.lineTo(cx - 120, mouthY - 25);
    ctx.closePath();
    ctx.fill();
    // Tooth dividers
    ctx.strokeStyle = "rgba(140, 130, 125, 0.6)";
    ctx.lineWidth = 3;
    for (let i = -80; i <= 80; i += 40) {
      ctx.beginPath();
      ctx.moveTo(cx + i, mouthY - 83);
      ctx.lineTo(cx + i, mouthY - 27);
      ctx.stroke();
    }
    // Tongue
    const tongue = ctx.createRadialGradient(cx, mouthY + 50, 10, cx, mouthY + 50, 100);
    tongue.addColorStop(0, "#f18a9c");
    tongue.addColorStop(1, "#c84460");
    ctx.fillStyle = tongue;
    ellipse(ctx, cx, mouthY + 50, 100, 45);
    // Lip outlines
    ctx.strokeStyle = "#1a0606";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(cx, mouthY, 150, 110, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Upper lip curl
    ctx.beginPath();
    ctx.moveTo(cx - 150, mouthY - 5);
    ctx.quadraticCurveTo(cx - 75, mouthY - 125, cx, mouthY - 95);
    ctx.quadraticCurveTo(cx + 75, mouthY - 125, cx + 150, mouthY - 5);
    ctx.lineWidth = 5;
    ctx.stroke();
  } else if (mouth === "frown") {
    ctx.strokeStyle = "#1a0606";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, mouthY + 70, 80, Math.PI + 0.3, 2 * Math.PI - 0.3);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#1a0606";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, mouthY - 30, 100, 0.4, Math.PI - 0.4);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  cartoonFaceCache.set(key, tex);
  return tex;
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number
) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function hexToRgb(h: number) {
  return {
    r: (h >> 16) & 0xff,
    g: (h >> 8) & 0xff,
    b: h & 0xff,
  };
}

let shirtTexCache = new Map<number, THREE.Texture>();
function makeShirtTexture(bg: number): THREE.Texture {
  const hit = shirtTexCache.get(bg);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const base = new THREE.Color(bg);
  ctx.fillStyle = toRgb(base);
  ctx.fillRect(0, 0, 512, 512);
  const img = ctx.getImageData(0, 0, 512, 512);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i] = clamp255(d[i] + n);
    d[i + 1] = clamp255(d[i + 1] + n);
    d[i + 2] = clamp255(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  shirtTexCache.set(bg, tex);
  return tex;
}

function toRgb(c: THREE.Color): string {
  return `rgb(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0})`;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function darker(hex: number, amount: number): number {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, -amount);
  return c.getHex();
}

/* ========================= 67 Decal ========================= */

let decalTexCache: THREE.Texture | null = null;
export function build67ShirtDecal(): THREE.Mesh {
  const tex = decalTexCache ?? (decalTexCache = make67DecalTexture());
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.55),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    })
  );
  mesh.position.set(0, Y_TORSO_CENTER - 0.02, 0.28);
  return mesh;
}

function make67DecalTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = "#ff2e63";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 18;
  ctx.font = "900 320px -apple-system, Inter, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText("67", 256, 288);
  ctx.fillText("67", 256, 288);
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.font = "800 42px -apple-system, Inter, Arial";
  ctx.fillText("MAV GANG", 256, 450);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
