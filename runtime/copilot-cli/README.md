# Cosmo for GitHub Copilot CLI

This runtime lets you run Cosmo inside **GitHub Copilot CLI** — no Anthropic key needed. Copilot CLI provides the LLM (backed by your GitHub Copilot subscription).

## Install (3 steps)

```bash
# From the plugin root:
./runtime/copilot-cli/install.sh
```

That's it. The installer:
1. Regenerates `agents/cosmo.agent.yaml` by wrapping `cosmo.system-prompt.md` in the Copilot-CLI-native YAML format.
2. Symlinks it into `~/.copilot/agents/cosmo.agent.yaml`.

**Start a new Copilot CLI shell** (the current session cached the agent list at startup, so it won't see Cosmo until you restart):

```bash
copilot
```

Inside the new session:

```
/agent cosmo
```

Cosmo will greet you and run the startup Figma-library handshake. Reply `skip` if you don't have the Figma MCP set up.

## Figma MCP (optional)

If you want the automated Figma read/write experience, export a Figma personal access token before starting Copilot CLI:

```bash
export FIGMA_ACCESS_TOKEN=figd_...
copilot
```

The agent YAML declares the Figma MCP using `npx -y figma-developer-mcp` by default. On first use, npx will fetch that package.

Without `FIGMA_ACCESS_TOKEN` set, the MCP will fail to authenticate. Cosmo has no built-in component catalog, so it will ask you to reconnect the Figma library rather than guessing components from memory.

## Rebuild after editing

The source of truth is `../../cosmo.system-prompt.md`. When you edit that file:

```bash
./runtime/copilot-cli/install.sh
```

Re-runs `build.py`, refreshes the symlink, and prints the "restart Copilot CLI" reminder.

## Uninstall

```bash
./runtime/copilot-cli/install.sh --uninstall
```

## Files

```
runtime/copilot-cli/
├── README.md                      # this file
├── build.py                       # generates cosmo.agent.yaml from ../../cosmo.system-prompt.md
├── install.sh                     # symlinks into ~/.copilot/agents/
└── agents/
    └── cosmo.agent.yaml           # generated — do not hand-edit
```

## Notes and known limits

- **Cosmo runs on whatever model Copilot CLI is configured to use.** Check `/model` inside Copilot CLI to see or change it. Cosmo works best with `claude-opus-4.7`, `claude-sonnet-5`, `gpt-5.5`, or equivalents. Smaller/faster models may skip review gates or invent props.
- **The Copilot CLI custom-agent format inlines the system prompt** into the YAML. That means the generated file is ~127 KB. Copilot CLI handles this fine — Sonnet/Opus/GPT-5 all have 200K+ context.
- **The pattern skills (§ H) are scaffolds** — same limitation as elsewhere. Cosmo's Phase 0 delegation-fallback will catch pattern-match requests and route them through the general workflow.
- **This is the third supported runtime** for Cosmo, alongside `runtime/node/` (Anthropic SDK) and `runtime/docker/`. All three read from the same `cosmo.system-prompt.md`.
