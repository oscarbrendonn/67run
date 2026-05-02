import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSET_BASE } from "./AssetBase";

// Per-kind VISUAL height — how tall the obstacle renders.
// Collision behavior is decided by dodgeType (jump/slide/lane), not visual height.
// LANE-BLOCKERS render taller so the silhouette signals "you can't jump this".
const TARGET_HEIGHT: Record<string, number> = {
  barrier: 1.3,
  cone: 1.1,
  block: 1.8,
  beam: 1.85, // overhead beam — slide UNDER it
  hotdog: 1.5,
  trash: 1.4,
  umbrella: 1.6,
  fruit: 1.3,
  cafetable: 1.2,
  baguette: 1.3,
  ramen: 1.6,
  vending: 2.4,         // LANE — vending machine (tall)
  kebab: 1.6,
  carpet: 1.3,
  phonebox: 2.5,        // LANE — phone booth (very tall)
  mailbox: 1.5,
  icepatch: 0.5,
  vodka: 1.1,
  goldstand: 1.2,
  palmcrate: 0.9,
  // Lane-block kinds: rendered TALL + LONG to feel like real parked
  // vehicles / monuments blocking a lane (Oscar: "büyük bir taksi köşede
  // bekliyor gibi"). Heights bumped, depth cap relaxed below.
  usa_taxi: 4.5,        // LANE — yellow taxi (BIG, "köşede bekliyor gibi")
  usa_hydrant: 1.0,
  usa_newsstand: 3.2,   // LANE — newsstand kiosk
  brazil_surfboard: 3.4, // LANE — standing surfboard
  brazil_drum: 1.2,
  brazil_acai: 1.4,
  france_winebarrel: 1.3,
  france_bistroumbrella: 2.8, // LANE — bistro umbrella tower
  france_arteasel: 2.6,  // LANE — artist easel
  japan_smalltorii: 1.5,
  japan_bento: 1.2,
  japan_sakuratree: 4.0, // LANE — full sakura tree
  turkey_tea: 1.3,
  turkey_simit: 1.3,
  turkey_lokum: 1.2,
  uk_doubledecker: 4.5,  // LANE — double-decker bus (it's huge!)
  uk_fishchips: 1.4,
  uk_lampost: 3.0,       // LANE — Victorian lamppost (taller)
  russia_samovar: 1.4,
  russia_ushanka: 1.3,
  russia_matryoshka: 1.3,
  uae_oilbarrel: 1.2,
  uae_datesyramid: 1.0,
  uae_falcon: 1.4,
  // OVERHEADS — slide-under archway/sign/gate per theme (taller, wider)
  usa_overhead: 3.2,
  brazil_overhead: 3.2,
  france_overhead: 3.2,
  japan_overhead: 3.4,
  turkey_overhead: 3.4,
  uk_overhead: 3.6,
  russia_overhead: 3.2,
  uae_overhead: 3.4,
  egypt_overhead: 3.4,
  italy_overhead: 3.4,
  australia_overhead: 3.4,
  china_overhead: 3.4,
  korea_overhead: 3.4,
  // New theme lane / jump obstacles
  italy_vespa: 1.3,
  italy_fountain: 1.6,
  italy_column: 2.4,
  italy_gelato: 1.4,
  australia_surfboard: 2.2,
  australia_bbq: 1.2,
  australia_kangaroosign: 2.0,
  australia_esky: 1.0,
  china_lantern: 1.6,
  china_dragon: 1.8,
  china_jadevase: 1.4,
  china_dimsum: 1.3,
  korea_kimchi: 1.2,
  korea_kpopsign: 2.0,
  korea_foodcart: 1.5,
  korea_hanbok: 1.8,
};

// Overheads need to span across a lane (wider) — opt out of the strict
// MAX_WIDTH cap.
const OVERHEAD_KINDS = new Set([
  "usa_overhead", "brazil_overhead", "france_overhead", "japan_overhead",
  "turkey_overhead", "uk_overhead", "russia_overhead", "uae_overhead",
  "egypt_overhead", "italy_overhead", "australia_overhead",
  "china_overhead", "korea_overhead",
]);

// Kinds that should keep their natural aspect ratio (LANE blockers).
// These get a more permissive width/depth cap so a bus stays bus-shaped.
const LANE_KINDS = new Set([
  "usa_taxi", "usa_newsstand",
  "uk_doubledecker", "phonebox", "uk_lampost",
  "japan_sakuratree", "vending",
  "france_bistroumbrella", "france_arteasel",
  "brazil_surfboard",
]);

// Max width per lane (player slot is ~1.7 wide, leave margin)
const MAX_WIDTH = 1.7;

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();
const inflightLoads = new Map<string, Promise<THREE.Group | null>>();

/**
 * Preload obstacles for a theme so they're cached before player encounters them.
 * Call when the theme switches.
 */
export function preloadThemeObstacles(themeId: string): void {
  const list = getThemeObstacleList(themeId);
  for (const kind of list) {
    if (!cache.has(kind) && !inflightLoads.has(kind)) {
      // Fire and forget — caches when done
      loadObstacleModel(kind);
    }
  }
}

function getThemeObstacleList(themeId: string): string[] {
  const generic = ["barrier", "cone", "block", "beam"];
  const themed: Record<string, string[]> = {
    usa: ["hotdog", "trash", "usa_taxi", "usa_hydrant", "usa_newsstand"],
    brazil: ["umbrella", "fruit", "brazil_surfboard", "brazil_drum", "brazil_acai"],
    france: ["cafetable", "baguette", "france_winebarrel", "france_bistroumbrella", "france_arteasel"],
    japan: ["ramen", "vending", "japan_smalltorii", "japan_bento", "japan_sakuratree"],
    turkey: ["kebab", "carpet", "turkey_tea", "turkey_simit", "turkey_lokum"],
    uk: ["phonebox", "mailbox", "uk_doubledecker", "uk_fishchips", "uk_lampost"],
    russia: ["icepatch", "vodka", "russia_samovar", "russia_ushanka", "russia_matryoshka"],
    uae: ["goldstand", "palmcrate", "uae_oilbarrel", "uae_datesyramid", "uae_falcon"],
    // Egypt obstacles are primitive-only — nothing to preload
    egypt: [],
  };
  return [...generic, ...(themed[themeId] || [])];
}

export async function loadObstacleModel(kind: string): Promise<THREE.Group | null> {
  const url = `${ASSET_BASE}/models/obstacles/${kind}.glb?v=${__BUILD_VERSION__}`;
  if (cache.has(kind)) {
    return cloneAndPrep(cache.get(kind)!);
  }
  // Avoid duplicate fetches when many obstacles request same kind concurrently
  if (inflightLoads.has(kind)) {
    const w = await inflightLoads.get(kind)!;
    return w ? cloneAndPrep(w) : null;
  }
  const loadPromise = (async (): Promise<THREE.Group | null> => {
    try {
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    let bbox = new THREE.Box3().setFromObject(model);
    let size = bbox.getSize(new THREE.Vector3());
    const targetH = TARGET_HEIGHT[kind] ?? 1.5;
    const isLane = LANE_KINDS.has(kind);
    const isOverhead = OVERHEAD_KINDS.has(kind);
    // Pre-rotate VEHICLE-like lane obstacles so their LONG axis aligns with
    // the road (z), not across it (x). Meshy sometimes generates a taxi as
    // "5m long × 2m wide" but along the X axis, which then gets crushed by
    // our 2.6m width cap and ends up tiny. Detect: if width > depth × 1.3,
    // it's lying sideways → rotate 90° around Y.
    if (isLane && size.x > size.z * 1.3) {
      model.rotation.y = Math.PI / 2;
      model.updateMatrixWorld(true);
      bbox = new THREE.Box3().setFromObject(model);
      size = bbox.getSize(new THREE.Vector3());
    }
    // Scale by HEIGHT (Y axis)
    let scale = targetH / Math.max(0.001, size.y);
    // Width cap: lane-blockers are real-world vehicles/objects (taxi, bus,
    // sphinx) that should look BIG (Oscar: "taksi hala küçük büyüt") — let
    // them spread to 2.6m wide. Visual only — collision is still tight at
    // lane-center ±0.7m so adjacent lanes stay safe.
    const widthAfterScale = size.x * scale;
    const widthCap = isOverhead ? 3.2 : isLane ? 2.6 : MAX_WIDTH;
    if (widthAfterScale > widthCap) {
      scale *= widthCap / widthAfterScale;
    }
    // Depth cap: lane vehicles can be 7m long (NYC taxi ~5m, bus ~10m).
    const depthAfterScale = size.z * scale;
    const MAX_DEPTH = isOverhead ? 1.5 : isLane ? 7.0 : 1.6;
    if (depthAfterScale > MAX_DEPTH) {
      scale *= MAX_DEPTH / depthAfterScale;
    }
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    // Compute centering offset
    const sb = new THREE.Box3().setFromObject(model);
    model.position.x -= (sb.min.x + sb.max.x) / 2;
    model.position.z -= (sb.min.z + sb.max.z) / 2;
    model.position.y -= sb.min.y;
    model.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    // Wrap so the OUTER group can be positioned freely without losing centering
    const wrapper = new THREE.Group();
    wrapper.add(model);
    cache.set(kind, wrapper);
    return wrapper;
    } catch (err) {
      console.warn(`Failed to load obstacle '${kind}':`, err);
      return null;
    }
  })();
  inflightLoads.set(kind, loadPromise);
  const result = await loadPromise;
  inflightLoads.delete(kind);
  return result ? cloneAndPrep(result) : null;
}

function cloneAndPrep(template: THREE.Group): THREE.Group {
  const g = template.clone(true);
  // Random small variation for naturalism
  g.rotation.y = (Math.random() - 0.5) * 0.3;
  return g;
}

/** Map game-side obstacle kinds to GLB file names. */
export function getObstacleFileName(kind: string): string {
  // Generic mappings
  if (kind === "barrier" || kind === "cone" || kind === "block" || kind === "beam") {
    return kind;
  }
  // ThemeObstacles kinds
  switch (kind) {
    case "hotdog": return "hotdog";
    case "trash": return "trash";
    case "umbrella": return "umbrella";
    case "fruit": return "fruit";
    case "cafetable": return "cafetable";
    case "baguette": return "baguette";
    case "ramen": return "ramen";
    case "vending": return "vending";
    case "kebab": return "kebab";
    case "carpet": return "kebab"; // fallback (carpet failed gen)
    case "phonebox": return "phonebox";
    case "mailbox": return "mailbox";
    case "icepatch": return "icepatch";
    case "vodka": return "vodka";
    case "goldstand": return "goldstand";
    case "palmcrate": return "goldstand"; // fallback (palmcrate failed gen)
    default: return kind;
  }
}
