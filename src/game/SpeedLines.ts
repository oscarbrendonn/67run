import * as THREE from "three";

interface Streak {
  mesh: THREE.Mesh;
  vz: number;
  life: number;
  maxLife: number;
}

/**
 * Subway-style speed lines — white streaks flying past the camera to sell speed.
 * Intensifies with run speed.
 */
export class SpeedLines {
  private scene: THREE.Scene;
  private pool: THREE.Mesh[] = [];
  private active: Streak[] = [];
  private accum = 0;
  private mat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
  }

  private spawn(behindPlayerX: number) {
    let mesh = this.pool.pop();
    if (!mesh) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 3), this.mat);
    }
    mesh.visible = true;
    this.scene.add(mesh);
    // Spawn ahead of camera (far -z) in a ring around the track
    const ang = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 10;
    const x = Math.cos(ang) * r;
    const y = Math.max(0.5, Math.sin(ang) * r + 4);
    const z = -30 - Math.random() * 30;
    mesh.position.set(x + behindPlayerX * 0.3, y, z);
    this.active.push({
      mesh,
      vz: 60 + Math.random() * 30,
      life: 1.0,
      maxLife: 1.0,
    });
  }

  update(dt: number, runSpeed: number, playerX: number) {
    // Intensity scales with speed (0 at low, full at high speed)
    const t = Math.max(0, Math.min(1, (runSpeed - 18) / 18));
    if (t <= 0.01) {
      // Let existing streaks finish but don't spawn
    } else {
      this.accum += dt;
      const rate = 0.01 + 0.02 * (1 - t); // faster spawn at higher intensity
      while (this.accum > rate && this.active.length < 80) {
        this.accum -= rate;
        this.spawn(playerX);
      }
    }

    // Update streaks
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i];
      s.mesh.position.z += s.vz * dt;
      s.life -= dt;
      // Scale in travel direction for motion streak
      s.mesh.scale.z = 1 + (1 - s.life / s.maxLife) * 3;
      const opacity = (s.life / s.maxLife) * 0.7 * t;
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
      if (s.life <= 0 || s.mesh.position.z > 15) {
        s.mesh.visible = false;
        this.scene.remove(s.mesh);
        this.pool.push(s.mesh);
        this.active.splice(i, 1);
      }
    }
  }

  clear() {
    for (const s of this.active) {
      s.mesh.visible = false;
      this.scene.remove(s.mesh);
      this.pool.push(s.mesh);
    }
    this.active.length = 0;
  }
}
