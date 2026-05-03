import * as THREE from "three";

/** Cache so we don't regenerate expensive canvas textures every frame. */
const cache = new Map<string, THREE.Texture>();

function getOrMake(key: string, build: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = build();
  cache.set(key, tex);
  return tex;
}

/** Clean cartoon-style asphalt — Oscar: "yollar çisili gibi gösteriyor".
 *  Cracks REMOVED, patches dialed way down, noise softened. The road
 *  reads as a smooth Subway Surfers strip instead of a cracked highway.
 *  Lane markings + 3D road studs are added separately in World.ts so the
 *  texture itself stays clean. */
export function makeAsphaltTexture(tint = 0x262833): THREE.Texture {
  return getOrMake(`asphalt-${tint}`, () => {
    const s = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const baseCol = new THREE.Color(tint);
    ctx.fillStyle = `rgb(${(baseCol.r * 255) | 0},${(baseCol.g * 255) | 0},${
      (baseCol.b * 255) | 0
    })`;
    ctx.fillRect(0, 0, s, s);
    // Soft grain only — no aggressive noise. ±12 instead of ±40.
    const id = ctx.getImageData(0, 0, s, s);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(id, 0, 0);
    // Few large soft patches — gives slight tone variation without
    // looking dirty/scratched.
    for (let i = 0; i < 12; i++) {
      const r = 200 + Math.random() * 200;
      const x = Math.random() * s;
      const y = Math.random() * s;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,0.12)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Cracks REMOVED — they were the "çisili" stripes Oscar called out.

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

/** Lush grass with scattered details */
export function makeGrassTexture(tint = 0x1e5a2a): THREE.Texture {
  return getOrMake(`grass-${tint}`, () => {
    const s = 512;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const col = new THREE.Color(tint);
    ctx.fillStyle = `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;
    ctx.fillRect(0, 0, s, s);
    // Scatter lighter blades
    for (let i = 0; i < 3000; i++) {
      const lighter = col.clone().offsetHSL(0, 0, 0.08 + Math.random() * 0.15);
      ctx.fillStyle = `rgb(${(lighter.r * 255) | 0},${(lighter.g * 255) | 0},${
        (lighter.b * 255) | 0
      })`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
    // Dark spots
    for (let i = 0; i < 800; i++) {
      const d = col.clone().offsetHSL(0, 0, -0.07);
      ctx.fillStyle = `rgb(${(d.r * 255) | 0},${(d.g * 255) | 0},${(d.b * 255) | 0})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
    // Occasional flowers
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? "#fff2b3" : "#ffb0c8";
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

/** Generates a sky gradient texture to use as scene background. */
export function makeSkyGradient(top: number, bottom: number): THREE.Texture {
  const key = `sky-${top}-${bottom}`;
  return getOrMake(key, () => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    const t = new THREE.Color(top);
    const b = new THREE.Color(bottom);
    g.addColorStop(
      0,
      `rgb(${(t.r * 255) | 0},${(t.g * 255) | 0},${(t.b * 255) | 0})`
    );
    g.addColorStop(
      1,
      `rgb(${(b.r * 255) | 0},${(b.g * 255) | 0},${(b.b * 255) | 0})`
    );
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}
