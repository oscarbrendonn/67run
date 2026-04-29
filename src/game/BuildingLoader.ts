import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSET_BASE } from "./AssetBase";

/**
 * Loads themed 3D building GLBs (Meshy-generated) lazily, caches them, and
 * returns a clone for placement in the scene. If a GLB doesn't exist (404)
 * or fails to load, returns null and the caller falls back to its primitive
 * version.
 *
 * Naming: /models/buildings/{theme}_{type}.glb
 *  e.g. usa_brownstone.glb, france_haussmann.glb, japan_neonshop.glb
 */

// Per-kind target HEIGHT — buildings are scaled to this for consistency.
// Meshy outputs come in arbitrary sizes; we normalize.
//
// Front-row TALL_BUILDINGS entries all set to ≥14m so even on the side
// closest to the camera, the building top covers the sky behind it (no
// sky-leak above short building). Back-row variants stay shorter for
// visual variety peeking through.
const TARGET_HEIGHT: Record<string, number> = {
  // USA — all bumped to ≥14m for TALL list eligibility
  usa_brownstone: 14,
  usa_skyscraper: 32,
  usa_deco: 28,
  usa_warehouse: 14,            // bumped 9 → 14
  usa_townhouse: 15,
  usa_diner: 5,
  // BRAZIL
  brazil_favela: 14,            // bumped 10 → 14
  brazil_beachhotel: 16,
  brazil_sambaschool: 7,
  brazil_church: 20,
  brazil_villa: 14,             // bumped 9 → 14
  brazil_museum: 15,
  // FRANCE
  france_haussmann: 16,
  france_cafe: 14,              // bumped 9 → 14
  france_boulangerie: 14,       // bumped 8 → 14
  france_townhouse: 16,
  france_church: 24,
  france_brasserie: 14,         // bumped 9 → 14
  // JAPAN
  japan_neonshop: 16,
  japan_woodenshop: 14,         // bumped 8 → 14
  japan_apartment: 18,
  japan_pagoda: 17,
  japan_station: 14,            // bumped 10 → 14
  japan_school: 14,
  // TURKEY
  turkey_ottoman: 14,           // bumped 10 → 14
  turkey_mosque: 16,
  turkey_bazaar: 14,            // bumped 9 → 14
  turkey_tower: 19,
  turkey_villa: 14,             // bumped 10 → 14
  turkey_han: 14,
  // UK
  uk_victorian: 14,
  uk_georgian: 14,
  uk_pub: 14,                   // bumped 8 → 14
  uk_tower: 17,
  uk_phonebox_kiosk: 4,
  uk_tubestation: 14,           // bumped 9 → 14
  // RUSSIA — 6 variants
  russia_stalinist: 18,         // bumped 16 → 18
  russia_oniondome: 17,         // bumped 15 → 17
  russia_dacha: 6,
  russia_palace: 16,            // bumped 14 → 16
  russia_khrushchyovka: 15,     // bumped 13 → 15
  russia_metro: 6,
  // UAE
  uae_glasstower: 28,
  uae_sandstone: 14,
  uae_souk: 14,                 // bumped 9 → 14
  uae_grandmosque: 16,
  uae_villa: 14,                // bumped 10 → 14
  uae_market: 7,
  // EGYPT — 6 variants
  egypt_apartment: 15,          // bumped 12 → 15
  egypt_mosque: 15,             // bumped 13 → 15
  egypt_steppyramid: 8,
  egypt_temple: 14,             // bumped 11 → 14
  egypt_market: 6,
  egypt_tower: 20,              // bumped 18 → 20
};

// Max width/depth so a single building doesn't span multiple slot lanes
const MAX_WIDTH = 7.5;
const MAX_DEPTH = 5.5;

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<THREE.Group | null>>();

/** Fetch a building GLB, return a fresh clone (or null if unavailable). */
export async function loadBuildingModel(name: string): Promise<THREE.Group | null> {
  if (cache.has(name)) return cloneAndPrep(cache.get(name)!);
  if (inflight.has(name)) {
    const r = await inflight.get(name)!;
    return r ? cloneAndPrep(r) : null;
  }
  const url = `${ASSET_BASE}/models/buildings/${name}.glb?v=${__BUILD_VERSION__}`;
  const p = (async (): Promise<THREE.Group | null> => {
    try {
      const gltf = await loader.loadAsync(url);
      const m = gltf.scene;
      // Normalize scale by HEIGHT, then cap by width/depth
      const bbox = new THREE.Box3().setFromObject(m);
      const size = bbox.getSize(new THREE.Vector3());
      const targetH = TARGET_HEIGHT[name] ?? 10;
      let scale = targetH / Math.max(0.001, size.y);
      const widthAfter = size.x * scale;
      if (widthAfter > MAX_WIDTH) scale *= MAX_WIDTH / widthAfter;
      const depthAfter = size.z * scale;
      if (depthAfter > MAX_DEPTH) scale *= MAX_DEPTH / depthAfter;
      m.scale.setScalar(scale);
      m.updateMatrixWorld(true);
      // Center on x/z, sit on y=0
      const sb = new THREE.Box3().setFromObject(m);
      m.position.x -= (sb.min.x + sb.max.x) / 2;
      m.position.z -= (sb.min.z + sb.max.z) / 2;
      m.position.y -= sb.min.y;
      // Shadow flags — only big meshes cast (perf)
      m.traverse((c) => {
        const me = c as THREE.Mesh;
        if (me.isMesh) {
          me.receiveShadow = true;
          // Cast shadow only if it's a large mesh
          const g = me.geometry as THREE.BufferGeometry;
          g.computeBoundingBox?.();
          const bb = g.boundingBox;
          if (bb) {
            const s = bb.getSize(new THREE.Vector3());
            me.castShadow = s.y * scale > 1.5; // only tall pieces cast
          }
        }
      });
      const wrapper = new THREE.Group();
      wrapper.add(m);
      cache.set(name, wrapper);
      return wrapper;
    } catch (err) {
      // 404 or load failure — fall back to primitive silently
      return null;
    }
  })();
  inflight.set(name, p);
  const r = await p;
  inflight.delete(name);
  return r ? cloneAndPrep(r) : null;
}

function cloneAndPrep(template: THREE.Group): THREE.Group {
  const g = template.clone(true);
  // Per-instance variation — same model never appears identically twice.
  // Rotation: ±25° around vertical axis (was ±10°, too subtle)
  g.rotation.y += (Math.random() - 0.5) * 0.9;
  // Wider uniform scale: 78–122% so two adjacent same-models look notably
  // different (was 88–112%, repetition was still visible).
  const sx = 0.78 + Math.random() * 0.44;
  const sy = 0.85 + Math.random() * 0.34;
  const sz = 0.78 + Math.random() * 0.44;
  // 50% chance to mirror on X — flips left/right asymmetric features so
  // even same model with same scale doesn't look identical.
  if (Math.random() < 0.5) {
    g.scale.set(-sx, sy, sz);
  } else {
    g.scale.set(sx, sy, sz);
  }
  return g;
}

/** Eagerly preload buildings for a theme so they're ready when player arrives. */
export function preloadThemeBuildings(themeId: string): void {
  const list = THEME_BUILDINGS[themeId];
  if (!list) return;
  for (const name of list) {
    if (!cache.has(name) && !inflight.has(name)) {
      // Fire-and-forget — caches when done
      loadBuildingModel(name);
    }
  }
}

/** Per-theme building names — ONLY models that actually exist on disk.
 *  Updated after re-generation pipeline brought back 5 missing entries. */
export const THEME_BUILDINGS: Record<string, string[]> = {
  usa: ["usa_brownstone", "usa_skyscraper", "usa_deco", "usa_warehouse", "usa_townhouse"],
  brazil: ["brazil_favela", "brazil_sambaschool", "brazil_church", "brazil_villa", "brazil_museum"],
  france: ["france_haussmann", "france_boulangerie", "france_church", "france_townhouse", "france_brasserie"],
  japan: ["japan_neonshop", "japan_woodenshop", "japan_pagoda", "japan_station", "japan_school"],
  turkey: ["turkey_mosque", "turkey_tower", "turkey_villa", "turkey_han", "turkey_bazaar", "turkey_ottoman"],
  uk: ["uk_victorian", "uk_georgian", "uk_pub", "uk_tower", "uk_tubestation"],
  russia: ["russia_stalinist", "russia_oniondome", "russia_dacha", "russia_palace", "russia_khrushchyovka", "russia_metro"],
  uae: ["uae_glasstower", "uae_souk", "uae_grandmosque", "uae_villa"],
  egypt: ["egypt_apartment", "egypt_mosque", "egypt_steppyramid", "egypt_temple", "egypt_tower"],
};

/** TALL building variants — used for FRONT-row slots. Same filter as
 *  THEME_BUILDINGS — only existing GLBs. */
const TALL_BUILDINGS: Record<string, string[]> = {
  usa: ["usa_brownstone", "usa_skyscraper", "usa_deco", "usa_townhouse", "usa_warehouse"],
  brazil: ["brazil_church", "brazil_museum", "brazil_favela", "brazil_villa"],
  france: ["france_haussmann", "france_church", "france_boulangerie", "france_townhouse", "france_brasserie"],
  japan: ["japan_neonshop", "japan_pagoda", "japan_school", "japan_station", "japan_woodenshop"],
  turkey: ["turkey_mosque", "turkey_tower", "turkey_han", "turkey_villa", "turkey_bazaar", "turkey_ottoman"],
  uk: ["uk_victorian", "uk_georgian", "uk_tower", "uk_pub", "uk_tubestation"],
  russia: ["russia_stalinist", "russia_oniondome", "russia_palace", "russia_khrushchyovka"],
  uae: ["uae_glasstower", "uae_grandmosque", "uae_villa", "uae_souk"],
  egypt: ["egypt_apartment", "egypt_mosque", "egypt_temple", "egypt_tower"],
};

/** Murmur3 finalizer — proper avalanche so adjacent slots scatter to all
 *  parts of the modulo space. The previous (slot * Knuth_constant + Y)
 *  hash had a period-4 collapse: every 4th slot mapped to the same
 *  type, so the same building repeated every 28m on the same side. */
function hash32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

/** Pick a building model name for a theme + slot (deterministic per slot).
 *  When `frontRow` is true, picks ONLY from the TALL list so the building
 *  blocks the sky behind it — prevents the "black void above a short
 *  building" issue. Back-row slots can pick from the full mix. */
export function pickBuildingModel(
  themeId: string,
  slot: number,
  frontRow = false
): string | null {
  const list = frontRow
    ? TALL_BUILDINGS[themeId] ?? THEME_BUILDINGS[themeId]
    : THEME_BUILDINGS[themeId];
  if (!list || list.length === 0) return null;
  return list[hash32(slot) % list.length];
}
