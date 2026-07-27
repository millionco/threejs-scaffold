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
tests/demo.spec.ts               # three-tester samples
playwright.config.ts             # three-tester defaults
three-tester-0.1.0.tgz           # vendored three-tester
vite.config.ts
tsconfig.json
Dockerfile
```

## three-tester samples

`tests/demo.spec.ts` covers `evaluate`, `observe` / `step`, page input, and
`captureVisualObjects`. The vendored `three-tester-0.1.0.tgz` matches the
vt-minis task package. `index.html` includes a `/__three__/` import map so
visual capture can resolve bare `three` during Playwright runs.