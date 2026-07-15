# Pattern — Copilot onboarding & upsell

*Reference file for the Cosmo skill. Read this when the user's request matches this pattern (see § A.Phase 0 pattern-match).*

### Skill — `pattern-copilot-onboarding-and-upsell`

#### Quick match

- **Pattern name:** pattern-copilot-onboarding-and-upsell
- **When to use:** User wants a distributed Security Copilot onboarding and upsell flow — chat handoff, trial cards, trial details, banner-based activation.
- **Key components:** Card, MessageBar, Button, Section, Body1

#### Status

> ⚠ **This is a scaffold.** Cosmo ships this skill's shape (frontmatter, quick-match header, and section outline) so Phase 0 pattern-match delegation works from day one. The **implementation procedure** must be filled in by porting the original `pattern-copilot-onboarding-and-upsell` skill content from the source `sfe-prototyping` plugin (or by writing it fresh for Cosmo).

Until the procedure is filled in, Cosmo's delegation fallback will trigger and the request will be handled by Cosmo's general 4-phase workflow instead. See `this system prompt` § *Delegation fallback*.

#### Expected sections (fill these in)

##### Prerequisites

What the user must have in place before this pattern applies (e.g., an existing wizard shell, a Copilot sidecar, an admin tenant, etc.).

##### Variants

List the pattern's variants (e.g., "2-slide baseline vs 3-slide extended", "multi-agent vs single-agent vs no-library") and the decision criteria for choosing between them.

##### Implementation procedure

Step-by-step build instructions. Each step should:

1. State the goal.
2. Name the SFE / Fluent Copilot / Fluent v9 component used, verified via `consult the connected Figma library (see § A.Startup handshake)`.
3. Show the code snippet or Figma frame structure.
4. Call out standards to apply (a11y, content design, RAI, tokens).

##### Content design guidance

Verbatim copy templates (heading, description, primary CTA, secondary CTA, error states) that follow the SFE content-design voice and the error-message formula. Sentence case, plain language.

##### Accessibility requirements

Pattern-specific a11y requirements beyond the site-wide baseline — focus order, live regions, keyboard shortcuts, ARIA relationships, dialog focus trap and return, etc.

##### RAI guidance (for Copilot / agent patterns)

AI identity marks, disclaimer text, feedback affordances, consent-first behavior for auto-actions, undo / override.

##### Design language

Spacing / color / typography / elevation tokens specific to this pattern, and `rem`/`vh`/`vw` sizing for surface dimensions.

##### Verification checklist

A short pass/fail list the user can walk through after building the pattern (e.g., "opens on trigger event", "traps focus", "returns focus on close", "announces to screen reader", "honors user consent").

##### Worked example

One end-to-end example — Figma structure and/or React code — showing the pattern applied to a concrete Security Copilot scenario.

#### Notes for Cosmo

- When this pattern is matched in Phase 0, follow the *Implementation procedure* end-to-end and do NOT run Phases 1–4 (§§ A.Phase 1 through A.Phase 4).
- Still enforce the global rules from `this system prompt` — component priority, MCP verification, standards-baked-in-not-bolted-on, and Trust360UX code conventions if the user asks for code output.
- If the procedure is a scaffold only (as above), delegate back to the general 4-phase workflow via the fallback message and carry forward any user answers already gathered.
