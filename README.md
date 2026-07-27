# ThreeJS app

Bun + Vite + TypeScript + Three.js starter for future Three.js tasks.

Toolchain mirrors the `alpha-debug-01` environment conventions (strict TS,
Vite 7, Three `0.185.1`, full-bleed canvas entry) with Bun instead of pnpm.

## Run

```bash
bun install
bun run dev        # Vite on 127.0.0.1:5173
bun run build      # tsc --noEmit + production bundle
bun test           # smoke checks
bun run typecheck  # app + test tsconfigs
bun run check      # typecheck + test + build
bun run preview    # preview the production build
```

## Layout

```
src/main.ts          # Three.js bootstrap (swap for task code)
src/style.css        # canvas / HUD chrome
public/              # static assets
tests/               # bun:test suite
vite.config.ts
tsconfig.json
Dockerfile           # Harbor-style image with deps baked in
```

Suggested task folders when you grow past the demo scene:

```
src/core/            # simulation / game logic (renderer-free when possible)
src/render/          # Three.js meshes, materials, post
src/ui/              # HUD / overlays
```
