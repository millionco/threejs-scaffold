FROM oven/bun:1.3.14-debian

# tmux + asciinema are required by tmux-driven agent harnesses (e.g. Harbor's
# terminus-2); procps provides ps for session management; ripgrep/fd-find/jq
# are tools Claude Code commonly shells out to while working in the repo.
# Baked in because network-restricted runs cannot apt-get at trial time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tmux asciinema procps ca-certificates bash curl git \
    ripgrep fd-find jq \
    && ln -s /usr/bin/fdfind /usr/local/bin/fd \
    && rm -rf /var/lib/apt/lists/*

# Claude Code CLI, native installer (no Node/npm required on this bun image).
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/root/.local/bin:${PATH}"
# Container runs as root; this tells Claude Code the root user is an
# intentional, isolated sandbox so --dangerously-skip-permissions is allowed.
ENV IS_SANDBOX=1
# Enables 24-bit color rendering in the interactive shell / Claude Code TUI.
ENV COLORTERM=truecolor
# Throwaway sandbox: no telemetry or error reports, and no self-updating to a
# version other than the one this image pinned at build time.
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
ENV DISABLE_AUTOUPDATER=1

WORKDIR /app

# Dependencies first (cache-friendly), then the app.
COPY package.json bun.lock /app/
RUN bun install --frozen-lockfile

# bun run test / check run a real Chromium via Playwright; install the
# browser and its OS deps at build time since trial runs are offline.
RUN bunx playwright install --with-deps chromium

COPY tsconfig.json vite.config.ts playwright.config.ts index.html /app/
COPY public /app/public
COPY src /app/src
COPY tests /app/tests

# Fold the sandbox flags scripts/claude-session.sh passes in into every
# interactive `claude`, so plain `claude` / `claude --continue` stay locked
# down without anyone having to remember the flags. `command` avoids recursing
# into the function; an unset CLAUDE_SANDBOX_ARGS just means a stock launch.
# Kept last so it never invalidates the expensive dependency layers above.
RUN printf '%s\n' 'claude() { command claude ${CLAUDE_SANDBOX_ARGS-} "$@"; }' >> /root/.bashrc

CMD ["/bin/bash"]
