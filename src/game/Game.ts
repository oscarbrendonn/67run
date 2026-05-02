import * as THREE from "three";
import {
  BloomEffect,
  BrightnessContrastEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  KernelSize,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  VignetteEffect,
} from "postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { preloadThemeBuildings } from "./BuildingLoader";
import { Chaser } from "./Chaser";
import { Horizon } from "./Horizon";
import { preloadLandmark } from "./LandmarkLoader";
import { preloadThemeObstacles } from "./ObstacleLoader";
import { Input } from "./Input";
import { Particles } from "./Particles";
import { Player } from "./Player";
import { SkyDome } from "./SkyDome";
import { SpeedLines } from "./SpeedLines";
import { THEMES, blendThemes, type Theme } from "./Themes";
import { UI } from "./UI";
import { Weather } from "./Weather";
import { World } from "./World";

type Phase = "menu" | "playing" | "dying" | "gameover";

// Each country segment is shorter now (was 750m) so the player passes
// through all 9 themes without having to grind a single one for too long.
const SEGMENT_DISTANCE = 400;
const LANDMARK_SPACING = 85;

export class Game {
  private canvas: HTMLCanvasElement;
  private ui: UI;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private input = new Input();

  private world!: World;
  private player!: Player;
  private chaser!: Chaser;
  private particles!: Particles;
  private weather!: Weather;
  private speedLines!: SpeedLines;
  private horizon!: Horizon;
  private skyDome!: SkyDome;
  private dustAccum = 0;
  private shakeT = 0;
  private shakeMagnitude = 0;

  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private rim!: THREE.DirectionalLight;

  private phase: Phase = "menu";
  private lastT = 0;

  /** Sky / fog / light color crossfade between countries.
   *  Logical theme switches immediately (so spawns + UI use new theme), but
   *  the visible color palette interpolates over a few seconds so the road
   *  feels like it's gradually entering the new country. */
  private themeBlend = {
    active: false,
    t: 0,
    duration: 3.0,
    from: null as Theme | null,
    to: null as Theme | null,
  };

  private runSpeed = 14;
  private chaseFactor = 0;
  private distance = 0;
  private coins = 0;
  private score = 0;
  private dyingT = 0;
  private level = 1;
  private themeIndex = 0;
  private nextLandmarkZ = 0;
  /** Resolves once the initial theme's GLBs are cached. main.ts awaits
   *  this before calling start() so the player lands in 3D, not in a
   *  primitive scene that swaps to 3D over the first few seconds. */
  assetsReady: Promise<void> = Promise.resolve();

  constructor(canvas: HTMLCanvasElement, ui: UI) {
    this.canvas = canvas;
    this.ui = ui;
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    // Pixel ratio capped at 1.0 — was 1.5 which means 2.25x GPU load on retina.
    // Visual quality difference is barely perceptible at game speed but the
    // FPS gain is significant on mobile + integrated GPUs.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    // Parse ?theme=X up-front so we can preload that country's GLBs while
    // the user is still on the start screen — by the time they hit PLAY,
    // building + Mav GLBs are cached. Without this, theme URLs always
    // showed primitives for the first 5-10 seconds while GLBs downloaded.
    const urlParams = new URLSearchParams(window.location.search);
    const urlTheme = urlParams.get("theme");
    const initialIdx = urlTheme
      ? Math.max(0, THEMES.findIndex((t) => t.id === urlTheme))
      : 0;
    const initial = THEMES[initialIdx];
    // CRITICAL: keep themeIndex in sync so checkThemeSwitch doesn't try
    // to "switch back" to THEMES[0] thinking we're still there. Without
    // this, ?theme=italy started visually as Rome but the index thought
    // it was NYC, causing weird state when crossing 400m segments.
    this.themeIndex = initialIdx;
    this.scene.background = new THREE.Color(initial.sky);
    this.scene.fog = new THREE.Fog(initial.fog, initial.fogNear, initial.fogFar);

    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    this.camera.position.set(0, 5.5, 8);
    this.camera.lookAt(0, 1.5, -8);

    this.setupLights(initial);
    this.setupEnvironment();
    this.setupPostProcessing();

    this.world = new World(this.scene, initial);
    // Preload all road textures in background so theme switches are instant (no lag)
    this.world.preloadAllRoads();
    this.player = new Player(this.scene);
    this.chaser = new Chaser(this.scene);
    // Now that Player exists (and started fetching its Mav GLB), build the
    // assetsReady promise. main.ts awaits this before calling start(), so
    // the player lands in a fully 3D scene with the 3D Mav already on
    // screen — no primitive flash, no "two Mavs overlapping" double-render.
    this.assetsReady = Promise.all([
      preloadThemeBuildings(initial.id),
      preloadThemeObstacles(initial.id),
      preloadLandmark(initial.id, initial.landmark),
      this.player.mavReady(),
    ]).then(() => undefined);
    this.particles = new Particles(this.scene);
    this.weather = new Weather(this.scene);
    this.speedLines = new SpeedLines(this.scene);
    this.horizon = new Horizon(initial);
    this.horizon.addTo(this.scene);
    // Atmospheric sky dome — per-country mood (sunset, night, overcast, etc.)
    this.skyDome = new SkyDome(initial);
    this.skyDome.addTo(this.scene);

    // ONE landmark per country (Oscar: "bina gibi çok koyman saçma olur"):
    // Single hero monument — Statue of Liberty / Christ / Eiffel / etc. —
    // placed ahead and to the side so the player runs PAST it once.
    this.nextLandmarkZ = -90;
    this.world.spawnLandmark(initial, this.nextLandmarkZ, -1);
    this.nextLandmarkZ = -10000; // disable further landmark spawns until next theme
    // Welcome-gate flag pair so the player can SEE which country they're in.
    this.world.spawnFlagPair(initial, -70);

    this.input.on((e) => {
      if (this.phase !== "playing") return;
      if (e.type === "left") this.player.moveLeft();
      else if (e.type === "right") this.player.moveRight();
      else if (e.type === "jump") this.player.jump();
      else if (e.type === "slide") this.player.slide();
    });

    window.addEventListener("resize", () => this.onResize());
    this.world.spawnAhead(0);

    this.ui.setLevel(1);
    this.ui.setCity(initial);

    this.lastT = performance.now();
    requestAnimationFrame(this.loop);
  }

  private setupLights(theme: Theme) {
    this.hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, 0.8);
    this.scene.add(this.hemi);

    // Lower-resolution shadow map — 512×512 instead of 1024×1024 = 4x less
    // shadow rendering cost per frame. Soft PCF still smooths the edges so
    // the visual difference is small but the FPS gain is large.
    this.sun = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
    this.sun.position.set(12, 22, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(512, 512);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 60;
    this.sun.shadow.camera.left = -14;
    this.sun.shadow.camera.right = 14;
    this.sun.shadow.camera.top = 16;
    this.sun.shadow.camera.bottom = -14;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun);

    this.rim = new THREE.DirectionalLight(theme.neonB, 0.65);
    this.rim.position.set(-6, 4, 10);
    this.scene.add(this.rim);

    // Fill light from front (3-point lighting) — softens shadows on Mav's face
    const fill = new THREE.DirectionalLight(0xfffbf0, 0.35);
    fill.position.set(0, 5, 12);
    this.scene.add(fill);
  }

  private setupEnvironment() {
    // PMREM environment — gives all PBR materials proper IBL reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envScene = new RoomEnvironment();
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    this.scene.environment = envMap;
    pmrem.dispose();
  }

  private setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloom = new BloomEffect({
      intensity: 0.45,                  // a touch softer than before
      luminanceThreshold: 0.75,
      luminanceSmoothing: 0.28,
      kernelSize: KernelSize.LARGE,
      mipmapBlur: true,
    });

    const vignette = new VignetteEffect({
      darkness: 0.28,                   // softer corner darkening
      offset: 0.30,
    });

    // Subway-Surfers vibrancy — more saturated colors so primitives + GLBs
    // read as a stylized cartoon, not flat realism. Slight contrast bump.
    const hueSat = new HueSaturationEffect({ saturation: 0.32 });
    const bc = new BrightnessContrastEffect({ contrast: 0.12, brightness: 0.04 });
    const smaa = new SMAAEffect({ preset: SMAAPreset.MEDIUM });

    this.composer.addPass(new EffectPass(this.camera, bloom, hueSat, bc, vignette, smaa));
  }

  start() {
    this.phase = "playing";
    this.runSpeed = 14;
    this.chaseFactor = 0;
    // URL param: ?theme=russia or ?dist=2000 to skip ahead for testing
    const params = new URLSearchParams(window.location.search);
    let startTheme = 0;
    let startDist = 0;
    const themeParam = params.get("theme");
    if (themeParam) {
      const idx = THEMES.findIndex((t) => t.id === themeParam);
      if (idx >= 0) {
        startTheme = idx;
        startDist = idx * SEGMENT_DISTANCE + 50;
      }
    }
    const distParam = params.get("dist");
    if (distParam) {
      const d = parseFloat(distParam);
      if (!isNaN(d)) {
        startDist = d;
        startTheme = Math.floor(d / SEGMENT_DISTANCE) % THEMES.length;
      }
    }
    this.distance = startDist;
    this.coins = 0;
    this.score = 0;
    this.dyingT = 0;
    this.level = Math.max(1, 1 + Math.floor(startDist / 250));
    this.themeIndex = startTheme;
    this.applyTheme(THEMES[startTheme], true);
    this.nextLandmarkZ = -60;
    this.player.reset();
    this.chaser.reset();
    // Make chaser visible again on retry (was hidden in onHit during death)
    this.chaser.rig.root.visible = true;
    this.world.reset();
    this.particles.clear();
    this.speedLines.clear();
    this.shakeT = 0;
    // ONE landmark for the country we just started (matches init() logic).
    const startThemeObj = THEMES[startTheme];
    this.nextLandmarkZ = -90;
    this.world.spawnLandmark(startThemeObj, this.nextLandmarkZ, -1);
    this.nextLandmarkZ = -10000;
    this.world.spawnFlagPair(startThemeObj, -70);
    this.world.spawnAhead(0);
    this.ui.setScore(0);
    this.ui.setCoins(0);
    this.ui.setDistance(0);
    this.ui.setLevel(1);
    this.ui.setCity(startThemeObj);
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private applyTheme(theme: Theme, instant = false) {
    // Logical state switches immediately — spawn rules, UI, weather use the
    // new theme right away.
    this.world.setTheme(theme);
    if (this.horizon) this.horizon.setTheme(theme);
    if (this.skyDome) this.skyDome.setTheme(theme);
    // Per-country REAL-world weather cliché:
    //  Russia (Moscow)  → snow   (sert kış, ikonik)
    //  Japan  (Tokyo)   → rain   (yağışlı, neon-gece klişesi)
    //  UK     (London)  → drizzle (klasik İngiliz çisintisi)
    //  Others           → clear (parlak gündüz)
    const weatherByTheme: Record<string, "snow" | "rain" | "drizzle" | "off"> = {
      russia: "snow",
      japan: "rain",
      uk: "drizzle",
      // China = Shanghai monsoon-style rain (urban evening downpour)
      china: "rain",
      // Italy/Australia/Korea = clear days; can adjust later if needed
    };
    this.weather.setMode(weatherByTheme[theme.id] ?? "off");
    if (!instant) this.ui.showCityBanner(theme);
    this.ui.setCity(theme);

    if (instant) {
      // Snap palette to target — used at game start / restart.
      (this.scene.background as THREE.Color).setHex(theme.sky);
      (this.scene.fog as THREE.Fog).color.setHex(theme.fog);
      (this.scene.fog as THREE.Fog).near = theme.fogNear;
      (this.scene.fog as THREE.Fog).far = theme.fogFar;
      this.hemi.color.setHex(theme.hemiSky);
      this.hemi.groundColor.setHex(theme.hemiGround);
      this.sun.color.setHex(theme.sunColor);
      this.sun.intensity = theme.sunIntensity;
      this.rim.color.setHex(theme.neonB);
      this.themeBlend.from = theme;
      this.themeBlend.to = theme;
      this.themeBlend.t = 1;
      this.themeBlend.active = false;
      return;
    }

    // Capture current palette state as the blend start. If a previous blend
    // is mid-flight we still anchor on whatever colors are currently visible.
    const currentPalette: Theme = this.themeBlend.to
      ? this.snapshotCurrentPalette(this.themeBlend.to)
      : theme;
    this.themeBlend.from = currentPalette;
    this.themeBlend.to = theme;
    this.themeBlend.t = 0;
    this.themeBlend.active = true;
  }

  /** Build a Theme-shaped snapshot from the actual scene state right now,
   *  so a mid-flight blend handoff doesn't snap. */
  private snapshotCurrentPalette(fallback: Theme): Theme {
    return {
      ...fallback,
      sky: (this.scene.background as THREE.Color).getHex(),
      fog: (this.scene.fog as THREE.Fog).color.getHex(),
      fogNear: (this.scene.fog as THREE.Fog).near,
      fogFar: (this.scene.fog as THREE.Fog).far,
      hemiSky: this.hemi.color.getHex(),
      hemiGround: this.hemi.groundColor.getHex(),
      sunColor: this.sun.color.getHex(),
      sunIntensity: this.sun.intensity,
      neonB: this.rim.color.getHex(),
    };
  }

  private updateThemeBlend(dt: number) {
    if (!this.themeBlend.active) return;
    this.themeBlend.t = Math.min(
      1,
      this.themeBlend.t + dt / this.themeBlend.duration
    );
    const b = blendThemes(this.themeBlend.from!, this.themeBlend.to!, this.themeBlend.t);
    (this.scene.background as THREE.Color).setHex(b.sky);
    (this.scene.fog as THREE.Fog).color.setHex(b.fog);
    (this.scene.fog as THREE.Fog).near = b.fogNear;
    (this.scene.fog as THREE.Fog).far = b.fogFar;
    this.hemi.color.setHex(b.hemiSky);
    this.hemi.groundColor.setHex(b.hemiGround);
    this.sun.color.setHex(b.sunColor);
    this.sun.intensity = b.sunIntensity;
    this.rim.color.setHex(b.neonB);
    if (this.themeBlend.t >= 1) this.themeBlend.active = false;
  }

  private checkLevelUp() {
    // Internal speed tier still ramps every 250m — but the UI for it was
    // removed (Oscar: "level yazmasına gerek yok zaten hızlanıyo").
    const newLevel = 1 + Math.floor(this.distance / 250);
    if (newLevel > this.level) {
      this.level = newLevel;
    }
  }

  private checkThemeSwitch() {
    // Switch theme every SEGMENT_DISTANCE
    const target = Math.floor(this.distance / SEGMENT_DISTANCE) % THEMES.length;
    if (target !== this.themeIndex) {
      this.themeIndex = target;
      this.applyTheme(THEMES[target]);
      // ONE landmark for the new country, far ahead, off to one side.
      this.nextLandmarkZ = -130;
      this.world.spawnLandmark(THEMES[target], this.nextLandmarkZ, -1);
      this.nextLandmarkZ = -10000;
      // Welcome-gate: flag pair at ~70m ahead so the player runs THROUGH
      // the flags as they enter the new country. (Flags removed from
      // periodic props — Oscar: "sadece ülkeye girerken olacak.")
      this.world.spawnFlagPair(THEMES[target], -70);
    }
  }

  private maybeSpawnLandmark() {
    // Disabled: one landmark per country only. checkThemeSwitch() handles
    // the single placement; this method intentionally no-ops now.
    // (Periodic spawn was making the road feel like a monument parade.)
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;

    if (this.phase === "playing") this.step(dt);
    else if (this.phase === "dying") this.dyingStep(dt);
    else {
      this.player.update(dt * 0.4, 0);
      this.chaser.update(dt * 0.4, 0, this.chaser.rig.root.position.z, 0);
    }

    this.composer.render(dt);
    requestAnimationFrame(this.loop);
  };

  private step(dt: number) {
    // Speed tiers — ramps with level
    const target = 14 + this.level * 2.2;
    this.runSpeed = Math.min(38, this.runSpeed + dt * 0.35);
    this.runSpeed = Math.min(this.runSpeed, target);
    this.chaseFactor = Math.min(1, this.chaseFactor + dt * 0.015);

    const dz = this.runSpeed * dt;
    this.distance += dz;
    this.score += dz * 0.7;

    // Move landmark spawn tracker
    this.nextLandmarkZ += dz;

    this.world.scroll(dz, 0);
    this.world.spawnAhead(0);
    this.maybeSpawnLandmark();

    this.player.update(dt, this.runSpeed);
    // Tunnel underground descent — apply Y offset on top of player.y
    const tunnelOffset = this.world.getTunnelOffset();
    if (tunnelOffset !== 0 || this.player.tunnelOffset !== 0) {
      // Smoothly lerp toward target (avoid abrupt jumps when entering)
      const cur = this.player.tunnelOffset ?? 0;
      const next = cur + (tunnelOffset - cur) * Math.min(1, dt * 8);
      this.player.tunnelOffset = next;
      this.player.root.position.y = this.player.y + next;
    }
    this.chaser.update(dt, this.player.rig.root.position.x, 0, this.chaseFactor);

    const gotCoins = this.world.collectTokens(
      this.player.rig.root.position.x,
      this.player.y,
      0
    );
    if (gotCoins > 0) {
      this.coins += gotCoins;
      this.score += gotCoins * 25;
      this.ui.setCoins(this.coins);
      this.particles.coinBurst(
        this.player.rig.root.position.x,
        this.player.y + 1.0,
        0
      );
      // Score popup at player screen position
      const worldPos = new THREE.Vector3(
        this.player.rig.root.position.x,
        this.player.y + 2.2,
        0
      );
      const proj = worldPos.clone().project(this.camera);
      const sx = ((proj.x + 1) / 2) * window.innerWidth;
      const sy = ((-proj.y + 1) / 2) * window.innerHeight;
      this.ui.scorePop(sx, sy, gotCoins * 25);
    }

    // Running dust puff every ~0.08s behind player when on ground
    if (this.player.state === "run") {
      this.dustAccum += dt;
      if (this.dustAccum > 0.08) {
        this.dustAccum = 0;
        this.particles.dust(
          this.player.rig.root.position.x,
          0.1,
          0.4,
          0x8a8a8a
        );
      }
    } else {
      this.dustAccum = 0;
    }

    this.particles.update(dt);
    this.weather.update(dt);
    this.speedLines.update(dt, this.runSpeed, this.player.rig.root.position.x);

    const passed = this.world.passCheck(0);
    if (passed > 0) this.score += passed * 5;

    // Power-up pickup (flying car)
    const pu = this.world.collectPowerup(
      this.player.rig.root.position.x,
      this.player.y,
      0
    );
    if (pu) {
      this.player.startFly();
      this.particles.coinBurst(
        this.player.rig.root.position.x,
        this.player.y + 1.5,
        0
      );
      this.ui.showFlyStart();
    }

    // Update fly HUD
    if (this.player.state === "fly") {
      this.ui.setFlyMeter(this.player.flyDistanceRemaining);
    } else {
      this.ui.setFlyMeter(0);
    }

    // Obstacle collision — skip while invincible (flying)
    if (!this.player.isInvincible()) {
      const hit = this.world.checkObstacleHit(this.player.getBox(), 0);
      if (hit) this.onHit();
    }

    const t = performance.now() * 0.002;
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMagnitude * (this.shakeT > 0 ? this.shakeT * 3 : 0);
      shakeX = (Math.random() - 0.5) * m;
      shakeY = (Math.random() - 0.5) * m;
    }
    this.camera.position.x =
      this.player.rig.root.position.x * 0.18 + Math.sin(t) * 0.05 + shakeX;
    this.camera.position.y = 5.5 + Math.sin(t * 1.2) * 0.04 + shakeY;

    this.ui.setScore(this.score);
    this.ui.setDistance(this.distance);

    this.checkLevelUp();
    this.checkThemeSwitch();
    this.updateThemeBlend(dt);
  }

  private onHit() {
    this.phase = "dying";
    this.dyingT = 0;
    this.player.die();
    this.particles.crash(this.player.rig.root.position.x, 0, 0);
    this.shakeT = 0.55;
    this.shakeMagnitude = 1.8;
    // Hide the 67Kid chaser during the death cinematic — its primitive
    // character was making the camera look like "old Mav and new Mav both
    // showing up", which Oscar called out as a bug. The chaser model is
    // distinct (red hoodie vs. Mav's cream shirt) but at game-over zoom it
    // reads as a duplicate Mav. Cleaner: just hide him.
    this.chaser.rig.root.visible = false;
  }

  private dyingStep(dt: number) {
    this.dyingT += dt;
    this.chaser.rig.root.position.z -= dt * 8;
    this.chaser.update(dt, this.player.rig.root.position.x, 0, 1);
    this.camera.position.z = 8 - this.dyingT * 2;
    this.camera.position.y = 4.5;
    this.camera.lookAt(this.player.rig.root.position.x, 1.2, 0);
    if (this.dyingT > 1.2) {
      this.phase = "gameover";
      this.ui.showGameOver({
        distance: this.distance,
        coins: this.coins,
        score: this.score,
        level: this.level,
      });
      this.camera.position.set(0, 5.5, 8);
      this.camera.lookAt(0, 1.5, -8);
    }
  }
}
