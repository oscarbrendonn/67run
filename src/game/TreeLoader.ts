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
  usa: "bush_round",
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
