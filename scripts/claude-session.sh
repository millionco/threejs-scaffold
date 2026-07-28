#!/usr/bin/env bash
# Launch an interactive Claude Code container session, then export the
# results when you exit.
#
# Each project gets its own private copy of ~/.claude, ~/.claude.json, and
# a bind-mounted app/ folder under ~/.threejs-sessions/<name>/ -- so running
# multiple containers at once never writes to the same files (and never
# touches your real host ~/.claude or repo either).
#
# Usage: scripts/claude-session.sh [project-name]
set -uo pipefail

IMAGE="threejs-scaffold"
BASE_DIR="$HOME/.threejs-sessions"
CLAUDE_CREDS_SRC="$HOME/.claude-docker-creds/.credentials.json"

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

if [ ! -f "$CLAUDE_CREDS_SRC" ]; then
  echo "No exported Claude creds at $CLAUDE_CREDS_SRC"
  echo "Run: security find-generic-password -s \"Claude Code-credentials\" -w > $CLAUDE_CREDS_SRC && chmod 600 $CLAUDE_CREDS_SRC"
  exit 1
fi

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
# Always refresh creds, even on resume, in case the token rotated since.
cp "$CLAUDE_CREDS_SRC" "$CLAUDE_HOME/.credentials.json"
chmod 600 "$CLAUDE_HOME/.credentials.json"

if [ "$RESUME" -eq 0 ]; then
  # Private, per-project Claude config: a fresh copy, not a shared bind mount.
  [ -f "$HOME/.claude/settings.json" ] && cp "$HOME/.claude/settings.json" "$CLAUDE_HOME/settings.json"
  [ -f "$HOME/.claude/CLAUDE.md" ] && cp "$HOME/.claude/CLAUDE.md" "$CLAUDE_HOME/CLAUDE.md"
  if [ -f "$HOME/.claude.json" ]; then
    cp "$HOME/.claude.json" "$CLAUDE_JSON"
  else
    echo '{}' > "$CLAUDE_JSON"
  fi
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

if [ "$RESUME" -eq 1 ]; then
  echo "Resuming existing container ($CONTAINER_STATE)..."
  echo
  docker start -ai "$CONTAINER_NAME"
else
  echo
  docker run -it --name "$CONTAINER_NAME" \
    --shm-size=1gb --memory=4g --cpus=2 \
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
