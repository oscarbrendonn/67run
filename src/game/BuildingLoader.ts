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
  usa_townhouse: 16,
  usa_diner: 5,
  // BRAZIL
  brazil_favela: 18,            // bumped 10 → 14
  brazil_beachhotel: 30,
  brazil_sambaschool: 7,
  brazil_church: 34,
  brazil_villa: 18,             // bumped 9 → 14
  brazil_museum: 28,
  // FRANCE
  france_haussmann: 22,
  france_cafe: 14,              // bumped 9 → 14
  france_boulangerie: 14,       // bumped 8 → 14
  france_townhouse: 22,
  france_church: 32,
  france_brasserie: 14,         // bumped 9 → 14
  // JAPAN
  japan_neonshop: 24,
  japan_woodenshop: 14,         // bumped 8 → 14
  japan_apartment: 26,
  japan_pagoda: 25,
  japan_station: 14,            // bumped 10 → 14
  japan_school: 14,
  // TURKEY
  turkey_ottoman: 18,           // bumped 10 → 14
  turkey_mosque: 24,
  turkey_bazaar: 14,            // bumped 9 → 14
  turkey_tower: 26,
  turkey_villa: 14,             // bumped 10 → 14
  turkey_han: 16,
  // UK
  uk_victorian: 18,
  uk_georgian: 18,
  uk_pub: 14,                   // bumped 8 → 14
  uk_tower: 26,
  uk_phonebox_kiosk: 4,
  uk_tubestation: 14,           // bumped 9 → 14
  // RUSSIA — 6 variants
  russia_stalinist: 28,         // bumped 16 → 18
  russia_oniondome: 25,         // bumped 15 → 17
  russia_dacha: 6,
  russia_palace: 24,            // bumped 14 → 16
  russia_khrushchyovka: 18,     // bumped 13 → 15
  russia_metro: 6,
  // UAE
  uae_glasstower: 34,
  uae_sandstone: 14,
  uae_souk: 14,                 // bumped 9 → 14
  uae_grandmosque: 24,
  uae_villa: 14,                // bumped 10 → 14
  uae_market: 7,
  // EGYPT — 6 variants
  egypt_apartment: 18,          // bumped 12 → 15
  egypt_mosque: 24,             // bumped 13 → 15
  egypt_steppyramid: 8,
  egypt_temple: 22,             // bumped 11 → 14
  egypt_market: 6,
  egypt_tower: 28,              // bumped 18 → 20
  // ITALY — Roma palazzo / basilica / villa
  italy_palazzo: 22,
  italy_basilica: 30,
  italy_villa: 14,
  italy_townhouse: 16,
  italy_trattoria: 8,
  // AUSTRALIA — Sydney harbour buildings
  australia_harbor: 14,
  australia_glasstower: 32,
  australia_terracehouse: 12,
  australia_warehouse: 10,
  australia_lighthouse: 22,
  // CHINA — Shanghai / Beijing palette
  china_pagoda: 24,
  china_skyscraper: 38,
  china_temple: 18,
  china_lanternshop: 8,
  china_apartment: 22,
  // KOREA — Seoul mix
  korea_hanok: 8,
  korea_apartment: 22,
  korea_kpopstore: 10,
  korea_palace: 16,
  korea_skyscraper: 36,
};

// Max width/depth so a single building doesn't span multiple slot lanes
const MAX_WIDTH = 7.5;
const MAX_DEPTH = 5.5;

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<THREE.Group | null>>();

/** Per-theme tint palette — applied to building meshes whose material is
 *  near-white/cream (likely the GLB shipped with neutral facade). Picks
 *  a deterministic-looking color per clone so a row doesn't read as one
 *  big white wall. Brazil only for now (Oscar: "şu beyaz binadan çok
 *  fazla var … koyu renkler farklı olsun").
 *  Each entry is a saturated-but-NOT-bright Rio favela / colonial palette. */
const THEME_TINT: Record<string, number[]> = {
  brazil: [
    0x8a3f3f, // koyu kırmızı (favela)
    0x3a6a8a, // muted mavi
    0x6a8a3a, // koyu yeşil-zeytin
    0x8a6a3f, // hardal
    0x6a3f8a, // mor
    0x3a8a8a, // turkuaz
    0xa05a3f, // terracotta
    0x4a4a8a, // indigo
  ],
};

/** Fetch a building GLB, return a fresh clone (or null if unavailable). */
export async function loadBuildingModel(name: string): Promise<THREE.Group | null> {
  if (cache.has(name)) return cloneAndPrep(cache.get(name)!, name);
  if (inflight.has(name)) {
    const r = await inflight.get(name)!;
    return r ? cloneAndPrep(r, name) : null;
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
  return r ? cloneAndPrep(r, name) : null;
}

function cloneAndPrep(template: THREE.Group, name?: string): THREE.Group {
  const g = template.clone(true);
  // Per-instance variation — same model never appears identically twice.
  g.rotation.y += (Math.random() - 0.5) * 0.9;
  const sx = 0.78 + Math.random() * 0.44;
  const sy = 0.85 + Math.random() * 0.34;
  const sz = 0.78 + Math.random() * 0.44;
  if (Math.random() < 0.5) {
    g.scale.set(-sx, sy, sz);
  } else {
    g.scale.set(sx, sy, sz);
  }
  // Theme-tint pass: ONLY ~half the clones get tinted (Oscar: "bazılarını
  // renkli yapabilirsin … çok da renkli yapma"). The other half keep the
  // original cream/white facade so the row reads as a varied mixed-style
  // street, not a uniformly recolored row.
  if (name && Math.random() < 0.55) {
    const themeId = name.split("_")[0];
    const palette = THEME_TINT[themeId];
    if (palette) {
      const tint = palette[Math.floor(Math.random() * palette.length)];
      const tintColor = new THREE.Color(tint);
      g.traverse((c) => {
        const me = c as THREE.Mesh;
        if (!me.isMesh) return;
        const mats = Array.isArray(me.material) ? me.material : [me.material];
        const newMats = mats.map((mat) => {
          const m = mat as THREE.MeshStandardMaterial;
          if (!m || !m.color) return mat;
          // Only retint near-white / cream surfaces (luminance > ~0.62).
          // Leaves dark/colored details (roofs, doors, windows) untouched.
          const lum = (m.color.r + m.color.g + m.color.b) / 3;
          if (lum < 0.62) return mat;
          const cloned = m.clone();
          cloned.color.copy(tintColor);
          return cloned;
        });
        me.material = Array.isArray(me.material) ? newMats : newMats[0];
      });
    }
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
  // New countries — GLB pipelines pending. Listed names match the names
  // the Meshy script will produce; loadBuildingModel returns null until
  // the GLBs land, so the primitive ThemeBuildings.buildGeneric fills in.
  italy: ["italy_palazzo", "italy_basilica", "italy_villa", "italy_townhouse", "italy_trattoria"],
  australia: ["australia_harbor", "australia_glasstower", "australia_terracehouse", "australia_warehouse", "australia_lighthouse"],
  china: ["china_pagoda", "china_skyscraper", "china_temple", "china_lanternshop", "china_apartment"],
  korea: ["korea_hanok", "korea_apartment", "korea_kpopstore", "korea_palace", "korea_skyscraper"],
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
  italy: ["italy_palazzo", "italy_basilica", "italy_villa"],
  australia: ["australia_glasstower", "australia_lighthouse", "australia_harbor"],
  china: ["china_skyscraper", "china_pagoda", "china_temple"],
  korea: ["korea_skyscraper", "korea_palace", "korea_apartment"],
};

/** BACK-row sky-blocker: a single tallest-per-theme GLB used as a uniform
 *  rear wall. Same model in every back-row slot guarantees the horizon is
 *  fully covered (no sky leaks between varied shorter buildings).
 *  cloneAndPrep still applies ±25° rotation, ±22% scale and 50% X-mirror,
 *  so the wall doesn't look pasted-from-a-stamp. */
const BACK_ROW_BUILDING: Record<string, string> = {
  usa: "usa_skyscraper",        // 32m — Manhattan glass tower
  brazil: "brazil_church",      // 34m — colonial church spire
  france: "france_church",      // 32m — gothic cathedral
  japan: "japan_apartment",     // 26m — danchi block (or fall back to neonshop 24m)
  turkey: "turkey_tower",       // 26m — Istanbul Galata-style tower
  uk: "uk_tower",               // 26m — gothic clock tower
  russia: "russia_stalinist",   // 28m — wedding-cake apartment block
  uae: "uae_glasstower",        // 34m — Dubai sky-scraper
  egypt: "egypt_tower",         // 28m — modern Cairo tower
  italy: "italy_basilica",      // 30m — Roman basilica
  australia: "australia_glasstower", // 32m — Sydney glass tower
  china: "china_skyscraper",    // 38m — Shanghai Pudong skyscraper
  korea: "korea_skyscraper",    // 36m — Seoul Lotte / Trade Tower
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
 *  rowTier 0 = FRONT (tall list, blocks sky directly above curb)
 *  rowTier 1 = MID   (full theme mix, peeks between front + back)
 *  rowTier 2 = BACK  (single tallest-per-theme GLB, uniform sky-blocking wall)
 *
 *  Front + mid pick deterministically from a list via Murmur3 hash. Back
 *  always returns the same name per theme — `cloneAndPrep` still randomizes
 *  rotation/scale/mirror so the wall doesn't look identical-pasted. */
export function pickBuildingModel(
  themeId: string,
  slot: number,
  rowTier: 0 | 1 | 2 = 1
): string | null {
  if (rowTier === 2) {
    return BACK_ROW_BUILDING[themeId] ?? null;
  }
  const list =
    rowTier === 0
      ? TALL_BUILDINGS[themeId] ?? THEME_BUILDINGS[themeId]
      : THEME_BUILDINGS[themeId];
  if (!list || list.length === 0) return null;
  return list[hash32(slot) % list.length];
}
