#!/usr/bin/env python3
"""
Generate a Copilot-CLI-native cosmo.agent.yaml from the standalone
cosmo.system-prompt.md. Copilot CLI reads custom agents from
~/.copilot/agents/*.agent.yaml — install.sh symlinks the generated file
there.

Usage:
    python3 build.py
"""

import os
import sys
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN_ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(PLUGIN_ROOT, "cosmo.system-prompt.md")
DST = os.path.join(HERE, "agents", "cosmo.agent.yaml")


class LiteralStr(str):
    pass


def literal_representer(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")


yaml.add_representer(LiteralStr, literal_representer)


def main() -> int:
    if not os.path.exists(SRC):
        print(f"Source not found: {SRC}", file=sys.stderr)
        return 1

    with open(SRC, encoding="utf-8") as f:
        prompt = f.read()

    # Copilot CLI provides the LLM. Prepend a short adapter note so the model
    # picks up the standalone prompt correctly and knows to run the startup
    # handshake on session start (Copilot CLI does not send a synthetic
    # "session start" trigger like the Node runtime does).
    adapter_prelude = (
        "You are Cosmo, running inside GitHub Copilot CLI.\n"
        "\n"
        "When this agent is first invoked (via `/agent cosmo`), your very first\n"
        "response MUST be your startup greeting from § A.Step 1 below — do NOT\n"
        "wait for the user to prompt you. If the user has already typed a task\n"
        "along with `/agent cosmo`, still emit the greeting first, then\n"
        "acknowledge you'll come back to their task after the startup handshake.\n"
        "\n"
        "Environment:\n"
        "- Working directory: {{cwd}}\n"
        "- Figma MCP is declared under `mcpServers` below. If a source fails to\n"
        "  connect, follow § A.Step 4 (degraded mode).\n"
        "\n"
        "---\n"
        "\n"
    )

    full_prompt = adapter_prelude + prompt

    agent = {
        "name": "cosmo",
        "displayName": "Cosmo — Design-to-Code Agent",
        "description": (
            "Design-to-code agent. Takes a prompt, PRD, or Figma file and produces "
            "an SFE-compliant Figma design, then a compliance audit, then production-"
            "ready React/TypeScript code — with a human review gate at every phase. "
            "Powered by the standalone cosmo.system-prompt.md."
        ),
        "tools": ["*"],
        "promptParts": {
            "includeAISafety": True,
            "includeToolInstructions": True,
            "includeParallelToolCalling": True,
            "includeCustomAgentInstructions": True,
            "includeEnvironmentContext": True,
        },
        "mcpServers": {
            "figma": {
                "command": "${FIGMA_MCP_COMMAND:-npx}",
                "args": ["-y", "figma-developer-mcp"],
                "env": {"FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"},
            },
        },
        "prompt": LiteralStr(full_prompt),
    }

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with open(DST, "w", encoding="utf-8") as f:
        f.write("# Copilot-CLI-native definition of the Cosmo agent.\n")
        f.write("# Regenerated from ../../cosmo.system-prompt.md via build.py.\n")
        yaml.dump(agent, f, sort_keys=False, allow_unicode=True, width=1000)

    print(f"Wrote {DST} ({os.path.getsize(DST)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
