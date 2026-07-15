#!/usr/bin/env bash
# Install Cosmo as a Copilot CLI custom agent.
#
# Copilot CLI reads custom agents from:
#   ~/.copilot/agents/*.agent.yaml     (personal — this script's default)
#   .github/agents/*.agent.yaml        (project — use --project)
#
# The generated cosmo.agent.yaml bundles the entire cosmo.system-prompt.md
# inline. No skill files are installed — everything Cosmo needs is inside
# the single YAML.
#
# Usage:
#   ./runtime/copilot-cli/install.sh              # personal (~/.copilot)
#   ./runtime/copilot-cli/install.sh --project    # project (./.github)
#   ./runtime/copilot-cli/install.sh --uninstall  # remove
#   ./runtime/copilot-cli/install.sh --copy       # copy instead of symlink

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MODE="personal"
LINK_CMD="ln -sfn"
ACTION="install"

for arg in "$@"; do
  case "$arg" in
    --project)   MODE="project" ;;
    --copy)      LINK_CMD="cp -f" ;;
    --uninstall) ACTION="uninstall" ;;
    --help|-h)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -20
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

if [[ "$MODE" == "personal" ]]; then
  TARGET="$HOME/.copilot/agents/cosmo.agent.yaml"
  LABEL="personal (~/.copilot)"
else
  TARGET="$(pwd)/.github/agents/cosmo.agent.yaml"
  LABEL="project ($(pwd)/.github)"
fi

if [[ "$ACTION" == "install" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    echo "→ Rebuilding cosmo.agent.yaml from cosmo.system-prompt.md"
    python3 "$SCRIPT_DIR/build.py"
  else
    echo "⚠ python3 not found — using existing $SCRIPT_DIR/agents/cosmo.agent.yaml as-is"
  fi

  mkdir -p "$(dirname "$TARGET")"
  if [[ -e "$TARGET" || -L "$TARGET" ]]; then rm -f "$TARGET"; fi
  $LINK_CMD "$SCRIPT_DIR/agents/cosmo.agent.yaml" "$TARGET"

  echo ""
  echo "✅ Installed to $LABEL:"
  echo "     $TARGET"
  echo ""
  echo "Next steps:"
  echo "  1. (Optional) Set env vars so the Figma MCP works:"
  echo "       export FIGMA_ACCESS_TOKEN=<your-figma-pat>"
  echo "  2. Start (or restart) Copilot CLI in a NEW shell:"
  echo "       copilot"
  echo "  3. Inside the session, invoke Cosmo:"
  echo "       /agent cosmo"
  echo ""
  echo "The currently running Copilot CLI session (if any) will not see the new"
  echo "agent until you restart it — custom agents are loaded at session start."
  echo ""
  echo "Uninstall: $0 --uninstall${MODE:+ ${MODE/personal/}}"
else
  if [[ -e "$TARGET" || -L "$TARGET" ]]; then
    rm -f "$TARGET"
    echo "🗑  Removed $TARGET"
  else
    echo "Nothing to remove at $TARGET"
  fi
fi
