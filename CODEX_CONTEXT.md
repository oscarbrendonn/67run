# 67 Runner — Codex Handoff (2026-05-01)

> Mav (Oscar's streamer character) endless-runner across 9 countries.
> Subway-Surfers-style. 67Kid chases, player collects 67-coins.

## Where the projects live

```
/Users/oscarbrendon/.openclaw/workspace/67-runner    ← PBR / "realistic" build
/Users/oscarbrendon/.openclaw/workspace/67-runner2   ← Toon / "cartoon" A/B variant
/tmp/67run-assets                                   ← GLB asset repo (jsDelivr CDN clone)
```

GitHub:
- `oscarbrendonn/67run` (game code, both variants live in separate folders inside their own repos that we keep in sync)
- `oscarbrendonn/67run-assets` (~120 GLBs, served via jsDelivr at `cdn.jsdelivr.net/gh/oscarbrendonn/67run-assets@main`)

Local preview:
- `cd 67-runner  && npm run dev`     → `http://localhost:5173`
- `cd 67-runner  && npm run build && npx vite preview --port 4173 --host` → `http://localhost:4173`
- `cd 67-runner2 && npx vite preview --port 4174 --host` → `http://localhost:4174`

## Stack

- Vite + TypeScript + Three.js 0.170 + postprocessing 6.36
- `vite-plugin-singlefile` → builds to one self-contained `dist/index.html`
- GLTFLoader + AnimationMixer (crossfade between idle/run/jump/slide/dead)
- Cache-busted GLB URLs via `?v=${__BUILD_VERSION__}` (defined in vite.config.ts)
- `MeshToonMaterial` cel-shading in 67-runner2 only (`src/game/CartoonStyle.ts`)
- Local routing: `src/game/AssetBase.ts` — `localhost` ⇒ `/models/...`, internet ⇒ jsDelivr CDN

## Recent work (this session)

1. **3-layer building wall**  (`src/game/World.ts` in both projects)
   - Was 4-per-z-position (front + back) → now **6-per-z (front + mid + back)**
   - `BUILDING_COUNT = 78`, `slot % 6` layout, `Math.floor(slotMod/2)` is row tier
   - Three innerEdge tiers: front 4.0–4.3m, mid 8.5–9.7m, back 13–14.8m from road center
   - Z-stagger per tier (0, 1/3 SPACING, 2/3 SPACING) → brick pattern, no sky leak
   - Cycle distance: `(BUILDING_COUNT / 6) * BUILDING_SPACING`

2. **9 country landmarks (Meshy.ai 3D)**  (`src/game/LandmarkLoader.ts`)
   - usa_liberty, brazil_christ, france_eiffel, japan_pagoda, turkey_hagia, uk_bigben, russia_basil, uae_burj, egypt_pyramids
   - Lazy-loaded via spawnLandmark, falls back to primitive if 404
   - Per-kind TARGET_HEIGHT: liberty 32m, eiffel 50m, burj 60m, pagoda 35m, etc.
   - Live on jsDelivr CDN (`/models/landmarks/{theme}_{kind}.glb`)

3. **English-only leaderboard**  (`src/game/Leaderboard.ts`)
   - Was: MOSKOVA / ATINA / PEKIN / SEUL / KAHIRE / VIYANA / etc. (Turkish spellings)
   - Now: MOSCOW / ATHENS / BEIJING / SEOUL / CAIRO / VIENNA / etc.
   - `KEY_BOARD = "67runner.leaderboard.v3"` (bumped from v2 to invalidate old localStorage)

4. **Per-theme grounds**  (`src/game/Ground.ts`)
   - Brazil = beach with shells + wave lines (`makeBeach`)
   - Russia = snow, Egypt/UAE = sand, France/UK = cobblestone, Japan = wet asphalt + neon
   - Sidewalk concrete darkened from `#7a7a7e` → `#5a5a5e` (Oscar: "kaldırım çok açık")

5. **Theme URL flicker fix**  (`src/game/Game.ts:108-117`)
   - `?theme=X` parsed at `init()` instead of `start()` — prevents 1-2s of NYC primitives showing before swap

6. **Width-aware building positioning**
   - GLB road-facing edge now sits at fixed `innerEdge` regardless of GLB width — no more buildings spilling into road
   - Random rotation applied BEFORE bbox measurement so width reflects rotated mesh

## Open visual fronts where Codex could push further

- **Lighting tuning**: PBR build still feels a bit flat in midday themes. Could add per-theme HDRI env or stronger sun angle.
- **Ground reflection**: Wet asphalt in Tokyo barely reads as wet — the normal map exists but specular is weak.
- **Distant fog band**: A soft volumetric fog at z = -90..-110 would smooth the building wall horizon.
- **Crowd / props**: Sidewalks empty. Could add NPC silhouettes (low-poly toon figures) every ~30m.
- **Sky variety**: All themes share one SkyDome shader. Could add cloud layers, sun position per timezone.
- **67-coin VFX**: Pickup currently a flat sprite. Bloom + particle burst would feel premium.
- **Death camera**: Snap-zoom on Mav when caught is abrupt. Could ease over 0.4s with shake.

## How to verify the recent changes

```bash
# 1. NYC 3-layer check
open http://localhost:4173/?theme=usa
# Tap to run, watch the buildings — front/mid/back tiers should be visible

# 2. Brazil check (Christ the Redeemer should appear in distance)
open http://localhost:4173/?theme=brazil

# 3. Leaderboard English check
# Open the start screen, scroll the TOP 100 — no Turkish spellings should remain

# 4. Toon variant
open http://localhost:4174/?theme=usa
```

## Asset pipeline (Meshy)

Scripts live in `/tmp/`:
- `submit_landmarks.sh` — POSTs preview tasks
- `process_landmarks.sh` — polls preview → refines → polls refine → downloads → pushes to `67run-assets`

Token: `msy_ts2yI9AboHiC8tCR44SQhoikJrhcQPJ5T7si` (in scripts; rotate before going public).

To add a new GLB: drop a line in `/tmp/landmark_prompts.txt` (`name|prompt`), run `submit_landmarks.sh`, then `process_landmarks.sh`.
