import * as THREE from "three";
import { animateRun, buildCharacter, CharacterRig } from "./Character";

export class Chaser {
  distanceBehind = 22;
  rig: CharacterRig;
  root: THREE.Group;
  private t = 0;

  constructor(scene: THREE.Scene) {
    this.rig = buildCharacter({
      hair: 0x1a0a0a,
      hairStyle: "hood",
      hoodColor: 0x9c0f2e,
      shirt: 0x6b0919,
      shirtLogo: null,
      pants: 0x16182a,
      shoes: 0x141414,
      mouth: "frown",
      skin: 0xd5a282,
      eyes: 0xff2e63,
      brows: 0x0a0a0a,
    });
    // Menacing red glow behind face
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff2e63,
        transparent: true,
        opacity: 0.3,
      })
    );
    glow.position.set(0, 2.1, 0.5);
    this.rig.root.add(glow);
    this.root = this.rig.root;
    scene.add(this.root);
  }

  reset() {
    this.distanceBehind = 22;
    this.root.position.set(0, 0, this.distanceBehind);
    this.root.rotation.set(0, 0, 0);
  }

  update(dt: number, playerX: number, playerZ: number, chaseSpeed: number) {
    const curX = this.root.position.x;
    this.root.position.x = curX + (playerX - curX) * Math.min(1, dt * 5);

    const desired = playerZ + (22 - chaseSpeed * 6);
    const curZ = this.root.position.z;
    this.root.position.z = curZ + (desired - curZ) * Math.min(1, dt * 1.5);

    this.t += dt * 1000;
    animateRun(this.rig, this.t, 1.6);
    this.root.rotation.x = -0.08;
  }
}
