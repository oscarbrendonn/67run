import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSET_BASE } from "./AssetBase";

/**
 * Loads themed bridge GLBs (Meshy-generated) lazily, caches them, returns a
 * fresh clone for placement. /models/bridges/{themeId}.glb. Falls back to null
 * if the GLB isn't available — caller keeps its primitive.
 *
 * Bridges scale to a fixed height (so all themed bridges have the same
 * road-clearance) and are wide enough to span the road + canals.
 */

const TARGET_HEIGHT = 6.4;     // total bridge height (matches primitive Bridge.ts)
const MAX_WIDTH = 24;          // span across road + canals + a little extra
const MIN_CLEARANCE = 4.5;     // arch bottom must clear by at least this

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<THREE.Group | null>>();

export async function loadBridgeModel(themeId: string): Promise<THREE.Group | null> {
  if (cache.has(themeId)) return cloneAndPrep(cache.get(themeId)!);
  if (inflight.has(themeId)) {
    const r = await inflight.get(themeId)!;
    return r ? cloneAndPrep(r) : null;
  }
  const url = `${ASSET_BASE}/models/bridges/${themeId}.glb?v=${__BUILD_VERSION__}`;
  const p = (async (): Promise<THREE.Group | null> => {
    try {
      const gltf = await loader.loadAsync(url);
      const m = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(m);
      const size = bbox.getSize(new THREE.Vector3());
      let scale = TARGET_HEIGHT / Math.max(0.001, size.y);
      const widthAfter = size.x * scale;
      if (widthAfter < MAX_WIDTH * 0.7) {
        // Too narrow — scale up so it spans the road
        scale = (MAX_WIDTH * 0.85) / Math.max(0.001, size.x);
      } else if (widthAfter > MAX_WIDTH) {
        scale *= MAX_WIDTH / widthAfter;
      }
      m.scale.setScalar(scale);
      m.updateMatrixWorld(true);
      const sb = new THREE.Box3().setFromObject(m);
      m.position.x -= (sb.min.x + sb.max.x) / 2;
      m.position.z -= (sb.min.z + sb.max.z) / 2;
      // Position so bridge bottom sits on ground (y=0) — but we need MIN_CLEARANCE
      // under the arch. Shift up if needed so player can pass through.
      m.position.y -= sb.min.y;
      m.traverse((c) => {
        const me = c as THREE.Mesh;
        if (me.isMesh) {
          me.receiveShadow = true;
          // Don't cast shadows on the road — would be very dark
          me.castShadow = false;
        }
      });
      const wrapper = new THREE.Group();
      wrapper.add(m);
      cache.set(themeId, wrapper);
      void MIN_CLEARANCE;
      return wrapper;
    } catch {
      return null;
    }
  })();
  inflight.set(themeId, p);
  const r = await p;
  inflight.delete(themeId);
  return r ? cloneAndPrep(r) : null;
}

function cloneAndPrep(template: THREE.Group): THREE.Group {
  return template.clone(true);
}
