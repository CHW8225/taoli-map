# Offline 3D Taoli Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the online AMap/Loca stage with a fully offline, interactive 3D China map while preserving the tested student timeline, year colors, local/overseas treatments, and responsive ceremony experience.

**Architecture:** Keep `TaoliExperience` as the playback owner and pass its derived state into an `OfflineMapStage`. Build all route, point, opacity, and camera decisions in pure TypeScript modules; the React map component only manages the ECharts-GL lifecycle and falls back to the existing SVG renderer when WebGL initialization fails.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, ECharts 5.6, ECharts-GL 2.0.9, local China GeoJSON, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-11-offline-3d-taoli-map-design.md`

## Global Constraints

- Runtime must work without internet, AMap keys, CDN assets, online fonts, geocoding, or remote images.
- Do not read, modify, stop, or reuse the polysaccharide database or its production port `3100`.
- Keep `students.csv` as the single student-list source and preserve all existing normalization rules.
- Preserve 陈永=2025届, 成宇峰=2008届, 岳泰新=2016届, and include 2026届.
- Overseas students never receive domestic map coordinates; Yangling-local students never receive zero-length routes.
- Ceremony mode locks the camera; browse mode permits rotate, zoom, and tilt.
- Each graduation year retains its unique `getYearColor(year)` color.
- All implementation work follows red-green-refactor; no production behavior is added before its failing test.

## Review Focus

- A missing or malformed China GeoJSON must render the SVG fallback rather than a blank canvas; Task 4 tests this failure.
- Repeated students at one location must create separate routes but one aggregated destination point; Task 2 tests both counts.
- A WebGL context/init failure must leave timeline and people navigation usable; Tasks 4 and 5 test the component boundary.
- Fullscreen/responsive resizing must call the chart resize path without creating another instance; Task 4 tests observer cleanup and resize.
- Offline launch support must never terminate unrelated processes or use port `3100`; Task 6 tests the launcher text and documented behavior.

---

### Task 1: Add the offline map data and runtime dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/data/china-map.ts`
- Create: `src/data/china-map.test.ts`
- Create: `src/types/china-geojson.d.ts`
- Create: `docs/map-data-source.md`

**Interfaces:**
- Produces: `CHINA_MAP_NAME: "china"`, `CHINA_GEOJSON: GeoJSON.FeatureCollection` from `src/data/china-map.ts`.
- Consumes: none.

- [ ] **Step 1: Write the failing GeoJSON contract tests**

  Add tests asserting that `CHINA_GEOJSON.type === "FeatureCollection"`, it has at least 30 named features, every feature has Polygon/MultiPolygon geometry, and the serialized data contains no `http://` or `https://` runtime URL.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `npm test -- src/data/china-map.test.ts`

  Expected: FAIL because `src/data/china-map.ts` does not exist.

- [ ] **Step 3: Add pinned dependencies and the typed local data adapter**

  Add `echarts@5.6.0`, `echarts-gl@2.0.9`, `china-geojson@1.0.0`, and `@types/geojson`. Export the national GeoJSON through `src/data/china-map.ts`, add only the declaration needed for the package JSON import, and document package source, version, retrieval date, license status, and the non-survey disclaimer in `docs/map-data-source.md`.

- [ ] **Step 4: Run focused and full tests**

  Run: `npm test -- src/data/china-map.test.ts && npm test`

  Expected: GeoJSON contract passes; existing suite remains green.

- [ ] **Step 5: Commit**

  Run: `git add package.json package-lock.json src/data/china-map.ts src/data/china-map.test.ts src/types/china-geojson.d.ts docs/map-data-source.md && git commit -m "feat: add offline china map data"`

### Task 2: Build deterministic 3D scene data

**Files:**
- Create: `src/domain/map-scene.ts`
- Create: `src/domain/map-scene.test.ts`

**Interfaces:**
- Consumes: `StudentRecord`, `LocationPoint`, `ORIGIN`, and `getYearColor(year)`.
- Produces: `buildMapScene(input: MapSceneInput): MapScene`, `buildArcCoordinates(origin, destination, lane): MapCoordinate3D[]`, and the `MapScene`, `RouteDatum`, `DestinationDatum`, `MapCoordinate3D` types.

- [ ] **Step 1: Write failing scene transformation tests**

  Cover: one route per remote domestic student; overseas and Yangling-local students excluded from routes; Yangling-local activation exposed as `originBloom`; repeated destinations yield separate routes plus one point with `count`; route color equals `getYearColor(year)`; finale/completed routes have lower opacity; arc endpoints match the source/destination and intermediate altitude is positive.

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `npm test -- src/domain/map-scene.test.ts`

  Expected: FAIL because `buildMapScene` is missing.

- [ ] **Step 3: Implement the pure scene builder**

  Generate a 32-sample sine-eased altitude arc for each route. Use lane index to vary peak altitude for students sharing a location. Keep aggregation keyed by `locationKey`, and keep every function independent of DOM or ECharts.

- [ ] **Step 4: Run focused and full tests**

  Run: `npm test -- src/domain/map-scene.test.ts && npm test`

  Expected: scene tests and full suite pass.

- [ ] **Step 5: Commit**

  Run: `git add src/domain/map-scene.ts src/domain/map-scene.test.ts && git commit -m "feat: build offline 3d map scenes"`

### Task 3: Define camera policy and ECharts option construction

**Files:**
- Create: `src/domain/camera-policy.ts`
- Create: `src/domain/camera-policy.test.ts`
- Create: `src/domain/map-option.ts`
- Create: `src/domain/map-option.test.ts`

**Interfaces:**
- Consumes: `MapScene`, `CHINA_MAP_NAME`, `ceremonyMode`, `reducedMotion`, and `finale`.
- Produces: `createCameraPolicy(input: CameraPolicyInput): CameraPolicy` and `createMapOption(scene: MapScene, policy: CameraPolicy): EChartsOption`.

- [ ] **Step 1: Write failing camera-policy tests**

  Assert ceremony mode uses zero rotate/zoom sensitivity and a fixed approximately 45-degree view; browse mode has non-zero rotate/zoom sensitivity; reduced motion disables automatic camera transitions; finale selects the wider overview distance.

- [ ] **Step 2: Run camera tests and verify RED**

  Run: `npm test -- src/domain/camera-policy.test.ts`

  Expected: FAIL because `createCameraPolicy` is missing.

- [ ] **Step 3: Implement the camera policy and verify GREEN**

  Run: `npm test -- src/domain/camera-policy.test.ts`

  Expected: PASS.

- [ ] **Step 4: Write failing ECharts option tests**

  Assert the option contains one `geo3D`, one `lines3D`, destination `scatter3D`, and a gold Yangling origin `scatter3D`; routes use their year color and per-route opacity; tooltip data exposes location count; every series uses the local `china` registration name and contains no URL.

- [ ] **Step 5: Run option tests and verify RED**

  Run: `npm test -- src/domain/map-option.test.ts`

  Expected: FAIL because `createMapOption` is missing.

- [ ] **Step 6: Implement the minimal option builder and run the suite**

  Run: `npm test -- src/domain/map-option.test.ts && npm test`

  Expected: option tests and full suite pass.

- [ ] **Step 7: Commit**

  Run: `git add src/domain/camera-policy.ts src/domain/camera-policy.test.ts src/domain/map-option.ts src/domain/map-option.test.ts && git commit -m "feat: define 3d map camera and rendering options"`

### Task 4: Implement the offline ECharts-GL stage with SVG fallback

**Files:**
- Create: `src/lib/offline-map-runtime.ts`
- Create: `src/components/FallbackMap.tsx`
- Create: `src/components/OfflineMapStage.tsx`
- Replace: `src/components/MapStage.test.tsx`
- Delete: `src/components/MapStage.tsx`

**Interfaces:**
- Consumes: `locations`, `visibleStudents`, `activeStudent`, `finale`, and `ceremonyMode`; uses Tasks 1–3 outputs.
- Produces: `OfflineMapStage(props: OfflineMapStageProps)` and a reusable `FallbackMap` preserving year-colored routes, origin bloom, and overseas beam.

- [ ] **Step 1: Rewrite map component tests before implementation**

  Mock only `loadOfflineMapRuntime()`. Test that successful loading registers local GeoJSON once and calls `setOption`; ceremony mode passes locked camera options; initialization rejection renders `data-testid="map-fallback"`; malformed map data renders fallback; Yangling-local activation adds the fallback bloom without a route; a mocked `ResizeObserver` calls `resize()` and disconnects on unmount; clicking a destination exposes all students at that location.

- [ ] **Step 2: Run component tests and verify RED**

  Run: `npm test -- src/components/MapStage.test.tsx`

  Expected: FAIL because `OfflineMapStage` and runtime loader are missing.

- [ ] **Step 3: Implement the dynamic runtime loader and components**

  Dynamically import `echarts` and `echarts-gl` on the client, initialize exactly one chart per mount, register `CHINA_GEOJSON`, update options from pure builders, attach one resize observer, handle init/context errors, and dispose chart/observer during cleanup. Keep the existing SVG route rendering in `FallbackMap` with authorization copy removed.

- [ ] **Step 4: Run focused and full tests**

  Run: `npm test -- src/components/MapStage.test.tsx && npm test`

  Expected: map component tests and full suite pass without unhandled promise warnings.

- [ ] **Step 5: Commit**

  Run: `git add src/lib/offline-map-runtime.ts src/components/FallbackMap.tsx src/components/OfflineMapStage.tsx src/components/MapStage.test.tsx src/components/MapStage.tsx && git commit -m "feat: render the alumni map fully offline in 3d"`

### Task 5: Integrate the offline stage and remove AMap runtime code

**Files:**
- Modify: `src/components/TaoliExperience.tsx`
- Modify: `src/components/TaoliExperience.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `next.config.ts`
- Create: `src/offline-contract.test.ts`
- Delete: `src/app/api/amap/[...path]/route.ts`
- Delete: `src/domain/amap-proxy.ts`
- Delete: `src/domain/amap-proxy.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `OfflineMapStage` from Task 4.
- Produces: application entrypoints with no `amapKey` prop, no AMap proxy, and no AMap environment requirement.

- [ ] **Step 1: Update experience tests and add an offline source contract test**

  Change all `TaoliExperience` renders to omit `amapKey`, expect the opening flow to show the offline 3D stage rather than “等待地图授权”, and assert ceremony mode reaches `OfflineMapStage` with interaction lock. Add a test that scans runtime source/config/package dependencies and rejects `AMapLoader`, `_AMapService`, `NEXT_PUBLIC_AMAP_KEY`, `AMAP_SECURITY_CODE`, `amap-jsapi-loader`, `http://`, and `https://` references outside provenance/documentation files.

- [ ] **Step 2: Run integration tests and verify RED**

  Run: `npm test -- src/components/TaoliExperience.test.tsx src/offline-contract.test.ts`

  Expected: FAIL because the AMap prop, loader, rewrite, proxy, and dependency still exist.

- [ ] **Step 3: Replace the integration and remove online map code**

  Import `OfflineMapStage`, pass `ceremonyMode`, remove `amapKey` from the public interface and page, remove the rewrite/API/proxy, remove AMap environment examples, and uninstall `@amap/amap-jsapi-loader`.

- [ ] **Step 4: Run focused tests, full tests, and typecheck**

  Run: `npm test -- src/components/TaoliExperience.test.tsx src/offline-contract.test.ts && npm test && npm run typecheck`

  Expected: all commands exit 0 and no AMap runtime reference remains.

- [ ] **Step 5: Commit**

  Run: `git add -A && git commit -m "refactor: remove online amap dependency"`

### Task 6: Finish the 3D visual system and safe offline launcher

**Files:**
- Modify: `src/app/globals.css`
- Create: `start-taoli-map.bat`
- Modify: `README.md`
- Create: `src/offline-launcher.test.ts`

**Interfaces:**
- Consumes: CSS class structure from `OfflineMapStage`, `FallbackMap`, and `TaoliExperience`.
- Produces: the approved deep-space blue floating stage and a Windows launch path using local port `3219`.

- [ ] **Step 1: Write the failing launcher safety test**

  Assert `start-taoli-map.bat` uses `127.0.0.1:3219`, opens `?mode=ceremony`, requires a completed production build, contains no `3100`, and contains no `taskkill`, `Stop-Process`, wildcard process lookup, or delete command.

- [ ] **Step 2: Run launcher test and verify RED**

  Run: `npm test -- src/offline-launcher.test.ts`

  Expected: FAIL because the launcher does not exist.

- [ ] **Step 3: Add the launcher and update operator documentation**

  Make the batch file start this project in a separately titled console and open the ceremony URL only after a short local readiness loop. Document first build, one-click start, shutdown by closing that titled console, browse-mode URL, offline verification, 1080p backup recording, and the explicit guarantee that port `3100` is untouched.

- [ ] **Step 4: Apply the approved visual styling**

  Add the deep-navy raised-map shell, local perspective grid, gold origin treatment, destination tooltip/panel styling, reduced-motion rules, and responsive 1920×1080, 3840×2160, 1366×768, and mobile breakpoints. Remove AMap-specific CSS only when its replacement exists.

- [ ] **Step 5: Run launcher, full-suite, type, and production build checks**

  Run: `npm test -- src/offline-launcher.test.ts && npm test && npm run typecheck && npm run build`

  Expected: all commands exit 0.

- [ ] **Step 6: Commit**

  Run: `git add start-taoli-map.bat README.md src/app/globals.css src/offline-launcher.test.ts && git commit -m "feat: add the offline ceremony launcher"`

### Task 7: Browser acceptance and final regression gate

**Files:**
- Modify only if browser acceptance exposes a defect, with a failing regression test first.
- Create: `docs/verification/offline-3d-acceptance.md`

**Interfaces:**
- Consumes: completed application from Tasks 1–6.
- Produces: recorded acceptance evidence and a release-ready local experience.

- [ ] **Step 1: Run the complete automated gate from a clean production build**

  Run: `npm test && npm run typecheck && npm run build`

  Expected: zero failed tests, zero type errors, build exit 0.

- [ ] **Step 2: Start the production app on port 3219 and verify offline network behavior**

  Load both `/` and `/?mode=ceremony`, disable external network access in browser tooling, and confirm no request leaves `127.0.0.1`. Verify map render, playback, pause/resume, previous/next year, speed selection, finale, local bloom, and overseas card behavior.

- [ ] **Step 3: Verify interaction and responsive views**

  In ceremony mode, verify mouse/touch cannot rotate or zoom; in browse mode, verify rotation, zoom, and tilt. Inspect 1920×1080, 3840×2160, 1366×768, and a common mobile viewport. Confirm resize/fullscreen does not stretch or duplicate the WebGL canvas.

- [ ] **Step 4: Verify named data invariants and record evidence**

  Confirm 陈永 appears in 2025, 成宇峰 in 2008, 岳泰新 in 2016, Yangling-local students have no zero-length line, and all three overseas students only use the overseas card. Record commands, browser results, limitations, and the map-data disclaimer in `docs/verification/offline-3d-acceptance.md`.

- [ ] **Step 5: Commit acceptance evidence**

  Run: `git add docs/verification/offline-3d-acceptance.md && git commit -m "test: record offline 3d acceptance"`

- [ ] **Step 6: Request a fresh whole-branch review and handle findings**

  Use the required final reviewer from the selected execution skill. Re-grade findings by user impact; fix Critical/Important findings with RED→GREEN tests and rerun the full suite, while reporting deferred Minor findings.
