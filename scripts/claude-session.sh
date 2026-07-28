#!/usr/bin/env bash
# Launch an interactive Claude Code container session, then export the
# results when you exit.
#
# Each project gets its own private ~/.claude, ~/.claude.json, and a
# bind-mounted app/ folder under ~/.threejs-sessions/<name>/ -- so running
# multiple containers at once never writes to the same files (and never
# touches your real host ~/.claude or repo either).
#
# The session is also sandboxed: nothing but the auth token crosses over from
# the host config, and Claude Code launches with all customizations off (see
# CLAUDE_SANDBOX_ARGS below), so a run behaves like a stock install.
#
# Usage: scripts/claude-session.sh [project-name]
set -uo pipefail

IMAGE="threejs-scaffold"
BASE_DIR="$HOME/.threejs-sessions"
# Last-resort creds location, for machines where neither the keychain nor the
# file-based store is readable. resolve_creds() below tries the live sources
# first, so this only has to be populated by hand in odd setups.
CLAUDE_CREDS_CACHE="$HOME/.claude-docker-creds/.credentials.json"

# Flags folded into every `claude` invocation inside the container (the image
# defines a shell function that reads this variable).
#   --safe-mode           drops your CLAUDE.md, user/project skills, plugins,
#                         hooks, MCP servers, custom commands/agents, output
#                         styles and themes. Auth, built-in tools and
#                         permissions keep working.
#   --strict-mcp-config   also ignores any .mcp.json committed to the repo;
#                         no --mcp-config is passed, so nothing is left to load.
#   --settings            safe-mode deliberately ignores the auto-discovered
#                         settings.json, so the last few knobs have to be handed
#                         over explicitly. Without this, safe-mode still leaves
#                         all of Anthropic's bundled skills loaded.
#   --dangerously-skip-permissions
#                         no approval prompts. Only reasonable because this is a
#                         throwaway container with its own copy of the repo; the
#                         image sets IS_SANDBOX=1 so running as root is allowed,
#                         and skipDangerousModePermissionPrompt in the settings
#                         below drops the one-time "are you sure" screen.
CLAUDE_SANDBOX_ARGS="--safe-mode --strict-mcp-config --dangerously-skip-permissions --settings /root/.claude/sandbox-settings.json"

NAME="${1:-session-$(date +%Y%m%d-%H%M%S)}"
CONTAINER_NAME="threejs-$NAME"
RAW_DIR="$BASE_DIR/$NAME"
CLAUDE_HOME="$RAW_DIR/claude-home"
CLAUDE_JSON="$RAW_DIR/claude.json"
APP_DIR="$RAW_DIR/app"
TRANSCRIPT_DIR="$RAW_DIR/transcript"
ZIP_PATH="$BASE_DIR/$NAME.zip"

# Reproducible build/tooling output, not real work product (mirrors
# .gitignore) — left out of the zip only; the raw app/ folder keeps them
# so a resumed session doesn't need to reinstall anything.
EXCLUDES=(node_modules dist .vite .cache artifacts playwright-report test-results .DS_Store)

echo "Building image '$IMAGE' (cached layers reused if unchanged)..."
docker build -t "$IMAGE" . || { echo "Build failed."; exit 1; }

# Claude Code keeps its OAuth token in the OS keychain on some machines and in
# a plain file on others, so try both rather than depending on one. Every
# candidate is content-checked: a failed `security ... > file` redirect leaves a
# 0-byte file behind, and an existence test would happily hand that to the
# container, which then fails as a confusing "not logged in" inside Claude.
usable_creds() { [ -s "$1" ] && grep -q accessToken "$1" 2>/dev/null; }

resolve_creds() {
  local dest="$1" src
  if security find-generic-password -s "Claude Code-credentials" -w > "$dest" 2>/dev/null \
     && usable_creds "$dest"; then
    return 0
  fi
  for src in "$HOME/.claude/.credentials.json" "$CLAUDE_CREDS_CACHE"; do
    if usable_creds "$src"; then
      cp "$src" "$dest"
      return 0
    fi
  done
  rm -f "$dest"
  return 1
}

RESUME=0
CONTAINER_STATE=""
if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  CONTAINER_STATE=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME")
fi

if [ "$CONTAINER_STATE" = "running" ]; then
  echo "Container $CONTAINER_NAME is already running. Attach with:"
  echo "  docker attach $CONTAINER_NAME"
  exit 1
elif [ -n "$CONTAINER_STATE" ]; then
  RESUME=1
fi

mkdir -p "$CLAUDE_HOME"
# Always re-resolve, even on resume, in case the token rotated since.
if ! resolve_creds "$CLAUDE_HOME/.credentials.json"; then
  echo "Could not find a usable Claude login on this machine. Tried:"
  echo "  keychain item \"Claude Code-credentials\""
  echo "  $HOME/.claude/.credentials.json"
  echo "  $CLAUDE_CREDS_CACHE"
  echo "Run 'claude' on the host and log in, then try again."
  exit 1
fi
chmod 600 "$CLAUDE_HOME/.credentials.json"

# Rewritten every launch so edits here take effect without recreating the
# container. Named apart from settings.json on purpose: this is loaded only
# because CLAUDE_SANDBOX_ARGS passes it to --settings, never auto-discovered.
cat > "$CLAUDE_HOME/sandbox-settings.json" <<'JSON'
{
  "disableBundledSkills": true,
  "disableAllHooks": true,
  "disableClaudeAiConnectors": true,
  "includeCoAuthoredBy": false,
  "skipDangerousModePermissionPrompt": true
}
JSON

if [ "$RESUME" -eq 0 ]; then
  # Nothing else is carried over from the host: no settings.json (hooks,
  # enabled plugins, extra marketplaces), no global CLAUDE.md, and no
  # .claude.json (MCP servers plus every project you have ever opened).
  # The container gets a fresh config holding only enough state to skip
  # onboarding and the folder-trust prompt.
  cat > "$CLAUDE_JSON" <<'JSON'
{
  "hasCompletedOnboarding": true,
  "theme": "dark",
  "autoUpdates": false,
  "projects": {
    "/app": {
      "hasTrustDialogAccepted": true,
      "hasCompletedProjectOnboarding": true,
      "bypassPermissionsModeAccepted": true
    }
  }
}
JSON
fi

if [ ! -d "$APP_DIR" ]; then
  echo "Seeding app/ from the image..."
  mkdir -p "$APP_DIR"
  SEED_CONTAINER="${CONTAINER_NAME}-seed"
  docker create --name "$SEED_CONTAINER" "$IMAGE" >/dev/null
  docker cp "$SEED_CONTAINER:/app/." "$APP_DIR"
  docker rm "$SEED_CONTAINER" >/dev/null
fi

echo "Project:                $NAME"
echo "Container:               $CONTAINER_NAME"
echo "Isolated Claude config:  $CLAUDE_HOME"
echo "App folder (mounted):    $APP_DIR"
echo "Sandbox flags:           claude $CLAUDE_SANDBOX_ARGS"

if [ "$RESUME" -eq 1 ]; then
  echo "Resuming existing container ($CONTAINER_STATE)..."
  echo
  docker start -ai "$CONTAINER_NAME"
else
  echo
  docker run -it --name "$CONTAINER_NAME" \
    --shm-size=1gb --memory=4g --cpus=2 \
    -e CLAUDE_SANDBOX_ARGS="$CLAUDE_SANDBOX_ARGS" \
    -v "$CLAUDE_HOME:/root/.claude" \
    -v "$CLAUDE_JSON:/root/.claude.json" \
    -v "$APP_DIR:/app" \
    "$IMAGE"
fi
EXIT_CODE=$?

# Always reset terminal state here, on every exit path (clean or crashed) --
# tmux / the Claude Code TUI can leave mouse-tracking or bracketed-paste
# mode on, which leaks raw escape codes into the prompts below otherwise.
printf '\e[?1000l\e[?1002l\e[?1003l\e[?1006l\e[?1015l\e[?2004l'
stty sane 2>/dev/null || true

if [ "$EXIT_CODE" -ne 0 ]; then
  echo
  echo "Container exited with code $EXIT_CODE (possible crash, e.g. OOM kill)."
  echo "app/ is a live mount, so nothing was lost. To resume:"
  echo "  ./scripts/claude-session.sh $NAME   (or: docker start -ai $CONTAINER_NAME)"
  echo "Then inside the shell, pick up Claude Code's prior conversation with:"
  echo "  claude --continue     # resume the most recent session"
  echo "  claude --resume       # pick a specific past session"
fi

echo
echo "Container exited."

rm -rf "$TRANSCRIPT_DIR"
mkdir -p "$TRANSCRIPT_DIR"
if [ -d "$CLAUDE_HOME/projects/-app" ]; then
  cp "$CLAUDE_HOME/projects/-app"/*.jsonl "$TRANSCRIPT_DIR/" 2>/dev/null
fi

echo
read -r -p "Package everything into a zip? [y/N] " ANSWER
case "$ANSWER" in
  [yY]*)
    ZIP_EXCLUDES=("app/*.log")
    for name in "${EXCLUDES[@]}"; do
      ZIP_EXCLUDES+=("app/$name" "app/$name/*")
    done
    (cd "$RAW_DIR" && zip -rq "$ZIP_PATH" app transcript -x "${ZIP_EXCLUDES[@]}")
    docker rm "$CONTAINER_NAME" >/dev/null

    echo
    echo "Zip:          $ZIP_PATH"
    echo "Raw folders:  $RAW_DIR"
    echo "Cleanup:      rm -rf $RAW_DIR"
    ;;
  *)
    echo
    echo "Raw folders:  $RAW_DIR"
    echo "Continue:     ./scripts/claude-session.sh $NAME   (or: docker start -ai $CONTAINER_NAME)"
    echo "Cleanup:      docker rm -f $CONTAINER_NAME; rm -rf $RAW_DIR"
    ;;
esac
