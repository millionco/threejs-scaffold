# ThreeJS app

Bun + Vite + TypeScript + Three.js starter.

## Run

```bash
bun install
bun run dev        # Vite on 127.0.0.1:5173
bun run build      # tsc --noEmit + production bundle
bun run test       # Playwright smoke test + screenshot
bun run typecheck  # app + test tsconfigs
```

## Layout

```
src/main.ts          # Three.js entry (swap for task code)
src/style.css
tests/smoke.test.ts  # five-second browser smoke test
playwright.config.ts
vite.config.ts
tsconfig.json
Dockerfile
```

## Docker (interactive, with your Claude Code auth)

The image drops into `/bin/bash` and has the `claude` CLI installed. It does
not carry your auth by itself — Claude Code stores its token in the macOS
Keychain, not in a file, so you export it once per machine.

```bash
# 1. Build the image
docker build -t threejs-scaffold .

# 2. Export your Keychain session to a standalone file (one-time, or whenever
#    the token expires and `claude` asks you to log in again). Never prints
#    the secret to the terminal.
mkdir -p ~/.claude-docker-creds
security find-generic-password -s "Claude Code-credentials" -w \
  > ~/.claude-docker-creds/.credentials.json
chmod 600 ~/.claude-docker-creds/.credentials.json

# 3. Run, mounting your real ~/.claude config plus the exported credentials
docker run -it \
  -v ~/.claude:/root/.claude \
  -v ~/.claude-docker-creds/.credentials.json:/root/.claude/.credentials.json \
  -v ~/.claude.json:/root/.claude.json \
  threejs-scaffold
```

Inside the container shell, run `claude` — no login prompt.

If it errors with `--dangerously-skip-permissions cannot be used with
root/sudo`, that's because the container runs as root and your mounted
`settings.json` has `defaultMode: bypassPermissions`. The image already sets
`IS_SANDBOX=1` to tell Claude Code this root user is an intentional,
isolated sandbox, so a rebuild (`docker build -t threejs-scaffold .`) fixes
it. To unblock a container that's already running without rebuilding, run
`IS_SANDBOX=1 claude` instead.
