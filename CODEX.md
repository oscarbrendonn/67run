# 67 Runner — Codex Handoff

> **You are collaborating with Oscar on this game.** Claude has been building it. This doc brings you up to speed. Read it fully before editing.

## 1. Workspace

```
/Users/oscarbrendon/.openclaw/workspace/67-runner/
```

Open this folder in your editor / Codex CLI.

## 2. What This Is

An endless runner game inspired by **Subway Surfers World Tour**. Main character **Mav** (blonde kid in a "67" shirt) runs across themed cities dodging obstacles and collecting 67 coins while a hooded **67Kid** chases him. Themes rotate: NYC → Rio → Paris → Tokyo → Istanbul → London → Moscow → Dubai.

This is part of Oscar's **67 ecosystem** (the "67" Solana meme/streamer project). Goal: ship a free-to-play web game in the next couple weeks; NFTs come later.

## 3. Run It

```bash
cd /Users/oscarbrendon/.openclaw/workspace/67-runner
npm install           # first time only
npm run dev           # Vite dev server on http://localhost:5173
```

**If `npm run dev` errors with `libsimdjson.29.dylib not found`** (broken node install on this Mac):
```bash
ln -sf /opt/homebrew/opt/simdjson/lib/libsimdjson.33.dylib /opt/homebrew/opt/simdjson/lib/libsimdjson.29.dylib
```

## 4. Tech Stack

- **Vite** + **TypeScript** (strict)
- **Three.js 0.170** (3D)
- **postprocessing** 6.36 (bloom, vignette, SMAA, hue/saturation)

No framework (no React). Pure TS + Three.js. DOM is used for HUD overlay only.

## 5. Project Layout

```
67-runner/
├── index.html                       # HUD structure (overlays, banners, fly meter)
├── src/
│   ├── main.ts                      # Bootstrap; exposes window.__game for debug
│   ├── style.css                    # All HUD/overlay CSS
│   └── game/
│       ├── Game.ts                  # Main loop, scene, camera, post-processing, theme switching, level, shake, powerup handling
│       ├── UI.ts                    # DOM HUD: setScore/setCoins/showGameOver/scorePop/setFlyMeter
│       ├── Input.ts                 # Keyboard (WASD + arrows + space) + touch swipes
│       ├── Player.ts                # Mav: lanes, jump, slide, FLY state, invincibility
│       ├── Chaser.ts                # 67Kid (hooded). Stays far behind camera, rushes forward on death
│       ├── Character.ts             # Primitive character builder: sphere head + CANVAS CARTOON FACE (big blue eyes, laughing mouth, freckles)
│       ├── Themes.ts                # 8 country themes (colors, fog, palette, landmark kind)
│       ├── ThemeBuildings.ts        # Architecturally distinct buildings per country (NYC skyscraper, Paris Haussmann, etc.)
│       ├── StreetProps.ts           # Themed props: palm/cherry/pine/sakura/torii/lantern/flag/bear/snowman/firebarrel/taxi
│       ├── Flags.ts                 # Canvas-drawn flag textures (US stripes+stars, BR diamond, JP sun, TR crescent, etc.)
│       ├── Landmarks.ts             # Big iconic landmarks (Eiffel LATTICE truss, Liberty, Christ, Big Ben, Hagia Sophia, Basil, Burj)
│       ├── Horizon.ts               # 112 silhouette buildings in 2 rings around player (fills horizon — no black gaps)
│       ├── World.ts                 # THE big file: ground, segments, obstacles, tokens, buildings, props, landmarks, tunnels, POWERUPS
│       ├── Tunnel.ts                # Rare subway tunnels (arches + portal + 67 graffiti + neon rim). BackSide materials so camera sees through
│       ├── Textures.ts              # Canvas-generated asphalt + grass textures (cracks, noise, flowers)
│       ├── Particles.ts             # Pooled particles: coinBurst / dust / crash
│       ├── Weather.ts               # Snow + AURORA BOREALIS (Russia only)
│       ├── SpeedLines.ts            # White streaks flying past camera at high speed
│       ├── FlyingCar.ts             # 🚗 Sports car mesh + jet thrusters. Used for pickup + Mav's ride during fly mode
│       └── AssetLoader.ts           # GLB loader (currently unused — ready for Ready Player Me avatar integration)
├── public/                          # (empty) — drop .glb files here if importing real models
├── package.json
└── CODEX.md                         # this file
```

## 6. Core Game Loop Concepts

**World scrolls; player stays at z=0.** Everything (obstacles, tokens, buildings, landmarks, tunnels, powerups) moves toward +z. Camera at (0, 5.5, 8) looks at (0, 1.5, -8).

**Theme switching.** Every 450m `Game.checkThemeSwitch()` rotates through `THEMES`. On switch, `Game.applyTheme(theme)` runs:
- `scene.background` + `scene.fog` = theme.sky (matched so no seam)
- Sun/hemi/rim lights recolored
- `world.setTheme()` — fully rebuilds buildings (each theme has different architecture) AND props (palm in Rio, cherry in Tokyo, snowpine+bear+snowman+firebarrel in Russia)
- `weather.setActive(theme.id === "russia")` — snow + aurora only in Russia
- `horizon.setTheme()` — silhouette buildings retinted

**Level system.** Every 250m → level++. Target run speed: `14 + level*2.2`, capped 38.

**Obstacle kinds** (in `World.addObstacle`):
- `barrier` — striped construction barrier with yellow warning lights
- `cone` — traffic cone with reflective bands
- `block` — shipping container with door + rust + 67 logo
- `beam` — scaffolding beam with safety stripes + red strobes (jump OVER or slide UNDER: hits 1.35-1.85y only)
- `bear` — menacing bear rearing up (Russia only, 20% chance). 2.5m tall — can't jump over, must lane switch
- `snowpile` — snow mound (Russia only, 20% chance)

Theme-aware spawn via `pickKind(themeId)`.

**Power-ups** (just added, may need polish):
- `flying car` — rare (~every 500-800m). Spawns at y=1.8 with blue glow ring underneath.
- Pickup → `Player.startFly()` → `state = "fly"`, lifts to y=3.2, car model appears under Mav with jet thrusters visible, invincible for 100m.
- `Player.isInvincible()` true during fly, so `checkObstacleHit` is skipped.
- HUD shows "FLY CAR" meter bar (`UI.setFlyMeter`).
- On distance expiration, `Player.endFly()` drops back to ground.

**Tunnels** — rare (cooldown 500m+, 8% chance). 6-9 arches + entrance/exit portal. Walls/roof use `THREE.BackSide` so camera sees through from outside but player sees inside. No point lights (use emissive materials only). 67 graffiti tags + neon rims.

## 7. Debug Hooks

In browser devtools console (`window.__game` exposed from `main.ts`):

```js
const g = window.__game;

// Force a theme
import('/src/game/Themes.ts').then(m => g.applyTheme(m.THEMES[6], true)); // Moscow

// Force tunnel
g.world.spawnTunnel(-30);

// Force flying car pickup
g.player.startFly();

// Force snow immediately
g.weather.setActive(true);
for (let i = 0; i < 40; i++) g.weather.update(0.1);

// Jump distance forward
g.distance = 2720; // Russia region

// Test particles
g.particles.coinBurst(0, 2, 0);
g.particles.crash(0, 0, 0);

// Check state
g.phase; g.themeIndex; g.level; g.runSpeed;
```

**Preview panel throttling:** when the Claude Code preview tab loses focus, `requestAnimationFrame` throttles heavily. Game loop effectively freezes. Solution: take a screenshot to restore focus, or do testing in a regular browser tab.

## 8. Oscar's Rules (memory — important)

- **NEVER commit this project under the `67coin` account** unless Oscar asks. Separate git identity. This project lives at `/Users/oscarbrendon/.openclaw/workspace/67-runner` independent of `eliteshape.rs` (which is a different project Oscar also works on).
- **Always screenshot before pushing visual changes.** Oscar wants to review before you commit.
- **This is NOT eliteshape.rs.** Don't touch `/Users/oscarbrendon/.openclaw/workspace/eliteshape.rs/**`.
- Communicate in **Turkish**. Oscar writes in Turkish.

## 9. What I (Claude) Just Built

In the latest session:

1. **Realistic cartoon face** — replaced 3D sphere eyes (uncanny doll) with detailed canvas face texture: big almond eyes with blue iris + highlights + eyelashes, open laughing mouth with teeth + tongue, nose, freckles, rosy cheeks. On spherical head.
2. **Filled horizon** — no black gaps. Matched fog color = sky color. Grass planes extended to 200 wide. `Horizon` class adds 112 silhouette buildings in 2 rings around player.
3. **Theme-specific architecture** — each country now builds its own buildings (`ThemeBuildings.ts`). NYC has skyscrapers with water towers + art deco + brownstones + glass towers. Paris has Haussmann cream facades with mansard roofs and balconies. Tokyo has narrow neon towers with vertical signs + pagodas. Rio has favelas (stacked colorful boxes) + Copacabana beachfront + colorful houses. Moscow has Stalin Seven Sisters tower + St Basil's onion domes + concrete apartments. Istanbul has mosque with dome + 2 minarets + Ottoman houses + red tile roofs. London has Victorian red brick + Georgian stucco + Gherkin glass. Dubai has tapered glass tower with emissive edges + curved modern + sandstone souq.
4. **Russia WOW** — aurora borealis (5 colored translucent strips waving in sky, Russia only), bear obstacle (rearing with red glowing eyes + claws, lane blocker), snowpile obstacle, snowman prop (with ushanka + red star + red scarf), fire barrel prop (orange flame + glow).
5. **Upgraded obstacles** — striped construction barrier with warning lights, proper traffic cone with reflective bands, shipping container with door + rust + 67 logo, scaffolding beam with safety stripes + red strobes.
6. **Flying Car power-up** — rare spawn, 100m flight. Detailed sports car mesh with wheels + windshield + headlights + taillights + 67 hood decal + jet thrusters (only visible when flying). Blue glow ring under pickup. HUD meter + toast. Player invincibility during fly.
7. **Score popups** — "+25" floats up and fades when collecting coins (DOM element).
8. **Speed lines** — white streaks flying past camera at high speed (Subway-style).
9. **Camera shake** on crash.
10. **Country flags** — canvas-drawn flags on poles for each theme (US stars+stripes, BR diamond, JP sun, TR crescent, UK Union Jack, RU tricolor, FR vertical, AE with red bar).

## 10. What's NOT Built (pick your priority)

Oscar's open wishlist:
- **Sound/music** — biggest missing "Subway feel" element. Suggest Howler.js + CC0 freesound tracks. BGM per theme + coin SFX + jump/land + crash + fly start.
- **Real Mav face** — Ready Player Me avatar (Oscar uploads selfie, exports GLB), drop in `public/models/mav.glb`, wire up via `AssetLoader` + `CharacterModel.ts` (already has the loader scaffolding).
- **More creative obstacles per theme** — Oscar explicitly asked. Japan ninja? Brazil carnival masks? Currently only Russia is themed.
- **Mobile polish** — touch swipes work, but HUD scaling and button sizes not tuned.
- **Hoverboard** — similar to flying car but shorter, maybe every 200m.
- **Coin magnet / 2x score** power-ups.
- **Daily missions / skins** — Subway-style progression.
- **Leaderboard** — backend needed.

## 11. Active Todo (mid-implementation)

When Claude wrapped this session, **the flying car power-up integration is essentially complete** — pickup spawn, player fly state, HUD meter, toast, invincibility. It may need:
- Verification in preview (spawn rate feel, pickup hitbox feel, car visibility under Mav)
- Tuning FLY_DISTANCE_M and FLY_HEIGHT in `Player.ts`
- Possibly adding a subtle camera dolly-back when flying starts

The **obstacle upgrades** are complete (barrier, cone, block, beam all rewritten).

The **Russia WOW** is complete (aurora, bear, snowman, fire barrel, intensified snow).

If Oscar reports issues, check these areas first:
- Does `Player.car` render under Mav during fly? (check position/scale in `Player.startFly`)
- Does HUD fly meter update smoothly? (`setFlyMeter` in Game step)
- Does pickup detection work? (`World.collectPowerup` hitbox at x±1.0, y±1.6, z±1.3)

## 12. How to Continue

If Oscar asks for:
- **"ses ekle"** (add sound) → Install `howler`, create `src/game/Audio.ts`, add BGM per theme with crossfade on theme change. Get CC0 tracks from freesound.org or Pixabay.
- **"daha fazla yaratıcı engel"** (more creative obstacles) → Add theme-specific obstacles (japan: torii beam, brazil: carnival float, paris: baguette cart, etc.) in `pickKind()`.
- **"hoverboard"** → Copy `FlyingCar.ts` approach with shorter duration + different mesh.
- **"gerçek mav"** (real Mav) → Ready Player Me avatar, or Fiverr custom.

### Good editing patterns

- Always check `World.ts` is properly reset on `world.reset()` when adding new spawned objects (need cleanup + new arrays).
- Scroll logic lives in `World.scroll(dz, playerZ)` — any scrolling object must be moved there.
- Theme change triggers `world.setTheme()` which rebuilds buildings + props. Weather/horizon also react.
- Keep `window.__game` debug exposure in `main.ts` for easy devtools testing.

### Don't

- Don't add `THREE.PointLight` in loops (per-arch, per-prop). Kills FPS. Use `emissive` materials instead.
- Don't cast shadows on tunnel meshes (perf + visual glitches).
- Don't assume RAF runs at 60fps in the preview panel — it throttles. Take a screenshot to restore tab focus when eval-testing.

---

**Questions?** Oscar's preference is always to ship fast and make it feel "wow". Lean toward more visual density, particles, emissive elements, quick dopamine hits (score pops, level-up toasts, coin bursts).
