import * as THREE from "three";
import type { Theme } from "./Themes";

const TRACK_WIDTH = 7;
/** How deep the tunnel floor goes below normal ground level. Positive = underground. */
export const TUNNEL_DEPTH = 2.5;

/**
 * Build one underground tunnel arch (~4m deep chunk).
 * Floor is at y=-TUNNEL_DEPTH, walls extend UP from there.
 * Tunnel feels like a real subway tunnel below street level.
 */
export function buildTunnelArch(theme: Theme): THREE.Group {
  const g = new THREE.Group();
  const wallColor = darken(theme.ground, 0.18);
  const accentColor = theme.neonA;

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.95,
    side: THREE.BackSide,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: darken(theme.ground, 0.3),
    roughness: 0.95,
    side: THREE.BackSide,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a20,
    roughness: 0.95,
  });
  const lightEmissive = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const neonMat = new THREE.MeshBasicMaterial({ color: accentColor });

  // Floor — concrete subway floor at deep level
  const floor = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH + 1, 0.3, 4.2), floorMat);
  floor.position.set(0, -TUNNEL_DEPTH - 0.15, 0);
  g.add(floor);

  // Walls — extend from tunnel floor up to roof level
  const wallH = 5.5;
  const wallY = -TUNNEL_DEPTH + wallH / 2;
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.6, wallH, 4.2), wallMat);
  wallL.position.set(-(TRACK_WIDTH / 2 + 0.5), wallY, 0);
  g.add(wallL);
  const wallR = wallL.clone();
  wallR.position.x = TRACK_WIDTH / 2 + 0.5;
  g.add(wallR);

  // Roof at street level (y ~= 2.5 absolute, which is about 5 above tunnel floor)
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_WIDTH + 1.8, 0.5, 4.2),
    roofMat
  );
  roof.position.set(0, -TUNNEL_DEPTH + wallH + 0.25, 0);
  g.add(roof);

  // Neon rim hanging from roof
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_WIDTH + 1.8, 0.16, 0.16),
    neonMat
  );
  rim.position.set(0, -TUNNEL_DEPTH + wallH + 0.15, 2.05);
  g.add(rim);

  // Ceiling lights
  const lightBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.1, 0.5),
    lightEmissive
  );
  lightBox.position.set(0, -TUNNEL_DEPTH + wallH - 0.05, 0);
  g.add(lightBox);

  // Side accent neon tiles on lower wall (subway-style)
  for (let i = -1.5; i <= 1.5; i += 1.5) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, 0.9),
      new THREE.MeshBasicMaterial({ color: accentColor })
    );
    tile.position.set(-(TRACK_WIDTH / 2 + 0.2), -TUNNEL_DEPTH + 1.2, i);
    g.add(tile);
    const tileR = tile.clone();
    tileR.position.x = TRACK_WIDTH / 2 + 0.2;
    g.add(tileR);
  }

  // 67 graffiti tag on wall (occasional)
  if (Math.random() < 0.4) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.0),
      new THREE.MeshBasicMaterial({
        map: make67TagTexture(),
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    tag.position.set(side * (TRACK_WIDTH / 2 + 0.19), -TUNNEL_DEPTH + 2.0, 0);
    tag.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.add(tag);
  }

  return g;
}

/** Entrance/exit portal — visible "metro entrance" frame at street level. */
export function buildTunnelPortal(theme: Theme): THREE.Group {
  const g = new THREE.Group();
  const portalMat = new THREE.MeshStandardMaterial({
    color: darken(theme.ground, 0.4),
    roughness: 0.85,
  });
  const neonMat = new THREE.MeshBasicMaterial({ color: theme.neonA });

  // Top frame (street level)
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_WIDTH + 3.2, 1.5, 1.0),
    portalMat
  );
  top.position.set(0, 3.0, 0);
  g.add(top);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5, 1.0), portalMat);
  sideL.position.set(-(TRACK_WIDTH / 2 + 1.4), 1.5, 0);
  g.add(sideL);
  const sideR = sideL.clone();
  sideR.position.x = TRACK_WIDTH / 2 + 1.4;
  g.add(sideR);

  // Inner neon frame
  const neonTop = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_WIDTH + 1.0, 0.12, 0.14),
    neonMat
  );
  neonTop.position.set(0, 2.4, 0.55);
  g.add(neonTop);
  const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.5, 0.14), neonMat);
  neonL.position.set(-(TRACK_WIDTH / 2 + 0.1), 0.5, 0.55);
  g.add(neonL);
  const neonR = neonL.clone();
  neonR.position.x = TRACK_WIDTH / 2 + 0.1;
  g.add(neonR);

  // 67 RUNNER sign on top
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.9),
    new THREE.MeshBasicMaterial({
      map: make67TagTexture(true),
      transparent: true,
    })
  );
  sign.position.set(0, 3.0, 0.55);
  g.add(sign);

  return g;
}

/** Sloped ramp connecting street level (y=0) to tunnel floor (y=-TUNNEL_DEPTH). */
export function buildTunnelRamp(theme: Theme, length = 6, descending = true): THREE.Group {
  const g = new THREE.Group();
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0x252530,
    roughness: 0.9,
  });
  const wallSideMat = new THREE.MeshStandardMaterial({
    color: darken(theme.ground, 0.25),
    roughness: 0.9,
    side: THREE.BackSide,
  });

  // Ramp surface — sloped plane
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH, 0.3, length), rampMat);
  // Tilt: descending = front higher than back (entering tunnel: front=street, back=deep)
  // For descending=true: positive z is forward direction (away from camera)
  // The ramp goes from y=0 at +length/2 to y=-TUNNEL_DEPTH at -length/2 (descending means going INTO tunnel)
  const angle = Math.atan2(TUNNEL_DEPTH, length);
  ramp.rotation.x = descending ? -angle : angle;
  ramp.position.y = -TUNNEL_DEPTH / 2;
  g.add(ramp);

  // Side walls along ramp — taper from y=0 height at street to wallH at tunnel level
  const wallH = 5.5;
  for (const sx of [-1, 1]) {
    const sideW = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, wallH, length),
      wallSideMat
    );
    sideW.position.set(sx * (TRACK_WIDTH / 2 + 0.2), wallH / 2 - TUNNEL_DEPTH / 2, 0);
    sideW.rotation.x = descending ? -angle * 0.5 : angle * 0.5;
    g.add(sideW);
  }

  return g;
}

function darken(hex: number, amount: number): number {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, -amount);
  return c.getHex();
}

let tagTexCache: THREE.Texture | null = null;
let signTexCache: THREE.Texture | null = null;
function make67TagTexture(asSign = false): THREE.Texture {
  if (!asSign && tagTexCache) return tagTexCache;
  if (asSign && signTexCache) return signTexCache;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = asSign ? 200 : 320;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  if (asSign) {
    ctx.fillStyle = "#ffd257";
    ctx.strokeStyle = "#2a1500";
    ctx.lineWidth = 8;
    ctx.font = "900 140px -apple-system, Inter, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("67 METRO", 256, 100);
    ctx.fillText("67 METRO", 256, 100);
  } else {
    ctx.save();
    ctx.translate(256, 160);
    ctx.rotate((Math.random() - 0.5) * 0.3);
    ctx.fillStyle = "#ff2e63";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 14;
    ctx.font = "900 260px -apple-system, Impact, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("67", 0, 0);
    ctx.fillText("67", 0, 0);
    ctx.fillStyle = "#ff2e63";
    ctx.fillRect(-60, 60, 8, 40);
    ctx.fillRect(70, 45, 6, 50);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (asSign) signTexCache = tex;
  else tagTexCache = tex;
  return tex;
}
