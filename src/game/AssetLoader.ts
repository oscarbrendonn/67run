import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export class AssetLoader {
  private gltf = new GLTFLoader();
  private cache = new Map<string, Promise<LoadedModel>>();

  load(url: string): Promise<LoadedModel> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    const p = new Promise<LoadedModel>((resolve, reject) => {
      this.gltf.load(
        url,
        (g) => {
          g.scene.traverse((c) => {
            const m = c as THREE.Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
            }
          });
          resolve({ scene: g.scene, animations: g.animations });
        },
        undefined,
        (err) => reject(err)
      );
    });
    this.cache.set(url, p);
    return p;
  }
}

export const assets = new AssetLoader();

/** Clones a loaded model's scene along with skeleton for independent playback. */
export function cloneSkinned(model: LoadedModel): {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
} {
  const scene = cloneSkeleton(model.scene);
  return { scene, animations: model.animations };
}

// Minimal SkeletonUtils.clone replacement to avoid extra import
function cloneSkeleton(source: THREE.Object3D): THREE.Group {
  const sourceLookup = new Map<THREE.Object3D, THREE.Object3D>();
  const cloneLookup = new Map<THREE.Object3D, THREE.Object3D>();

  const clone = source.clone(true);

  parallelTraverse(source, clone, (a, b) => {
    sourceLookup.set(b, a);
    cloneLookup.set(a, b);
  });

  clone.traverse((node) => {
    if (!(node as THREE.SkinnedMesh).isSkinnedMesh) return;
    const skinned = node as THREE.SkinnedMesh;
    const sourceNode = sourceLookup.get(skinned) as THREE.SkinnedMesh;
    const sourceBones = sourceNode.skeleton.bones;

    skinned.skeleton = sourceNode.skeleton.clone();
    skinned.bindMatrix.copy(sourceNode.bindMatrix);
    skinned.skeleton.bones = sourceBones.map(
      (b) => cloneLookup.get(b) as THREE.Bone
    );
    skinned.bind(skinned.skeleton, skinned.bindMatrix);
  });

  return clone as THREE.Group;
}

function parallelTraverse(
  a: THREE.Object3D,
  b: THREE.Object3D,
  cb: (a: THREE.Object3D, b: THREE.Object3D) => void
) {
  cb(a, b);
  for (let i = 0; i < a.children.length; i++) {
    parallelTraverse(a.children[i], b.children[i], cb);
  }
}
