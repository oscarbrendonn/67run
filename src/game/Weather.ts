import * as THREE from "three";

interface Flake {
  mesh: THREE.Mesh;
  vy: number;
  vx: number;
  life: number;
}

interface AuroraStrip {
  mesh: THREE.Mesh;
  phase: number;
  speed: number;
}

type WeatherMode = "off" | "snow" | "rain" | "drizzle";

/**
 * Atmospheric weather — snow (Russia) or rain (Japan).
 * Spawns many small particles that fall, recycling as they leave the
 * frame. Toggle with setMode().
 */
export class Weather {
  private scene: THREE.Scene;
  private flakes: Flake[] = [];
  private pool: THREE.Mesh[] = [];
  private mode: WeatherMode = "off";
  private accum = 0;
  private aurora: AuroraStrip[] = [];
  private auroraGroup: THREE.Group;
  private snowGeo: THREE.SphereGeometry;
  private rainGeo: THREE.CylinderGeometry;
  private snowMat: THREE.MeshBasicMaterial;
  private rainMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.auroraGroup = new THREE.Group();
    this.auroraGroup.visible = false;
    this.scene.add(this.auroraGroup);
    this.buildAurora();
    // Shared geometries for snow + rain (each particle clones one mesh,
    // not its geometry — so rebuilding particles is allocation-free).
    this.snowGeo = new THREE.SphereGeometry(0.5, 4, 3);
    this.rainGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.4, 4);
    this.snowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.rainMat = new THREE.MeshBasicMaterial({
      color: 0xb0d0f0,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
  }

  private buildAurora() {
    // 5 large translucent colored strips in the sky
    const colors = [0x2affa0, 0x2aff6a, 0x2a8aff, 0xa02aff, 0x2affb8];
    for (let i = 0; i < 5; i++) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 12, 12, 4),
        new THREE.MeshBasicMaterial({
          color: colors[i],
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      strip.position.set((i - 2) * 8, 22 + i * 2, -80 + i * 8);
      strip.rotation.x = -0.3;
      strip.rotation.z = (i - 2) * 0.12;
      // Warp vertices for wave look
      const pos = strip.geometry.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        pos.setY(v, pos.getY(v) + Math.sin(x * 0.2) * 1.5);
      }
      pos.needsUpdate = true;
      this.auroraGroup.add(strip);
      this.aurora.push({
        mesh: strip,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.4,
      });
    }
  }

  /** Set weather mode. "off" hides everything, "snow" = Russia,
   *  "rain" = Japan. Cleans up existing particles when mode changes. */
  setMode(mode: WeatherMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.auroraGroup.visible = mode === "snow"; // aurora only with snow
    for (const f of this.flakes) {
      f.mesh.visible = false;
      this.scene.remove(f.mesh);
    }
    this.flakes.length = 0;
    this.pool.length = 0; // wrong-mode meshes — drop pool, rebuild lazily
  }

  /** Backward compat — old call sites. */
  setActive(active: boolean) {
    this.setMode(active ? "snow" : "off");
  }

  private spawn() {
    const isRain = this.mode === "rain";
    const isDrizzle = this.mode === "drizzle";
    const isWet = isRain || isDrizzle;
    // Drizzle: smaller, lighter than rain. Snow: tiny round flake.
    const size = isWet
      ? isDrizzle ? 0.55 : 1
      : 0.08 + Math.random() * 0.12;
    let mesh = this.pool.pop();
    if (mesh) {
      mesh.scale.setScalar(size);
      mesh.visible = true;
      this.scene.add(mesh);
    } else {
      mesh = new THREE.Mesh(
        isWet ? this.rainGeo : this.snowGeo,
        isWet ? this.rainMat : this.snowMat
      );
      mesh.scale.setScalar(size);
      this.scene.add(mesh);
    }
    const x = (Math.random() - 0.5) * 30;
    const y = isWet ? 8 + Math.random() * 6 : 6 + Math.random() * 6;
    const z = Math.random() * 50 - 35;
    mesh.position.set(x, y, z);
    this.flakes.push({
      mesh,
      // Rain: fast straight. Drizzle: slower, lighter angled. Snow: sways.
      vy: isRain
        ? -22 - Math.random() * 6
        : isDrizzle
        ? -8 - Math.random() * 3
        : -1.5 - Math.random() * 1.2,
      vx: isRain
        ? (Math.random() - 0.5) * 0.05
        : isDrizzle
        ? (Math.random() - 0.5) * 0.5 + 0.6 // slight wind sway
        : (Math.random() - 0.5) * 0.4,
      life: isWet ? 1.4 + Math.random() * 0.4 : 4 + Math.random() * 2,
    });
  }

  update(dt: number) {
    if (this.mode === "off") return;
    const isRain = this.mode === "rain";
    const isDrizzle = this.mode === "drizzle";
    const isSnow = this.mode === "snow";
    // Density per mode:
    //  rain (Tokyo)     → ~200/s, max 380, dense
    //  drizzle (London) → ~80/s,  max 130, sparse light
    //  snow (Moscow)    → ~67/s,  max 220
    this.accum += dt;
    const spawnInterval = isRain ? 0.005 : isDrizzle ? 0.012 : 0.015;
    const maxParticles = isRain ? 380 : isDrizzle ? 130 : 220;
    while (this.accum > spawnInterval && this.flakes.length < maxParticles) {
      this.accum -= spawnInterval;
      this.spawn();
    }
    // Aurora wave animation (snow only)
    if (isSnow) {
      const t = performance.now() * 0.001;
      for (const a of this.aurora) {
        a.mesh.rotation.z =
          0.05 + Math.sin(t * a.speed + a.phase) * 0.2;
        (a.mesh.material as THREE.MeshBasicMaterial).opacity =
          0.25 + Math.sin(t * a.speed * 1.2 + a.phase) * 0.1;
      }
    }
    for (let i = this.flakes.length - 1; i >= 0; i--) {
      const f = this.flakes[i];
      f.mesh.position.y += f.vy * dt;
      f.mesh.position.x += f.vx * dt;
      if (isSnow) {
        f.mesh.position.x += Math.sin(performance.now() * 0.001 + i) * 0.02;
      }
      f.life -= dt;
      if (f.life <= 0 || f.mesh.position.y < 0) {
        f.mesh.visible = false;
        this.scene.remove(f.mesh);
        this.pool.push(f.mesh);
        this.flakes.splice(i, 1);
      }
    }
  }
}
