# ThreeJS app

Bun + Vite + TypeScript + Three.js starter.

## Run

```bash
bun install
bun run dev          # Vite on 127.0.0.1:5173
bun run typecheck    # incremental app + test typecheck
bun run test:smoke   # fast browser health, no captures
bun run check:fast   # typecheck + browser health
bun run check:final  # typecheck + production build + visual captures
```

Batch related edits. Run `check:fast` only at meaningful milestones and
`check:final` once near completion. Both commands wait for their own bounded
subprocesses and return one JSON result; do not background them or poll logs.

## Layout

```
src/main.ts          # Three.js entry (swap for task code)
src/style.css
tests/browser-health.smoke.test.ts # fast screenshot-free health check
tests/smoke.test.ts          # final interaction and capture check
playwright.config.ts
vite.config.ts
tsconfig.json
tsconfig.check.json
scripts/verify.mjs
Dockerfile
```
