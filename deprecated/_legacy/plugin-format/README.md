# Cosmo — Design-to-Code Agent

Cosmo takes a **prompt**, a **PRD**, or an **existing Figma file** and produces:

1. A structured Figma design built from real SFE (Security Fluent Extension) components, tokens, and layout patterns — matching Microsoft Security UX standards, WCAG 2.2 AA, and Responsible AI guidelines.
2. An audit report against those same standards, with severity-graded findings.
3. Production-ready **React + TypeScript** code using `@sfe/react-*` components, `makeStyles` + `@sfe/react-theme` tokens, and i18n-ready message definitions.

You review and edit at every step — Cosmo never advances a phase without your explicit approval.

## Quick start

```bash
# 1. Install the plugin
/plugin install path/to/plugins/cosmo

# 2. Invoke Cosmo
/agent cosmo
```

Then describe what you want:

```
Build me a security dashboard for tracking incident triage —
KPIs at the top, filters, and an incidents table.
Ingest the PRD at /Users/me/docs/incident-triage-prd.md
and target a Figma file at https://figma.com/file/ABC123/dashboard
```

## The four phases

| Phase | What happens | Skills used | Review gate |
|---|---|---|---|
| **0. Pattern match** | If your request matches a known UX pattern (agent-setup wizard, Copilot FRE, output card, etc.), Cosmo delegates entirely to that pattern skill. | `pattern-*` (15 skills) | You confirm the pattern fits |
| **1. Intake** | Parses your prompt / PRD / Figma URL. Extracts intent, user roles, screens, data shape. Asks clarifying questions. | `ingesting-prd-and-figma` | You approve the interpreted spec |
| **2. Design generation** | Generates or updates Figma frames using SFE components, spacing/color tokens, typography, and a11y patterns. | `generating-figma-designs`, `using-sfe-components`, `sfe-ux-standards` | **You edit in Figma, then approve** |
| **3. Audit** | Runs pass/fail checks across accessibility (WCAG 2.2 AA), content design, RAI, design language, and component usage on the Figma file. Produces a severity-grouped report. | `auditing-sfe-designs`, `sfe-ux-standards` | **You fix in Figma, then approve** |
| **4. Code handoff** | Converts finalized Figma frames into React/TypeScript. Emits `ComponentName.tsx`, `styles.tsx`, `messages.ts`, `index.tsx` for each component, following the Trust360UX conventions. | `design-to-react-handoff`, `using-sfe-components`, `sfe-ux-standards` | You review the code |

## What's included

| Component | Purpose |
|---|---|
| **Agent (`cosmo`)** | Orchestrates the 4 phases with review gates. |
| **Skill (`ingesting-prd-and-figma`)** | Parses prompts, PRDs, Figma files; extracts spec. |
| **Skill (`generating-figma-designs`)** | Creates/updates Figma frames from spec via Figma MCP. |
| **Skill (`auditing-sfe-designs`)** | Runs a11y / RAI / content / design-language / component-usage audit on Figma. |
| **Skill (`design-to-react-handoff`)** | Converts finalized Figma to React/TSX following Trust360UX conventions. |
| **Skill (`using-sfe-components`)** | Component knowledge base — 40+ SFE components, selection guide, MCP routing, tokens, examples. Auto-loaded. |
| **Skill (`sfe-ux-standards`)** | Reference for Microsoft Security UX standards — content design, a11y (WCAG 2.2 AA, 38 anti-patterns), RAI, design language tokens. Auto-loaded. |
| **15 pattern skills (`pattern-*`)** | End-to-end procedures for common UX patterns (agent setup wizard, Copilot FRE, home headers, output cards, feedback, handoff, etc.). Delegated to when the request matches. |
| **MCP (`fluent-agent`)** | Live SFE / Fluent v9 / Copilot component docs. |
| **MCP (`figma`)** | Reads/writes Figma files, frames, components, and variables. |

## Component priority

When multiple libraries offer similar components, Cosmo prefers, in order:

1. **SFE** (`@sfe/react-*`, `@sfe/merch-*`) — first choice
2. **Fluent Copilot** (`@fluentui/react-copilot`) — for AI-specific components
3. **Fluent UI v9** (`@fluentui/react-components`) — base primitives

Never suggests deprecated Fluent v8 (`@fluentui/react`) or custom one-offs when an SFE/Fluent v9 equivalent exists.

## Standards Cosmo enforces

At every phase — design generation, audit, and code generation — Cosmo applies:

- **WCAG 2.2 Level AA** — semantic HTML, keyboard operability, focus management, contrast, ARIA, live regions, form errors.
- **Microsoft Security content design** — sentence case, plain language, error message formula (*what happened + why + how to fix*), no standalone "Error"/"Failed"/"Oops".
- **RAI (Responsible AI)** — transparency, AI identity, disclaimers on AI outputs, feedback controls, user override.
- **SFE design language** — spacing tokens (`tokens.spacingVerticalM`, etc.), color tokens, typography ramp, elevation, border radius.
- **Trust360UX code conventions** (in Phase 4):
  - Per-component folder (`index.tsx`, `ComponentName.tsx`, `styles.tsx`, `messages.ts`)
  - `makeStyles` + tokens (no hardcoded pixel values — use `rem`/`vh`/`vw` for size)
  - i18n via `useTranslate()` (no string literals in components)
  - `useCallback` / `useMemo` for handlers and computed values
  - Alias imports (`common/*`, `app/*`) — no `../../..` traversal
  - `useLogger()` from `common/services` — never `console.*`
  - Text components from `common/components/Text` — never raw `<h1>`, `<p>`, `<span>`

## Review gates

Cosmo will **stop and wait** for your explicit "approved" / "proceed" before moving between phases. You can:

- Edit the Figma file directly (Cosmo re-reads it via MCP after Gate 1 and Gate 2).
- Ask for revisions ("swap the KPI card for a MetricGroupCard", "make the empty state friendlier", "reduce to 3 filters").
- Rerun the audit after edits.
- Ask for a different fidelity level (exploratory sketch vs. handoff-ready).

## When to use Cosmo vs. other agents

| I want to... | Use |
|---|---|
| Go from PRD / prompt / Figma → design → code end-to-end | **Cosmo** |
| Iterate on a Figma design that already exists | **Cosmo** (skip Phase 1) |
| Only audit an existing Figma file or React code | **Cosmo** (jump to Phase 3) |
| Ask a quick question about an SFE component | No agent — just ask; component knowledge is auto-loaded |

## Contributing

- **Add a new pattern skill:** create `skills/pattern-<name>/SKILL.md` with a quick-match header (triggers, when-to-use, key components) and add a row to the pattern table in `agents/cosmo.md`.
- **Update knowledge base:** edit `skills/using-sfe-components/SKILL.md` or `skills/sfe-ux-standards/SKILL.md`.
- **Change workflow:** edit `agents/cosmo.md`.

## Important notes

- Cosmo cannot reach Figma or the Fluent MCP without those MCPs being connected. If either is unavailable, it falls back to the built-in knowledge in `using-sfe-components` / `sfe-ux-standards` and clearly states its uncertainty.
- Generated code is **prototype-quality with production-grade patterns baked in**. It should still go through your team's code review, automated a11y testing (axe, Accessibility Insights), and manual assistive-tech testing before shipping.

## License

Internal — Microsoft Security.
