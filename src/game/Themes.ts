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
  landmark: "liberty" | "christ" | "eiffel" | "pagoda" | "bigben" | "basil" | "hagia" | "burj" | "pyramids";
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
  // 2. Brazil — Rio
  {
    id: "brazil",
    city: "RIO DE JANEIRO",
    country: "BRAZIL",
    flag: "BR",
    sky: 0xf7b370,
    fog: 0xf7b370,
    fogNear: 40,
    fogFar: 200,
    ground: 0x4a3a32,
    grass: 0x1e5a2a,
    buildingPalette: [0xe8d5a0, 0xc89068, 0xa0603a, 0xd89878, 0xb07050],
    neonA: 0x2ed177,
    neonB: 0xffd257,
    sunColor: 0xffb87a,
    sunIntensity: 2.0,
    hemiSky: 0xffc08a,
    hemiGround: 0x3a2a1a,
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
  // 4. Japan — Tokyo
  {
    id: "japan",
    city: "TOKYO",
    country: "JAPAN",
    flag: "JP",
    sky: 0x3a2050,
    fog: 0x3a2050,
    fogNear: 32,
    fogFar: 160,
    ground: 0x1a1a2a,
    grass: 0x2a1a3a,
    buildingPalette: [0x2a2a3e, 0x3a2a4a, 0x1a1a28, 0x2a1a38, 0x4a2a5a],
    neonA: 0xff2e9c,
    neonB: 0x2ee0ff,
    sunColor: 0xff8aff,
    sunIntensity: 1.2,
    hemiSky: 0x6a3aa8,
    hemiGround: 0x1a0a2a,
    landmark: "pagoda",
  },
  // 5. Turkey — Istanbul
  {
    id: "turkey",
    city: "ISTANBUL",
    country: "TURKEY",
    flag: "TR",
    sky: 0xe8a070,
    fog: 0xe8a070,
    fogNear: 38,
    fogFar: 190,
    ground: 0x3a2e28,
    grass: 0x2a3a22,
    buildingPalette: [0xc8a878, 0xa88058, 0xd8b888, 0x886848, 0xb89868],
    neonA: 0xff8a00,
    neonB: 0x28a8b8,
    sunColor: 0xff9a58,
    sunIntensity: 1.9,
    hemiSky: 0xe8a878,
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
  // 8. UAE — Dubai
  {
    id: "uae",
    city: "DUBAI",
    country: "UAE",
    flag: "AE",
    sky: 0xffa060,
    fog: 0xffa060,
    fogNear: 40,
    fogFar: 200,
    ground: 0x6a5038,
    grass: 0x5a4028,
    buildingPalette: [0xe8c898, 0xfff0c8, 0xd8a868, 0xfff8e0, 0xc89878],
    neonA: 0x28b8ff,
    neonB: 0xffd257,
    sunColor: 0xff9060,
    sunIntensity: 2.1,
    hemiSky: 0xffa880,
    hemiGround: 0x3a2818,
    landmark: "burj",
  },
  // 9. Egypt — Cairo (Pyramids + Nile + sand)
  {
    id: "egypt",
    city: "CAIRO",
    country: "EGYPT",
    flag: "EG",
    sky: 0xf5c878,        // golden desert sky
    fog: 0xf5c878,
    fogNear: 42,
    fogFar: 210,
    ground: 0xc8a060,     // sandy stone
    grass: 0xa88040,      // dry desert
    buildingPalette: [0xe8c890, 0xc8a060, 0xa07840, 0xd8b878, 0xb89060],
    neonA: 0xffd230,      // gold accents (hieroglyph color)
    neonB: 0x28a0c0,      // Nile blue
    sunColor: 0xfff0c0,
    sunIntensity: 2.2,
    hemiSky: 0xf8d090,
    hemiGround: 0x6a4828,
    landmark: "pyramids",
  },
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
