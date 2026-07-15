# Cosmo runtime — Docker image.
#
# Build:
#   docker build -f runtime/docker/Dockerfile -t cosmo:latest .
#     (run from the plugin root — the build context is the whole cosmo/ folder)
#
# Run:
#   docker run --rm -it \
#     -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
#     -e FIGMA_ACCESS_TOKEN=$FIGMA_ACCESS_TOKEN \
#     cosmo:latest
#
# Notes:
# - Runs as a non-root user.
# - Bundles the system prompt at /app/cosmo.system-prompt.md.
# - Includes npx so the default Figma MCP command (`npx -y figma-developer-mcp`)
#   works out of the box.

FROM node:20-alpine AS runtime

# System deps: git (some MCP servers clone repos on first run), tini for signal handling.
RUN apk add --no-cache git tini

# Non-root user
RUN addgroup -S cosmo && adduser -S cosmo -G cosmo

WORKDIR /app

# --- Install runtime deps (only production) -----------------------------------
COPY --chown=cosmo:cosmo runtime/node/package.json ./runtime/node/package.json
RUN cd runtime/node && npm install --omit=dev

# --- Copy the standalone agent asset ------------------------------------------
COPY --chown=cosmo:cosmo cosmo.system-prompt.md /app/cosmo.system-prompt.md
COPY --chown=cosmo:cosmo runtime/node/index.js      /app/runtime/node/index.js

# Point the runtime at the bundled system prompt.
ENV COSMO_SYSTEM_PROMPT_PATH=/app/cosmo.system-prompt.md
ENV NODE_ENV=production

# Sensible defaults; override via `docker run -e ...`.
ENV FIGMA_MCP_ENABLED=true \
    FIGMA_MCP_COMMAND=npx \
    FIGMA_MCP_ARGS="-y,figma-developer-mcp" \
    ANTHROPIC_MODEL=claude-sonnet-4-5-20250929 \
    ANTHROPIC_MAX_TOKENS=8192

USER cosmo

ENTRYPOINT ["/sbin/tini", "--", "node", "/app/runtime/node/index.js"]
