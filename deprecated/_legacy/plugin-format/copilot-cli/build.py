#!/usr/bin/env python3
"""
Regenerate the Copilot-CLI-native cosmo.agent.yaml from the source
agents/cosmo.md (which uses Agency-CLI-style frontmatter).

Run this after editing agents/cosmo.md.

Usage:
    python3 copilot-cli/build.py
"""

import os
import re
import sys
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN_ROOT = os.path.dirname(HERE)
SRC = os.path.join(PLUGIN_ROOT, "agents", "cosmo.md")
DST = os.path.join(HERE, "agents", "cosmo.agent.yaml")


def main() -> int:
    if not os.path.exists(SRC):
        print(f"Source not found: {SRC}", file=sys.stderr)
        return 1

    with open(SRC, encoding="utf-8") as f:
        text = f.read()

    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    if not m:
        print(f"No YAML frontmatter in {SRC}", file=sys.stderr)
        return 1
    body = m.group(2).strip()

    prelude = (
        "You are Cosmo. This is the Copilot-CLI adapter of the Cosmo plugin.\n"
        "\n"
        "Environment context:\n"
        "- Current working directory: {{cwd}}\n"
        "- Skills auto-loaded from ~/.copilot/skills/cosmo/*/SKILL.md\n"
        "- MCP servers declared below: `fluent-agent` and `figma`\n"
        "- If either MCP is unavailable, follow the failure-mode messaging block near the end of this prompt.\n"
        "\n"
    )
    full_prompt = prelude + body

    agent = {
        "name": "cosmo",
        "displayName": "Cosmo — Design-to-Code Agent",
        "description": (
            "Design-to-code agent. Takes a prompt, PRD, or Figma file and produces an "
            "SFE-compliant Figma design, then a compliance audit, then production-ready "
            "React/TypeScript code — with a human review gate at every phase."
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
            "fluent-agent": {
                "command": "${FLUENT_AGENT_MCP_COMMAND:-fluent-agent-mcp}",
                "args": [],
                "env": {"FLUENT_AGENT_ENDPOINT": "${FLUENT_AGENT_ENDPOINT}"},
            },
            "figma": {
                "command": "${FIGMA_MCP_COMMAND:-figma-mcp}",
                "args": [],
                "env": {"FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"},
            },
        },
        "prompt": full_prompt,
    }

    class LiteralStr(str):
        pass

    def literal_representer(dumper, data):
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")

    yaml.add_representer(LiteralStr, literal_representer)
    agent["prompt"] = LiteralStr(full_prompt)

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    with open(DST, "w", encoding="utf-8") as f:
        f.write("# Copilot-CLI-native definition of the Cosmo agent.\n")
        f.write("# Source of truth is ../agents/cosmo.md — regenerate with copilot-cli/build.py after edits.\n")
        yaml.dump(agent, f, sort_keys=False, allow_unicode=True, width=1000)

    print(f"Wrote {DST} ({os.path.getsize(DST)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
