#!/usr/bin/env bash
# Install Cosmo into the Copilot CLI's canonical directories.
#
# Copilot CLI discovers:
#   Agents  — ~/.copilot/agents/*.agent.yaml            (personal)
#           — .github/agents/*.agent.yaml               (project, in cwd or git root)
#   Skills  — ~/.copilot/skills/<name>/SKILL.md         (personal)
#           — .github/skills/<name>/SKILL.md            (project)
#
# This script installs to the PERSONAL locations by default (--project switches to the current cwd project).
# It uses symlinks so edits in the plugin repo are picked up automatically after re-running `/agent` or restarting the CLI.
#
# Usage:
#   ./copilot-cli/install.sh              # personal (~/.copilot)
#   ./copilot-cli/install.sh --project    # project (.github/ in current cwd)
#   ./copilot-cli/install.sh --uninstall  # remove installed symlinks
#   ./copilot-cli/install.sh --copy       # copy instead of symlink

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="personal"
LINK_CMD="ln -sfn"
ACTION="install"

for arg in "$@"; do
  case "$arg" in
    --project) MODE="project" ;;
    --copy)    LINK_CMD="cp -R" ;;
    --uninstall) ACTION="uninstall" ;;
    --help|-h)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -30
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

if [[ "$MODE" == "personal" ]]; then
  AGENT_DIR="$HOME/.copilot/agents"
  SKILL_DIR="$HOME/.copilot/skills"
  LABEL="personal (~/.copilot)"
else
  AGENT_DIR="$(pwd)/.github/agents"
  SKILL_DIR="$(pwd)/.github/skills"
  LABEL="project ($(pwd)/.github)"
fi

# Rebuild the agent YAML from the source markdown before installing.
if [[ "$ACTION" == "install" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    echo "→ Rebuilding cosmo.agent.yaml from source markdown"
    python3 "$SCRIPT_DIR/build.py"
  else
    echo "⚠ python3 not found — using existing $SCRIPT_DIR/agents/cosmo.agent.yaml as-is"
  fi
fi

echo "→ Target: $LABEL"

install_one() {
  local src="$1"
  local dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [[ -e "$dst" || -L "$dst" ]]; then
    rm -rf "$dst"
  fi
  $LINK_CMD "$src" "$dst"
  echo "  ✅ $dst"
}

uninstall_one() {
  local dst="$1"
  if [[ -e "$dst" || -L "$dst" ]]; then
    rm -rf "$dst"
    echo "  🗑  $dst"
  fi
}

if [[ "$ACTION" == "install" ]]; then
  # 1. Agent
  install_one "$SCRIPT_DIR/agents/cosmo.agent.yaml" "$AGENT_DIR/cosmo.agent.yaml"

  # 2. All skills (each is its own subdirectory)
  for skill in "$PLUGIN_ROOT"/skills/*/; do
    name="$(basename "$skill")"
    install_one "$skill" "$SKILL_DIR/cosmo-$name"
  done

  echo ""
  echo "Installed Cosmo into $LABEL."
  echo ""
  echo "Next steps:"
  echo "  1. Set the MCP environment variables before starting Copilot CLI:"
  echo "       export FIGMA_ACCESS_TOKEN=<your-figma-pat>"
  echo "       export FLUENT_AGENT_ENDPOINT=<your-fluent-agent-endpoint>"
  echo "       # optional: override the MCP client commands"
  echo "       # export FIGMA_MCP_COMMAND=<your-figma-mcp-command>"
  echo "       # export FLUENT_AGENT_MCP_COMMAND=<your-fluent-agent-mcp-command>"
  echo "  2. Start (or restart) the Copilot CLI:      copilot"
  echo "  3. Inside a session:                        /agent cosmo"
  echo ""
  echo "To uninstall: $0 --uninstall${MODE:+ ${MODE/personal/}}"
else
  # uninstall
  uninstall_one "$AGENT_DIR/cosmo.agent.yaml"
  for skill in "$PLUGIN_ROOT"/skills/*/; do
    name="$(basename "$skill")"
    uninstall_one "$SKILL_DIR/cosmo-$name"
  done
  echo ""
  echo "Uninstalled Cosmo from $LABEL."
fi
