import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSET_BASE } from "./AssetBase";

/**
 * GUTS supermoto — 67 Mav's signature bike (Meshy v5 multi-view).
 * Frame is monolithic in the GLB, so we don't try to find named wheel
 * meshes — instead we attach two procedural wheel discs at the
 * bbox-detected wheel positions and rotate them every frame.
 */

const TARGET_HEIGHT = 1.6;
const loader = new GLTFLoader();
type Template = { wrapper: THREE.Group; frontWheel: THREE.Group; backWheel: THREE.Group };
let cachedTemplate: Template | null = null;
let inflight: Promise<Template | null> | null = null;

export interface BikeRig {
  root: THREE.Group;
  body: THREE.Object3D;
  frontWheel: THREE.Group;
  backWheel: THREE.Group;
}

/** Build one procedural wheel — black tire + silver rim + 6 spokes.
 *  Designed to spin around its X axis (lateral). */
function buildWheel(radius: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.22, 12, 28),
    new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.85 })
  );
  tire.rotation.y = Math.PI / 2;
  g.add(tire);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, radius * 0.18, 18),
    new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.35, metalness: 0.85 })
  );
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  // Spokes (6) — visible motion when rotating
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.05, radius * 1.2, radius * 0.05),
      new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.5, metalness: 0.7 })
    );
    sp.rotation.z = (i / 6) * Math.PI * 2;
    g.add(sp);
  }
  // Center hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, radius * 0.32, 12),
    new THREE.MeshStandardMaterial({ color: 0x232830, roughness: 0.3, metalness: 0.9 })
  );
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

/** Public: load (or clone-from-cache) the bike. Returns BikeRig with
 *  wheel handles so the caller can rotate them every frame. */
export async function loadBike(): Promise<BikeRig | null> {
  if (cachedTemplate) return cloneRig(cachedTemplate);
  if (inflight) {
    const t = await inflight;
    return t ? cloneRig(t) : null;
  }
  inflight = (async () => {
    try {
      const url = `${ASSET_BASE}/models/bike/mav-bike.glb?v=${__BUILD_VERSION__}`;
      const gltf = await loader.loadAsync(url);
      const body = gltf.scene;
      // Normalize scale + center
      const bbox = new THREE.Box3().setFromObject(body);
      const size = bbox.getSize(new THREE.Vector3());
      const scale = TARGET_HEIGHT / Math.max(0.001, size.y);
      body.scale.setScalar(scale);
      body.updateMatrixWorld(true);
      const sb = new THREE.Box3().setFromObject(body);
      body.position.x -= (sb.min.x + sb.max.x) / 2;
      body.position.z -= (sb.min.z + sb.max.z) / 2;
      body.position.y -= sb.min.y;
      body.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });

      // Build wrapper that holds bike body + 2 procedural wheels.
      // Wheel positions: bbox front-most & back-most along Z, just below center Y.
      const finalBox = new THREE.Box3().setFromObject(body);
      const fSize = finalBox.getSize(new THREE.Vector3());
      const wheelRadius = fSize.y * 0.32;
      const wheelY = wheelRadius;

      const frontWheel = buildWheel(wheelRadius);
      frontWheel.position.set(0, wheelY, finalBox.max.z * 0.85);
      const backWheel = buildWheel(wheelRadius);
      backWheel.position.set(0, wheelY, finalBox.min.z * 0.85);

      const wrapper = new THREE.Group();
      wrapper.add(body);
      wrapper.add(frontWheel);
      wrapper.add(backWheel);

      cachedTemplate = { wrapper, frontWheel, backWheel };
      return cachedTemplate;
    } catch (err) {
      console.warn("Bike GLB load failed:", err);
      return null;
    }
  })();
  const t = await inflight;
  inflight = null;
  return t ? cloneRig(t) : null;
}

function cloneRig(t: { wrapper: THREE.Group; frontWheel: THREE.Group; backWheel: THREE.Group }): BikeRig {
  const root = t.wrapper.clone(true);
  // Find the cloned wheels — they preserve order
  const body = root.children[0];
  const frontWheel = root.children[1] as THREE.Group;
  const backWheel = root.children[2] as THREE.Group;
  return { root, body, frontWheel, backWheel };
}

/** Spin both wheels by `angle` radians (called per-frame from update). */
export function spinWheels(rig: BikeRig, angle: number) {
  rig.frontWheel.rotation.x += angle;
  rig.backWheel.rotation.x += angle;
}
