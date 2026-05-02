import * as THREE from "three";
import {
  animateRun,
  buildCharacter,
  CharacterRig,
  poseIdle,
  poseJump,
  poseSlide,
} from "./Character";
import { buildFlyingCar, setCarFlying } from "./FlyingCar";
import { MavGLB } from "./MavGLB";

export const LANE_X = [-1.85, 0, 1.85];
export const FLY_DISTANCE_M = 100;
export const FLY_HEIGHT = 3.2;

export class Player {
  laneIndex = 1;
  targetX = 0;
  y = 0;
  vy = 0;
  state: "run" | "jump" | "slide" | "fly" = "run";
  slideTimer = 0;
  alive = true;
  rig: CharacterRig;
  root: THREE.Group;
  private runT = 0;
  // Fly state
  flyDistanceRemaining = 0;
  /** Vertical offset added by tunnel descent — separate from jump physics */
  tunnelOffset = 0;
  private car: THREE.Group | null = null;
  // GLB Mav (loaded async — replaces primitive when ready)
  private mavGLB: MavGLB | null = null;

  /** Promise that resolves once the Mav GLB + animations are loaded.
   *  Game.assetsReady awaits this so TAP TO RUN doesn't fire before
   *  the 3D character is on-screen. */
  mavReady(): Promise<void> {
    return this.mavGLB?.ready() ?? Promise.resolve();
  }

  constructor(scene: THREE.Scene) {
    this.rig = buildCharacter({
      skin: 0xf7caa5,
      hair: 0xe6c27a,
      hairStyle: "messy",
      shirt: 0xf4f1ea,
      shirtLogo: "67",
      pants: 0x253050,
      shoes: 0xffffff,
      mouth: "open",
      eyes: 0x171717,
      brows: 0x3a2810,
      photoFace: true, // Use actual Mav photo as face
    });
    this.root = this.rig.root;
    // Hide ALL primitive Mav parts (body + head + both arms + both legs)
    // from the start. Earlier I only hid body+head — arms and legs were
    // still visible, so player saw the primitive limbs sticking out
    // around the GLB Mav. That's the "old Mav" Oscar kept seeing.
    const setPrimVisible = (v: boolean) => {
      if (this.rig.body) this.rig.body.visible = v;
      if (this.rig.head) this.rig.head.visible = v;
      if (this.rig.leftArm) this.rig.leftArm.visible = v;
      if (this.rig.rightArm) this.rig.rightArm.visible = v;
      if (this.rig.leftLeg) this.rig.leftLeg.visible = v;
      if (this.rig.rightLeg) this.rig.rightLeg.visible = v;
    };
    setPrimVisible(false);
    scene.add(this.root);

    this.mavGLB = new MavGLB(scene);
    this.mavGLB.onLoaded(() => {
      const p = this.root.position;
      this.mavGLB!.root.position.set(p.x, p.y, p.z);
    });
    // No primitive failsafe: assetsReady (in Game.init) preloads the Mav
    // GLB and TAP TO RUN waits for it, so the GLB is always ready by the
    // time the player starts running. Showing the primitive after 4s
    // caused the "two Mavs overlapping" bug Oscar saw — primitive was
    // revealed but never re-hidden when the late GLB finally loaded.
  }

  reset() {
    this.laneIndex = 1;
    this.targetX = 0;
    this.y = 0;
    this.vy = 0;
    this.state = "run";
    this.slideTimer = 0;
    this.alive = true;
    this.runT = 0;
    this.flyDistanceRemaining = 0;
    if (this.car) {
      this.root.remove(this.car);
      this.car = null;
    }
    this.root.position.set(0, 0, 0);
    this.root.rotation.set(0, 0, 0);
    this.root.scale.setScalar(1);
    poseIdle(this.rig);
    this.mavGLB?.setState("run");
  }

  /** Enter fly mode — spawn car under Mav, elevate him. */
  startFly() {
    this.state = "fly";
    this.flyDistanceRemaining = FLY_DISTANCE_M;
    if (!this.car) {
      this.car = buildFlyingCar();
      this.car.scale.setScalar(0.65);
      // Position car under player (relative to player's root)
      this.car.position.set(0, -0.3, 0);
      setCarFlying(this.car, true);
      this.root.add(this.car);
    }
  }

  /** Drop from fly mode back to ground. */
  endFly() {
    this.state = "run";
    this.flyDistanceRemaining = 0;
    if (this.car) {
      this.root.remove(this.car);
      this.car = null;
    }
    this.y = 0;
    this.vy = 0;
    poseIdle(this.rig);
  }

  moveLeft() {
    if (!this.alive) return;
    this.laneIndex = Math.max(0, this.laneIndex - 1);
    this.targetX = LANE_X[this.laneIndex];
  }

  moveRight() {
    if (!this.alive) return;
    this.laneIndex = Math.min(2, this.laneIndex + 1);
    this.targetX = LANE_X[this.laneIndex];
  }

  jump() {
    if (!this.alive) return;
    if (this.state === "fly") return; // no jump during flight
    if (this.state === "run" || this.state === "slide") {
      // Higher initial velocity + gravity = snappier jump (~0.65s air time)
      this.vy = 11.5;
      this.state = "jump";
      this.slideTimer = 0;
      poseJump(this.rig);
      this.mavGLB?.setState("jump");
    }
  }

  slide() {
    if (!this.alive) return;
    if (this.state === "fly") return;
    if (this.state === "run") {
      this.state = "slide";
      // Tight Subway-style slide (~0.4s)
      this.slideTimer = 0.4;
      poseSlide(this.rig);
      this.mavGLB?.setState("slide");
    } else if (this.state === "jump") {
      this.vy = -10;
    }
  }

  update(dt: number, runSpeed: number) {
    const cur = this.root.position.x;
    const next = cur + (this.targetX - cur) * Math.min(1, dt * 14);
    this.root.position.x = next;

    if (this.state === "jump") {
      this.y += this.vy * dt;
      // Stronger gravity = snappier landing
      this.vy -= 32 * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.state = "run";
        this.mavGLB?.setState("run");
      }
    }

    if (this.state === "slide") {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.state = "run";
        poseIdle(this.rig);
        this.mavGLB?.setState("run");
      }
    }

    if (this.state === "fly") {
      // Lerp up to FLY_HEIGHT + hover wiggle
      const targetY = FLY_HEIGHT + Math.sin(performance.now() * 0.005) * 0.15;
      this.y += (targetY - this.y) * Math.min(1, dt * 4);
      // Decrease remaining distance
      this.flyDistanceRemaining -= runSpeed * dt;
      if (this.flyDistanceRemaining <= 0) this.endFly();
    }

    this.root.position.y = this.y;

    // Sync GLB Mav transform with root + tick mixer
    if (this.mavGLB && this.mavGLB.loaded) {
      const p = this.root.position;
      this.mavGLB.root.position.set(p.x, p.y, p.z);
      this.mavGLB.root.rotation.set(this.root.rotation.x, this.root.rotation.y, this.root.rotation.z);
      // Slide squash effect on GLB too
      this.mavGLB.root.scale.set(1, this.root.scale.y, 1);
      this.mavGLB.update(dt * (this.state === "slide" ? 1 : 1 + runSpeed * 0.02));
    }

    if (this.state === "slide") {
      this.root.scale.y = 0.55;
    } else {
      this.root.scale.y += (1 - this.root.scale.y) * Math.min(1, dt * 14);
    }

    const lean = (this.targetX - this.root.position.x) * 0.25;
    this.root.rotation.z += (lean - this.root.rotation.z) * Math.min(1, dt * 10);

    if (this.state === "run") {
      this.runT += dt * 1000;
      animateRun(this.rig, this.runT, 1 + runSpeed * 0.04);
    } else if (this.state === "fly") {
      // Freeze run animation, hold pose (knees slightly bent like riding)
      this.rig.leftLeg.rotation.x = 0.2;
      this.rig.rightLeg.rotation.x = 0.2;
      this.rig.leftArm.rotation.x = 0;
      this.rig.rightArm.rotation.x = 0;
    }

  }

  isInvincible(): boolean {
    return this.state === "fly";
  }

  getBox(): { minX: number; maxX: number; minY: number; maxY: number } {
    const x = this.root.position.x;
    const y = this.y;
    const w = 0.55;
    let h = 2.0;
    let minY = y;
    if (this.state === "slide") {
      // Sliding low: short hitbox, just feet area
      h = 0.85;
    } else if (this.state === "jump") {
      // Jumping: only count lower body for collision (head clears low obstacles).
      // Feet at y, body extends only ~1.2 up — generous obstacle clearance.
      h = 1.2;
    }
    return { minX: x - w / 2, maxX: x + w / 2, minY, maxY: minY + h };
  }

  die() {
    this.alive = false;
    this.root.rotation.z = 0.4;
    this.root.rotation.x = -0.2;
    this.mavGLB?.setState("dead");
  }

  resetAnim() {
    this.mavGLB?.setState("run");
  }
}
