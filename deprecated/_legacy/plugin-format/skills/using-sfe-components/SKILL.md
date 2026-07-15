---
name: using-sfe-components
description: Component knowledge base for 40+ SFE components — selection guide, MCP routing for live APIs, design tokens, worked code examples, and dashboard/pattern composition. Auto-loaded into every Cosmo session.
triggers:
  - "what component"
  - "which sfe component"
  - "how do I use"
  - "component for"
autoLoad: true
---

# Skill — Using SFE Components

Component knowledge base. Auto-loaded into every Cosmo session so component questions can be answered directly without invoking the full 4-phase workflow.

## Ground rules (in every response about components)

1. **Component priority is strict:**
   1. **SFE** — `@sfe/react-*`, `@sfe/merch-*` (first choice).
   2. **Fluent Copilot** — `@fluentui/react-copilot` (AI/Copilot patterns).
   3. **Fluent UI v9** — `@fluentui/react-components` (base primitives).
   4. **Icons** — `@fluentui/react-icons`.
   Never recommend a lower-priority component when a higher one exists. Never recommend deprecated **Fluent v8** (`@fluentui/react`) or custom one-offs.
2. **Verify APIs via the MCP first.** For every component you're about to recommend, run:
   ```
   ask_fluent_agent(sfe, "For {Component}: when to use, when NOT to use, do's, don'ts,
   required/optional props and slots, default values, supported values, and a code example.")
   ```
   Use `react-v9` for Fluent primitives. Fall back to this local catalog only if MCP is unavailable, and mark the uncertainty.
3. **Never guess prop names.** If MCP is down and this catalog doesn't cover a prop, say so and point the user to Storybook.

## Component catalog (selected, high-signal set)

The full catalog lives in `fluent-agent` MCP; the entries below are the fallback local index. Descriptions are short — always confirm details via MCP.

### Layout & structure

| Component | Package | Use for |
|---|---|---|
| `LayoutGrid` | `@sfe/react-layout-grid` | Responsive grid for page layout, dashboard sections. |
| `Section` | `@sfe/react-section` | Titled content block with heading + description + body. |
| `Card` | `@sfe/react-card` | Bordered / elevated container for grouped content. |
| `Divider` | `@fluentui/react-components` | Horizontal / vertical separator. |

### KPIs & metrics

| Component | Package | Use for |
|---|---|---|
| `Metric` | `@sfe/react-metric` | Single KPI with value + label + trend. |
| `MetricGroupCard` | `@sfe/react-metric` | Card wrapping multiple `Metric` instances (KPI row). |
| `MetricTrend` | `@sfe/react-metric` | Trend arrow + delta % for a metric. |
| `CountAnnotationBar` | `@sfe/react-count-annotation` | Row of annotated counts. **Requires an accompanying chart.** |

### Data display

| Component | Package | Use for |
|---|---|---|
| `DataGrid` | `@sfe/react-data-grid` | Interactive table with sort / select / virtualization. |
| `CompositeDataGrid` | `@sfe/react-data-grid` | `DataGrid` + toolbar + column picker + filter bar. **Prefer over composing yourself.** |
| `InPageFilter` | `@sfe/react-filter` | Filter bar for tables and lists. |
| `TabList` | `@sfe/react-tab-list` | Section switcher. |
| `Breadcrumb` | `@sfe/react-breadcrumb` | Navigation trail. |
| `StatusLabel` | `@sfe/react-status-label` | Pill with severity / status. **Must include text, not icon-only.** |
| `SeverityIndicator` | `@sfe/react-severity` | Severity dot / icon for row-level indication. |

### Forms & input

| Component | Package | Use for |
|---|---|---|
| `Wizard` | `@sfe/react-wizard` | Multi-step form / setup flow (2+ steps). |
| `WizardStep` | `@sfe/react-wizard` | Single step inside a `Wizard`. |
| `Field` | `@fluentui/react-components` | Labeled form control with validation state. |
| `Input` | `@fluentui/react-components` | Text input. |
| `Dropdown` | `@fluentui/react-components` | Single / multi-select. |
| `Combobox` | `@fluentui/react-components` | Combobox with filtering. |
| `DatePicker` | `@fluentui/react-datepicker-compat` | Date picker. |

### Feedback & AI

| Component | Package | Use for |
|---|---|---|
| `InlineOutputCard` | `@fluentui/react-copilot` | Inline AI output with generate / loading / summarized states, references, feedback, follow-ups. |
| `ArtifactPanel` | `@fluentui/react-copilot` | Panel showing AI-generated artifacts with disclaimers and actions. |
| `PromptRibbon` | `@fluentui/react-copilot` | Contextual starter prompts bar; passes selected prompt to the Copilot sidecar. |
| `Dialog` | `@fluentui/react-components` | Modal dialog. **Focus is trapped by default.** |
| `MessageBar` | `@fluentui/react-components` | Inline banner (info / warning / error / success). |
| `Toaster` | `@fluentui/react-components` | Toast notifications (paired with `NotificationService`). |
| `TaskList` / `TaskListItem` / `TaskListCard` | `@sfe/react-task-list` | Vertical checklist / task tracker. |

### Navigation & shell

| Component | Package | Use for |
|---|---|---|
| `NavDrawer` | `@fluentui/react-nav-preview` | Left navigation shell. |
| `AgentAvatar` | `@sfe/react-agent` | Agent avatar chip. |

*(This is a fallback index. For the full 40+ component list and current APIs, always prefer the `fluent-agent` MCP.)*

## Selection guide — common requests

| Request | Recommend |
|---|---|
| "Build a dashboard" | `Section` + `LayoutGrid` + `MetricGroupCard` (+ `Metric` × N) + `TabList` + `InPageFilter` + `CompositeDataGrid` |
| "Setup wizard" | `Wizard` + `WizardStep` × N + `Field` + form controls |
| "Data table with filters" | `InPageFilter` + `CompositeDataGrid` (do **not** compose from raw `DataGrid` + `Toolbar` unless you have a specific reason) |
| "AI-generated content card" | `InlineOutputCard` or `ArtifactPanel` — include RAI disclaimer, feedback, references |
| "Task checklist" | `TaskList` + `TaskListItem` (wrap in `TaskListCard` for card style) |
| "KPI row" | `MetricGroupCard` wrapping `Metric` (+ optional `MetricTrend`) |
| "Severity display" | `SeverityIndicator` for row indicator; `StatusLabel` (with text) for pill |
| "Multi-step form (2+)" | `Wizard` |
| "Single-step form" | `Section` + `Field` × N — **do not** use `Wizard` for 1 step |
| "Starter prompts bar" | `PromptRibbon` — pair with Copilot sidecar handoff |

## Design tokens (from `@sfe/react-theme`)

Use tokens for spacing / color / typography / elevation / border-radius. Never raw hex or px in styles.

- **Spacing:** `tokens.spacingVerticalXXS` … `spacingVerticalXXXL`, `tokens.spacingHorizontalXXS` … `spacingHorizontalXXXL`.
- **Color:** `tokens.colorNeutralBackground1`…`Background6`, `tokens.colorNeutralForeground1`…`Foreground4`, `tokens.colorBrandForeground1`…`Foreground2`, `tokens.colorPaletteRedBackground3` (severity), etc.
- **Typography:** `tokens.fontSizeBase100` … `Base600`, `tokens.fontWeightRegular` / `Medium` / `Semibold` / `Bold`, `tokens.lineHeightBase100` … `Base600`.
- **Elevation:** `tokens.shadow2` / `shadow4` / `shadow8` / `shadow16` / `shadow28` / `shadow64`.
- **Border radius:** `tokens.borderRadiusSmall` / `Medium` / `Large` / `XLarge` / `Circular`.

**Height / width / min / max size** — use **`rem`** / `vh` / `vw` / `em`, not tokens and not pixels.

## Worked example — dashboard skeleton

```tsx
// path/to/Dashboard/Dashboard.tsx
import { useCallback, useMemo } from "react";
import { FluentProvider } from "@fluentui/react-components";
import { sfeLightTheme } from "@sfe/react-theme";
import { LayoutGrid } from "@sfe/react-layout-grid";
import { Section } from "@sfe/react-section";
import { MetricGroupCard, Metric, MetricTrend } from "@sfe/react-metric";
import { TabList, Tab } from "@sfe/react-tab-list";
import { InPageFilter } from "@sfe/react-filter";
import { CompositeDataGrid } from "@sfe/react-data-grid";
import { Title1, Body2 } from "common/components/Text";
import { useTranslate } from "common/hooks/useI18nService";
import { useLogger } from "common/services";
import messages from "./messages";
import { useStyles } from "./styles";

export const Dashboard = () => {
  const styles = useStyles();
  const translate = useTranslate();
  const logger = useLogger();

  const handleTabChange = useCallback(
    (_: unknown, data: { value: string }) => {
      logger.trackEvent({ name: "DashboardTabChange", properties: { tab: data.value } });
    },
    [logger],
  );

  const kpis = useMemo(
    () => [
      { label: translate(messages.kpiOpenIncidents), value: "128", delta: "+12" },
      { label: translate(messages.kpiMttr), value: "42m", delta: "-8m" },
      { label: translate(messages.kpiHighSeverity), value: "19", delta: "+3" },
      { label: translate(messages.kpiCoverage), value: "94%", delta: "+1%" },
    ],
    [translate],
  );

  return (
    <FluentProvider theme={sfeLightTheme}>
      <main className={styles.root} aria-labelledby="dashboard-title">
        <Section>
          <Title1 id="dashboard-title">{translate(messages.title)}</Title1>
          <Body2>{translate(messages.description)}</Body2>
        </Section>

        <MetricGroupCard>
          {kpis.map((k) => (
            <Metric key={k.label} label={k.label} value={k.value}>
              <MetricTrend delta={k.delta} />
            </Metric>
          ))}
        </MetricGroupCard>

        <TabList onTabSelect={handleTabChange} defaultSelectedValue="incidents">
          <Tab value="incidents">{translate(messages.tabIncidents)}</Tab>
          <Tab value="alerts">{translate(messages.tabAlerts)}</Tab>
        </TabList>

        <InPageFilter aria-label={translate(messages.ariaLabelFilters)} />

        <CompositeDataGrid
          aria-label={translate(messages.ariaLabelIncidentsTable)}
          /* items, columns, sort/filter props here */
        />
      </main>
    </FluentProvider>
  );
};
```

Companion `styles.tsx`, `messages.ts`, `index.tsx` follow the templates in `design-to-react-handoff`.

## MCP fallback notes

If `fluent-agent` MCP is unavailable:

- Recommend based on this local catalog and clearly say so:
  > *"⚠ Fluent MCP is unavailable — I'm recommending from Cosmo's local catalog. Verify prop names on Storybook (https://aka.ms/sfe requires corp SSO) before shipping."*
- Do **not** invent prop names. If a prop isn't in this catalog, say you don't know and ask the user to check Storybook or reconnect the MCP.
