import * as THREE from "three";

interface Particle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  fade: number;
}

/** Lightweight pooled particle system for sparkles, dust, collect bursts. */
export class Particles {
  private scene: THREE.Scene;
  private active: Particle[] = [];
  private pool: THREE.Mesh[] = [];
  private tmpColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private take(size: number, color: number, shape: "cube" | "sphere"): THREE.Mesh {
    const m = this.pool.pop();
    if (m) {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.setHex(color);
      mat.opacity = 1;
      m.scale.setScalar(size);
      m.visible = true;
      this.scene.add(m);
      return m;
    }
    const geom =
      shape === "cube"
        ? new THREE.BoxGeometry(1, 1, 1)
        : new THREE.SphereGeometry(0.5, 8, 6);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      toneMapped: true,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.scale.setScalar(size);
    this.scene.add(mesh);
    return mesh;
  }

  private release(p: Particle) {
    p.mesh.visible = false;
    this.scene.remove(p.mesh);
    this.pool.push(p.mesh);
  }

  /** Burst of gold coin sparkles at position. */
  coinBurst(x: number, y: number, z: number) {
    for (let i = 0; i < 10; i++) {
      const size = 0.1 + Math.random() * 0.1;
      const mesh = this.take(size, Math.random() < 0.5 ? 0xffe080 : 0xffd257, "cube");
      mesh.position.set(x, y, z);
      const ang = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.active.push({
        mesh,
        life: 0.55,
        maxLife: 0.55,
        vx: Math.cos(ang) * speed,
        vy: 2 + Math.random() * 3,
        vz: Math.sin(ang) * speed,
        spinX: (Math.random() - 0.5) * 10,
        spinY: (Math.random() - 0.5) * 10,
        fade: 1,
      });
    }
  }

  /** Small dust puff behind runner. */
  dust(x: number, y: number, z: number, color = 0xaaaaaa) {
    const size = 0.25 + Math.random() * 0.18;
    const mesh = this.take(size, color, "sphere");
    mesh.position.set(x, y, z);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
    this.active.push({
      mesh,
      life: 0.45,
      maxLife: 0.45,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.8 + Math.random() * 0.8,
      vz: 1.2 + Math.random() * 1.0,
      spinX: 0,
      spinY: (Math.random() - 0.5) * 2,
      fade: 0.6,
    });
  }

  /** Crash debris when player hits an obstacle. */
  crash(x: number, y: number, z: number) {
    for (let i = 0; i < 20; i++) {
      const size = 0.15 + Math.random() * 0.18;
      const mesh = this.take(size, Math.random() < 0.5 ? 0xff4d6d : 0xffd257, "cube");
      mesh.position.set(x, y + 1, z);
      const ang = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      this.active.push({
        mesh,
        life: 0.9,
        maxLife: 0.9,
        vx: Math.cos(ang) * speed,
        vy: 3 + Math.random() * 4,
        vz: Math.sin(ang) * speed,
        spinX: (Math.random() - 0.5) * 14,
        spinY: (Math.random() - 0.5) * 14,
        fade: 1,
      });
    }
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.release(p);
        this.active.splice(i, 1);
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 11 * dt;
      p.mesh.rotation.x += p.spinX * dt;
      p.mesh.rotation.y += p.spinY * dt;
      const t = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t * p.fade;
      p.mesh.scale.multiplyScalar(1 + dt * 0.6);
    }
  }

  clear() {
    for (const p of this.active) this.release(p);
    this.active.length = 0;
  }
}
