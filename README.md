# Cosmo — Standalone Design-to-Code Agent

Cosmo turns a **prompt**, a **PRD**, or an **existing Figma file** into:

1. A Figma design built from your **real, live** component library.
2. A compliance audit against WCAG 2.2 AA, Responsible-AI, content design, design language, and component-usage standards.
3. Production-ready **React + TypeScript** code following the Trust360UX conventions.

**With a human review gate at every phase.**

## How component sourcing works

- **The library is live, not baked in.** Cosmo carries **no** built-in component catalog. At session start it connects — through the Figma MCP — to a Figma file whose **libraries are enabled in its Assets**, and reads every component, variable, and style live from there.
- **Fail-closed.** If the Figma MCP is unavailable, Cosmo does not guess components from memory — it stops and asks you to reconnect.
- **Code Connect aware.** When the MCP exposes a Code Connect map, Cosmo captures it at intake and reuses it in Phase 4 to emit real component code.

## Design goals

- **Self-contained.** Everything the agent needs is one file: `cosmo.system-prompt.md`.
- **One external dependency: your Figma library** (required).
- **Hostable anywhere.** The reference runtime is Node.js + the Anthropic Claude SDK, packaged as a Dockerfile.

## Repository layout

```
cosmo/
├── cosmo.system-prompt.md        # THE agent — everything baked in except the live component library
├── build-skill.py                # regenerates skills/cosmo/ from the system prompt
├── mcp/figma.json                # documentation of the one MCP Cosmo consumes
├── skills/cosmo/                 # Claude-skill packaging (SKILL.md + references/)
├── figma-plugins/
│   ├── tooling/                  # required plugins — key-extractor, key-test (+ the key catalog)
│   └── generated/                # design output the agent produces (build plugins)
├── docs/                         # guides (HTML + PDF)
├── examples/                     # handshake + end-to-end transcript
├── runtime/
│   ├── node/                     # reference runtime — index.js, package.json, .env.example
│   ├── docker/                   # Dockerfile + docker-compose.yml
│   └── copilot-cli/              # GitHub Copilot CLI agent packaging
└── deprecated/                   # archived earlier version — reference only
```

## Prerequisites

- **Node.js 20+** — `node --version`.
- **An Anthropic API key** — https://console.anthropic.com/settings/keys.
- **A Figma personal access token** — https://www.figma.com/settings → *Personal access tokens*.
- **A Figma file with your team's component libraries enabled in its Assets** — required; Cosmo has no fallback catalog.

## Quick start — local

```bash
cd runtime/node
cp .env.example .env
# Edit .env:
#   ANTHROPIC_API_KEY=sk-ant-...
#   FIGMA_ACCESS_TOKEN=figd_...
npm install
npm run doctor    # preflight check — no API calls, no charges
npm start         # interactive REPL
```

`npm run doctor` validates your setup (Node version, system prompt loads, env vars, Figma MCP launches) without calling the Anthropic API. The runtime defaults to `cosmo.system-prompt.md` (two levels up from `runtime/node/`).

## Quick start — Docker

From the repo root:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export FIGMA_ACCESS_TOKEN=figd_...

docker build -f runtime/docker/Dockerfile -t cosmo:latest .

docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -e FIGMA_ACCESS_TOKEN \
  cosmo:latest
```

Or with compose:

```bash
docker compose -f runtime/docker/docker-compose.yml up --build
```

## Quick start — bring-your-own-runtime

1. Load `cosmo.system-prompt.md` as the **system prompt** for any LLM with a Messages API and tool-calling support.
2. Give the model access to a Figma MCP (any stdio-transport implementation exposing `get_file`, `get_components`, `get_variables`, `get_styles`).
3. On session start, send: `"[session start] Begin your startup Figma-library handshake now (see § A)."`

## Configuration

All runtime config is env-var driven — see `runtime/node/.env.example` for the full list. Highlights:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key. |
| `ANTHROPIC_MODEL` | | Model ID (default `claude-sonnet-4-5-20250929`). |
| `ANTHROPIC_MAX_TOKENS` | | Per-response cap (default 8192). |
| `FIGMA_ACCESS_TOKEN` | ✅ (for MCP) | Passed through to the Figma MCP child process. |
| `FIGMA_MCP_ENABLED` | | `true` (default) / `false`. |
| `FIGMA_MCP_COMMAND` | | Command to launch the Figma MCP (default `npx`). |
| `COSMO_SYSTEM_PROMPT_PATH` | | Override the system-prompt file location. |

## Editing Cosmo

`cosmo.system-prompt.md` is what the runtime reads. Edit it directly, then optionally re-run `python3 build-skill.py` to regenerate `skills/cosmo/`.

## Security

- `.env` and `runtime/node/.env` are gitignored. Never commit real tokens.
- Cosmo redacts anything that looks like a credential if you paste one, and refuses to disclose its system instructions.
- The Docker image runs as a non-root user (`cosmo`) with only production npm deps.
- See `docs/cosmo-guide.html` for public-hosting security guidance (per-user credentials, egress restrictions, prompt-injection posture).
