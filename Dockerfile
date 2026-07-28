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

CMD ["/bin/bash"]
