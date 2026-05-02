import * as THREE from "three";

export interface Theme {
  id: string;
  city: string;
  country: string;
  flag: string; // emoji
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  ground: number;
  grass: number;
  buildingPalette: number[];
  neonA: number;
  neonB: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  landmark:
    | "liberty" | "christ" | "eiffel" | "pagoda" | "bigben"
    | "basil" | "hagia" | "burj" | "pyramids"
    | "colosseum" | "opera" | "pearl" | "seoultower";
}

export const THEMES: Theme[] = [
  // 1. USA — Washington DC / NYC
  {
    id: "usa",
    city: "NEW YORK",
    country: "USA",
    flag: "US",
    sky: 0x6ea2d4,
    fog: 0x6ea2d4,
    fogNear: 38,
    fogFar: 180,
    ground: 0x3a3e4a,
    grass: 0x1a3a24,
    buildingPalette: [0x7a8ba0, 0x8a7060, 0x606878, 0xa89078, 0x4a5268],
    neonA: 0xffd257,
    neonB: 0xff4d6d,
    sunColor: 0xffeac5,
    sunIntensity: 1.9,
    hemiSky: 0x9bc4ee,
    hemiGround: 0x2a2d3a,
  landmark: "liberty",
  },
  // 2. Brazil — Rio (mavi tropikal gökyüzü, sunset değil — Oscar:
  // "hava her yerde mavi olacak, böyle sarı falan yapma")
  {
    id: "brazil",
    city: "RIO DE JANEIRO",
    country: "BRAZIL",
    flag: "BR",
    sky: 0x6cb0d8,        // tropikal mavi
    fog: 0x9cc4dc,        // hafif daha açık fog
    fogNear: 40,
    fogFar: 200,
    ground: 0x4a3a32,
    // Was 0x8a6a48 — Oscar: "açık sarı kötü, kalitesiz". Daha koyu
    // toprak-kahve, less yellow.
    grass: 0x5e4830,
    buildingPalette: [0xe8d5a0, 0xc89068, 0xa0603a, 0xd89878, 0xb07050],
    neonA: 0x2ed177,
    neonB: 0xffd257,
    sunColor: 0xfff5dd,   // beyaz-sıcak güneş
    sunIntensity: 1.9,
    hemiSky: 0xa8c8e0,    // mavi gök yansıması
    hemiGround: 0x2a1f12,
    landmark: "christ",
  },
  // 3. France — Paris
  {
    id: "france",
    city: "PARIS",
    country: "FRANCE",
    flag: "FR",
    sky: 0xb8c8d8,
    fog: 0xb8c8d8,
    fogNear: 38,
    fogFar: 190,
    ground: 0x4a4640,
    grass: 0x2a4a28,
    buildingPalette: [0xe8dcc4, 0xd4c4a8, 0xb8a080, 0xc8b898, 0xe0d4b8],
    neonA: 0x4d7eff,
    neonB: 0xff4d6d,
    sunColor: 0xfff1d0,
    sunIntensity: 1.6,
    hemiSky: 0xc8d8ee,
    hemiGround: 0x403838,
    landmark: "eiffel",
  },
  // 4. Japan — Tokyo (gece + yağmur — Oscar: "Japonya'da akşam olabilir
  // siyah, yağmur yapabilirsin"). Koyu siyah-mavi sky, ay ışığı, neon
  // accent rengi sokağa pop verir.
  {
    id: "japan",
    city: "TOKYO",
    country: "JAPAN",
    flag: "JP",
    sky: 0x0a0e1c,         // koyu gece (was 0x3a2050 mor)
    fog: 0x0a0e1c,
    fogNear: 32,
    fogFar: 160,
    ground: 0x1a1a2a,
    grass: 0x2a1a3a,
    buildingPalette: [0x2a2a3e, 0x3a2a4a, 0x1a1a28, 0x2a1a38, 0x4a2a5a],
    neonA: 0xff2e9c,
    neonB: 0x2ee0ff,
    sunColor: 0x5a7aa8,    // mavi ay ışığı (was 0xff8aff pembe)
    sunIntensity: 0.9,
    hemiSky: 0x1a2030,     // koyu lacivert
    hemiGround: 0x0a0a18,
    landmark: "pagoda",
  },
  // 5. Turkey — Istanbul (Boğaz mavi gökyüzü, sunset değil)
  {
    id: "turkey",
    city: "ISTANBUL",
    country: "TURKEY",
    flag: "TR",
    sky: 0x88b4cc,        // boğaz mavi
    fog: 0xb0c8d8,
    fogNear: 38,
    fogFar: 190,
    ground: 0x3a2e28,
    grass: 0x2a3a22,
    buildingPalette: [0xc8a878, 0xa88058, 0xd8b888, 0x886848, 0xb89868],
    neonA: 0xff8a00,
    neonB: 0x28a8b8,
    sunColor: 0xfff5e0,
    sunIntensity: 1.8,
    hemiSky: 0xb0c8d8,
    hemiGround: 0x3a2a1a,
    landmark: "hagia",
  },
  // 6. UK — London
  {
    id: "uk",
    city: "LONDON",
    country: "UK",
    flag: "GB",
    sky: 0x94a4b8,
    fog: 0x94a4b8,
    fogNear: 32,
    fogFar: 160,
    ground: 0x383a46,
    grass: 0x28402a,
    buildingPalette: [0x585868, 0x706878, 0x484858, 0x887868, 0x686878],
    neonA: 0xd42838,
    neonB: 0x3a5a9c,
    sunColor: 0xe8e0d0,
    sunIntensity: 1.3,
    hemiSky: 0xa8b8c8,
    hemiGround: 0x303038,
    landmark: "bigben",
  },
  // 7. Russia — Moscow
  {
    id: "russia",
    city: "MOSCOW",
    country: "RUSSIA",
    flag: "RU",
    sky: 0x8296b0,
    fog: 0x8296b0,
    fogNear: 32,
    fogFar: 160,
    ground: 0x2a2e3a,
    grass: 0x202838,
    buildingPalette: [0x8a3838, 0xa85858, 0x582838, 0x784858, 0x984848],
    neonA: 0xffd257,
    neonB: 0xff4d6d,
    sunColor: 0xfff0d0,
    sunIntensity: 1.5,
    hemiSky: 0x8a9cb8,
    hemiGround: 0x2a2838,
    landmark: "basil",
  },
  // 8. UAE — Dubai (çöl mavi gündüz)
  {
    id: "uae",
    city: "DUBAI",
    country: "UAE",
    flag: "AE",
    sky: 0x80b8d8,
    fog: 0xa8c8dc,
    fogNear: 40,
    fogFar: 200,
    ground: 0x6a5038,
    grass: 0x5a4028,
    buildingPalette: [0xe8c898, 0xfff0c8, 0xd8a868, 0xfff8e0, 0xc89878],
    neonA: 0x28b8ff,
    neonB: 0xffd257,
    sunColor: 0xfff5e0,
    sunIntensity: 2.0,
    hemiSky: 0xb0d0e0,
    hemiGround: 0x3a2818,
    landmark: "burj",
  },
  // 9. Egypt — Cairo (Pyramids + Nile + sand) — açık mavi çöl gökyüzü
  {
    id: "egypt",
    city: "CAIRO",
    country: "EGYPT",
    flag: "EG",
    sky: 0x9cc0d8,
    fog: 0xb8d0e0,
    fogNear: 42,
    fogFar: 210,
    // Was 0xc8a060 / 0xa88040 (parlak sarı kum) — Oscar: "sarı çirkin
    // duruyor, kalitesiz". Reddish-brown desert tones now.
    ground: 0x7a5a36,
    grass: 0x5e4628,
    buildingPalette: [0xc8a070, 0xa07840, 0x8a6038, 0xb88860, 0x96704a],
    neonA: 0xff8a30,
    neonB: 0x28a0c0,
    sunColor: 0xfff5dd,
    sunIntensity: 2.1,
    hemiSky: 0xc0d8e8,
    hemiGround: 0x4a3220,
    landmark: "pyramids",
  },
  // 10. Italy — Rome (Akdeniz mavisi, Kolezyum, taş cobblestone)
  { id: "italy", city: "ROME", country: "ITALY", flag: "IT",
    sky: 0x4a8acc, fog: 0x9ec0dc, fogNear: 40, fogFar: 200,
    ground: 0x6a5848, grass: 0x3a5230,
    buildingPalette: [0xd8b888, 0xb88858, 0xc8a070, 0xa07848, 0xe8d4b0],
    neonA: 0xc83838, neonB: 0x2a8050,
    sunColor: 0xfff5dd, sunIntensity: 1.9,
    hemiSky: 0xb0c8dc, hemiGround: 0x4a382a,
    landmark: "colosseum" },
  // 11. Australia — Sydney (sahil mavi, Opera Binası)
  { id: "australia", city: "SYDNEY", country: "AUSTRALIA", flag: "AU",
    sky: 0x5ac0e8, fog: 0xb8dcec, fogNear: 42, fogFar: 210,
    ground: 0x9a7a52, grass: 0x4a6838,
    buildingPalette: [0xeeeeee, 0xc8b8a0, 0xa89878, 0xd0b888, 0xb8a890],
    neonA: 0xff8a3a, neonB: 0x2a78c8,
    sunColor: 0xfffff0, sunIntensity: 2.1,
    hemiSky: 0xc8e4ec, hemiGround: 0x6a5838,
    landmark: "opera" },
  // 12. China — Shanghai (gece neon + Pearl Tower)
  { id: "china", city: "SHANGHAI", country: "CHINA", flag: "CN",
    sky: 0x182030, fog: 0x182030, fogNear: 32, fogFar: 160,
    ground: 0x2a1a1a, grass: 0x1a1818,
    buildingPalette: [0x8a2a2a, 0xc83838, 0x602020, 0xa84848, 0xffd247],
    neonA: 0xff2030, neonB: 0xffd247,
    sunColor: 0x6080b0, sunIntensity: 1.0,
    hemiSky: 0x2a3850, hemiGround: 0x1a1010,
    landmark: "pearl" },
  // 13. South Korea — Seoul (gündüz mavi, N Seoul Tower)
  { id: "korea", city: "SEOUL", country: "SOUTH KOREA", flag: "KR",
    sky: 0x6aacd8, fog: 0x9cc4dc, fogNear: 38, fogFar: 190,
    ground: 0x383a44, grass: 0x3a4438,
    buildingPalette: [0xd8d8d8, 0xb8b8c0, 0x707080, 0x484858, 0x9890a0],
    neonA: 0xff5078, neonB: 0x2ed0ff,
    sunColor: 0xfff5e0, sunIntensity: 1.8,
    hemiSky: 0xb0c8dc, hemiGround: 0x303038,
    landmark: "seoultower" },
];

/** Linear blend between two themes for smooth transitions */
export function blendThemes(a: Theme, b: Theme, t: number): Theme {
  const c = (ca: number, cb: number) => {
    const colA = new THREE.Color(ca);
    const colB = new THREE.Color(cb);
    return colA.lerp(colB, t).getHex();
  };
  const n = (na: number, nb: number) => na + (nb - na) * t;
  return {
    ...b,
    sky: c(a.sky, b.sky),
    fog: c(a.fog, b.fog),
    fogNear: n(a.fogNear, b.fogNear),
    fogFar: n(a.fogFar, b.fogFar),
    ground: c(a.ground, b.ground),
    grass: c(a.grass, b.grass),
    neonA: c(a.neonA, b.neonA),
    neonB: c(a.neonB, b.neonB),
    sunColor: c(a.sunColor, b.sunColor),
    sunIntensity: n(a.sunIntensity, b.sunIntensity),
    hemiSky: c(a.hemiSky, b.hemiSky),
    hemiGround: c(a.hemiGround, b.hemiGround),
  };
}
