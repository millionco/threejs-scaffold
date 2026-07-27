FROM oven/bun:1.3.14-debian

# tmux + asciinema are required by tmux-driven agent harnesses (e.g. Harbor's
# terminus-2); procps provides ps for session management. Baked in because
# network-restricted runs cannot apt-get at trial time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tmux asciinema procps ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first (cache-friendly), then the app. The agent works offline;
# node_modules is baked into the image.
COPY package.json bun.lock /app/
RUN bun install --frozen-lockfile

COPY tsconfig.json vite.config.ts index.html README.md /app/
COPY public /app/public
COPY src /app/src
COPY tests /app/tests
