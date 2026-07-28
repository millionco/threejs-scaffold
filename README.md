# ThreeJS app

Bun + Vite + TypeScript + Three.js starter.

## Run

```bash
bun install
bun run dev        # Vite on 127.0.0.1:5173
bun run build      # tsc --noEmit + production bundle
bun run test       # bun:test smoke checks
bun run typecheck  # app + test tsconfigs
```

## Layout

```
src/main.ts          # Three.js entry (swap for task code)
src/style.css
tests/smoke.test.ts  # scaffolding checks
vite.config.ts
tsconfig.json
Dockerfile
```
