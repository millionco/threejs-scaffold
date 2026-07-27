# ThreeJS app

Bun + Vite + TypeScript + Three.js starter for future Three.js tasks.

Toolchain mirrors the `alpha-debug-01` environment conventions (strict TS,
Vite 7, Three `0.185.1`, full-bleed canvas entry) with Bun instead of pnpm.

## Run

```bash
bun install
bunx playwright install chromium   # once, for three-tester
bun run dev        # Vite on 127.0.0.1:5173
bun run build      # tsc --noEmit + production bundle
bun run test       # bun:test smoke checks
bun run test:e2e   # build + three-tester / Playwright
bun run typecheck  # app + test tsconfigs
bun run check      # typecheck + unit + three-tester
bun run preview    # preview the production build
```

## Layout

```
src/main.ts                      # Three.js bootstrap (swap for task code)
src/style.css                    # canvas / HUD chrome
public/                          # static assets
tests/*.test.ts                  # bun:test suite
tests/*.spec.ts                  # three-tester examples (TypeScript)
playwright.config.ts             # three-tester defaults
three-tester-0.1.0.tgz           # vendored three-tester
vite.config.ts
tsconfig.json
Dockerfile
```

## three-tester examples

See `tests/three-tester.examples.spec.ts` for typed examples of `evaluate`,
`observe`, `step`, `readPixels`, and Playwright `page` input against the demo
scene. `tests/demo.spec.ts` covers the scaffolding canvas smoke checks.

Suggested task folders when you grow past the demo scene:

```
src/core/            # simulation / game logic (renderer-free when possible)
src/render/          # Three.js meshes, materials, post
src/ui/              # HUD / overlays
```
