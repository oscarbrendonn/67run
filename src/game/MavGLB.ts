import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSET_BASE } from "./AssetBase";

export type MavState = "idle" | "run" | "jump" | "slide" | "dead";

const V = `?v=${__BUILD_VERSION__}`;
const MODEL_BASE = `${ASSET_BASE}/models/mav-final-rigged.glb${V}`;
const ANIMATIONS: Record<Exclude<MavState, "idle">, string> = {
  run:   `${ASSET_BASE}/models/mav-final-running.glb${V}`,
  jump:  `${ASSET_BASE}/models/mav-final-jump.glb${V}`,
  slide: `${ASSET_BASE}/models/mav-final-slide.glb${V}`,
  dead:  `${ASSET_BASE}/models/mav-final-dead.glb${V}`,
};
const IDLE_FILE = `${ASSET_BASE}/models/mav-final-idle.glb${V}`;

/**
 * MavGLB — wraps Meshy-generated rigged Mav model with multiple animations.
 * Uses one base mesh + AnimationMixer to crossfade between clips.
 *
 * Each animation GLB has its own mesh+rig, but bone names are identical
 * (since they all come from the same rig task). We extract just the clip
 * from each and bind it to the base mesh.
 */
export class MavGLB {
  root: THREE.Group;
  scene: THREE.Scene;
  loaded = false;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<MavState, THREE.AnimationAction>> = {};
  private currentState: MavState | null = null;
  private onLoadedCallbacks: Array<() => void> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.loadAll();
  }

  onLoaded(cb: () => void) {
    if (this.loaded) cb();
    else this.onLoadedCallbacks.push(cb);
  }

  /** Returns a Promise that resolves once the Mav GLB + all animations
   *  are cached. Game.assetsReady awaits this so TAP TO RUN doesn't fire
   *  while the player would still be a primitive rig. */
  ready(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    return new Promise((resolve) => this.onLoadedCallbacks.push(() => resolve()));
  }

  private async loadAll() {
    const loader = new GLTFLoader();
    const loadGLB = (url: string): Promise<{ scene: THREE.Group; clip?: THREE.AnimationClip }> =>
      new Promise((resolve, reject) =>
        loader.load(
          url,
          (g) =>
            resolve({
              scene: g.scene,
              clip: g.animations[0],
            }),
          undefined,
          reject
        )
      );

    try {
      // Load base + all animations in parallel
      const [base, runG, jumpG, slideG, deadG, idleG] = await Promise.all([
        loadGLB(MODEL_BASE),
        loadGLB(ANIMATIONS.run),
        loadGLB(ANIMATIONS.jump),
        loadGLB(ANIMATIONS.slide),
        loadGLB(ANIMATIONS.dead),
        loadGLB(IDLE_FILE),
      ]);

      // Use base mesh, attach to root + scale to ~2 units tall
      const model = base.scene;
      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      const targetHeight = 2.05;
      const scale = targetHeight / size.y;
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);
      const sb = new THREE.Box3().setFromObject(model);
      model.position.y -= sb.min.y;
      // Face down the track (-z direction)
      model.rotation.y = Math.PI;
      model.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          m.frustumCulled = false; // don't disappear when off-camera (skinned mesh issue)
        }
      });
      this.root.add(model);

      // Build mixer + actions on the base mesh
      this.mixer = new THREE.AnimationMixer(model);

      // Try to bind each anim's clip to OUR base. Bone names match because same rig task.
      // Strip root translation tracks — keeps character anchored in place,
      // only the bone rotations animate. Prevents animations like Roll_Dodge
      // from launching the character forward.
      const stripRootMotion = (clip: THREE.AnimationClip): THREE.AnimationClip => {
        const filtered = clip.clone();
        filtered.tracks = filtered.tracks.filter((t) => !t.name.endsWith(".position"));
        return filtered;
      };

      const tryBind = (
        state: MavState,
        clip: THREE.AnimationClip | undefined,
        opts: {
          loop?: THREE.AnimationActionLoopStyles;
          timeScale?: number;
          clamp?: boolean;
          stripMotion?: boolean;
        } = {}
      ) => {
        if (!clip) return;
        const finalClip = opts.stripMotion ? stripRootMotion(clip) : clip;
        const action = this.mixer!.clipAction(finalClip);
        action.setLoop(opts.loop ?? THREE.LoopRepeat, Infinity);
        if (opts.timeScale) action.timeScale = opts.timeScale;
        action.clampWhenFinished = opts.clamp ?? false;
        this.actions[state] = action;
      };

      // All animations strip root motion — game logic handles position.
      // Character stays anchored, only bones animate.
      tryBind("run", runG.clip, { loop: THREE.LoopRepeat, stripMotion: true });
      tryBind("jump", jumpG.clip, { loop: THREE.LoopOnce, clamp: true, timeScale: 2.2, stripMotion: true });
      tryBind("slide", slideG.clip, { loop: THREE.LoopOnce, clamp: true, timeScale: 3.6, stripMotion: true });
      tryBind("dead", deadG.clip, { loop: THREE.LoopOnce, clamp: true, timeScale: 1.2, stripMotion: true });
      tryBind("idle", idleG.clip, { loop: THREE.LoopRepeat, stripMotion: true });

      this.loaded = true;
      // Default: run
      this.setState("run");
      for (const cb of this.onLoadedCallbacks) cb();
      this.onLoadedCallbacks.length = 0;
    } catch (err) {
      console.warn("MavGLB load failed:", err);
    }
  }

  setState(state: MavState, fadeDuration = 0.05) {
    if (!this.loaded || !this.mixer) return;
    if (this.currentState === state) return;
    const target = this.actions[state];
    if (!target) return;
    // Fade out current, fade in target
    for (const [s, a] of Object.entries(this.actions)) {
      if (s === state) continue;
      if (a && a.isRunning()) a.fadeOut(fadeDuration);
    }
    target.reset();
    target.fadeIn(fadeDuration);
    target.play();
    this.currentState = state;
  }

  update(dt: number) {
    if (this.mixer) this.mixer.update(dt);
  }

  setVisible(v: boolean) {
    this.root.visible = v;
  }

  position() {
    return this.root.position;
  }

  rotation() {
    return this.root.rotation;
  }
}
