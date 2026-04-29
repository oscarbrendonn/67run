import * as THREE from "three";
import type { Theme } from "./Themes";

/**
 * A ring of far-away building silhouettes that stays around the player.
 * Fills the horizon so the camera never sees "black" beyond the fog.
 * Positioned in the fog so details blur into sky color naturally.
 */
export class Horizon {
  group: THREE.Group;
  private mat: THREE.MeshBasicMaterial;

  constructor(theme: Theme) {
    this.group = new THREE.Group();
    this.mat = new THREE.MeshBasicMaterial({
      color: darken(theme.fog, 0.08),
      fog: true,
    });
    this.buildRing();
  }

  private buildRing() {
    // Distant silhouette buildings arranged around the track
    const radius = 95;
    const count = 36;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const w = 6 + Math.random() * 14;
      const h = 10 + Math.random() * 40;
      const d = 4 + Math.random() * 6;
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        this.mat
      );
      building.position.set(
        Math.cos(ang) * radius,
        h / 2,
        Math.sin(ang) * radius
      );
      building.rotation.y = ang + Math.PI / 2;
      this.group.add(building);
    }
    // Second, further ring — taller tower silhouettes
    const radius2 = 130;
    const count2 = 24;
    for (let i = 0; i < count2; i++) {
      const ang = (i / count2) * Math.PI * 2;
      const w = 8 + Math.random() * 10;
      const h = 25 + Math.random() * 35;
      const d = 6 + Math.random() * 8;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        this.mat
      );
      tower.position.set(
        Math.cos(ang) * radius2,
        h / 2,
        Math.sin(ang) * radius2
      );
      tower.rotation.y = ang;
      this.group.add(tower);
    }
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.group);
  }

  setTheme(theme: Theme) {
    this.mat.color.setHex(darken(theme.fog, 0.08));
  }

  /** Keep the horizon centered on the player (follow scroll). */
  follow(playerZ: number) {
    this.group.position.z = playerZ;
  }
}

function darken(hex: number, amount: number): number {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, -amount);
  return c.getHex();
}
