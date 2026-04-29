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

/**
 * Atmospheric weather (currently: snow).
 * Spawns many small white boxes that fall slowly, recycling as they
 * leave the frame. Toggle with setActive().
 */
export class Weather {
  private scene: THREE.Scene;
  private flakes: Flake[] = [];
  private pool: THREE.Mesh[] = [];
  private active = false;
  private accum = 0;
  private aurora: AuroraStrip[] = [];
  private auroraGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.auroraGroup = new THREE.Group();
    this.auroraGroup.visible = false;
    this.scene.add(this.auroraGroup);
    this.buildAurora();
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

  setActive(active: boolean) {
    this.active = active;
    this.auroraGroup.visible = active;
    if (!active) {
      for (const f of this.flakes) {
        f.mesh.visible = false;
        this.pool.push(f.mesh);
        this.scene.remove(f.mesh);
      }
      this.flakes.length = 0;
    }
  }

  private spawn() {
    // Random position within camera frustum area (x: -25..25, y: 15, z: 10..-40)
    const size = 0.08 + Math.random() * 0.12;
    let mesh = this.pool.pop();
    if (mesh) {
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
      mesh.scale.setScalar(size);
      mesh.visible = true;
      this.scene.add(mesh);
    } else {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 4, 3),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      mesh.scale.setScalar(size);
      this.scene.add(mesh);
    }
    const x = (Math.random() - 0.5) * 30;
    const y = 6 + Math.random() * 6; // 6-12 so they stay in camera frustum
    const z = Math.random() * 50 - 35; // -35 to 15, includes area in front of camera
    mesh.position.set(x, y, z);
    this.flakes.push({
      mesh,
      vy: -1.5 - Math.random() * 1.2,
      vx: (Math.random() - 0.5) * 0.4,
      life: 4 + Math.random() * 2,
    });
  }

  update(dt: number) {
    if (!this.active) return;
    // Spawn rate ~ 60 per second while active (denser snow)
    this.accum += dt;
    const spawnInterval = 0.015;
    while (this.accum > spawnInterval && this.flakes.length < 220) {
      this.accum -= spawnInterval;
      this.spawn();
    }
    // Aurora wave animation
    const t = performance.now() * 0.001;
    for (const a of this.aurora) {
      a.mesh.rotation.z =
        0.05 + Math.sin(t * a.speed + a.phase) * 0.2;
      (a.mesh.material as THREE.MeshBasicMaterial).opacity =
        0.25 + Math.sin(t * a.speed * 1.2 + a.phase) * 0.1;
    }
    for (let i = this.flakes.length - 1; i >= 0; i--) {
      const f = this.flakes[i];
      f.mesh.position.y += f.vy * dt;
      f.mesh.position.x += f.vx * dt;
      // Gentle sway
      f.mesh.position.x += Math.sin(performance.now() * 0.001 + i) * 0.02;
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
