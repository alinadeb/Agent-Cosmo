#!/usr/bin/env node
/**
 * Smoke test for the Cosmo runtime.
 *
 * Verifies the runtime can:
 *   1. Load the system prompt.
 *   2. Report a fake key as malformed (or missing) via --doctor without making an API call.
 *   3. Exit with the expected status code.
 *
 * No network access required. No Anthropic charges.
 *
 * Usage:
 *   npm test
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const runtimeDir = pathResolve(__dirname, "..");
const entry = pathResolve(runtimeDir, "index.js");

function runDoctor(env) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [entry, "--doctor"], {
      cwd: runtimeDir,
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function assert(label, cond, detail) {
  const icon = cond ? "✅" : "❌";
  console.log(`  ${icon} ${label}${detail ? " — " + detail : ""}`);
  return cond;
}

async function main() {
  console.log("Cosmo runtime smoke test\n");
  let allOk = true;

  // Test 1 — no keys at all: doctor should exit non-zero, mention ANTHROPIC_API_KEY.
  {
    const res = await runDoctor({
      ANTHROPIC_API_KEY: "",
      FIGMA_MCP_ENABLED: "false",
      COSMO_SHOW_PREAMBLE: "false",
    });
    allOk = assert("Doctor exits non-zero when API key is missing", res.code !== 0, `exit=${res.code}`) && allOk;
    allOk = assert(
      "Doctor reports missing ANTHROPIC_API_KEY",
      res.stdout.includes("ANTHROPIC_API_KEY is not set"),
    ) && allOk;
    allOk = assert(
      "Doctor reports system prompt loaded",
      res.stdout.includes("System prompt loaded"),
    ) && allOk;
  }

  // Test 2 — well-formed fake key + MCP disabled: doctor should exit 0.
  {
    const res = await runDoctor({
      ANTHROPIC_API_KEY: "sk-ant-fake-for-smoke-test",
      FIGMA_MCP_ENABLED: "false",
      COSMO_SHOW_PREAMBLE: "false",
    });
    allOk = assert("Doctor exits 0 with well-formed key + MCP disabled", res.code === 0, `exit=${res.code}`) && allOk;
    allOk = assert(
      "Doctor confirms ANTHROPIC_API_KEY is set",
      res.stdout.includes("ANTHROPIC_API_KEY is set"),
    ) && allOk;
    allOk = assert(
      "Doctor confirms Figma MCP disabled",
      res.stdout.includes("Figma MCP disabled"),
    ) && allOk;
    allOk = assert(
      "Doctor prints preflight-passed message",
      res.stdout.includes("Preflight passed"),
    ) && allOk;
  }

  // Test 3 — malformed key: doctor should warn but continue.
  {
    const res = await runDoctor({
      ANTHROPIC_API_KEY: "wrong-prefix-key",
      FIGMA_MCP_ENABLED: "false",
      COSMO_SHOW_PREAMBLE: "false",
    });
    allOk = assert(
      "Doctor warns on malformed key",
      res.stdout.includes("looks malformed"),
    ) && allOk;
  }

  console.log("");
  if (allOk) {
    console.log("All smoke checks passed. ✅");
    process.exit(0);
  } else {
    console.log("Some smoke checks failed. ❌");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal: ${err.stack ?? err}`);
  process.exit(1);
});
