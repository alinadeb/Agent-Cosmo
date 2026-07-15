# Code-handoff procedure (Phase 4)

*Reference file for the Cosmo skill. Read this when the user's request enters the corresponding phase.*

## Skill — Design-to-React handoff

### Purpose

Turn approved Figma frames into React + TypeScript source that a Trust360UX developer can paste directly into `EUAIFrontEnd/src/`. Code must follow every Trust360UX convention — no shortcuts.

### Preconditions

- Phase 3 audit was accepted (`approved` from the user).
- Figma file is stable (no in-flight edits).
- `figma-desktop` MCP is available to re-read the frames (or the frames were exported and pasted). Component APIs come from the Fluent Agent MCP (+ Code Connect where available).

### Output structure — always per component

For each component you emit, produce **exactly** these four files in a folder:

```
ComponentName/
├── index.tsx           # barrel export — 1 line
├── ComponentName.tsx   # main component
├── styles.tsx          # makeStyles + tokens
└── messages.ts         # i18n message definitions (defineMessages)
```

Emit each file as a fenced code block with a **path header line** so the user can paste directly:

````markdown
```tsx
// EUAIFrontEnd/src/<module>/components/IncidentsTable/IncidentsTable.tsx
import { …
```
````

### The non-negotiable rules

#### 1. Styles

- `makeStyles` from `@fluentui/react-components`.
- Tokens from `@sfe/react-theme` — `tokens.spacingVerticalM`, `tokens.colorNeutralBackground1`, `tokens.fontSizeBase300`, `tokens.shadow8`, etc.
- **Height / width / min / max size:** `rem` / `vh` / `vw` / `em`. **Never hardcoded px.**
- No inline styles. No CSS-in-JS in the component file.
- Use **logical properties** — `paddingBlock` / `paddingInline`, `marginBlock` / `marginInline`, `insetBlock` / `insetInline`.
- When using a Text component (see §7), do **not** set `fontSize`, `fontWeight`, `lineHeight`, or text `color` in `styles.tsx` — the Text component owns those.

**Template — `styles.tsx`:**

```tsx
import { makeStyles } from "@fluentui/react-components";
import { tokens } from "@sfe/react-theme";

export const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    paddingBlock: tokens.spacingVerticalL,
    paddingInline: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow8,
    width: "100%",
    minHeight: "2rem",
  },
});
```

#### 2. i18n

- `messages.ts` **only** (not `messages.json`) for all new components.
- Import `defineMessages` from `common/utils/i18n`.
- Scope pattern: `{root}.{component}` where root is `shell` / `common` / a solution name (`datasetManagement`, etc.).
- Keys are **camelCase and flat** — no nested objects. Prefix grouped keys (`ariaLabelCloseButton`, `buttonSubmit`) instead of nesting.
- Interpolation: **double braces** `{{variable}}` in `defaultMessage`. Pass variables as strings.
- **Never** hardcode user-facing text in `.tsx`. Every user-facing string goes through `translate(messages.key)`.

**Template — `messages.ts`:**

```ts
import { defineMessages } from "common/utils/i18n";

export const scope = "datasetManagement.incidentsTable";

const messages = defineMessages({
  title: {
    id: `${scope}.title`,
    defaultMessage: "Active incidents",
  },
  buttonExport: {
    id: `${scope}.buttonExport`,
    defaultMessage: "Export",
  },
  ariaLabelExportButton: {
    id: `${scope}.ariaLabelExportButton`,
    defaultMessage: "Export the current incidents view to CSV",
  },
  itemsFound: {
    id: `${scope}.itemsFound`,
    defaultMessage: "{{count}} incidents found",
  },
});

export default messages;
```

#### 3. Component file

**Template — `ComponentName.tsx`:**

```tsx
import { useCallback, useMemo } from "react";
import { Button } from "common/components/Button";
import { Title2, Body2 } from "common/components/Text";
import { useTranslate } from "common/hooks/useI18nService";
import { useLogger } from "common/services";
import messages from "./messages";
import { useStyles } from "./styles";

export const IncidentsTable = () => {
  const styles = useStyles();
  const translate = useTranslate();
  const logger = useLogger();

  const handleExport = useCallback(() => {
    logger.trackEvent({ name: "IncidentsExport", properties: { source: "table" } });
    // …
  }, [logger]);

  const summary = useMemo(
    () => translate(messages.itemsFound, { count: String(items.length) }),
    [translate, items.length],
  );

  return (
    <section className={styles.root} aria-labelledby="incidents-title">
      <Title2 id="incidents-title">{translate(messages.title)}</Title2>
      <Body2 role="status" aria-live="polite">{summary}</Body2>
      <Button
        appearance="primary"
        onClick={handleExport}
        aria-label={translate(messages.ariaLabelExportButton)}
      >
        {translate(messages.buttonExport)}
      </Button>
      {/* … */}
    </section>
  );
};
```

**Rules baked into the template above:**

- Named export (no `default` unless the module's convention already uses default).
- `useCallback` for event handlers; `useMemo` for computed values / JSX.
- **Never** define inline arrow functions in JSX props.
- Alias imports (`common/*`) — no `../../..`.
- Use the **`common/components/Button` wrapper**, not `@fluentui/react-components` directly. Check `common/components/*` for every UI primitive before falling back to Fluent.

#### 4. `index.tsx` — barrel export

```tsx
export { IncidentsTable } from "./IncidentsTable";
```

#### 5. Routing

- Wrapper hooks only: `useNavigate`, `useLocation`, `useParams`, `useSearchParams`, `useCurrentPath`, `useRouteParams<T>`, `useRouteParam`, `useQueryParams`, `useQueryParam`, `useIsCurrentRoute`, `useRouteState<T>` — all from `common/hooks/useRouteService`.
- **Never** `import { useNavigate } from "react-router"` directly.

#### 6. Logging

- Components / hooks → `const logger = useLogger()` from `common/services`.
- Redux slices / non-React → `import { hostService } from "app/services/HostService"; const logger = hostService.log;`.
- **Never** `console.log` / `console.warn` / `console.error` / `console.info` / `console.debug`.

#### 7. Text components (semantic + typographic)

- Every user-facing text uses a component from `common/components/Text`:
  - `Title1` (32px, page title) — one per page.
  - `Title2` (28px, section header) — `<h2>` equivalent.
  - `Title3` (24px, subsection header) — `<h3>` equivalent.
  - `Subtitle1` (20px, major content section).
  - `Subtitle2` (16px, secondary header).
  - `Body1` (14px, primary content).
  - `Body2` (12px, secondary content).
  - `Caption1` (12px, caption / label).
  - `Caption2` (10px, small annotation).
- **Never** raw `<h1>` / `<h2>` / `<h3>` / `<h4>` / `<h5>` / `<h6>` / `<p>` / `<span>` for text.
- **Never** re-declare `fontSize` / `fontWeight` / `lineHeight` / `color` in `styles.tsx` for a Text component — it owns those. Only add layout / overflow styles.

#### 8. Accessibility (WCAG 2.2 AA — baked in)

- **Semantic HTML** — `<button>` for actions, `<a>` for navigation, `<nav>` / `<main>` / `<header>` / `<footer>` landmarks, form controls with `<label>` / `<Field>`.
- **Accessible name** on every interactive element:
  - Text button → visible text is the name.
  - Icon-only button → `aria-label={translate(messages.ariaLabelXxx)}`.
  - Grouped controls with the same label → prefix with context (`"Remove {itemName}"`).
- **Keyboard operability** — all interactives keyboard-reachable; visible focus indicator (do not remove the outline without an equivalent).
- **`tabIndex`** — only `0` or `-1`; **never** positive.
- **Composite widgets** (menus, listboxes, grids) — roving tabindex OR `aria-activedescendant`. Arrow keys move within; Enter/Space activate; Escape closes.
- **Focus management** — modals trap focus; return focus to the trigger on close; `autoFocus` on the first field of a dialog when appropriate.
- **Live regions** — `role="status" aria-live="polite"` for non-urgent updates (filter counts, save-succeeded), `role="alert" aria-live="assertive"` for errors.
- **Loading** — `aria-busy={isLoading}`; `Spinner` with `label`.
- **Forms** — associated `<Field>` label, `aria-required` for required, `aria-invalid` + `aria-describedby` for error text, `role="alert"` on the error element, error text follows the *what + why + how* formula.
- **Tables** — `<table>` with `<thead>` / `<tbody>` / `<th scope="col">` / `<th scope="row">`; `aria-label` or `<caption>`; complex data → prefer breaking into multiple simple tables.
- **Grids (interactive)** — use SFE `DataGrid` / `CompositeDataGrid` (never `<table>` for interactive data).
- **Images / icons** — `<img alt>` set meaningfully (or `alt=""` for decorative); `<svg role="img" aria-label="...">` or `aria-hidden="true"` for decorative.
- **Color contrast** — body ≥ 4.5:1, large ≥ 3:1, states ≥ 3:1. Color is never the only signal (pair with text/icon).
- **Skip link** — pages have a `Skip to main` link visible on focus (site-wide, usually in shell).

#### 9. Content design

- Sentence case for labels, headings, buttons, tabs, menu items.
- Error messages: *what happened + why + how to fix* — never standalone "Error", "Failed", "Something went wrong", "Oops".
- Plain language. No jargon that isn't standard for Security Copilot users.

#### 10. RAI (for AI features)

- Mark AI identity clearly (icon + label like "AI-generated summary").
- Disclaimer on AI outputs: *"AI-generated content may be inaccurate. Review before acting."*
- Feedback controls (thumbs up/down + optional reason capture) on every AI output.
- Undo / override wherever the AI has made a state change.

#### 11. Component priority in imports

1. `@sfe/react-*` / `@sfe/merch-*`
2. `@fluentui/react-copilot`
3. `@fluentui/react-components`
4. Icons: `@fluentui/react-icons`

Never import from `@fluentui/react` (deprecated v8) or custom one-off packages when a higher-priority equivalent exists.

### Emit-time steps

1. **Re-read the Figma frames** via the `figma` MCP so you code from the finalized design, not from stale context.
2. **Component-to-code map** — for each Figma frame, decide the component tree in code. Prefer one `.tsx` per screen for prototypes. Split into subcomponents when a section is reused or exceeds ~150 lines.
3. **For each React component**, emit the 4 files with path headers.
4. **List every message key** you added, so the user knows to run `npm run merge-messages`.
5. **List residual manual checks** — screen reader announcement wording, real-device contrast, keyboard-only end-to-end traversal, focus return on modal close, live-region announce cadence. Do **not** claim the code is "fully accessible" — say it was built with accessibility in mind and still needs manual + tool verification (axe, Accessibility Insights).

### Failure modes

- **Figma MCP down after one retry:** ask the user to paste frame exports; run in image-mode and mark the code with `// TODO: verify from Figma once MCP is back` where a decision is uncertain.
- **A Figma decision would violate a Trust360UX rule** (e.g., inline styles, hardcoded px, raw `<h1>`): **do not silently fix** — surface it, tell the user *"The Figma frame implies X, which would break rule Y. I'll do Z instead — flag if that's not right."*
- **Missing SFE component** for a Figma element: escalate to Fluent Copilot, then Fluent v9. Never invent a component.

### Deliverable

Emit the code blocks, then:

```markdown
### Handoff summary

**Files emitted:** N (across M components)
**Message keys added:** K — run `npm run merge-messages` to update `public/locales/en/translation.json`.
**Component packages used:** @sfe/react-*, @fluentui/react-copilot, @fluentui/react-components, @fluentui/react-icons
**Wrappers reused from `common/components`:** Button, DataTable, Filter, …

**Residual manual checks (not covered by generation):**
- Screen-reader announcement wording (test with NVDA / VoiceOver).
- Keyboard-only traversal end-to-end (Tab / Shift+Tab / Enter / Space / Escape / Arrows).
- Real-device contrast at 200% zoom.
- axe / Accessibility Insights automated scan.
- i18n review (Hindi + any other target locales after `merge-messages`).

Want me to iterate on anything, split a component further, or add more state variants?
```

### Do NOT

- Do NOT emit inline styles, hardcoded px, raw `<h1>` / `<p>` / `<span>` for text, or `console.*`.
- Do NOT import from `react-router` directly, or from `@fluentui/react` (v8).
- Do NOT bypass `common/components/*` wrappers when they exist.
- Do NOT claim the code is fully accessible / production-ready. State that it was built with those principles and still needs manual review.
- Do NOT emit code if Phase 3 audit findings are unresolved. Return to Phase 3.


---
