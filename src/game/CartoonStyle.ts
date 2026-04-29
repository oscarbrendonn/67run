import * as THREE from "three";

/**
 * Cell-shaded "anime" look for Meshy-generated GLBs.
 *
 * Subway Surfers (and most stylized mobile runners) avoid full PBR — they
 * use flat, painted-looking materials with sharp light/shadow steps. Our
 * Meshy models ship with realistic PBR (baseColor + roughness + metallic +
 * normal), which made them feel "too 3D" / sculpted. Swapping to
 * MeshToonMaterial with a 3-step gradient gets the saturated, cartoon
 * appearance Oscar asked for.
 *
 * The gradient is a tiny 4×1 canvas with hard color stops so dot(N,L) gets
 * quantized into discrete bands — that's what gives the cel-shaded look.
 */

const TOON_GRADIENT: THREE.Texture = (() => {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 1;
  const ctx = c.getContext("2d")!;
  // 3 hard bands: deep shadow, midtone, highlight (4th = full bright)
  ctx.fillStyle = "#3a3a3a"; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = "#a0a0a0"; ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = "#dcdcdc"; ctx.fillRect(2, 0, 1, 1);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(3, 0, 1, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
})();

/**
 * Walk every mesh in the group and replace its (PBR) material with a
 * flat-shaded toon material, preserving the original color + diffuse
 * texture. Roughness / metallic / normal maps are dropped — those are what
 * make a model read as "realistic" rather than "cartoon".
 */
export function applyCartoonShading(group: THREE.Group): void {
  group.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    const olds = Array.isArray(m.material) ? m.material : [m.material];
    const news = olds.map((old) => toToonMaterial(old as THREE.MeshStandardMaterial));
    m.material = Array.isArray(m.material) ? news : news[0];
  });
}

function toToonMaterial(old: THREE.MeshStandardMaterial): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color: old.color ? old.color.clone() : new THREE.Color(0xffffff),
    map: old.map ?? null,
    gradientMap: TOON_GRADIENT,
    transparent: !!old.transparent,
    opacity: old.opacity ?? 1,
    side: old.side,
    alphaTest: old.alphaTest ?? 0,
    emissive: old.emissive ? old.emissive.clone() : new THREE.Color(0x000000),
    emissiveMap: old.emissiveMap ?? null,
    emissiveIntensity: old.emissiveIntensity ?? 1,
  });
  return mat;
}
