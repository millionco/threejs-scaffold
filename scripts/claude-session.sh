#!/usr/bin/env bash
# Launch an interactive Claude Code container session, then export the
# results when you exit.
#
# Each project gets its own private copy of ~/.claude and ~/.claude.json,
# so running multiple containers at once never writes to the same files
# (and never touches your real host ~/.claude either).
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
# .gitignore) — stripped from the export, public/ and other real assets stay.
EXCLUDES=(node_modules dist .vite .cache artifacts playwright-report test-results .DS_Store)

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "Image '$IMAGE' not found, building it..."
  docker build -t "$IMAGE" . || { echo "Build failed."; exit 1; }
fi

if [ ! -f "$CLAUDE_CREDS_SRC" ]; then
  echo "No exported Claude creds at $CLAUDE_CREDS_SRC"
  echo "Run: security find-generic-password -s \"Claude Code-credentials\" -w > $CLAUDE_CREDS_SRC && chmod 600 $CLAUDE_CREDS_SRC"
  exit 1
fi

if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  echo "A container named $CONTAINER_NAME already exists. Pick a different project name or clean it up:"
  echo "  docker rm -f $CONTAINER_NAME"
  exit 1
fi

# Private, per-project Claude config: a fresh copy, not a shared bind mount.
mkdir -p "$CLAUDE_HOME"
cp "$CLAUDE_CREDS_SRC" "$CLAUDE_HOME/.credentials.json"
chmod 600 "$CLAUDE_HOME/.credentials.json"
[ -f "$HOME/.claude/settings.json" ] && cp "$HOME/.claude/settings.json" "$CLAUDE_HOME/settings.json"
[ -f "$HOME/.claude/CLAUDE.md" ] && cp "$HOME/.claude/CLAUDE.md" "$CLAUDE_HOME/CLAUDE.md"
if [ -f "$HOME/.claude.json" ]; then
  cp "$HOME/.claude.json" "$CLAUDE_JSON"
else
  echo '{}' > "$CLAUDE_JSON"
fi

echo "Project:                $NAME"
echo "Container:               $CONTAINER_NAME"
echo "Isolated Claude config:  $CLAUDE_HOME"
echo

docker run -it --name "$CONTAINER_NAME" \
  --shm-size=1gb --memory=4g --cpus=2 \
  -v "$CLAUDE_HOME:/root/.claude" \
  -v "$CLAUDE_JSON:/root/.claude.json" \
  "$IMAGE"
EXIT_CODE=$?

if [ "$EXIT_CODE" -ne 0 ]; then
  echo
  echo "Container exited with code $EXIT_CODE (possible crash, e.g. OOM kill)."
  echo "The container and its /app state are still there. To resume:"
  echo "  docker start -ai $CONTAINER_NAME"
  echo "Then inside the shell, pick up Claude Code's prior conversation with:"
  echo "  claude --continue     # resume the most recent session"
  echo "  claude --resume       # pick a specific past session"
fi

echo
echo "Container exited. Pulling raw files out..."

rm -rf "$APP_DIR"
docker cp "$CONTAINER_NAME:/app" "$APP_DIR"

for name in "${EXCLUDES[@]}"; do
  rm -rf "${APP_DIR:?}/$name"
done
find "$APP_DIR" -name '*.log' -delete

rm -rf "$TRANSCRIPT_DIR"
mkdir -p "$TRANSCRIPT_DIR"
if [ -d "$CLAUDE_HOME/projects/-app" ]; then
  cp "$CLAUDE_HOME/projects/-app"/*.jsonl "$TRANSCRIPT_DIR/" 2>/dev/null
fi

echo
read -r -p "Package everything into a zip? [y/N] " ANSWER
case "$ANSWER" in
  [yY]*)
    (cd "$RAW_DIR" && zip -rq "$ZIP_PATH" app transcript)
    docker rm "$CONTAINER_NAME" >/dev/null

    echo
    echo "Zip:          $ZIP_PATH"
    echo "Raw folders:  $RAW_DIR"
    echo "Cleanup:      docker rmi $IMAGE && rm -rf $RAW_DIR"
    echo "              (removes the raw folders and the docker image, keeps the zip)"
    ;;
  *)
    echo
    echo "Raw folders:  $RAW_DIR"
    echo "Continue:     docker start -ai $CONTAINER_NAME"
    echo "Cleanup:      docker rm -f $CONTAINER_NAME && docker rmi $IMAGE && rm -rf $RAW_DIR"
    ;;
esac
