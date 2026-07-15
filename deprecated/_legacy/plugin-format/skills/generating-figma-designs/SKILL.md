---
name: generating-figma-designs
description: Creates or updates Figma frames from a spec, using real SFE components, design tokens, and accessibility patterns. Uses the Figma MCP for writes.
triggers:
  - "generate figma"
  - "build design"
  - "create frames"
  - "update figma"
when-to-use: "Phase 2 of Cosmo. Call this after Phase 1's spec is approved. Not for code generation — see `design-to-react-handoff`."
---

# Skill — Generating Figma designs

## Purpose

Turn an approved spec into Figma frames that use real SFE components (or Fluent Copilot / Fluent v9 in priority order), correct design tokens, and accessibility-ready structure. This is a **design** skill — it does not produce code. Code generation lives in `design-to-react-handoff` (Phase 4).

## Preconditions

- Phase 1 spec has been produced and the user has replied `approved`.
- `figma` MCP is connected. If not, fall back per the failure-mode block below.
- `fluent-agent` MCP is available (preferred) for verifying component APIs. Local `using-sfe-components` catalog is the fallback.

## Component priority (strict)

1. **SFE** — `@sfe/react-*`, `@sfe/merch-*` — first choice.
2. **Fluent Copilot** — `@fluentui/react-copilot` — for AI-specific components.
3. **Fluent UI v9** — `@fluentui/react-components` — foundation primitives.

Never propose deprecated Fluent v8 (`@fluentui/react`). Never propose a custom one-off when an SFE/Fluent v9 equivalent exists.

## Plan first (for anything non-trivial)

For requests with **3+ sections or 5+ components**, emit a brief plan **before** touching Figma:

1. **Component inventory** — a table:

   | Component | Package | Purpose |
   |---|---|---|
   | `MetricGroupCard` | `@sfe/react-metric` | KPI row |
   | `CompositeDataGrid` | `@sfe/react-data-grid` | Incidents table |
   | `InPageFilter` | `@sfe/react-filter` | Table filters |
   | `TabList` | `@sfe/react-tab-list` | Section switcher |

2. **Layout sketch** — Mermaid or ASCII showing nesting:

   ```
   LayoutGrid
   ├── Section (header)
   │   ├── Title1
   │   └── Body2 (description)
   ├── MetricGroupCard × 4
   ├── TabList
   ├── InPageFilter
   └── CompositeDataGrid
   ```

3. **Open questions** — anything ambiguous that needs a user answer before you commit to a frame.

For **single-component** requests, skip the plan and generate directly.

## Verify every component via MCP

For **each** component in the inventory:

```
ask_fluent_agent(sfe, "For {Component}: when to use, when NOT to use, do's,
don'ts, required/optional props and slots, default values, supported values,
and a code example.")
```

Use `react-v9` for Fluent primitives. From the response, confirm:

- **When to use / when NOT to use** — swap it now if it doesn't fit.
- **Do's and don'ts** — e.g., `CountAnnotationBar` requires an accompanying chart, `StatusLabel` needs text (not icon-only), `Wizard` has minimum-step rules.
- **Props and slots** — use documented names only.

If MCP is unavailable, retry **once**, then fall back to `using-sfe-components` catalog and mark the frame with a design note: *"⚠ Verified against local catalog only — confirm on Storybook before shipping."*

## Building frames in Figma

For each screen in the spec, use the `figma` MCP to:

1. **Create or select the frame.** Use the frame name from the spec's `Screens` section.
2. **Place SFE component instances** using the Figma library key for `@sfe/react-*`. Never build custom versions of components that already exist in the library.
3. **Apply real tokens** — spacing, color, typography, elevation, radius. Use variables/styles, not raw hex/px.
4. **Wire realistic sample data.** Domain-appropriate: "Malware detected on ANALYST-01-DESKTOP", "2 minutes ago", "Sev 2 — Contained", not `"Item 1"`, `"Item 2"`.
5. **Add state variants** when the fidelity target is `investigating`, `stakeholder review`, or `handoff-ready`:
   - Loading state (skeleton or spinner with label).
   - Empty state (illustration + heading + action).
   - Error state (icon + `role="alert"`-equivalent annotation + retry action).
   - No-permission state if applicable.
6. **Annotate accessibility** as design notes on the frame:
   - Focus order (numbered dots or a labeled path).
   - `aria-label` values for icon-only buttons.
   - `aria-live` regions for dynamic content.
   - Keyboard shortcuts.
7. **Annotate content design** — flag error messages that follow the *what happened + why + how to fix* formula.
8. **Annotate RAI** — mark AI-generated content, disclaimers, feedback affordances.

## Bake in standards as you generate (not as a post-check)

- **Contrast:** body text ≥ 4.5:1, large text ≥ 3:1, control state indicators ≥ 3:1 against adjacent colors.
- **Sentence case** everywhere — labels, headings, button text, tab labels, menu items.
- **Error message formula:** *what happened + why + how to fix*. Never standalone "Error", "Failed", "Something went wrong", "Oops".
- **Icon-only buttons** must have a tooltip AND a design-note `aria-label`.
- **Focus indicators** must be visible — do not remove the default outline without providing an equivalent.
- **Color is never the only signal** — pair with text or icon.
- **Semantic structure** — heading levels descend (`Title1` → `Title2` → `Title3`, no skipping).
- **Touch targets** — 24×24 CSS px minimum for AA (32×32 preferred), with adequate spacing.

## Deliverable

Emit a summary block:

```markdown
## Design generated

**Figma file:** <url>
**Frames created / updated:**
- Dashboard — Analyst (main)
- Dashboard — Empty state
- Dashboard — Error state

**Components used (verified via fluent-agent MCP):**
- `MetricGroupCard` (@sfe/react-metric)
- `CompositeDataGrid` (@sfe/react-data-grid)
- …

**Deviations from plan:** …

**Accessibility annotations added:** focus order (12 stops), aria-labels (4 icon buttons), live region (filter results count).

Please open the file, edit anything you'd like, then reply `approved` to move to audit — or tell me what to change and I'll update the frames.
```

## Failure modes (verbatim messaging)

- **Figma MCP down after one retry:** *"⚠ Figma MCP isn't responding. I retried once. I can continue in describe-only mode (I'll emit a component tree + token assignments instead of writing to Figma), or you can reconnect the MCP and I'll retry. Which do you prefer?"*
- **Fluent MCP down after one retry:** proceed using the local catalog, mark uncertainty on affected components.
- **Requested component doesn't exist in the SFE library:** search for the closest SFE equivalent → if none, escalate to Fluent Copilot → then Fluent v9. If nothing fits at all, tell the user and ask if a compose-from-primitives approach is acceptable.

## Do NOT

- Do NOT invent props or components. Everything must be verifiable via MCP or the local catalog.
- Do NOT use raw hex / px — always variables/tokens.
- Do NOT skip the plan for multi-section prototypes.
- Do NOT advance to audit without user approval.
