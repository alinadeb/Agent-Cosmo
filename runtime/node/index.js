#!/usr/bin/env node
/**
 * Cosmo runtime — Node.js + Anthropic Claude + optional Figma MCP.
 *
 * Loads cosmo.system-prompt.md, launches the Figma MCP client (stdio) if
 * configured, and runs an interactive REPL that streams responses from Claude.
 *
 * Usage:
 *   npm install
 *   cp .env.example .env  &&  # edit .env
 *   npm start                    # interactive REPL
 *   npm run doctor               # preflight check (no API calls, no charges)
 *
 * Flags:
 *   --doctor    Validate config, load system prompt, briefly launch MCP, exit.
 *   --help      Show help.
 *
 * The Figma MCP client is optional. Without it, Cosmo falls back to its
 * inline component reference (§ G) and marks uncertainty in output.
 */

import "dotenv/config";

import { readFile, access } from "node:fs/promises";
import { constants as fsConst } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import Anthropic from "@anthropic-ai/sdk";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
  anthropicMaxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "8192", 10),
  systemPromptPath:
    process.env.COSMO_SYSTEM_PROMPT_PATH ||
    pathResolve(__dirname, "..", "..", "cosmo.system-prompt.md"),
  figmaMcpEnabled: (process.env.FIGMA_MCP_ENABLED || "true") !== "false",
  figmaMcpCommand: process.env.FIGMA_MCP_COMMAND || "",
  figmaMcpArgs: (process.env.FIGMA_MCP_ARGS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  figmaAccessToken: process.env.FIGMA_ACCESS_TOKEN || "",
  showPreamble: (process.env.COSMO_SHOW_PREAMBLE || "true") !== "false",
  logTokens: (process.env.COSMO_LOG_TOKENS || "false") === "true",
};

// -----------------------------------------------------------------------------
// Local greeting — mirrors § A.Step 1 of cosmo.system-prompt.md (plain-text
// rendering for the terminal). Printed locally on session start so no API tokens
// are spent before the user types anything. The system prompt still enforces the
// same progressive greeting if the model ever needs to regenerate it.
// -----------------------------------------------------------------------------

const LOCAL_GREETING =
  "Cosmo here — I turn a prompt, PRD, or Figma file into a design → audit → " +
  "React code, built from your real components.\n\n" +
  "What are we building? Describe it in a sentence, or paste a Figma link.\n" +
  "(New here? Say 'how does this work'.)";

// -----------------------------------------------------------------------------
// Figma MCP client (optional)
// -----------------------------------------------------------------------------

/** @typedef {{ tools: Array<{name:string, description:string, inputSchema:object}>, client: McpClient, close: () => Promise<void> }} McpHandle */

/** @returns {Promise<McpHandle | null>} */
async function startFigmaMcp() {
  if (!CONFIG.figmaMcpEnabled) return null;
  if (!CONFIG.figmaMcpCommand) {
    console.warn("⚠ FIGMA_MCP_COMMAND not set. Skipping Figma MCP — Cosmo will run without a live library.");
    return null;
  }

  const transport = new StdioClientTransport({
    command: CONFIG.figmaMcpCommand,
    args: CONFIG.figmaMcpArgs,
    env: {
      ...process.env,
      FIGMA_ACCESS_TOKEN: CONFIG.figmaAccessToken,
    },
  });

  const client = new McpClient(
    { name: "cosmo", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
  } catch (err) {
    console.warn(`⚠ Figma MCP failed to start (${err.message ?? err}). Running without a live library.`);
    try {
      await transport.close?.();
    } catch {}
    return null;
  }

  let tools = [];
  try {
    const result = await client.listTools();
    tools = result.tools ?? [];
  } catch (err) {
    console.warn(`⚠ Figma MCP started but listTools() failed (${err.message ?? err}). Continuing with no tools.`);
  }

  console.log(
    `→ Figma MCP connected. ${tools.length} tool${tools.length === 1 ? "" : "s"} available: ${tools
      .map((t) => t.name)
      .join(", ")}`,
  );

  return {
    tools,
    client,
    close: async () => {
      try {
        await client.close();
      } catch {}
    },
  };
}

/**
 * Convert MCP tool schemas to Anthropic-style tool definitions.
 * Prefixes tool names with `figma__` for clear namespacing in the model's view.
 * @param {McpHandle | null} mcp
 * @returns {Array<{name:string, description:string, input_schema:object}>}
 */
function mcpToolsToAnthropic(mcp) {
  if (!mcp) return [];
  return mcp.tools.map((t) => ({
    name: `figma__${t.name}`,
    description: t.description || `Figma MCP: ${t.name}`,
    input_schema: t.inputSchema || { type: "object", properties: {} },
  }));
}

/**
 * Dispatch a tool_use block from Anthropic to the Figma MCP.
 * @param {McpHandle} mcp
 * @param {string} toolName full Anthropic tool name (with the `figma__` prefix)
 * @param {object} toolInput
 * @returns {Promise<string>} textual result to feed back into the conversation
 */
async function callFigmaTool(mcp, toolName, toolInput) {
  if (!toolName.startsWith("figma__")) {
    return `Error: unknown tool '${toolName}'.`;
  }
  const mcpName = toolName.slice("figma__".length);
  try {
    const result = await mcp.client.callTool({ name: mcpName, arguments: toolInput });
    if (Array.isArray(result?.content)) {
      const text = result.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n\n");
      return text || JSON.stringify(result, null, 2);
    }
    return JSON.stringify(result, null, 2);
  } catch (err) {
    return `Figma MCP error calling '${mcpName}': ${err.message ?? err}`;
  }
}

// -----------------------------------------------------------------------------
// Anthropic call — one full "turn" with agentic tool use.
// Returns cleanly on error rather than throwing to caller.
// -----------------------------------------------------------------------------

/**
 * @param {Anthropic} anthropic
 * @param {string} systemPrompt
 * @param {Array<object>} history (mutated: appends assistant/tool turns)
 * @param {McpHandle | null} mcp
 * @param {AbortSignal | undefined} signal
 * @returns {Promise<{ok: true} | {ok: false, error: string}>}
 */
async function runTurn(anthropic, systemPrompt, history, mcp, signal) {
  const tools = mcpToolsToAnthropic(mcp);

  while (true) {
    if (signal?.aborted) {
      return { ok: false, error: "aborted" };
    }

    const params = {
      model: CONFIG.anthropicModel,
      max_tokens: CONFIG.anthropicMaxTokens,
      system: systemPrompt,
      messages: history,
    };
    if (tools.length > 0) params.tools = tools;

    let finalMessage;
    try {
      const stream = anthropic.messages.stream(params, { signal });
      stream.on("text", (delta) => output.write(delta));
      finalMessage = await stream.finalMessage();
      output.write("\n");
    } catch (err) {
      output.write("\n");
      const status = err?.status ?? err?.error?.status;
      const type = err?.error?.error?.type ?? err?.type;
      const msg = err?.error?.error?.message ?? err?.message ?? String(err);
      if (status === 401 || type === "authentication_error") {
        return { ok: false, error: `Anthropic auth failed (401). Check ANTHROPIC_API_KEY in .env.` };
      }
      if (status === 429) {
        return { ok: false, error: `Anthropic rate limit (429). ${msg} — wait a moment and try again.` };
      }
      if (status === 400) {
        return { ok: false, error: `Anthropic rejected the request (400): ${msg}` };
      }
      if (err?.name === "AbortError" || signal?.aborted) {
        return { ok: false, error: "aborted" };
      }
      return { ok: false, error: `Anthropic error${status ? " " + status : ""}: ${msg}` };
    }

    if (CONFIG.logTokens) {
      const u = finalMessage.usage ?? {};
      console.error(
        `  [tokens] in=${u.input_tokens ?? "?"} out=${u.output_tokens ?? "?"} cache_read=${u.cache_read_input_tokens ?? "?"} cache_write=${u.cache_creation_input_tokens ?? "?"}`,
      );
    }

    history.push({ role: "assistant", content: finalMessage.content });

    if (finalMessage.stop_reason !== "tool_use") return { ok: true };

    const toolResults = [];
    for (const block of finalMessage.content) {
      if (block.type !== "tool_use") continue;
      console.error(`  → tool ${block.name}(${JSON.stringify(block.input).slice(0, 120)})`);
      let resultText;
      if (!mcp) {
        resultText = `Error: no MCP is connected — cannot call ${block.name}. Tell the user that ${block.name.startsWith("figma__") ? "the Figma library is not connected — proceed using § G.Component reference (fallback catalog) and note the limitation to the user" : "the tool is unavailable"}.`;
      } else {
        try {
          resultText = await callFigmaTool(mcp, block.name, block.input);
        } catch (err) {
          resultText = `Tool ${block.name} threw: ${err.message ?? err}. Report the failure to the user and continue with the fallback catalog if available.`;
        }
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: resultText,
      });
    }

    history.push({ role: "user", content: toolResults });
  }
}

// -----------------------------------------------------------------------------
// Preflight check (--doctor) — no Anthropic calls, no charges.
// -----------------------------------------------------------------------------

async function doctor() {
  console.log("Cosmo — preflight check\n");
  let ok = true;
  const say = (label, status, detail) => {
    const icon = status === "ok" ? "✅" : status === "warn" ? "⚠" : "❌";
    console.log(`  ${icon} ${label}${detail ? " — " + detail : ""}`);
    if (status === "fail") ok = false;
  };

  // 1. Node version
  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  if (nodeMajor >= 20) say(`Node ${process.versions.node}`, "ok");
  else say(`Node ${process.versions.node}`, "fail", "requires ≥ 20");

  // 2. System prompt
  try {
    await access(CONFIG.systemPromptPath, fsConst.R_OK);
    const stat = await readFile(CONFIG.systemPromptPath, "utf8");
    const sizeKb = (stat.length / 1024).toFixed(1);
    const hasHandshake = stat.includes("Startup handshake");
    const hasWorkflow = stat.includes("Agent workflow");
    if (hasHandshake && hasWorkflow)
      say(`System prompt loaded (${sizeKb} KB)`, "ok", CONFIG.systemPromptPath);
    else
      say(`System prompt loaded but sections missing`, "fail", `handshake=${hasHandshake} workflow=${hasWorkflow}`);
  } catch {
    say("System prompt not found", "fail", CONFIG.systemPromptPath);
  }

  // 3. ANTHROPIC_API_KEY (presence only, no call)
  if (CONFIG.anthropicApiKey && CONFIG.anthropicApiKey.startsWith("sk-ant-")) {
    say("ANTHROPIC_API_KEY is set", "ok", `(${CONFIG.anthropicApiKey.slice(0, 12)}…)`);
  } else if (CONFIG.anthropicApiKey) {
    say("ANTHROPIC_API_KEY looks malformed", "warn", "expected prefix sk-ant-");
  } else {
    say("ANTHROPIC_API_KEY is not set", "fail", "set it in runtime/node/.env");
  }
  say(`Model = ${CONFIG.anthropicModel}`, "ok");
  say(`Max tokens = ${CONFIG.anthropicMaxTokens}`, "ok");

  // 4. Figma MCP
  if (!CONFIG.figmaMcpEnabled) {
    say("Figma MCP disabled", "warn", "Cosmo will run without a live library");
  } else if (!CONFIG.figmaMcpCommand) {
    say("FIGMA_MCP_COMMAND is not set", "warn", "Cosmo will run without a live library");
  } else {
    say(`Figma MCP command = ${CONFIG.figmaMcpCommand} ${CONFIG.figmaMcpArgs.join(" ")}`, "ok");
    if (!CONFIG.figmaAccessToken) {
      say("FIGMA_ACCESS_TOKEN is not set", "warn", "the MCP will start but most reads will fail");
    } else {
      say(`FIGMA_ACCESS_TOKEN is set`, "ok", `(${CONFIG.figmaAccessToken.slice(0, 8)}…)`);
    }

    // Try launching briefly and listing tools
    console.log("\n  Attempting to launch Figma MCP…");
    let mcp = null;
    try {
      mcp = await startFigmaMcp();
      if (mcp) {
        say(`Figma MCP tools discovered`, "ok", mcp.tools.map((t) => t.name).join(", ") || "(none)");
        await mcp.close();
      } else {
        say("Figma MCP did not connect", "warn", "see warnings above");
      }
    } catch (err) {
      say("Figma MCP crashed while starting", "fail", err.message ?? String(err));
    }
  }

  console.log("");
  if (ok) {
    console.log("Preflight passed. Run `npm start` to begin an interactive session.");
    process.exit(0);
  } else {
    console.log("Preflight failed. Fix the ❌ items above and re-run `npm run doctor`.");
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// Main REPL
// -----------------------------------------------------------------------------

async function loadSystemPrompt() {
  try {
    await access(CONFIG.systemPromptPath, fsConst.R_OK);
  } catch {
    console.error(`ERROR: system prompt not found at ${CONFIG.systemPromptPath}`);
    console.error("Set COSMO_SYSTEM_PROMPT_PATH in .env, or place cosmo.system-prompt.md two levels above this runtime.");
    process.exit(1);
  }
  return await readFile(CONFIG.systemPromptPath, "utf8");
}

function printPreamble() {
  if (!CONFIG.showPreamble) return;
  console.log("Cosmo — standalone design-to-code agent");
  console.log(`  Model:     ${CONFIG.anthropicModel}`);
  console.log(`  Figma MCP: ${CONFIG.figmaMcpEnabled ? "enabled" : "disabled"}`);
  console.log("  Type 'exit' or press Ctrl+D to quit. Ctrl+C interrupts a running turn.");
  console.log("");
}

async function repl() {
  if (!CONFIG.anthropicApiKey) {
    console.error("ERROR: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in, or run `npm run doctor` to diagnose.");
    process.exit(1);
  }

  const systemPrompt = await loadSystemPrompt();
  const anthropic = new Anthropic({ apiKey: CONFIG.anthropicApiKey });

  let mcp = null;
  try {
    mcp = await startFigmaMcp();
  } catch (err) {
    console.warn(`⚠ Failed to start Figma MCP: ${err.message ?? err}. Continuing without.`);
  }

  printPreamble();

  // Print the greeting locally (no API call). The system prompt requires this
  // exact greeting on session start; printing it deterministically saves
  // tokens and makes startup instant.
  console.log(`Cosmo: ${LOCAL_GREETING}\n`);

  const history = [
    { role: "user", content: "[session start] Begin your startup Figma-library handshake. I already printed your greeting to the user locally — pick up from awaiting their reply." },
    { role: "assistant", content: LOCAL_GREETING },
  ];

  const rl = createInterface({ input, output, terminal: true });
  let currentAbort = null;

  const onSigint = () => {
    if (currentAbort) {
      currentAbort.abort();
      console.log("\n(turn interrupted — press Ctrl+C again to exit)");
      currentAbort = null;
    } else {
      console.log("\nGoodbye.");
      cleanup().finally(() => process.exit(0));
    }
  };
  process.on("SIGINT", onSigint);

  const cleanup = async () => {
    process.removeListener("SIGINT", onSigint);
    if (mcp) await mcp.close();
    rl.close();
  };
  rl.on("close", () => {
    console.log("\nGoodbye.");
    cleanup().finally(() => process.exit(0));
  });

  while (true) {
    let userText;
    try {
      userText = await rl.question("\n> ");
    } catch {
      await cleanup();
      return;
    }
    if (!userText) continue;
    const trimmed = userText.trim().toLowerCase();
    if (trimmed === "exit" || trimmed === "quit") {
      await cleanup();
      return;
    }

    history.push({ role: "user", content: userText });
    currentAbort = new AbortController();
    const result = await runTurn(anthropic, systemPrompt, history, mcp, currentAbort.signal);
    currentAbort = null;
    if (!result.ok) {
      console.error(`⚠ ${result.error}`);
      // Roll back the user turn so retry doesn't duplicate — the SDK didn't
      // successfully complete this exchange.
      if (history[history.length - 1]?.role === "user") {
        // keep it: user might want to see their prompt in history for context
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Entry
// -----------------------------------------------------------------------------

function printHelp() {
  console.log(`Cosmo runtime

Usage:
  node index.js              Start the interactive REPL
  node index.js --doctor     Preflight check (no API calls, no charges)
  node index.js --help       Show this help

Environment:
  See .env.example for all config options.`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }
  if (argv.includes("--doctor")) {
    await doctor();
    return;
  }
  await repl();
}

main().catch((err) => {
  console.error(`Fatal: ${err.stack ?? err}`);
  process.exit(1);
});
