import * as THREE from "three";
import { buildBridge } from "./Bridge";
import { getCachedBuilding, loadBuildingModel, pickBuildingModel, preloadThemeBuildings } from "./BuildingLoader";
import { loadFlagModel } from "./FlagLoader";
import { buildFlagPole } from "./Flags";
import { buildFlyingCar } from "./FlyingCar";
import { getGroundMaterial } from "./Ground";
import { buildLandmark } from "./Landmarks";
import { loadLandmarkModel } from "./LandmarkLoader";
import { loadObstacleModel, preloadThemeObstacles } from "./ObstacleLoader";
import { LANE_X } from "./Player";
import { buildStreetProp } from "./StreetProps";
import { buildThemeBuilding } from "./ThemeBuildings";
import {
  buildThemeObstacle,
  type DodgeType,
  getDodgeType,
  pickThemeObstacle,
  pickThemeOverhead,
  type ThemeObstacleKind,
} from "./ThemeObstacles";
import { makeAsphaltTexture, makeGrassTexture } from "./Textures";
import type { Theme } from "./Themes";
import { buildTunnelArch, buildTunnelPortal, buildTunnelRamp, TUNNEL_DEPTH } from "./Tunnel";

export type ObstacleKind = "barrier" | "cone" | "block" | "beam" | "bear" | "snowpile" | "themed";

export interface Obstacle {
  group: THREE.Group;
  kind: ObstacleKind;
  lane: number;
  z: number;
  passed: boolean;
  collisionHeight?: number;
  themedKind?: ThemeObstacleKind;
  /** How the player must avoid this obstacle (jump / slide / lane-change). */
  dodgeType?: DodgeType;
}

export interface Token {
  group: THREE.Group;
  lane: number;
  z: number;
  y: number;
  collected: boolean;
}

interface Building {
  group: THREE.Group;
  baseZ: number;
  slot: number;
  /** Which theme this building was built for. When mismatched on cycle, it
   *  is destroyed and replaced with a fresh one for the current theme — that
   *  way the country transition looks like the road is gradually entering a
   *  new place, not a hard cut. */
  themeId: string;
  /** Target X-position for the building's road-facing edge. Width-aware so
   *  no building ever spills into the road, and they all line up at the
   *  same wall regardless of how wide the model is. */
  innerEdge: number;
  /** ±1 — which side of the road this building is on. */
  side: number;
}

interface LandmarkEntry {
  group: THREE.Group;
  z: number;
  side: number;
}

interface PropEntry {
  group: THREE.Group;
  baseZ: number;
  slot: number;
  side: number;
  /** Theme this prop was built for. Recycled with current theme when it
   *  cycles past the player. */
  themeId: string;
}

interface TunnelEntry {
  group: THREE.Group;
  z: number;
}

interface BridgeEntry {
  group: THREE.Group;
  z: number;
}

export interface PowerUp {
  group: THREE.Group;
  kind: "car";
  lane: number;
  z: number;
  y: number;
  collected: boolean;
}

const SEGMENT_LENGTH = 40;
const SEGMENT_COUNT = 6;
const TRACK_WIDTH = 7;
const SPAWN_AHEAD = 200;
const SPAWN_GAP_MIN = 12;
const SPAWN_GAP_MAX = 20;
const INITIAL_SPAWN_Z = -55;
// Subway-tight density: front row at every Z step, back row STAGGERED by
// half-spacing so it fills the gaps in front row. Result: continuous
// wall of buildings on both sides — Oscar: "binaların arası asla boş
// olmayacak full kapalı estetik".
// 3-LAYER WALL: front / middle / back. 6 buildings per z-position
// (L+R per layer × 3 layers). 13 z-positions × 6 = 78 buildings total —
// completely fills the depth so no sky leaks behind the front row.
const BUILDING_COUNT = 78;
const BUILDING_SPACING = 6;
const PROP_COUNT = 36;
const PROP_SPACING = 8;

export class World {
  scene: THREE.Scene;
  ground: THREE.Group;
  segments: THREE.Group[] = [];
  groundMat: THREE.MeshStandardMaterial;
  stripeMat: THREE.MeshStandardMaterial;
  grassMat: THREE.MeshStandardMaterial;
  grassL: THREE.Mesh;
  grassR: THREE.Mesh;
  /** Canal water strips immediately next to the road (Subway Surfers vibe). */
  canalMat!: THREE.MeshStandardMaterial;
  canalL!: THREE.Mesh;
  canalR!: THREE.Mesh;
  /** Animated ripple normal map applied to canal water. */
  canalNormalMap!: THREE.Texture;
  /** Sidewalk + curb + slab seams + manholes — scroll together with road
   *  so the kaldırım appears to move backward at the same rate as the
   *  road, instead of looking statically forward (Oscar: "aradaki yol
   *  ileri ilerliyor gibi"). Wraps every SIDEWALK_CYCLE meters. */
  sidewalkGroup!: THREE.Group;
  private sidewalkCycle = 0;
  buildings: Building[] = [];
  obstacles: Obstacle[] = [];
  /** Cache for theme road textures so theme-switch doesn't re-fetch */
  private roadTexCache: Map<string, THREE.Texture> = new Map();
  tokens: Token[] = [];
  landmarks: LandmarkEntry[] = [];
  props: PropEntry[] = [];
  tunnels: TunnelEntry[] = [];
  bridges: BridgeEntry[] = [];
  /** z-position where the next bridge should appear */
  private nextBridgeZ = -100;
  powerups: PowerUp[] = [];
  lastPowerupZ = 0;
  spawnedZ = INITIAL_SPAWN_Z;
  theme: Theme;
  /** meters until next allowed tunnel — prevents back-to-back */
  private tunnelCooldown = 400;
  /** Active tunnel zones for player Y descent. zStart is closest to player (entrance), zEnd is farthest. */
  private tunnelZones: { zEntrance: number; zExit: number; rampLength: number }[] = [];

  private obstacleMats: Record<ObstacleKind, THREE.Material>;
  private tokenGroupTemplate: THREE.Group;

  constructor(scene: THREE.Scene, initialTheme: Theme) {
    this.scene = scene;
    this.theme = initialTheme;
    this.ground = new THREE.Group();
    scene.add(this.ground);

    const asphaltTex = makeAsphaltTexture(initialTheme.ground);
    asphaltTex.repeat.set(2, 8);
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: asphaltTex,
      roughness: 0.92,
    });
    this.stripeMat = new THREE.MeshStandardMaterial({
      color: initialTheme.neonA,
      roughness: 0.55,
      emissive: initialTheme.neonA,
      emissiveIntensity: 0.25,
    });
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = new THREE.Group();
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(TRACK_WIDTH, SEGMENT_LENGTH),
        this.groundMat
      );
      plane.rotation.x = -Math.PI / 2;
      plane.receiveShadow = true;
      seg.add(plane);
      // (Per-segment curbs removed — replaced by single global sidewalk
      // curb mesh below. Two overlapping curbs were causing the z-fight
      // flicker at the road edge.)
      // Lane dashes — only used when AI road texture isn't loaded (theme.id === ?)
      // AI textures have their own painted lane markings, so we hide these once loaded.
      const dashGroup = new THREE.Group();
      dashGroup.name = "lane-dashes";
      for (const x of [-TRACK_WIDTH / 6, TRACK_WIDTH / 6]) {
        for (let s = -SEGMENT_LENGTH / 2 + 1; s < SEGMENT_LENGTH / 2; s += 3.5) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.6), this.stripeMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(x, 0.02, s);
          dashGroup.add(dash);
        }
      }
      seg.add(dashGroup);
      seg.position.z = -i * SEGMENT_LENGTH;
      this.ground.add(seg);
      this.segments.push(seg);
    }

    const grassTex = makeGrassTexture(initialTheme.grass);
    grassTex.repeat.set(30, 60);
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grassTex,
      roughness: 1,
    });
    // Much wider grass — extends far beyond camera frustum to eliminate any black gap
    this.grassL = new THREE.Mesh(
      new THREE.PlaneGeometry(200, SEGMENT_LENGTH * SEGMENT_COUNT * 2),
      this.grassMat
    );
    this.grassL.rotation.x = -Math.PI / 2;
    this.grassL.position.set(
      -TRACK_WIDTH / 2 - 100,
      -0.02,
      -((SEGMENT_COUNT - 1) * SEGMENT_LENGTH) / 2
    );
    this.grassL.receiveShadow = true;
    scene.add(this.grassL);
    this.grassR = this.grassL.clone();
    this.grassR.position.x = TRACK_WIDTH / 2 + 100;
    scene.add(this.grassR);

    // SIDE STRIP — proper 3D city sidewalk: raised concrete plane + visible
    // curb edge between road and sidewalk. ALL sidewalk geometry lives on
    // a `sidewalkGroup` that scrolls in lockstep with the road, so the
    // kaldırım visually moves backward at the same rate as the road
    // instead of appearing to drift forward (Oscar: "aradaki yol ileri
    // ilerliyor gibi … geriye doğru gitmesi lazım").
    const SIDEWALK_WIDTH = 4.5;
    const SIDEWALK_Y = 0.18;
    const CURB_HEIGHT = 0.22;
    const CURB_WIDTH = 0.25;
    // Strip is exactly 2 cycles long, centered ahead of the player. As it
    // scrolls back, we wrap by SIDEWALK_CYCLE so a fresh cycle is always
    // ahead.
    this.sidewalkCycle = SEGMENT_LENGTH * SEGMENT_COUNT;
    const totalLen = this.sidewalkCycle * 2;
    this.sidewalkGroup = new THREE.Group();
    scene.add(this.sidewalkGroup);
    const groundDef = getGroundMaterial(initialTheme.id);
    this.canalMat = new THREE.MeshStandardMaterial({
      color: groundDef.tint,
      map: groundDef.map,
      roughness: groundDef.roughness,
      metalness: 0,
    });
    this.canalNormalMap = makeRippleNormalMap(); // unused but keeps field
    const sidewalkGeo = new THREE.PlaneGeometry(SIDEWALK_WIDTH, totalLen);
    this.canalL = new THREE.Mesh(sidewalkGeo, this.canalMat);
    this.canalL.rotation.x = -Math.PI / 2;
    this.canalL.position.set(
      -TRACK_WIDTH / 2 - SIDEWALK_WIDTH / 2 - CURB_WIDTH,
      SIDEWALK_Y,
      -((SEGMENT_COUNT - 1) * SEGMENT_LENGTH) / 2
    );
    this.canalL.receiveShadow = true;
    this.sidewalkGroup.add(this.canalL);
    this.canalR = new THREE.Mesh(sidewalkGeo, this.canalMat);
    this.canalR.rotation.x = -Math.PI / 2;
    this.canalR.position.set(
      TRACK_WIDTH / 2 + SIDEWALK_WIDTH / 2 + CURB_WIDTH,
      SIDEWALK_Y,
      this.canalL.position.z
    );
    this.canalR.receiveShadow = true;
    this.sidewalkGroup.add(this.canalR);

    // CURB — visible darker concrete edge between road and sidewalk.
    const sidewalkCurbMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a52,
      roughness: 0.95,
    });
    const curbGeo = new THREE.BoxGeometry(CURB_WIDTH, CURB_HEIGHT, totalLen);
    const curbL = new THREE.Mesh(curbGeo, sidewalkCurbMat);
    curbL.position.set(
      -TRACK_WIDTH / 2 - CURB_WIDTH / 2,
      CURB_HEIGHT / 2,
      this.canalL.position.z
    );
    curbL.castShadow = true;
    curbL.receiveShadow = true;
    this.sidewalkGroup.add(curbL);
    const curbR = new THREE.Mesh(curbGeo, sidewalkCurbMat);
    curbR.position.set(
      TRACK_WIDTH / 2 + CURB_WIDTH / 2,
      CURB_HEIGHT / 2,
      this.canalL.position.z
    );
    curbR.castShadow = true;
    curbR.receiveShadow = true;
    this.sidewalkGroup.add(curbR);

    // === 3D sidewalk detail: slab seams every 3m + manhole covers.
    // Both rendered as InstancedMesh so the entire strip is ONE drawcall
    // each instead of 320+ separate meshes. (Plain Mesh-per-seam was
    // causing Oscar's "donmaya başladı" frame-rate drop.)
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a30,
      roughness: 0.95,
    });
    const SEAM_W = 0.06;
    const SEAM_H = 0.04;
    const seamGeo = new THREE.BoxGeometry(SIDEWALK_WIDTH - 0.4, SEAM_H, SEAM_W);
    const stripStartZ = this.canalL.position.z - totalLen / 2;
    const stripEndZ = this.canalL.position.z + totalLen / 2;
    // Pre-count: every 3m × 2 sides
    const seamCount = Math.floor((stripEndZ - stripStartZ) / 3) * 2;
    const seamMesh = new THREE.InstancedMesh(seamGeo, seamMat, seamCount);
    seamMesh.receiveShadow = true;
    seamMesh.castShadow = false;
    const seamMatrix = new THREE.Matrix4();
    let seamI = 0;
    for (let z = stripStartZ; z < stripEndZ && seamI < seamCount; z += 3) {
      for (const sx of [-1, 1] as const) {
        if (seamI >= seamCount) break;
        seamMatrix.makeTranslation(
          sx * (TRACK_WIDTH / 2 + CURB_WIDTH + SIDEWALK_WIDTH / 2),
          SIDEWALK_Y + SEAM_H / 2,
          z
        );
        seamMesh.setMatrixAt(seamI++, seamMatrix);
      }
    }
    seamMesh.count = seamI;
    seamMesh.instanceMatrix.needsUpdate = true;
    this.sidewalkGroup.add(seamMesh);

    const manholeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1e,
      roughness: 0.7,
      metalness: 0.4,
    });
    const manholeGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16);
    const manholeCount = Math.floor((stripEndZ - stripStartZ - 12) / 25) + 1;
    const manholeMesh = new THREE.InstancedMesh(manholeGeo, manholeMat, manholeCount);
    manholeMesh.receiveShadow = true;
    manholeMesh.castShadow = false;
    const manholeMatrix = new THREE.Matrix4();
    let manholeI = 0;
    for (let z = stripStartZ + 12; z < stripEndZ && manholeI < manholeCount; z += 25) {
      const sx = manholeI % 2 === 0 ? -1 : 1;
      manholeMatrix.makeTranslation(
        sx * (TRACK_WIDTH / 2 + CURB_WIDTH + SIDEWALK_WIDTH * 0.55),
        SIDEWALK_Y + 0.02,
        z
      );
      manholeMesh.setMatrixAt(manholeI++, manholeMatrix);
    }
    manholeMesh.count = manholeI;
    manholeMesh.instanceMatrix.needsUpdate = true;
    this.sidewalkGroup.add(manholeMesh);

    // Buildings — allocate pool, seed with theme colors
    for (let i = 0; i < BUILDING_COUNT; i++) {
      this.buildings.push(this.createBuilding(i));
    }

    // Street props — lamps, trees, signs, benches (themed)
    for (let i = 0; i < PROP_COUNT; i++) {
      this.props.push(this.createProp(i));
    }

    this.obstacleMats = {
      barrier: new THREE.MeshStandardMaterial({ color: 0xff2e63, roughness: 0.6 }),
      cone: new THREE.MeshStandardMaterial({ color: 0xff8a00, roughness: 0.5 }),
      block: new THREE.MeshStandardMaterial({ color: 0x9c0f2e, roughness: 0.7 }),
      beam: new THREE.MeshStandardMaterial({
        color: 0x57e0ff,
        emissive: 0x57e0ff,
        emissiveIntensity: 0.6,
      }),
      bear: new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.95 }),
      snowpile: new THREE.MeshStandardMaterial({
        color: 0xf4f8fc,
        roughness: 1,
      }),
      themed: new THREE.MeshStandardMaterial({ color: 0xffffff }), // unused — themed obstacles bring own materials
    };

    this.tokenGroupTemplate = this.buildToken();
  }

  /** Theme-tinted sidewalk pavement color. Pavement varies subtly per
   *  country (Cairo sandy, Tokyo dark slate, etc.) but stays neutral. */
  private sidewalkColorFor(themeId: string): number {
    switch (themeId) {
      case "usa":    return 0xa8a8b0; // standard concrete grey
      case "brazil": return 0xc8b08a; // warm tan
      case "france": return 0xb8b0a0; // pale limestone
      case "japan":  return 0x6a6a72; // dark slate
      case "turkey": return 0xb89878; // warm beige
      case "uk":     return 0x9a9a9c; // grey
      case "russia": return 0x8a8a8a; // cool grey
      case "uae":    return 0xd8b878; // sandy
      case "egypt":  return 0xc8a878; // sand limestone
      default:       return 0xa8a8b0;
    }
  }

  private applyRoadTexture(theme: Theme) {
    const ROAD_TINT: Record<string, number> = {
      usa: 0xc8c8c8,
      brazil: 0x707070,
      france: 0x808080,
      japan: 0x4a4a4a,   // very dark — Tokyo neon was too bright
      turkey: 0x909090,
      uk: 0xa8a8a8,
      russia: 0x9a9a9a,
      uae: 0x808080,
      egypt: 0xc09060,   // sandy beige
    };
    const tint = ROAD_TINT[theme.id] ?? 0xa0a0a0;
    const cached = this.roadTexCache.get(theme.id);
    if (cached) {
      this.groundMat.map = cached;
      this.groundMat.color.setHex(tint);
      this.groundMat.needsUpdate = true;
      this.setLaneDashesVisible(false);
      return;
    }
    const themeRoadUrl = `/textures/road_${theme.id}.png`;
    const loader = new THREE.TextureLoader();
    loader.load(
      themeRoadUrl,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 8);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        this.roadTexCache.set(theme.id, tex);
        if (this.theme.id === theme.id) {
          this.groundMat.map = tex;
          this.groundMat.color.setHex(tint);
          this.groundMat.roughness = 0.85;
          this.groundMat.needsUpdate = true;
          this.setLaneDashesVisible(false);
        }
      },
      undefined,
      () => {
        const asphaltTex = makeAsphaltTexture(theme.ground);
        asphaltTex.repeat.set(2, 8);
        this.groundMat.map = asphaltTex;
        this.groundMat.color.setHex(0xffffff);
        this.groundMat.needsUpdate = true;
        this.setLaneDashesVisible(true);
      }
    );
  }

  private setLaneDashesVisible(visible: boolean) {
    for (const seg of this.segments) {
      const g = seg.getObjectByName("lane-dashes");
      if (g) g.visible = visible;
    }
  }

  /**
   * Preload all 8 theme road textures + obstacles for next theme.
   * Call once after first theme so transitions are smooth.
   */
  preloadAllRoads() {
    const themes = ["usa", "brazil", "france", "japan", "turkey", "uk", "russia", "uae", "egypt"];
    const loader = new THREE.TextureLoader();
    for (const id of themes) {
      if (this.roadTexCache.has(id)) continue;
      loader.load(`/textures/road_${id}.png`, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 8);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        this.roadTexCache.set(id, tex);
      });
    }
  }

  private createProp(slot: number): PropEntry {
    const side = slot % 2 === 0 ? -1 : 1;
    const g = buildStreetProp(this.theme, slot);
    g.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const baseZ = -slot * PROP_SPACING - Math.random() * 3;
    // Props sit on the SIDEWALK strip between the front-row buildings
    // (inner edge ~5.5m) and the mid-row buildings (inner edge ~8.5m),
    // so they don't end up clipped INSIDE building meshes (Oscar:
    // "palmiyeleri evin içine sokmuşsun, düzgün yerlere koy").
    // Sidewalk outer edge sits at TRACK_WIDTH/2 + CURB + SIDEWALK_WIDTH
    // = 3.5 + 0.25 + 4.5 = 8.25m, so x ∈ [6.6, 7.8] keeps props on the
    // sidewalk and clear of both building rows.
    g.position.set(
      side * (TRACK_WIDTH / 2 + 3.1 + Math.random() * 1.2),
      0,
      baseZ
    );
    g.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.rotation.y += (Math.random() - 0.5) * 0.4;
    this.scene.add(g);
    return { group: g, baseZ, slot, side, themeId: this.theme.id };
  }

  private rebuildProps() {
    for (const p of this.props) this.scene.remove(p.group);
    this.props.length = 0;
    for (let i = 0; i < PROP_COUNT; i++) {
      this.props.push(this.createProp(i));
    }
  }

  private createBuilding(slot: number): Building {
    // Pack 6 buildings at every z-position across 3 layers:
    //   slot%6 == 0 → L-front,  1 → R-front
    //   slot%6 == 2 → L-mid,    3 → R-mid
    //   slot%6 == 4 → L-back,   5 → R-back
    const slotMod = slot % 6;
    const side = slotMod % 2 === 0 ? -1 : 1;
    const rowTier = Math.floor(slotMod / 2); // 0=front, 1=mid, 2=back
    const isFrontRow = rowTier === 0;
    // Try cached GLB first — if present, skip primitive entirely so the
    // first frame of a new theme already shows the 3D building. Oscar:
    // "yeni haritaya açıldığında kötü binalar görünüyor, biraz oynamak
    // gerekiyor". Primitive flash gone when cache is warm (preload done).
    const earlyModelName = pickBuildingModel(
      this.theme.id,
      slot,
      rowTier as 0 | 1 | 2
    );
    const cachedGlb = earlyModelName ? getCachedBuilding(earlyModelName) : null;
    const tb = cachedGlb
      ? { group: cachedGlb, mainMaterials: [], accentMaterials: [] }
      : buildThemeBuilding(this.theme, slot);
    const g = tb.group;
    g.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    // Per-tier z-stagger so all 3 layers fall on different z values within
    // a single BUILDING_SPACING band — "brick" pattern across all 3 rows
    // for guaranteed gap-fill behind the front wall.
    const zStep = Math.floor(slot / 6) * BUILDING_SPACING;
    const staggerOffset =
      rowTier === 0
        ? 0
        : rowTier === 1
        ? BUILDING_SPACING * (1 / 3)
        : BUILDING_SPACING * (2 / 3);
    const baseZ = -(zStep + staggerOffset) - Math.random() * 0.6;
    // Position so the building's ROAD-FACING EDGE lines up at a fixed
    // distance from road center — Subway-style "wall of buildings" right
    // at the curb, regardless of building width. Wide buildings push out
    // (away from road); narrow ones pull in. No more buildings spilling
    // into the road.
    //   Front row sits at the curb,
    //   Mid row sits ~5–6m further from road,
    //   Back row sits ~9–11m further from road.
    const innerEdge =
      rowTier === 0
        ? TRACK_WIDTH / 2 + 0.5 + Math.random() * 0.3   // 4.0–4.3m from center
        : rowTier === 1
        ? TRACK_WIDTH / 2 + 5.0 + Math.random() * 1.2   // 8.5–9.7m from center
        : TRACK_WIDTH / 2 + 9.5 + Math.random() * 1.8;  // 13–14.8m from center
    // Apply random rotation BEFORE measuring so bbox reflects rotated width
    g.rotation.y = (Math.random() - 0.5) * 0.4;
    g.updateMatrixWorld(true);
    const tmpBB = new THREE.Box3().setFromObject(g);
    const halfWidth = Math.max(0.5, (tmpBB.max.x - tmpBB.min.x) / 2);
    g.position.set(side * (innerEdge + halfWidth), 0.2, baseZ);
    this.scene.add(g);
    const entry: Building = {
      group: g,
      baseZ,
      slot,
      themeId: this.theme.id,
      innerEdge,
      side,
    };

    // If we already used the cached GLB above, no async swap needed.
    // Otherwise (cache miss → primitive shown), kick off the GLB load
    // and swap when it lands.
    const modelName = earlyModelName;
    if (modelName && !cachedGlb) {
      loadBuildingModel(modelName).then((glb) => {
        if (!glb) return;
        if (!this.buildings.includes(entry)) return;
        if (entry.themeId !== this.theme.id) return;
        const oldZ = entry.group.position.z;
        // Face the road
        glb.rotation.y = entry.side > 0 ? Math.PI : 0;
        glb.rotation.y += (Math.random() - 0.5) * 0.18;
        glb.updateMatrixWorld(true);
        // Measure the GLB's actual width and re-position so its road-facing
        // edge sits at entry.innerEdge — uniform "wall" along the curb.
        const bb = new THREE.Box3().setFromObject(glb);
        const halfWidth = Math.max(0.5, (bb.max.x - bb.min.x) / 2);
        glb.position.set(entry.side * (entry.innerEdge + halfWidth), 0.2, oldZ);
        glb.traverse((c) => {
          const m = c as THREE.Mesh;
          if (m.isMesh) m.receiveShadow = true;
        });
        this.scene.remove(entry.group);
        this.scene.add(glb);
        entry.group = glb;
      });
    }

    return entry;
  }

  /**
   * Apply a theme. Designed to feel like the road is gradually entering a new
   * country, NOT a hard cut:
   *  - Spawn logic + road texture switch immediately (so anything spawning
   *    ahead is the new theme).
   *  - In-flight obstacles are NOT wiped — they cull naturally as the player
   *    runs past them.
   *  - Buildings + props don't rebuild now — they're tagged with theme and
   *    each one gets re-created with the new theme only when it cycles to
   *    the back of the spawn ring (handled in `scroll`). So old-theme
   *    buildings disappear over a couple of seconds while new-theme ones
   *    appear in the distance.
   */
  setTheme(theme: Theme) {
    this.theme = theme;
    // Apply CACHED road texture if available (no re-fetch lag)
    this.applyRoadTexture(theme);
    // Preload theme obstacles + buildings IMMEDIATELY (not via requestIdle
    // — that callback never fires during 60fps gameplay, so GLBs were
    // never starting to download until the player was already deep into
    // the country and saw primitives instead of 3D models). Eager fetch
    // means by the time the player runs 20-30m, GLBs are cached and
    // swapped in.
    preloadThemeObstacles(theme.id);
    preloadThemeBuildings(theme.id);
    const grassTex = makeGrassTexture(theme.grass);
    grassTex.repeat.set(8, 24);
    this.grassMat.map = grassTex;
    this.grassMat.needsUpdate = true;
    this.stripeMat.color.setHex(theme.neonA);
    this.stripeMat.emissive.setHex(theme.neonA);
    // Swap the side strip texture to the new country's surface (snow/sand/
    // grass/cobblestone/etc.) — instead of just retinting a flat plane.
    const groundDef = getGroundMaterial(theme.id);
    this.canalMat.color.setHex(groundDef.tint);
    this.canalMat.map = groundDef.map;
    this.canalMat.roughness = groundDef.roughness;
    this.canalMat.needsUpdate = true;
    // SMOOTH theme transition (Oscar: "uzaktan sanki gelir gibi olacak …
    // bir anda değiştiriyorsun, öyle yapma"):
    //  - Buildings ALREADY visible (z > player z - 60) keep their old-theme
    //    look. They scroll past naturally and get recycled at the back of
    //    the spawn ring.
    //  - Buildings far ahead (z <= player z - 60) get rebuilt RIGHT NOW
    //    with the new theme — so the country you're entering is visible
    //    in the distance approaching.
    //  - Props/flags follow the same horizon split.
    //
    //  The earlier hard "1-2 sn eski binalar gözüküyor" complaint was
    //  caused by the URL theme not being parsed at init() (now fixed in
    //  Game.ts), NOT by the cycle behavior — so we can return to the
    //  natural fade now.
    const HORIZON = -60; // anything farther than this from the camera = swap now
    for (let i = 0; i < this.buildings.length; i++) {
      const old = this.buildings[i];
      if (old.themeId === theme.id) continue;
      if (old.group.position.z >= HORIZON) continue; // visible — let it scroll past
      const oldZ = old.group.position.z;
      this.scene.remove(old.group);
      const fresh = this.createBuilding(old.slot);
      fresh.group.position.z = oldZ;
      this.buildings[i] = fresh;
    }
    for (let i = 0; i < this.props.length; i++) {
      const old = this.props[i];
      if (old.themeId === theme.id) continue;
      if (old.slot < 0) continue; // flag pair — leave it (will cull when off-screen)
      if (old.group.position.z >= HORIZON) continue;
      const oldZ = old.group.position.z;
      this.scene.remove(old.group);
      const fresh = this.createProp(old.slot);
      fresh.group.position.z = oldZ;
      this.props[i] = fresh;
    }
  }

  /** Hard reset of buildings + props (used on game restart, not theme change). */
  forceRebuildScenery() {
    for (const b of this.buildings) this.scene.remove(b.group);
    this.buildings.length = 0;
    for (let i = 0; i < BUILDING_COUNT; i++) {
      this.buildings.push(this.createBuilding(i));
    }
    for (const p of this.props) this.scene.remove(p.group);
    this.props.length = 0;
    for (let i = 0; i < PROP_COUNT; i++) {
      this.props.push(this.createProp(i));
    }
  }

  private retintBuildings() {
    // Full rebuild — each theme has architecturally distinct buildings
    for (const b of this.buildings) this.scene.remove(b.group);
    this.buildings.length = 0;
    for (let i = 0; i < BUILDING_COUNT; i++) {
      this.buildings.push(this.createBuilding(i));
    }
  }

  /** Spawn a pair of country flagpoles at the start of a country segment.
   *  Two big flags facing the road from each side, ~60-90m ahead — the
   *  player runs through them like a "welcome to {country}" gate. */
  spawnFlagPair(theme: Theme, baseZ: number) {
    const themeId = theme.id;
    for (const side of [-1, 1] as const) {
      const placeholder = buildFlagPole(themeId);
      placeholder.position.set(side * 6.0, 0, baseZ + (side > 0 ? -3 : 0));
      // Flag faces road
      placeholder.rotation.y = side > 0 ? Math.PI : 0;
      this.scene.add(placeholder);
      const entry: PropEntry = {
        group: placeholder,
        baseZ: baseZ,
        slot: -1,
        side,
        themeId,
      };
      this.props.push(entry);
      // Lazy-swap to GLB if available
      loadFlagModel(themeId).then((glb) => {
        if (!glb) return;
        if (!this.props.includes(entry)) return;
        while (placeholder.children.length > 0) {
          placeholder.remove(placeholder.children[0]);
        }
        placeholder.add(glb);
      });
    }
  }

  /** Spawn a landmark at given Z, positioned on random side. */
  spawnLandmark(theme: Theme, z: number, side: number = Math.random() < 0.5 ? -1 : 1) {
    const g = buildLandmark(theme.landmark);
    // Push landmark far behind the 3-layer building wall (back row inner
    // edge ~13–15m from road) so it reads as a distant skyline monument
    // rather than a road-adjacent prop. Oscar: "üç binanın arkasına koy,
    // arkadan görünsün". x≈45m yan + z = caller's z (already ~-90 to
    // -130) gives the right "Cristo Redentor on the mountain horizon" feel.
    const dist = 44 + Math.random() * 8;       // was 28 → 36, now 44 → 52
    g.position.set(side * dist, 0, z);
    g.rotation.y = side > 0 ? -0.3 : 0.3;
    g.scale.setScalar(1.0);
    g.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    this.scene.add(g);
    const entry = { group: g, z, side };
    this.landmarks.push(entry);

    // Lazy-swap to Meshy GLB. Primitive shows immediately, GLB replaces
    // when ready. Falls through silently on 404 / load fail (keeps primitive).
    const themeId = theme.id;
    loadLandmarkModel(themeId, theme.landmark).then((glb) => {
      if (!glb) return;
      if (!this.landmarks.includes(entry)) return;
      const oldPos = entry.group.position.clone();
      const oldRot = entry.group.rotation.clone();
      this.scene.remove(entry.group);
      glb.position.copy(oldPos);
      glb.rotation.copy(oldRot);
      this.scene.add(glb);
      entry.group = glb;
    });
  }

  private buildToken(): THREE.Group {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.08, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd257,
        metalness: 0.8,
        roughness: 0.18,
        emissive: 0xff8a00,
        emissiveIntensity: 0.35,
      })
    );
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.32),
      new THREE.MeshBasicMaterial({ map: makeTokenTexture(), transparent: true })
    );
    label.position.z = 0.05;
    g.add(label);
    const labelBack = label.clone();
    labelBack.position.z = -0.05;
    labelBack.rotation.y = Math.PI;
    g.add(labelBack);
    return g;
  }

  reset() {
    for (const o of this.obstacles) this.scene.remove(o.group);
    for (const t of this.tokens) this.scene.remove(t.group);
    for (const l of this.landmarks) this.scene.remove(l.group);
    for (const tn of this.tunnels) this.scene.remove(tn.group);
    for (const br of this.bridges) this.scene.remove(br.group);
    for (const p of this.powerups) this.scene.remove(p.group);
    this.obstacles.length = 0;
    this.tokens.length = 0;
    this.landmarks.length = 0;
    this.tunnels.length = 0;
    this.bridges.length = 0;
    this.nextBridgeZ = -100;
    this.powerups.length = 0;
    this.tunnelZones.length = 0;
    this.tunnelCooldown = 400;
    this.lastPowerupZ = 0;
    this.spawnedZ = INITIAL_SPAWN_Z;
    this.segments.forEach((s, i) => (s.position.z = -i * SEGMENT_LENGTH));
    // Hard rebuild scenery so a new run starts with the chosen theme everywhere
    this.forceRebuildScenery();
  }

  scroll(dz: number, playerZ: number) {
    this.spawnedZ += dz;
    // Road segments scroll back as the player runs forward.
    for (const s of this.segments) {
      s.position.z += dz;
      if (s.position.z - playerZ > SEGMENT_LENGTH) {
        s.position.z -= SEGMENT_COUNT * SEGMENT_LENGTH;
      }
    }
    // Sidewalk + curbs + slab seams + manholes ride the same scroll so
    // they appear to move backward at the same rate as the road.
    // Wrap by sidewalkCycle (= one segment row) so the kaldırım is
    // always present in front of and behind the player.
    if (this.sidewalkGroup) {
      this.sidewalkGroup.position.z += dz;
      if (this.sidewalkGroup.position.z > this.sidewalkCycle) {
        this.sidewalkGroup.position.z -= this.sidewalkCycle;
      } else if (this.sidewalkGroup.position.z < -this.sidewalkCycle) {
        this.sidewalkGroup.position.z += this.sidewalkCycle;
      }
    }
    // Buildings: 6 per z-position (L+R × 3 layers: front/mid/back), so each
    // ROW has BUILDING_COUNT/6 buildings. Cycle distance wraps the row
    // length, not the total slot count.
    const buildingCycleDist = (BUILDING_COUNT / 6) * BUILDING_SPACING;
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      b.group.position.z += dz;
      if (b.group.position.z - playerZ > 30) {
        const cycledZ = b.group.position.z - buildingCycleDist;
        if (b.themeId !== this.theme.id) {
          // Theme changed since this building was created — replace with a
          // fresh one for the new country at the far end of the ring.
          this.scene.remove(b.group);
          const fresh = this.createBuilding(b.slot);
          fresh.group.position.z = cycledZ;
          this.buildings[i] = fresh;
        } else {
          b.group.position.z = cycledZ;
        }
      }
    }
    // Props alternate L/R per slot, so a same-side row has PROP_COUNT/2
    // entries spaced 2*PROP_SPACING apart. Total row length = PROP_COUNT *
    // PROP_SPACING — that's the cycle wrap distance.
    const propCycleDist = PROP_COUNT * PROP_SPACING;
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      p.group.position.z += dz;
      if (p.group.position.z - playerZ > 20) {
        // Welcome-gate flag pair (slot < 0) is one-shot — destroy when it
        // scrolls past the player instead of recycling it (createProp(-1)
        // would emit a broken prop). Prevents the prop array from leaking
        // a couple of extra entries every theme change.
        if (p.slot < 0) {
          this.scene.remove(p.group);
          this.props.splice(i, 1);
          continue;
        }
        const cycledZ = p.group.position.z - propCycleDist;
        if (p.themeId !== this.theme.id) {
          this.scene.remove(p.group);
          const fresh = this.createProp(p.slot);
          fresh.group.position.z = cycledZ;
          this.props[i] = fresh;
        } else {
          p.group.position.z = cycledZ;
        }
      }
    }
    for (const t of this.tunnels) {
      t.group.position.z += dz;
      t.z = t.group.position.z;
    }
    // Bridges scroll with the world
    for (const b of this.bridges) {
      b.group.position.z += dz;
      b.z = b.group.position.z;
    }
    // Track for next-bridge spawn position
    this.nextBridgeZ += dz;
    // Move tunnel zones with scroll for player Y descent tracking
    for (const zone of this.tunnelZones) {
      zone.zEntrance += dz;
      zone.zExit += dz;
    }
    this.tunnelZones = this.tunnelZones.filter((z) => z.zExit < playerZ + 10);
    // Power-ups: scroll + gentle bob + spin
    for (const p of this.powerups) {
      p.group.position.z += dz;
      p.z = p.group.position.z;
      p.group.rotation.y += 0.03;
      p.group.position.y = p.y + Math.sin(performance.now() * 0.003 + p.z) * 0.15;
    }
    this.powerups = this.powerups.filter((p) => {
      if (p.collected || p.z > playerZ + 12) {
        this.scene.remove(p.group);
        return false;
      }
      return true;
    });
    // Cull passed tunnel pieces
    this.tunnels = this.tunnels.filter((t) => {
      if (t.z > playerZ + 20) {
        this.scene.remove(t.group);
        return false;
      }
      return true;
    });
    // Cull passed bridges
    this.bridges = this.bridges.filter((b) => {
      if (b.z > playerZ + 20) {
        this.scene.remove(b.group);
        return false;
      }
      return true;
    });
    for (const l of this.landmarks) {
      l.group.position.z += dz;
      l.z = l.group.position.z;
    }
    for (const o of this.obstacles) {
      o.group.position.z += dz;
      o.z = o.group.position.z;
    }
    for (const t of this.tokens) {
      t.group.position.z += dz;
      t.z = t.group.position.z;
      t.group.rotation.y += 0.08;
    }
    // Cull old landmarks
    this.landmarks = this.landmarks.filter((l) => {
      if (l.z > playerZ + 30) {
        this.scene.remove(l.group);
        return false;
      }
      return true;
    });
    this.obstacles = this.obstacles.filter((o) => {
      if (o.z > playerZ + 12) {
        this.scene.remove(o.group);
        return false;
      }
      return true;
    });
    this.tokens = this.tokens.filter((t) => {
      if (t.collected || t.z > playerZ + 12) {
        this.scene.remove(t.group);
        return false;
      }
      return true;
    });
  }

  spawnAhead(playerZ: number) {
    // Spawn periodic decorative bridges every ~180-260m (cosmetic only)
    while (this.nextBridgeZ > playerZ - SPAWN_AHEAD) {
      const g = buildBridge(this.theme);
      g.position.set(0, 0, this.nextBridgeZ);
      this.scene.add(g);
      const bridgeEntry: BridgeEntry = { group: g, z: this.nextBridgeZ };
      this.bridges.push(bridgeEntry);
      this.nextBridgeZ -= 180 + Math.random() * 80;
      // (Meshy-generated bridge GLBs were swapped in here previously, but they
      // arrived as solid blocks that closed off the road. Sticking to the
      // minimalist primitive viaduct keeps the passage visibly open.)
    }
    while (this.spawnedZ > playerZ - SPAWN_AHEAD) {
      const gap = SPAWN_GAP_MIN + Math.random() * (SPAWN_GAP_MAX - SPAWN_GAP_MIN);
      this.spawnedZ -= gap;
      // Rare tunnel chance — one every 400+ m when cooldown expires
      if (this.tunnelCooldown <= 0 && Math.random() < 0.08) {
        this.spawnTunnel(this.spawnedZ);
        // Skip obstacle row while tunnel occupies this slot
        continue;
      }
      this.tunnelCooldown -= gap;
      // Rare flying car powerup — roughly every 500-800m
      if (
        this.spawnedZ < this.lastPowerupZ - 500 - Math.random() * 300 &&
        Math.random() < 0.5
      ) {
        this.addPowerup(Math.floor(Math.random() * 3), this.spawnedZ, 1.8);
        this.lastPowerupZ = this.spawnedZ;
      }
      if (Math.random() < 0.22) this.spawnCoinRow(this.spawnedZ);
      else this.spawnRow(this.spawnedZ);
    }
  }

  private addPowerup(lane: number, z: number, y: number) {
    const car = buildFlyingCar();
    // Scale down to a pickup size (half car)
    car.scale.setScalar(0.55);
    car.position.set(LANE_X[lane], y, z);
    // Rotating glow ring under car
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.06, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.3;
    car.add(ring);
    this.scene.add(car);
    this.powerups.push({ group: car, kind: "car", lane, z, y, collected: false });
  }

  /** Check if player intersects any uncollected powerup. Returns the picked up one or null. */
  collectPowerup(
    playerX: number,
    playerY: number,
    playerZ: number
  ): PowerUp | null {
    for (const p of this.powerups) {
      if (p.collected) continue;
      if (Math.abs(p.z - playerZ) > 1.3) continue;
      if (Math.abs(p.group.position.x - playerX) > 1.0) continue;
      if (Math.abs(p.y - (playerY + 0.9)) > 1.6) continue;
      p.collected = true;
      p.group.scale.multiplyScalar(1.4);
      return p;
    }
    return null;
  }

  private spawnTunnel(zStart: number) {
    // Underground subway tunnel — player physically descends below ground level.
    // 12-18 arches × 4 = 48-72 units of safe zone (~2-3 sec at run speed) —
    // shorter than before, doesn't give as much "free" advantage.
    const length = 12 + Math.floor(Math.random() * 7);
    const archSpacing = 4;
    const RAMP_LENGTH = 8;

    // ENTRANCE RAMP — slope going down
    const rampIn = buildTunnelRamp(this.theme, RAMP_LENGTH, true);
    rampIn.position.set(0, 0, zStart + RAMP_LENGTH / 2);
    this.scene.add(rampIn);
    this.tunnels.push({ group: rampIn, z: zStart + RAMP_LENGTH / 2 });

    // Entrance portal frame at top of ramp
    const entrance = buildTunnelPortal(this.theme);
    entrance.position.set(0, 0, zStart + RAMP_LENGTH + 1);
    this.scene.add(entrance);
    this.tunnels.push({ group: entrance, z: zStart + RAMP_LENGTH + 1 });

    // Tunnel arches at deep level
    for (let i = 0; i < length; i++) {
      const arch = buildTunnelArch(this.theme);
      const z = zStart - i * archSpacing;
      arch.position.set(0, 0, z);
      this.scene.add(arch);
      this.tunnels.push({ group: arch, z });
      // Coin streams down deep — y at tunnel floor + 0.6 = -1.9 in world
      for (let lane = 0; lane < 3; lane++) {
        if (Math.random() < 0.6) {
          this.addToken(lane, z, -TUNNEL_DEPTH + 0.6);
          this.addToken(lane, z - 1.2, -TUNNEL_DEPTH + 0.6);
          this.addToken(lane, z - 2.4, -TUNNEL_DEPTH + 0.6);
        }
      }
    }

    // Exit portal + ramp going up
    const exitZ = zStart - length * archSpacing;
    const exitP = buildTunnelPortal(this.theme);
    exitP.position.set(0, 0, exitZ - 1);
    exitP.rotation.y = Math.PI;
    this.scene.add(exitP);
    this.tunnels.push({ group: exitP, z: exitZ - 1 });

    const rampOut = buildTunnelRamp(this.theme, RAMP_LENGTH, false);
    rampOut.position.set(0, 0, exitZ - RAMP_LENGTH / 2 - 1);
    this.scene.add(rampOut);
    this.tunnels.push({ group: rampOut, z: exitZ - RAMP_LENGTH / 2 - 1 });

    // Register tunnel zone for player Y descent
    // entrance ramp: z=zStart+RAMP_LENGTH (top) → z=zStart (bottom of ramp = tunnel start)
    this.tunnelZones.push({
      zEntrance: zStart + RAMP_LENGTH, // street-level start of descent
      zExit: exitZ - RAMP_LENGTH - 1, // street-level end of ascent
      rampLength: RAMP_LENGTH,
    });

    this.spawnedZ = exitZ - RAMP_LENGTH - 6;
    // Rarer tunnels: every 1200-2200m instead of 800-1500m
    this.tunnelCooldown = 1200 + Math.random() * 1000;
  }

  /**
   * Returns the player Y offset for the current scroll position.
   * Returns -TUNNEL_DEPTH inside tunnels, 0 on street, lerped on ramps.
   * Player at z=0 always; we check tunnel zones in scrolled coords.
   */
  getTunnelOffset(): number {
    // Player is at z=0. Check if any tunnel zone covers z=0.
    for (const zone of this.tunnelZones) {
      // zone.zEntrance > z >= zone.zExit (z decreases going forward, but entrance is closer to player)
      const z = 0;
      if (z > zone.zEntrance) continue; // not yet reached
      if (z < zone.zExit) continue; // already past
      // Player is between entrance ramp top and exit ramp top (somewhere in tunnel zone)
      const rampTopIn = zone.zEntrance;
      const rampBottomIn = zone.zEntrance - zone.rampLength;
      const rampBottomOut = zone.zExit + zone.rampLength;
      const rampTopOut = zone.zExit;
      // Sloping descent
      if (z > rampBottomIn) {
        // On entrance ramp: z=rampTopIn → 0, z=rampBottomIn → -DEPTH
        const t = (rampTopIn - z) / zone.rampLength;
        return -TUNNEL_DEPTH * t;
      }
      // Sloping ascent
      if (z < rampBottomOut) {
        // On exit ramp: z=rampBottomOut → -DEPTH, z=rampTopOut → 0
        const t = (rampBottomOut - z) / zone.rampLength;
        return -TUNNEL_DEPTH * (1 - t);
      }
      // In flat tunnel zone
      return -TUNNEL_DEPTH;
    }
    return 0;
  }

  private addObstacleRaw(lane: number, z: number, kind: ObstacleKind) {
    this.addObstacle(lane, z, kind);
  }

  private spawnCoinRow(z: number) {
    const lane = Math.floor(Math.random() * 3);
    const peak = Math.random() < 0.3 ? 1.6 : 0.55;
    for (let i = 0; i < 5; i++) {
      const tz = z - i * 1.3;
      const norm = (i / 4) * 2 - 1;
      const y = peak === 1.6 ? 1.0 + (1 - norm * norm) : 0.55;
      this.addToken(lane, tz, y);
    }
  }

  private spawnRow(z: number) {
    // 6% chance to spawn a slide-under overhead in a SINGLE lane. Player
    // can either slide under it OR change lanes — always has options. The
    // earlier "full-width must-slide" spawn was confusing (looked like 3
    // identical obstacles you couldn't jump over) so it's been removed.
    if (Math.random() < 0.06) {
      const overhead = pickThemeOverhead(this.theme.id);
      if (overhead) {
        const lane = Math.floor(Math.random() * 3);
        this.addObstacle(lane, z, "themed", overhead);
        return;
      }
    }
    const lanes = [0, 1, 2];
    const blocked = new Set<number>();
    const roll = Math.random();
    if (roll < 0.55) blocked.add(lanes[Math.floor(Math.random() * 3)]);
    else if (roll < 0.85) {
      const a = Math.floor(Math.random() * 3);
      blocked.add(a);
      let b = Math.floor(Math.random() * 3);
      while (b === a) b = Math.floor(Math.random() * 3);
      blocked.add(b);
    }
    // When both blocked lanes would be lane-blockers, swap one for a
    // jump-type so the player always has a non-side-step option somewhere.
    const blockedKinds: { lane: number; kind: ObstacleKind; themed?: ThemeObstacleKind }[] = [];
    for (const lane of blocked) {
      const k = pickKind(this.theme.id);
      let themed: ThemeObstacleKind | undefined;
      if (k === "themed") {
        themed = pickThemeObstacle(this.theme.id) ?? undefined;
      }
      blockedKinds.push({ lane, kind: k, themed });
    }
    // If every blocked lane is a hard-stop (lane-blocker), force one to
    // be a jumpable so player has a vertical out as well.
    const hardStops = blockedKinds.filter(
      (b) => (b.kind === "themed" && b.themed && getDodgeType(b.themed) === "lane") || b.kind === "bear"
    );
    if (hardStops.length === blockedKinds.length && blockedKinds.length > 1) {
      hardStops[0].kind = "barrier";
      hardStops[0].themed = undefined;
    }
    for (const b of blockedKinds) {
      this.addObstacle(b.lane, z, b.kind, b.themed);
    }
    for (const lane of lanes) {
      if (blocked.has(lane)) continue;
      if (Math.random() < 0.55) {
        const count = 3 + Math.floor(Math.random() * 3);
        const startZ = z;
        const peak = Math.random() < 0.25 ? 1.8 : 0.55;
        for (let i = 0; i < count; i++) {
          const tz = startZ - i * 1.4;
          const norm = (i / Math.max(1, count - 1)) * 2 - 1;
          const y = peak === 1.8 ? 1.2 + (1 - norm * norm) * 1.1 : 0.55;
          this.addToken(lane, tz, y);
        }
      }
    }
  }

  private addObstacle(lane: number, z: number, kind: ObstacleKind, themedOverride?: ThemeObstacleKind): void {
    // Themed obstacles — culture-specific (hotdog cart, ramen, kebab, etc.)
    if (kind === "themed") {
      const themedKind = themedOverride ?? pickThemeObstacle(this.theme.id);
      if (!themedKind) {
        return this.addObstacle(lane, z, "barrier");
      }
      // Try to load 3D GLB first; primitive fallback while loading or if missing
      const placeholder = buildThemeObstacle(themedKind);
      placeholder.group.position.set(LANE_X[lane], 0, z);
      this.scene.add(placeholder.group);
      const entry: Obstacle = {
        group: placeholder.group,
        kind: "themed",
        lane,
        z,
        passed: false,
        collisionHeight: placeholder.height,
        themedKind,
        dodgeType: placeholder.dodgeType,
      };
      this.obstacles.push(entry);
      // Async swap to GLB when loaded (overheads now have GLBs too — saved
      // to /models/obstacles/{theme}_overhead.glb by the Meshy pipeline).
      loadObstacleModel(themedKind).then((glb) => {
        if (!glb) return;
        // Only swap if this obstacle is still in the world
        if (!this.obstacles.includes(entry)) return;
        const oldPos = entry.group.position.clone();
        this.scene.remove(entry.group);
        glb.position.copy(oldPos);
        this.scene.add(glb);
        entry.group = glb;
      });
      return;
    }
    // Generic obstacles — try GLB version too
    const glbKind = kind; // barrier/cone/block/beam map directly to GLB filenames
    const placeholder = this.buildPrimitiveObstacle(kind);
    placeholder.position.set(LANE_X[lane], 0, z);
    this.scene.add(placeholder);
    const entry: Obstacle = {
      group: placeholder,
      kind,
      lane,
      z,
      passed: false,
    };
    this.obstacles.push(entry);
    loadObstacleModel(glbKind).then((glb) => {
      if (!glb) return;
      if (!this.obstacles.includes(entry)) return;
      const oldPos = entry.group.position.clone();
      this.scene.remove(entry.group);
      glb.position.copy(oldPos);
      this.scene.add(glb);
      entry.group = glb;
    });
    return;
  }

  /** Build the original primitive obstacle as fallback / placeholder. */
  private buildPrimitiveObstacle(kind: ObstacleKind): THREE.Group {
    const g = new THREE.Group();
    const mat = this.obstacleMats[kind as Exclude<ObstacleKind, "themed">];
    switch (kind) {
      case "barrier": {
        // Construction barrier: red+white striped panel + yellow warning lights + black frame
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          roughness: 0.6,
          metalness: 0.5,
        });
        // Black frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.12), frameMat);
        frame.position.y = 0.65;
        g.add(frame);
        // Red+white striped panel (4 alternating stripes)
        const stripeColors = [0xe6323a, 0xfafafa, 0xe6323a, 0xfafafa];
        for (let i = 0; i < 4; i++) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(1.42, 0.24, 0.08),
            new THREE.MeshStandardMaterial({ color: stripeColors[i], roughness: 0.65 })
          );
          stripe.position.set(0, 0.25 + i * 0.26, 0.06);
          g.add(stripe);
        }
        // Yellow warning lights (emissive) on top corners
        const warnMat = new THREE.MeshStandardMaterial({
          color: 0xffd257,
          emissive: 0xffd257,
          emissiveIntensity: 2.2,
        });
        for (const x of [-0.68, 0.68]) {
          const warn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), warnMat);
          warn.position.set(x, 1.38, 0.05);
          g.add(warn);
        }
        // Legs
        const legMat = frameMat;
        for (const x of [-0.6, 0.6]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.5), legMat);
          leg.position.set(x, 0.15, 0);
          g.add(leg);
        }
        g.traverse((c) => {
          const mm = c as THREE.Mesh;
          if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; }
        });
        break;
      }
      case "cone": {
        // Traffic cone — single LatheGeometry profile for smooth curves
        const coneMat = new THREE.MeshStandardMaterial({
          color: 0xff6a1a,
          roughness: 0.4,
          metalness: 0.05,
        });
        const baseMat = new THREE.MeshStandardMaterial({
          color: 0x141414,
          roughness: 0.85,
        });
        // Define the cone profile (radius vs height) — narrows at top, slight curve
        const profile: THREE.Vector2[] = [];
        const samples = 16;
        for (let i = 0; i < samples; i++) {
          const t = i / (samples - 1);
          const y = t * 1.0;
          // Radius decreases with curve (parabolic-ish for soft taper)
          const r = 0.26 * Math.pow(1 - t, 0.85) + 0.04;
          profile.push(new THREE.Vector2(r, y));
        }
        const lathe = new THREE.LatheGeometry(profile, 24);
        const lathMesh = new THREE.Mesh(lathe, coneMat);
        lathMesh.position.y = 0.07;
        lathMesh.castShadow = true;
        lathMesh.receiveShadow = true;
        g.add(lathMesh);
        // Square base — chunky black plastic
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.5), baseMat);
        base.position.y = 0.035;
        base.castShadow = true;
        g.add(base);
        // Reflective bands — TubeGeometry around cone for realistic ribbon
        const reflMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.18,
          metalness: 0.6,
          emissive: 0xa8a8a8,
          emissiveIntensity: 0.25,
        });
        // Lower band radius ~ at y=0.4
        for (const [bandY, bandR] of [
          [0.45, 0.18],
          [0.78, 0.12],
        ]) {
          const tube = new THREE.Mesh(
            new THREE.TorusGeometry(bandR, 0.025, 8, 28),
            reflMat
          );
          tube.rotation.x = Math.PI / 2;
          tube.position.y = bandY + 0.07;
          g.add(tube);
          // Wider band (cylindrical strip)
          const strip = new THREE.Mesh(
            new THREE.CylinderGeometry(bandR + 0.005, bandR + 0.005, 0.07, 24),
            reflMat
          );
          strip.position.y = bandY + 0.07;
          g.add(strip);
        }
        break;
      }
      case "block": {
        // Shipping container with door details + painted logo + rust
        const colors = [0xc83838, 0x2a70a8, 0x2a8a4a, 0xd89828, 0x702878];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const bodyMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.75,
          metalness: 0.25,
        });
        const rustMat = new THREE.MeshStandardMaterial({
          color: 0x6a3020,
          roughness: 0.95,
        });
        const doorMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color).offsetHSL(0, 0, -0.08).getHex(),
          roughness: 0.75,
        });
        // Main body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), bodyMat);
        body.position.y = 0.7;
        g.add(body);
        // Horizontal corrugation lines (faked via thin boxes)
        for (let y = -0.55; y <= 0.55; y += 0.22) {
          const rib = new THREE.Mesh(
            new THREE.BoxGeometry(1.42, 0.03, 1.42),
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(color).offsetHSL(0, 0, -0.06).getHex(),
              roughness: 0.8,
            })
          );
          rib.position.y = 0.7 + y;
          g.add(rib);
        }
        // Door panel on front
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.04), doorMat);
        door.position.set(0, 0.7, 0.72);
        g.add(door);
        // Door handles (vertical bars)
        for (const x of [-0.3, 0.3]) {
          const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 1.2, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.3 })
          );
          handle.position.set(x, 0.7, 0.76);
          g.add(handle);
        }
        // Rust patches
        for (let i = 0; i < 3; i++) {
          const rust = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), rustMat);
          rust.position.set(
            (Math.random() - 0.5) * 1.2,
            0.3 + Math.random() * 0.8,
            0.73
          );
          rust.scale.set(1, 1, 0.1);
          g.add(rust);
        }
        // 67 painted logo
        const logo = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.35),
          new THREE.MeshBasicMaterial({ map: makeContainer67Tex(), transparent: true })
        );
        logo.position.set(0, 1.0, 0.75);
        g.add(logo);
        g.traverse((c) => {
          const mm = c as THREE.Mesh;
          if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; }
        });
        break;
      }
      case "beam": {
        // Scaffolding beam with safety stripes + warning strobes on posts
        const metalMat = new THREE.MeshStandardMaterial({
          color: 0xd8b850,
          roughness: 0.4,
          metalness: 0.6,
        });
        const darkMat = new THREE.MeshStandardMaterial({
          color: 0x1a1a20,
          roughness: 0.8,
        });
        const stripeMat = new THREE.MeshStandardMaterial({
          color: 0x111111,
          roughness: 0.9,
        });
        const warnMat = new THREE.MeshStandardMaterial({
          color: 0xff2040,
          emissive: 0xff2040,
          emissiveIntensity: 2.5,
        });
        // Main beam (yellow with black stripes)
        const beam = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.35), metalMat);
        beam.position.y = 1.55;
        g.add(beam);
        // Diagonal black stripes on beam (warning tape look)
        for (let i = -0.7; i <= 0.7; i += 0.28) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.36, 0.36),
            stripeMat
          );
          stripe.position.set(i, 1.55, 0);
          stripe.rotation.y = 0.3;
          g.add(stripe);
        }
        // Posts (scaffolding style)
        for (const x of [-0.85, 0.85]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.15), darkMat);
          post.position.set(x, 0.9, 0);
          g.add(post);
          // Cross bracing
          const brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.08), darkMat);
          brace.position.set(x, 0.85, 0);
          brace.rotation.z = 0.4;
          g.add(brace);
          // Warning strobes on top
          const warn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), warnMat);
          warn.position.set(x, 1.85, 0);
          g.add(warn);
        }
        // Base plates
        for (const x of [-0.85, 0.85]) {
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.35), darkMat);
          plate.position.set(x, 0.04, 0);
          g.add(plate);
        }
        g.traverse((c) => {
          const mm = c as THREE.Mesh;
          if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; }
        });
        break;
      }
      case "bear": {
        // Standing bear, rearing up — lane blocker
        const fur = mat;
        const darkFur = new THREE.MeshStandardMaterial({
          color: 0x3a2414,
          roughness: 0.95,
        });
        const snout = new THREE.MeshStandardMaterial({
          color: 0x8a6040,
          roughness: 0.9,
        });
        const black = new THREE.MeshStandardMaterial({
          color: 0x111111,
          roughness: 0.5,
        });
        const angryRed = new THREE.MeshStandardMaterial({
          color: 0xff2030,
          emissive: 0xff2030,
          emissiveIntensity: 2.0,
        });
        // Legs / base
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.8), fur);
        base.position.y = 0.3;
        g.add(base);
        // Torso (upright)
        const torso = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 16, 12),
          fur
        );
        torso.scale.set(1, 1.3, 0.9);
        torso.position.y = 1.2;
        g.add(torso);
        // Head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 16, 12),
          fur
        );
        head.position.y = 2.05;
        g.add(head);
        // Snout
        const snoutMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 12, 10),
          snout
        );
        snoutMesh.scale.set(1, 0.7, 1.1);
        snoutMesh.position.set(0, 1.95, 0.28);
        g.add(snoutMesh);
        // Nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), black);
        nose.position.set(0, 2.0, 0.45);
        g.add(nose);
        // Glowing red angry eyes
        for (const x of [-0.13, 0.13]) {
          const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            angryRed
          );
          eye.position.set(x, 2.18, 0.3);
          g.add(eye);
        }
        // Ears
        for (const x of [-0.22, 0.22]) {
          const ear = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 10, 8),
            fur
          );
          ear.scale.set(1, 0.9, 0.6);
          ear.position.set(x, 2.35, 0);
          g.add(ear);
        }
        // Raised arms (menacing)
        for (const x of [-0.5, 0.5]) {
          const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.7, 0.3),
            fur
          );
          arm.position.set(x, 1.65, 0.15);
          arm.rotation.z = x < 0 ? 0.5 : -0.5;
          g.add(arm);
          // Paw with claws
          const paw = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 10, 8),
            darkFur
          );
          paw.position.set(x * 1.5, 2.05, 0.35);
          g.add(paw);
          // Claws
          for (let c = 0; c < 3; c++) {
            const claw = new THREE.Mesh(
              new THREE.ConeGeometry(0.03, 0.15, 6),
              new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 })
            );
            claw.position.set(x * 1.5 + (c - 1) * 0.06, 1.95, 0.5);
            claw.rotation.x = Math.PI / 2;
            g.add(claw);
          }
        }
        // Cast shadows
        g.traverse((c) => {
          const mm = c as THREE.Mesh;
          if (mm.isMesh) {
            mm.castShadow = true;
            mm.receiveShadow = true;
          }
        });
        break;
      }
      case "snowpile": {
        // A mound of snow blocking the lane
        const mound = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 16, 10),
          mat
        );
        mound.scale.set(1, 0.6, 1);
        mound.position.y = 0.5;
        mound.castShadow = true;
        mound.receiveShadow = true;
        g.add(mound);
        // Smaller mounds on top
        const m2 = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 10, 8),
          mat
        );
        m2.position.set(0.2, 0.85, 0.1);
        g.add(m2);
        const m3 = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 10, 8),
          mat
        );
        m3.position.set(-0.25, 0.8, -0.15);
        g.add(m3);
        // Icicles / sparkle
        for (let i = 0; i < 5; i++) {
          const sparkle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 6, 5),
            new THREE.MeshBasicMaterial({ color: 0xbfe6ff })
          );
          sparkle.position.set(
            (Math.random() - 0.5) * 1.3,
            0.5 + Math.random() * 0.6,
            (Math.random() - 0.5) * 0.8
          );
          g.add(sparkle);
        }
        break;
      }
    }
    return g;
  }

  private addToken(lane: number, z: number, y: number) {
    const g = this.tokenGroupTemplate.clone(true);
    g.position.set(LANE_X[lane], y, z);
    this.scene.add(g);
    this.tokens.push({ group: g, lane, z, y, collected: false });
  }

  checkObstacleHit(
    playerBox: { minX: number; maxX: number; minY: number; maxY: number },
    playerZ: number
  ): Obstacle | null {
    for (const o of this.obstacles) {
      if (o.passed) continue;
      if (Math.abs(o.z - playerZ) > 1.2) continue;
      const laneX = LANE_X[o.lane];
      const obMinX = laneX - 0.7;
      const obMaxX = laneX + 0.7;
      if (playerBox.maxX < obMinX || playerBox.minX > obMaxX) continue;
      // Y collision band depends on dodge type:
      //   "jump"  → 0..1.3   (player jump peak minY=2.07 clears)
      //   "slide" → 1.4..3.5 (player slide hitbox maxY=0.85 passes under;
      //                       jump peak minY=2.07 < 3.5 still collides)
      //   "lane"  → 0..4.0   (cannot jump or slide; must lane-change)
      let obMinY = 0;
      let obMaxY = 1.3;
      // Resolve dodge type for both standard + themed kinds
      const dodge: DodgeType =
        o.dodgeType ??
        (o.kind === "beam"
          ? "slide"
          : o.kind === "bear"
          ? "lane"
          : "jump");
      if (dodge === "slide") {
        obMinY = 1.4;
        obMaxY = 3.5;
      } else if (dodge === "lane") {
        obMinY = 0;
        obMaxY = 4.0;
      } else {
        obMinY = 0;
        // Per-kind tuned heights for the small/short jump-overs
        switch (o.kind) {
          case "barrier": obMaxY = 1.2; break;
          case "cone":    obMaxY = 1.0; break;
          case "block":   obMaxY = 1.3; break;
          case "snowpile":obMaxY = 1.0; break;
          case "themed":  obMaxY = Math.min(o.collisionHeight ?? 1.3, 1.3); break;
          default:        obMaxY = 1.3;
        }
      }
      if (playerBox.maxY < obMinY || playerBox.minY > obMaxY) continue;
      return o;
    }
    return null;
  }

  collectTokens(playerX: number, playerY: number, playerZ: number): number {
    let got = 0;
    for (const t of this.tokens) {
      if (t.collected) continue;
      if (Math.abs(t.z - playerZ) > 1.1) continue;
      if (Math.abs(t.group.position.x - playerX) > 0.8) continue;
      if (Math.abs(t.y - (playerY + 0.9)) > 1.1) continue;
      t.collected = true;
      got++;
      t.group.scale.set(1.6, 1.6, 1.6);
      t.group.position.y += 0.4;
    }
    return got;
  }

  passCheck(playerZ: number): number {
    let passed = 0;
    for (const o of this.obstacles) {
      if (!o.passed && o.z > playerZ + 0.5) {
        o.passed = true;
        passed++;
      }
    }
    return passed;
  }
}

function pickKind(themeId?: string): ObstacleKind {
  const r = Math.random();
  if (themeId === "russia") {
    // Russia: bears, snow piles, themed (vodka, ice) + standard
    if (r < 0.15) return "bear";
    if (r < 0.27) return "snowpile";
    if (r < 0.50) return "themed"; // vodka crate / ice patch
    if (r < 0.65) return "barrier";
    if (r < 0.78) return "cone";
    if (r < 0.86) return "block";
    return "beam"; // ~14% — force more slides
  }
  // Other themes: ~42% themed (culture-specific), 58% standard construction
  if (r < 0.42) return "themed";
  if (r < 0.60) return "barrier";
  if (r < 0.76) return "cone";
  if (r < 0.86) return "block";
  return "beam"; // ~14% — force more slides
}

let container67TexCache: THREE.Texture | null = null;
function makeContainer67Tex(): THREE.Texture {
  if (container67TexCache) return container67TexCache;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 180;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 180);
  // Stenciled "67" logo
  ctx.fillStyle = "rgba(250,240,220,0.92)";
  ctx.font = "900 130px -apple-system, Impact, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("67", 128, 85);
  ctx.fillStyle = "rgba(250,240,220,0.7)";
  ctx.font = "700 28px -apple-system, Inter, Arial";
  ctx.fillText("CARGO", 128, 160);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  container67TexCache = tex;
  return tex;
}

/** Generate a procedural ripple normal map for canal water.
 *  Multi-octave wavy pattern that, when animated via UV scroll, gives the
 *  water specular sparkle without an actual reflection shader. */
function makeRippleNormalMap(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  const SIZE = 256;
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Combine 3 sine waves for a varied ripple pattern (height field)
      const u = x / SIZE;
      const v = y / SIZE;
      const h =
        Math.sin(u * 6.28 * 4) * 0.4 +
        Math.sin(v * 6.28 * 5 + 1.7) * 0.3 +
        Math.sin((u + v) * 6.28 * 7 + 3.1) * 0.2 +
        Math.sin((u - v) * 6.28 * 6 + 0.5) * 0.1;
      // Convert height to fake normal (gradient approximation)
      // In a real normal map, R=x-slope, G=y-slope, B=up
      const nx = Math.sin(u * 6.28 * 4) * Math.cos(v * 6.28 * 5);
      const ny = Math.cos(u * 6.28 * 4) * Math.sin(v * 6.28 * 5);
      const idx = (y * SIZE + x) * 4;
      img.data[idx + 0] = Math.floor(((nx * 0.5 + 0.5) + h * 0.05) * 255);
      img.data[idx + 1] = Math.floor(((ny * 0.5 + 0.5) + h * 0.05) * 255);
      img.data[idx + 2] = 255; // up component
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeTokenTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);
  const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  g.addColorStop(0, "#fff3b0");
  g.addColorStop(1, "#ffb800");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a1d00";
  ctx.font = "900 70px -apple-system, Inter, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("67", 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}
