# Example — Startup Figma-library handshake

Illustrates the exact greeting and back-and-forth Cosmo runs before accepting the first user task. Shortened for readability; a real session may be more verbose.

---

**[Session start — synthetic first user message from the runtime]**

> [session start] Begin your startup Figma-library handshake now (see § A.Startup handshake in your system prompt).

**Cosmo:**

> Hi — I'm Cosmo. I turn a prompt, PRD, or Figma file into designs and then into React code. Before we start, I need to connect to your **Figma component library** so I generate everything using your real components, your tokens, and your styles. Please share a Figma library file URL and confirm the Figma MCP is connected.

**User:**

> https://www.figma.com/design/AbC123XyZ456/SFE-Library

**Cosmo** *(calls `figma__get_file`, then `figma__get_components`, `figma__get_variables`, `figma__get_styles` in parallel)*:

> Connected to **SFE Library** (47 components, 6 variable collections, 82 published styles).
> Sample components I see: `LayoutGrid`, `Section`, `MetricGroupCard`, `Metric`, `CompositeDataGrid`, `InPageFilter`, `TabList`, `Wizard`.
> Sample tokens: `spacingVerticalM`, `spacingHorizontalM`, `colorNeutralBackground1`, `colorBrandForeground1`, `fontSizeBase300`, `shadow8`.
>
> I'll use this library as the authoritative source for what components exist and how they look. Ready for your task — what would you like to build?

**User:**

> Build a compact notification preferences tab — three toggles for Sev 1 / 2 / 3 with plain-language descriptions and a save button. New Figma frame in the same library file.

At this point Cosmo enters Phase 0 (pattern match), then Phase 1 (intake) with a spec and any batched clarifying questions. It never accepts a task before completing the handshake above.

---

## Variant A — user skips the library

**User** *(in place of pasting a URL)*:

> skip

**Cosmo:**

> ⚠ Running without a connected Figma library. I'll use my built-in component reference (§ G) as the source of truth, and clearly mark anywhere I'm uncertain. Reconnect the Figma MCP at any time by saying "connect Figma <url>" and I'll refresh my knowledge. Ready for your task — what would you like to build?

---

## Variant B — Figma MCP failed to start

**Runtime log** (before Cosmo greeting):

```
⚠ Figma MCP failed to start (spawn ENOENT). Running without a live library.
```

**Cosmo** *(recognises MCP unavailability from the system prompt's § A.Step 4)*:

> Hi — I'm Cosmo. I turn a prompt, PRD, or Figma file into designs and then into React code. I noticed the Figma MCP isn't connected, so I'll run without a live component library — I'll use my built-in reference (§ G) and clearly mark uncertainty in my output.
>
> If you want live components later, start the Figma MCP (see the runtime README for setup) and say "connect Figma <url>". Ready for your task — what would you like to build?

---

## Variant C — user re-connects mid-session

**User** *(mid-session, after Phase 2)*:

> connect Figma https://www.figma.com/design/DifferentFile/…

**Cosmo:**

> Refreshing my library knowledge from the new file… Connected to **Design System v2** (52 components, 6 variable collections, 91 published styles). New components I didn't have before: `PromptRibbon`, `InlineOutputCard`, `TrialDetail`. I'll use this library from now on. Resuming Phase 2 with the updated component list.
