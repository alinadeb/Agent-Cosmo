# Cosmo 1.0 — archived

**Status: archived / reference only. Superseded by [`../2.0/`](../2.0/).**

This folder preserves the original Cosmo 1.0 agent and its build source. It is **not** wired to run — there is no runtime or Docker image here. To run Cosmo, use [`../2.0/`](../2.0/).

## What's here

| Path | What it is |
|---|---|
| `cosmo.system-prompt.md` | The 1.0 standalone agent (live library **+** a baked-in fallback component catalog, § G). |
| `_legacy/plugin-format/` | The original Agency-CLI plugin bundle — the build source. |
| `build.py` | Regenerates `cosmo.system-prompt.md` from `_legacy/plugin-format/*`. |
| `build-skill.py` | Splits `cosmo.system-prompt.md` into `skills/cosmo/`. |
| `skills/cosmo/` | The 1.0 skill package (`SKILL.md` + `references/`). |

## How 1.0 differs from 2.0

- **1.0** keeps a baked-in component catalog (§ G) and falls back to it when the Figma MCP is unavailable.
- **2.0** removed the catalog: it reads the component library **live** from the connected Figma file's enabled-library assets, and refuses (rather than guessing) when the MCP is down — which makes it safe to host publicly.

Both build scripts still work here because the folder preserves their original relative layout (`build.py` → `_legacy/plugin-format/*`, `build-skill.py` → `skills/cosmo/`).
