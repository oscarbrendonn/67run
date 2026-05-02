import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSET_BASE } from "./AssetBase";

/**
 * Loads themed landmark GLBs (Meshy-generated) lazily — one per country.
 * Statue of Liberty, Christ the Redeemer, Eiffel Tower, etc.
 *
 * Naming: /models/landmarks/{themeId}_{kind}.glb
 *  e.g. usa_liberty.glb, brazil_christ.glb, france_eiffel.glb
 *
 * If a GLB doesn't exist (404) or fails to load, returns null and the
 * caller falls back to its primitive version from `Landmarks.ts`.
 */

// Per-kind target HEIGHT — landmarks are dramatic, much taller than buildings
const TARGET_HEIGHT: Record<string, number> = {
  usa_liberty: 32,
  brazil_christ: 30,
  france_eiffel: 50,
  japan_pagoda: 35,
  turkey_hagia: 32,
  uk_bigben: 40,
  russia_basil: 30,
  uae_burj: 60,
  egypt_pyramids: 28,
  italy_colosseum: 26,
  australia_opera: 22,
  china_pearl: 50,
  korea_seoultower: 38,
};

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<THREE.Group | null>>();

/** Map landmark kind enum (from Themes.ts) to GLB filename. */
function landmarkFile(themeId: string, kind: string): string {
  // kind: "liberty" | "christ" | "eiffel" | ... → "{theme}_{kind}"
  return `${themeId}_${kind}`;
}

export async function loadLandmarkModel(
  themeId: string,
  kind: string
): Promise<THREE.Group | null> {
  const name = landmarkFile(themeId, kind);
  if (cache.has(name)) return cloneAndPrep(cache.get(name)!);
  if (inflight.has(name)) {
    const r = await inflight.get(name)!;
    return r ? cloneAndPrep(r) : null;
  }
  const url = `${ASSET_BASE}/models/landmarks/${name}.glb?v=${__BUILD_VERSION__}`;
  const p = (async (): Promise<THREE.Group | null> => {
    try {
      const gltf = await loader.loadAsync(url);
      const m = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(m);
      const size = bbox.getSize(new THREE.Vector3());
      const targetH = TARGET_HEIGHT[name] ?? 30;
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
      cache.set(name, wrapper);
      return wrapper;
    } catch {
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
  // Slight per-instance rotation so when the same landmark spawns multiple
  // times in a country segment, each looks slightly different.
  g.rotation.y += (Math.random() - 0.5) * 0.4;
  return g;
}

export function preloadLandmark(themeId: string, kind: string): void {
  const name = landmarkFile(themeId, kind);
  if (!cache.has(name) && !inflight.has(name)) {
    loadLandmarkModel(themeId, kind);
  }
}
