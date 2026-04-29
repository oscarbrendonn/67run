import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const TARGET_HEIGHT = 6;
const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<THREE.Group | null>>();

export async function loadFlagModel(themeId: string): Promise<THREE.Group | null> {
  if (cache.has(themeId)) {
    const tpl = cache.get(themeId)!;
    return tpl.clone(true);
  }
  if (inflight.has(themeId)) {
    const r = await inflight.get(themeId)!;
    return r ? r.clone(true) : null;
  }
  const p = (async () => {
    try {
      const gltf = await loader.loadAsync(`/models/flags/${themeId}.glb?v=${__BUILD_VERSION__}`);
      const m = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(m);
      const size = bbox.getSize(new THREE.Vector3());
      const scale = TARGET_HEIGHT / Math.max(0.001, size.y);
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
      cache.set(themeId, wrapper);
      return wrapper;
    } catch (err) {
      console.warn(`Flag GLB load failed for ${themeId}:`, err);
      return null;
    }
  })();
  inflight.set(themeId, p);
  const r = await p;
  inflight.delete(themeId);
  return r ? r.clone(true) : null;
}
