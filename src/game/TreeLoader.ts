import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSET_BASE } from "./AssetBase";

// Per-country species mapping. Themes without an entry fall back to USA oak.
// Tropical themes (brazil, uae, egypt) use palm — handled separately by
// the existing buildPalmTree / palm prop kind, NOT this loader.
const TREE_BY_THEME: Record<string, string> = {
  usa: "oak_usa",
  uk: "oak_usa",            // Same oak species reads fine for British plane streets
  france: "platane_france",
  italy: "cypress_italy",
  australia: "eucalyptus_aus",
  china: "willow_china",
  korea: "ginkgo_korea",
  turkey: "poplar_turkey",
  russia: "birch_russia",
};

const TARGET_HEIGHT = 4.0; // Sidewalk-scale tree height (~4m)
const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<THREE.Group | null>>();

/** Returns a clone of the GLB tree for this theme, or null if no GLB exists
 *  or the load failed. Caller should fall back to primitive on null. */
export async function loadTreeModel(themeId: string): Promise<THREE.Group | null> {
  const species = TREE_BY_THEME[themeId];
  if (!species) return null;
  if (cache.has(species)) return cache.get(species)!.clone(true);
  if (inflight.has(species)) {
    const r = await inflight.get(species)!;
    return r ? r.clone(true) : null;
  }
  const p = (async () => {
    try {
      const url = `${ASSET_BASE}/models/trees/${species}.glb?v=${__BUILD_VERSION__}`;
      const gltf = await loader.loadAsync(url);
      const m = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(m);
      const size = bbox.getSize(new THREE.Vector3());
      // Scale to TARGET_HEIGHT (uses Y axis = up)
      const scale = TARGET_HEIGHT / Math.max(0.001, size.y);
      m.scale.setScalar(scale);
      m.updateMatrixWorld(true);
      // Re-center XZ at origin, lift so feet rest on Y=0
      const sb = new THREE.Box3().setFromObject(m);
      m.position.x -= (sb.min.x + sb.max.x) / 2;
      m.position.z -= (sb.min.z + sb.max.z) / 2;
      m.position.y -= sb.min.y;
      m.traverse((c) => {
        const me = c as THREE.Mesh;
        if (me.isMesh) {
          me.castShadow = true;
          me.receiveShadow = true;
        }
      });
      const wrapper = new THREE.Group();
      wrapper.add(m);
      cache.set(species, wrapper);
      return wrapper;
    } catch (err) {
      console.warn(`Tree GLB load failed for ${species}:`, err);
      return null;
    }
  })();
  inflight.set(species, p);
  const r = await p;
  inflight.delete(species);
  return r ? r.clone(true) : null;
}

/** Bush GLBs — generic species used per theme cluster. Falls back to
 *  primitive bushCluster when GLB unavailable or theme not mapped. */
const BUSH_BY_THEME: Record<string, string> = {
  usa: "bush_usa",          // Meshy-generated NYC sidewalk shrub cluster
  uk: "bush_round",
  france: "bush_round",
  italy: "bush_round",
  japan: "bush_round",
  turkey: "bush_round",
  korea: "bush_round",
  china: "bush_round",
  uae: "shrub_desert",
  egypt: "shrub_desert",
  brazil: "fern_tropical",
  australia: "fern_tropical",
  russia: "bush_round",
};

const HEDGE_BY_THEME: Record<string, string> = {
  usa: "hedge_boxwood",
  uk: "hedge_boxwood",
  france: "hedge_boxwood",
  italy: "hedge_boxwood",
  japan: "hedge_boxwood",
  turkey: "hedge_boxwood",
  korea: "hedge_boxwood",
  china: "hedge_boxwood",
  uae: "hedge_boxwood",
  egypt: "hedge_boxwood",
  brazil: "hedge_boxwood",
  australia: "hedge_boxwood",
  russia: "hedge_boxwood",
};

const BUSH_HEIGHT = 1.0;
const HEDGE_HEIGHT = 1.0;
const bushCache = new Map<string, THREE.Group>();
const bushInflight = new Map<string, Promise<THREE.Group | null>>();

async function loadGlb(species: string, subdir: string, targetH: number): Promise<THREE.Group | null> {
  const key = `${subdir}/${species}`;
  if (bushCache.has(key)) return bushCache.get(key)!.clone(true);
  if (bushInflight.has(key)) {
    const r = await bushInflight.get(key)!;
    return r ? r.clone(true) : null;
  }
  const url = `${ASSET_BASE}/models/${subdir}/${species}.glb?v=${__BUILD_VERSION__}`;
  const p = (async () => {
    try {
      const gltf = await loader.loadAsync(url);
      const m = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(m);
      const size = bbox.getSize(new THREE.Vector3());
      const scale = targetH / Math.max(0.001, size.y);
      m.scale.setScalar(scale);
      m.updateMatrixWorld(true);
      const sb = new THREE.Box3().setFromObject(m);
      m.position.x -= (sb.min.x + sb.max.x) / 2;
      m.position.z -= (sb.min.z + sb.max.z) / 2;
      m.position.y -= sb.min.y;
      m.traverse((c) => {
        const me = c as THREE.Mesh;
        if (me.isMesh) {
          me.castShadow = true;
          me.receiveShadow = true;
        }
      });
      const wrapper = new THREE.Group();
      wrapper.add(m);
      bushCache.set(key, wrapper);
      return wrapper;
    } catch (err) {
      console.warn(`GLB load failed ${url}:`, err);
      return null;
    }
  })();
  bushInflight.set(key, p);
  const r = await p;
  bushInflight.delete(key);
  return r ? r.clone(true) : null;
}

export async function loadBushModel(themeId: string): Promise<THREE.Group | null> {
  const species = BUSH_BY_THEME[themeId];
  if (!species) return null;
  return loadGlb(species, "trees", BUSH_HEIGHT);
}

export async function loadHedgeModel(themeId: string): Promise<THREE.Group | null> {
  const species = HEDGE_BY_THEME[themeId];
  if (!species) return null;
  return loadGlb(species, "trees", HEDGE_HEIGHT);
}

/** 3D palm tree — loads /models/trees/palm_tropical.glb (Meshy-generated).
 *  Returns null on miss so caller falls back to primitive buildPalmTree. */
const PALM_HEIGHT = 4.5;
export async function loadPalmModel(themeId: string): Promise<THREE.Group | null> {
  // Same model for all tropical themes (brazil/uae/egypt/aus)
  return loadGlb("palm_tropical", "trees", PALM_HEIGHT);
}

/** 3D bamboo cluster — loads /models/trees/bamboo_brazil.glb. */
const BAMBOO_HEIGHT = 3.5;
export async function loadBambooModel(themeId: string): Promise<THREE.Group | null> {
  return loadGlb("bamboo_brazil", "trees", BAMBOO_HEIGHT);
}

// === Street furniture (lamp, bench, hydrant) — Meshy text-to-3D ===
// All currently NYC-flavored; reused across themes until per-theme variants
// land. Heights match the original primitive proportions.
const LAMP_HEIGHT = 3.2;
const BENCH_HEIGHT = 0.95;
const HYDRANT_HEIGHT = 0.9;

export async function loadLampModel(themeId: string): Promise<THREE.Group | null> {
  return loadGlb("lamp_nyc", "props", LAMP_HEIGHT);
}

export async function loadBenchModel(themeId: string): Promise<THREE.Group | null> {
  return loadGlb("bench_nyc", "props", BENCH_HEIGHT);
}

export async function loadHydrantModel(themeId: string): Promise<THREE.Group | null> {
  return loadGlb("hydrant_nyc", "props", HYDRANT_HEIGHT);
}

const PARIS_LAMP_HEIGHT = 3.6;
const LANTERN_HEIGHT = 2.4;
const BISTRO_HEIGHT = 2.6;

// Per-theme variants — Oscar wanted "her yerin kendine özgün şeyleri".
// Japan-style lantern was leaking into Turkey/China/Korea, French bistro
// was leaking into Italy/UK. Now each theme fetches its own GLB.
const PARIS_LAMP_BY_THEME: Record<string, string> = {
  france: "lamp_paris",
  uk: "lamp_uk",
};
const LANTERN_BY_THEME: Record<string, string> = {
  japan: "lantern_japan",
  china: "lantern_china",
  turkey: "lantern_turkey",
  korea: "lantern_korea",
};
const BISTRO_BY_THEME: Record<string, string> = {
  france: "bistro_france",
  italy: "bistro_italy",
};

export async function loadParisLampModel(themeId: string): Promise<THREE.Group | null> {
  const species = PARIS_LAMP_BY_THEME[themeId] ?? "lamp_paris";
  return loadGlb(species, "props", PARIS_LAMP_HEIGHT);
}

export async function loadLanternModel(themeId: string): Promise<THREE.Group | null> {
  const species = LANTERN_BY_THEME[themeId] ?? "lantern_japan";
  return loadGlb(species, "props", LANTERN_HEIGHT);
}

export async function loadBistroModel(themeId: string): Promise<THREE.Group | null> {
  const species = BISTRO_BY_THEME[themeId] ?? "bistro_france";
  return loadGlb(species, "props", BISTRO_HEIGHT);
}

// Single-theme primitives upgraded to 3D
const CHERRY_HEIGHT = 4.2;
const TORII_HEIGHT = 3.8;
const BEAR_HEIGHT = 2.0;
const SNOWMAN_HEIGHT = 1.4;
const SNOWPINE_HEIGHT = 4.0;
const FIREBARREL_HEIGHT = 1.4;
const OBELISK_HEIGHT = 4.5;

export async function loadCherryModel(): Promise<THREE.Group | null> {
  return loadGlb("cherry_japan", "props", CHERRY_HEIGHT);
}
export async function loadToriiModel(): Promise<THREE.Group | null> {
  return loadGlb("torii_japan", "props", TORII_HEIGHT);
}
export async function loadBearModel(): Promise<THREE.Group | null> {
  return loadGlb("bear_russia", "props", BEAR_HEIGHT);
}
export async function loadSnowmanModel(): Promise<THREE.Group | null> {
  return loadGlb("snowman_russia", "props", SNOWMAN_HEIGHT);
}
export async function loadSnowpineModel(): Promise<THREE.Group | null> {
  return loadGlb("snowpine_russia", "props", SNOWPINE_HEIGHT);
}
export async function loadFirebarrelModel(): Promise<THREE.Group | null> {
  return loadGlb("firebarrel_russia", "props", FIREBARREL_HEIGHT);
}
export async function loadObeliskModel(): Promise<THREE.Group | null> {
  return loadGlb("obelisk_egypt", "props", OBELISK_HEIGHT);
}
