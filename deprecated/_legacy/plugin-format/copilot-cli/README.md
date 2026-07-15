# Cosmo for GitHub Copilot CLI

This folder is the **Copilot CLI adapter** for the Cosmo plugin. The Copilot CLI uses a different agent format than the Agency-CLI marketplace format used by `../plugin.json` and `../agents/cosmo.md`. This adapter regenerates a Copilot-CLI-native `.agent.yaml` from the source markdown and installs everything into the directories Copilot CLI discovers.

## Directory contract (verified against Copilot CLI 1.0.69)

| What | Personal (per-user) | Project (per-repo) |
|---|---|---|
| Agents | `~/.copilot/agents/*.agent.yaml` | `.github/agents/*.agent.yaml` |
| Skills | `~/.copilot/skills/<name>/SKILL.md` | `.github/skills/<name>/SKILL.md`, `.agents/skills/<name>/SKILL.md`, `.claude/skills/<name>/SKILL.md` |
| Personal skills (alt) | `~/.agents/skills/<name>/SKILL.md` | — |

MCP servers are declared **inside** the agent YAML (`mcpServers:` block) — Copilot CLI reads them from there and starts them when the agent is selected.

## Install

From the plugin root:

```bash
./copilot-cli/install.sh                # personal (~/.copilot) — recommended
./copilot-cli/install.sh --project      # project (./.github)
./copilot-cli/install.sh --copy         # copy instead of symlink
./copilot-cli/install.sh --uninstall    # remove
```

The installer:
1. Regenerates `agents/cosmo.agent.yaml` from `../agents/cosmo.md` via `build.py` (so the source of truth stays the markdown file).
2. Symlinks `agents/cosmo.agent.yaml` → `~/.copilot/agents/cosmo.agent.yaml`.
3. Symlinks each `../skills/<name>/` → `~/.copilot/skills/cosmo-<name>/` (the `cosmo-` prefix avoids colliding with anyone else's `using-sfe-components` etc.).

## Configure MCP env before starting

Copilot CLI expands `${VAR}` and `${VAR:-default}` in `mcpServers.*.command` and `env` at agent-load time. Set these in your shell (or `.zshenv` / `.bash_profile`):

```bash
# Figma
export FIGMA_ACCESS_TOKEN="figd_..."           # required for Figma writes
export FIGMA_MCP_COMMAND="figma-mcp"           # optional; overrides default

# Fluent Agent (Microsoft internal)
export FLUENT_AGENT_ENDPOINT="https://..."     # ask your team lead
export FLUENT_AGENT_MCP_COMMAND="fluent-agent-mcp"  # optional
```

If either MCP command isn't available on `$PATH`, the corresponding phase falls back to describe-only / local-catalog mode (Cosmo's failure-mode messaging block handles this).

## Run

```bash
copilot                                        # start Copilot CLI
```

Inside a session:

```
/agent cosmo
Build me a security dashboard for incident triage. PRD at /tmp/prd.md,
target Figma https://figma.com/file/ABC. Fidelity: stakeholder review.
```

Confirm the agent shows up in `/env` and that `mcpServers` in `/mcp` list both `fluent-agent` and `figma`.

## Rebuild after editing the source agent

The source of truth is `../agents/cosmo.md` (Agency-CLI format). When you edit that file:

```bash
python3 ./build.py
# or just re-run the installer — it rebuilds automatically
./install.sh
```

Then either restart Copilot CLI or start a new session so it re-scans agents.

## Format differences vs. the Agency-CLI file

| Aspect | Agency-CLI (`../agents/cosmo.md`) | Copilot-CLI (`agents/cosmo.agent.yaml`) |
|---|---|---|
| File extension | `.md` | `.agent.yaml` |
| Frontmatter | YAML block at top | Fields are top-level YAML |
| Prompt | Body of markdown after `---` | `prompt:` key (multi-line literal) |
| Triggers | `triggers:` array | Not a native concept — model uses `description` to route |
| Allowed tools | `allowed-tools:` array | `tools:` array (use `["*"]` for all, or list built-ins/MCPs) |
| MCP servers | Referenced via plugin manifest | Inline `mcpServers:` map |
| Skills | Referenced via plugin manifest | Discovered from filesystem locations above |

## Notes and known limits

- **Triggers** in the source markdown don't have a native equivalent — Copilot CLI decides which custom agent to invoke based on the user selecting it with `/agent cosmo` or matching the description. The trigger words are still useful documentation and are also picked up by the pattern-matching table inside the prompt itself (Phase 0).
- **Skill auto-loading (`autoLoad: true` in the markdown frontmatter of `using-sfe-components` and `sfe-ux-standards`)** is a Cosmo-specific hint. Copilot CLI's skill runtime decides skill relevance from the skill's `description` field and the current conversation; the auto-load hint doesn't need to be honored explicitly for the workflow to work — Cosmo's prompt tells the model *which* skill to consult in each phase.
- **User-invocable flag** — the built-in `SKILL.md` frontmatter supports `user-invocable: false` to hide a skill from `/skills`. Cosmo skills default to visible; add that field to any skill you want hidden.
- **Path expansion** — the installer symlinks (fast, live-edit). Use `--copy` if your Copilot CLI runs in a sandbox that doesn't follow symlinks.

## Uninstall

```bash
./copilot-cli/install.sh --uninstall
# or
./copilot-cli/install.sh --uninstall --project
```

This removes only the symlinks / copies this script created; it does not touch anything else under `~/.copilot` or `.github/`.
