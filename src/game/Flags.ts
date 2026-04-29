import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function cvs(w = 400, h = 260): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function toTex(c: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function flagTexture(id: string): THREE.Texture {
  const hit = cache.get(id);
  if (hit) return hit;
  let tex: THREE.Texture;
  switch (id) {
    case "usa":
      tex = makeUSA();
      break;
    case "brazil":
      tex = makeBrazil();
      break;
    case "france":
      tex = makeFrance();
      break;
    case "japan":
      tex = makeJapan();
      break;
    case "turkey":
      tex = makeTurkey();
      break;
    case "uk":
      tex = makeUK();
      break;
    case "russia":
      tex = makeRussia();
      break;
    case "uae":
      tex = makeUAE();
      break;
    case "egypt":
      tex = makeEgypt();
      break;
    default:
      tex = makeSolid("#888");
  }
  cache.set(id, tex);
  return tex;
}

function makeUSA(): THREE.Texture {
  // High-res canvas + proper US flag proportions (10:19 → 400×210 close enough)
  const W = 760;
  const H = 400;
  const [c, ctx] = cvs(W, H);
  // 13 stripes — start with red on top
  const stripe = H / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#b22234" : "#ffffff";
    ctx.fillRect(0, i * stripe, W, stripe);
  }
  // Canton — official 7 stripes tall, ~40% of width
  const cantonW = W * 0.4;
  const cantonH = stripe * 7;
  ctx.fillStyle = "#3c3b6e";
  ctx.fillRect(0, 0, cantonW, cantonH);
  // 50 stars: 9 rows alternating 6/5 stars
  ctx.fillStyle = "#ffffff";
  const starRadius = cantonH / 18;
  for (let row = 0; row < 9; row++) {
    const isLongRow = row % 2 === 0; // rows with 6 stars
    const starsInRow = isLongRow ? 6 : 5;
    const rowY = (cantonH / 10) * (row + 1);
    const colSpacing = cantonW / (isLongRow ? 7 : 6);
    const startX = isLongRow ? colSpacing : colSpacing * 1.5;
    for (let col = 0; col < starsInRow; col++) {
      drawStar(ctx, startX + col * colSpacing, rowY, starRadius, 5);
    }
  }
  return toTex(c);
}

function makeBrazil(): THREE.Texture {
  const [c, ctx] = cvs(400, 280);
  ctx.fillStyle = "#009739";
  ctx.fillRect(0, 0, 400, 280);
  // Yellow diamond
  ctx.fillStyle = "#fedd00";
  ctx.beginPath();
  ctx.moveTo(200, 20);
  ctx.lineTo(380, 140);
  ctx.lineTo(200, 260);
  ctx.lineTo(20, 140);
  ctx.closePath();
  ctx.fill();
  // Blue circle
  ctx.fillStyle = "#002776";
  ctx.beginPath();
  ctx.arc(200, 140, 70, 0, Math.PI * 2);
  ctx.fill();
  // Band
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(200, 160, 72, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  return toTex(c);
}

function makeFrance(): THREE.Texture {
  const [c, ctx] = cvs(400, 260);
  ctx.fillStyle = "#0055a4";
  ctx.fillRect(0, 0, 133, 260);
  ctx.fillStyle = "#fff";
  ctx.fillRect(133, 0, 134, 260);
  ctx.fillStyle = "#ef4135";
  ctx.fillRect(267, 0, 133, 260);
  return toTex(c);
}

function makeJapan(): THREE.Texture {
  const [c, ctx] = cvs(400, 260);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 400, 260);
  ctx.fillStyle = "#bc002d";
  ctx.beginPath();
  ctx.arc(200, 130, 75, 0, Math.PI * 2);
  ctx.fill();
  return toTex(c);
}

function makeTurkey(): THREE.Texture {
  const [c, ctx] = cvs(400, 260);
  ctx.fillStyle = "#e30a17";
  ctx.fillRect(0, 0, 400, 260);
  // Crescent
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(170, 130, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e30a17";
  ctx.beginPath();
  ctx.arc(190, 130, 46, 0, Math.PI * 2);
  ctx.fill();
  // Star (simple 5-point)
  ctx.fillStyle = "#fff";
  drawStar(ctx, 250, 130, 30, 5);
  return toTex(c);
}

function makeUK(): THREE.Texture {
  const [c, ctx] = cvs(400, 260);
  ctx.fillStyle = "#012169";
  ctx.fillRect(0, 0, 400, 260);
  // White diagonals
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(400, 260);
  ctx.moveTo(400, 0);
  ctx.lineTo(0, 260);
  ctx.stroke();
  // Red diagonals
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(400, 260);
  ctx.moveTo(400, 0);
  ctx.lineTo(0, 260);
  ctx.stroke();
  // White cross
  ctx.fillStyle = "#fff";
  ctx.fillRect(170, 0, 60, 260);
  ctx.fillRect(0, 110, 400, 40);
  // Red cross
  ctx.fillStyle = "#c8102e";
  ctx.fillRect(184, 0, 32, 260);
  ctx.fillRect(0, 118, 400, 24);
  return toTex(c);
}

function makeRussia(): THREE.Texture {
  const [c, ctx] = cvs(400, 260);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 400, 86);
  ctx.fillStyle = "#0033a0";
  ctx.fillRect(0, 86, 400, 86);
  ctx.fillStyle = "#da291c";
  ctx.fillRect(0, 172, 400, 88);
  return toTex(c);
}

function makeUAE(): THREE.Texture {
  const [c, ctx] = cvs(400, 260);
  // Vertical red on left
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, 100, 260);
  // Three horizontal on right: green, white, black
  ctx.fillStyle = "#00732f";
  ctx.fillRect(100, 0, 300, 87);
  ctx.fillStyle = "#fff";
  ctx.fillRect(100, 87, 300, 86);
  ctx.fillStyle = "#000";
  ctx.fillRect(100, 173, 300, 87);
  return toTex(c);
}

function makeEgypt(): THREE.Texture {
  const [c, ctx] = cvs(400, 260);
  // Three horizontal stripes: red, white, black
  ctx.fillStyle = "#ce1126";
  ctx.fillRect(0, 0, 400, 87);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 87, 400, 86);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 173, 400, 87);
  // Gold eagle of Saladin (simplified — circle with rays)
  ctx.fillStyle = "#c09300";
  ctx.beginPath();
  ctx.arc(200, 130, 24, 0, Math.PI * 2);
  ctx.fill();
  // Rays / wing strokes
  ctx.strokeStyle = "#c09300";
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(200 + Math.cos(a) * 16, 130 + Math.sin(a) * 16);
    ctx.lineTo(200 + Math.cos(a) * 30, 130 + Math.sin(a) * 30);
    ctx.stroke();
  }
  return toTex(c);
}

function makeSolid(col: string): THREE.Texture {
  const [c, ctx] = cvs(200, 140);
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, 200, 140);
  return toTex(c);
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  points: number
) {
  const step = Math.PI / points;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.beginPath();
  for (let i = 0; i < 2 * points; i++) {
    const rr = i % 2 === 0 ? r : r / 2.3;
    ctx.lineTo(Math.cos(i * step) * rr, Math.sin(i * step) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Builds a flagpole prop with the given country's flag. */
export function buildFlagPole(themeId: string): THREE.Group {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xd8d8d8,
    metalness: 0.7,
    roughness: 0.3,
  });
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 6.2, 8),
    poleMat
  );
  pole.position.y = 3.1;
  g.add(pole);
  // Pole top ball
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffd257,
      metalness: 0.8,
      roughness: 0.2,
    })
  );
  ball.position.y = 6.3;
  g.add(ball);
  // Flag itself
  const tex = flagTexture(themeId);
  const flagGeom = new THREE.PlaneGeometry(1.8, 1.2, 20, 12);
  // Ripple effect — displace vertices in +X direction along y
  const pos = flagGeom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const ripple = Math.sin(x * 3.5) * 0.08 + Math.sin(x * 6 + 1.2) * 0.03;
    pos.setZ(i, ripple);
  }
  pos.needsUpdate = true;
  const flag = new THREE.Mesh(
    flagGeom,
    new THREE.MeshStandardMaterial({
      map: tex,
      side: THREE.DoubleSide,
      roughness: 0.85,
    })
  );
  flag.position.set(0.94, 5.4, 0);
  g.add(flag);
  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.28, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.85 })
  );
  base.position.y = 0.15;
  g.add(base);
  return g;
}
