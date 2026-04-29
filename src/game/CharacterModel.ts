import * as THREE from "three";
import { assets, cloneSkinned } from "./AssetLoader";

export const ROBOT_URL =
  "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";

export type CharacterKind = "mav" | "chaser";

export interface LoadedCharacter {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  setState: (state: "run" | "jump" | "slide" | "idle" | "die") => void;
}

/**
 * Loads the Three.js RobotExpressive rig (CC0) and returns a controllable character.
 * Optionally tints meshes to match our Mav/Chaser palette.
 */
export async function loadCharacter(kind: CharacterKind): Promise<LoadedCharacter> {
  const base = await assets.load(ROBOT_URL);
  const { scene, animations } = cloneSkinned(base);

  // RobotExpressive has internal scale=100 groups so bbox is unreliable.
  // Use a known-good scale and face camera direction.
  scene.scale.setScalar(0.42);
  scene.rotation.y = Math.PI;

  const root = new THREE.Group();
  root.add(scene);

  if (kind === "mav") {
    tintMav(scene);
  } else {
    tintChaser(scene);
  }

  const mixer = new THREE.AnimationMixer(scene);
  const actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of animations) {
    actions[clip.name] = mixer.clipAction(clip);
  }

  // Available clips on RobotExpressive:
  // Idle, Walking, Running, Dance, Death, Sitting, Standing,
  // No, Yes, Wave, Punch, ThumbsUp, Jump
  // We use: Running (default), Jump, Death, Idle
  const fade = (to: THREE.AnimationAction, duration = 0.2) => {
    for (const a of Object.values(actions)) {
      if (a === to) continue;
      if (a.isRunning()) a.fadeOut(duration);
    }
    to.reset().fadeIn(duration).play();
  };

  let current: string = "Running";
  const setState: LoadedCharacter["setState"] = (state) => {
    let target: THREE.AnimationAction | undefined;
    switch (state) {
      case "run":
        target = actions["Running"] ?? actions["Walking"];
        if (current === "run") return;
        current = "run";
        break;
      case "jump":
        target = actions["Jump"];
        if (current === "jump") return;
        current = "jump";
        break;
      case "slide":
        // No native slide — use Death or Sitting briefly, but simpler: slow down running
        target = actions["Running"] ?? actions["Walking"];
        if (target) target.setEffectiveTimeScale(0.4);
        current = "slide";
        break;
      case "idle":
        target = actions["Idle"] ?? actions["Standing"];
        current = "idle";
        break;
      case "die":
        target = actions["Death"] ?? actions["Idle"];
        current = "die";
        break;
    }
    if (target) {
      if (state === "run") target.setEffectiveTimeScale(1.4);
      fade(target, 0.18);
    }
  };

  // Start running by default
  setState("run");

  return { root, mixer, actions, setState };
}

function tintMav(scene: THREE.Object3D) {
  scene.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = (m.material as THREE.MeshStandardMaterial).clone();
    // Warm up (more cream, less plastic)
    mat.color = mat.color.clone();
    mat.color.offsetHSL(0.05, -0.1, 0.15);
    mat.metalness = Math.min(0.2, (mat.metalness ?? 0) * 0.3);
    mat.roughness = Math.max(0.6, (mat.roughness ?? 0.5));
    m.material = mat;
  });
}

function tintChaser(scene: THREE.Object3D) {
  scene.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = (m.material as THREE.MeshStandardMaterial).clone();
    // Red-black menacing
    mat.color = new THREE.Color(0x7a0d1f).lerp(mat.color.clone(), 0.25);
    mat.emissive = new THREE.Color(0x220808);
    mat.emissiveIntensity = 0.4;
    mat.metalness = 0.4;
    mat.roughness = 0.45;
    m.material = mat;
  });
}
