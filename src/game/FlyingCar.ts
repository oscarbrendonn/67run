import * as THREE from "three";

/**
 * Builds a flying sports car mesh — used both for:
 *  - The floating pickup token (rare spawn on track)
 *  - The vehicle that carries Mav during fly mode
 */
export function buildFlyingCar(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff2e63,
    roughness: 0.25,
    metalness: 0.7,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x141a2a,
    roughness: 0.15,
    metalness: 0.9,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.5,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.95,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd8d8e0,
    roughness: 0.25,
    metalness: 0.85,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2.5,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff2030,
    emissive: 0xff2030,
    emissiveIntensity: 2.0,
  });
  const thrusterMat = new THREE.MeshBasicMaterial({
    color: 0x00c8ff,
    transparent: true,
    opacity: 0.8,
  });

  // Main body (sleek sports car shape)
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 4), bodyMat);
  body.position.y = 0.5;
  g.add(body);

  // Hood wedge (sloped front)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.3), bodyMat);
  hood.position.set(0, 0.65, 1.1);
  hood.rotation.x = -0.08;
  g.add(hood);

  // Trunk (sloped rear)
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.0), bodyMat);
  trunk.position.set(0, 0.65, -1.4);
  trunk.rotation.x = 0.1;
  g.add(trunk);

  // Cabin (greenhouse) — dark glass
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.2), glassMat);
  cabin.position.set(0, 0.95, -0.1);
  g.add(cabin);

  // Cabin roof slightly curved (add top)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.8), bodyMat);
  roof.position.set(0, 1.22, -0.1);
  g.add(roof);

  // Windshield frame
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.52, 0.08),
    glassMat
  );
  windshield.position.set(0, 0.95, 1.05);
  windshield.rotation.x = -0.5;
  g.add(windshield);

  // Rear window
  const rearWin = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.52, 0.08),
    glassMat
  );
  rearWin.position.set(0, 0.95, -1.2);
  rearWin.rotation.x = 0.5;
  g.add(rearWin);

  // Side skirts
  for (const sx of [-1, 1]) {
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.2, 3.8),
      accentMat
    );
    skirt.position.set(sx * 0.92, 0.35, 0);
    g.add(skirt);
  }

  // Headlights
  for (const sx of [-1, 1]) {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.08),
      headlightMat
    );
    headlight.position.set(sx * 0.55, 0.62, 2.02);
    g.add(headlight);
  }

  // Taillights
  for (const sx of [-1, 1]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.1, 0.08),
      taillightMat
    );
    tail.position.set(sx * 0.55, 0.58, -2.02);
    g.add(tail);
  }

  // Wheels (4) — hidden when flying, but shown when on ground
  const wheelGroup = new THREE.Group();
  wheelGroup.name = "wheels";
  const positions: Array<[number, number]> = [
    [-0.9, 1.3],
    [0.9, 1.3],
    [-0.9, -1.3],
    [0.9, -1.3],
  ];
  for (const [x, z] of positions) {
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.3, 16),
      tireMat
    );
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, 0.32, z);
    wheelGroup.add(tire);
    // Rim
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.32, 8),
      rimMat
    );
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, 0.32, z);
    wheelGroup.add(rim);
  }
  g.add(wheelGroup);

  // Jet thrusters on the bottom (visible when flying)
  const thrusterGroup = new THREE.Group();
  thrusterGroup.name = "thrusters";
  thrusterGroup.visible = false;
  for (const [x, z] of positions) {
    const thrust = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.9, 10),
      thrusterMat
    );
    thrust.rotation.x = Math.PI;
    thrust.position.set(x, -0.1, z);
    thrusterGroup.add(thrust);
    // Core bright glow
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    core.rotation.x = Math.PI;
    core.position.set(x, -0.05, z);
    thrusterGroup.add(core);
  }
  g.add(thrusterGroup);

  // 67 decal on hood
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.4),
    new THREE.MeshBasicMaterial({
      map: makeCarDecalTex(),
      transparent: true,
    })
  );
  decal.position.set(0, 0.73, 1.0);
  decal.rotation.x = -Math.PI / 2 + 0.08;
  g.add(decal);

  // Cast shadows
  g.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  return g;
}

export function setCarFlying(car: THREE.Group, flying: boolean) {
  const thrusters = car.getObjectByName("thrusters");
  if (thrusters) thrusters.visible = flying;
}

let carDecalTexCache: THREE.Texture | null = null;
function makeCarDecalTex(): THREE.Texture {
  if (carDecalTexCache) return carDecalTexCache;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 6;
  ctx.font = "900 100px -apple-system, Impact, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText("67", 128, 70);
  ctx.fillText("67", 128, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  carDecalTexCache = tex;
  return tex;
}
