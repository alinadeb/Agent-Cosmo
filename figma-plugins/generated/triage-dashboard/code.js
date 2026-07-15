// Cosmo — Triage Dashboard plugin
// Writes a security incident triage dashboard into the current Figma page.
//
// NOTE ON FIDELITY: This build uses SFE-STYLED PRIMITIVES (frames, text,
// rectangles with Auto Layout) that approximate SFE/Fluent components. They are
// look-alikes, NOT real @sfe/react-* component instances. To swap in genuine
// SFE instances, resolve each component's library key and replace the relevant
// factory calls with figma.importComponentByKeyAsync(key).createInstance().
//
// LAYOUT DISCIPLINE: width is sized top-down. The page frame has a FIXED width;
// every full-width child is set with layoutSizingHorizontal = "FILL" AFTER it is
// appended to an already-sized parent. Fixed-width children use "FIXED" + resize.

(async () => {
  const CONTENT_W = 1280;

  const C = {
    pageBg: "#FAFAFA",
    surface: "#FFFFFF",
    border: "#EDEDED",
    stroke: "#D1D1D1",
    textPrimary: "#242424",
    textSecondary: "#616161",
    textMuted: "#909090",
    brand: "#0F6CBD",
    sevHighBg: "#FDE7E9", sevHighFg: "#B10E1C",
    sevMedBg: "#FFF4CE", sevMedFg: "#7A4D05",
    sevLowBg: "#EDEBE9", sevLowFg: "#3B3A39",
    stNewBg: "#EFF6FC", stNewFg: "#0F6CBD",
    stProgBg: "#FFF4CE", stProgFg: "#7A4D05",
    stResBg: "#E6F4EA", stResFg: "#0E700E",
    pos: "#0E700E", neg: "#B10E1C", warn: "#7A4D05",
    aiBg: "#F3F0FB", aiFg: "#3B2A7A", aiChip: "#4B2FA8",
    skeleton: "#ECECEC"
  };

  const WEIGHT = { 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold" };

  try {
    await Promise.all(
      Object.values(WEIGHT).map((style) => figma.loadFontAsync({ family: "Inter", style }))
    );
  } catch (e) {
    figma.closePlugin("Couldn't load the Inter font family — aborting.");
    return;
  }

  // ---- low-level helpers -----------------------------------------------------
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substr(0, 2), 16) / 255,
      g: parseInt(h.substr(2, 2), 16) / 255,
      b: parseInt(h.substr(4, 2), 16) / 255
    };
  }
  const solid = (hex) => [{ type: "SOLID", color: hexToRgb(hex) }];

  function frame(name, o) {
    o = o || {};
    const f = figma.createFrame();
    f.name = name;
    f.layoutMode = o.dir || "VERTICAL";
    f.primaryAxisSizingMode = "AUTO";
    f.counterAxisSizingMode = "AUTO";
    f.itemSpacing = o.gap || 0;
    const px = o.padX != null ? o.padX : o.pad || 0;
    const py = o.padY != null ? o.padY : o.pad || 0;
    f.paddingLeft = f.paddingRight = px;
    f.paddingTop = f.paddingBottom = py;
    f.fills = o.fill ? solid(o.fill) : [];
    f.cornerRadius = o.radius || 0;
    if (o.justify) f.primaryAxisAlignItems = o.justify;
    if (o.align) f.counterAxisAlignItems = o.align;
    if (o.border) { f.strokes = solid(o.border); f.strokeWeight = o.borderW || 1; }
    return f;
  }

  function text(chars, o) {
    o = o || {};
    const t = figma.createText();
    t.fontName = { family: "Inter", style: WEIGHT[o.weight || 400] };
    t.characters = chars;
    t.fontSize = o.size || 13;
    t.fills = solid(o.color || C.textPrimary);
    if (o.spacing) t.letterSpacing = { value: o.spacing, unit: "PIXELS" };
    return t;
  }

  // Fill / fix width — call AFTER the node is appended to a sized parent.
  function fillW(n) { try { n.layoutSizingHorizontal = "FILL"; } catch (e) {} }
  function fixW(n, w) { try { n.layoutSizingHorizontal = "FIXED"; } catch (e) {} n.resize(w, Math.max(n.height, 1)); }

  // Multi-line text that fills parent width and wraps.
  function para(parent, chars, o) {
    const t = text(chars, o);
    parent.appendChild(t);
    t.textAutoResize = "HEIGHT";
    fillW(t);
    return t;
  }

  // ---- component-like primitives --------------------------------------------
  function badge(label, bg, fg) {
    const b = frame("Badge", { dir: "HORIZONTAL", padX: 8, padY: 2, fill: bg, radius: 4, align: "CENTER" });
    b.appendChild(text(label, { size: 12, weight: 600, color: fg }));
    return b;
  }
  const severityBadge = (s) =>
    s === "High" ? badge("High", C.sevHighBg, C.sevHighFg)
      : s === "Medium" ? badge("Medium", C.sevMedBg, C.sevMedFg)
        : badge("Low", C.sevLowBg, C.sevLowFg);
  const statusBadge = (s) =>
    s === "New" ? badge("New", C.stNewBg, C.stNewFg)
      : s === "In progress" ? badge("In progress", C.stProgBg, C.stProgFg)
        : badge("Resolved", C.stResBg, C.stResFg);

  function button(label, primary) {
    const b = frame("Button", {
      dir: "HORIZONTAL", padX: 12, padY: 8, radius: 4, align: "CENTER",
      fill: primary ? C.brand : C.surface, border: primary ? null : C.stroke
    });
    b.appendChild(text(label, { size: 13, weight: 600, color: primary ? "#FFFFFF" : C.textPrimary }));
    return b;
  }

  function dropdown(label) {
    const d = frame("Filter", { dir: "HORIZONTAL", gap: 8, padX: 12, padY: 6, radius: 4, align: "CENTER", fill: C.surface, border: C.stroke });
    d.appendChild(text(label, { size: 13, weight: 500, color: C.textPrimary }));
    d.appendChild(text("v", { size: 11, weight: 600, color: C.textSecondary }));
    return d;
  }

  function kpi(label, value, delta, deltaColor) {
    const c = frame("KPI", { dir: "VERTICAL", gap: 6, pad: 16, radius: 8, fill: C.surface, border: C.border });
    c.appendChild(text(label, { size: 12, weight: 500, color: C.textSecondary }));
    c.appendChild(text(value, { size: 28, weight: 600, color: C.textPrimary }));
    c.appendChild(text(delta, { size: 12, weight: 500, color: deltaColor }));
    return c;
  }

  function skel(w, h) {
    const r = figma.createRectangle();
    r.resize(w, h);
    r.cornerRadius = 4;
    r.fills = solid(C.skeleton);
    return r;
  }

  // ---- sample data -----------------------------------------------------------
  const INCIDENTS = [
    { id: "INC-4821", title: "Suspicious OAuth consent grant", sev: "High", status: "New", assignee: "Unassigned", source: "Defender XDR", entities: "user: j.reyes, app: DataSync", age: "42m", sla: "3h 18m left", urgent: false, tactic: "Initial Access (TA0001)" },
    { id: "INC-4820", title: "Impossible-travel sign-in", sev: "High", status: "In progress", assignee: "A. Deb", source: "Entra ID Protection", entities: "user: m.okafor", age: "1h 05m", sla: "1h 55m left", urgent: false, tactic: "Credential Access (TA0006)" },
    { id: "INC-4818", title: "Mass file download from SharePoint", sev: "Medium", status: "New", assignee: "Unassigned", source: "Defender for Cloud Apps", entities: "user: l.tanaka, 312 files", age: "1h 22m", sla: "4h 38m left", urgent: false, tactic: "Exfiltration (TA0010)" },
    { id: "INC-4815", title: "PowerShell encoded command on host", sev: "High", status: "In progress", assignee: "R. Silva", source: "Defender for Endpoint", entities: "device: FIN-WS-204", age: "2h 10m", sla: "50m left", urgent: true, tactic: "Execution (TA0002)" },
    { id: "INC-4812", title: "Anomalous mailbox forwarding rule", sev: "Medium", status: "New", assignee: "Unassigned", source: "Defender for Office 365", entities: "user: s.nguyen", age: "2h 47m", sla: "3h 13m left", urgent: false, tactic: "Collection (TA0009)" },
    { id: "INC-4809", title: "Brute-force against VPN gateway", sev: "Medium", status: "In progress", assignee: "A. Deb", source: "Sentinel", entities: "ip: 203.0.113.44", age: "3h 30m", sla: "2h 30m left", urgent: false, tactic: "Credential Access (TA0006)" },
    { id: "INC-4805", title: "New global admin role assignment", sev: "High", status: "New", assignee: "Unassigned", source: "Entra ID", entities: "user: admin.svc", age: "4h 12m", sla: "48m left", urgent: true, tactic: "Privilege Escalation (TA0004)" },
    { id: "INC-4801", title: "Malware quarantined on endpoint", sev: "Low", status: "Resolved", assignee: "R. Silva", source: "Defender for Endpoint", entities: "device: HR-LT-118", age: "6h 40m", sla: "Met", urgent: false, tactic: "Execution (TA0002)" }
  ];

  const COLS = [
    { key: "id", label: "Incident", w: 96 },
    { key: "title", label: "Title", grow: true },
    { key: "sev", label: "Severity", w: 100 },
    { key: "status", label: "Status", w: 116 },
    { key: "assignee", label: "Assignee", w: 120 },
    { key: "age", label: "Age / SLA", w: 120 }
  ];

  function tableCell(col, inc, header) {
    const c = frame("Cell", { dir: "HORIZONTAL", gap: 6, align: "CENTER" });
    if (header) {
      c.appendChild(text(col.label, { size: 12, weight: 600, color: C.textSecondary }));
    } else if (col.key === "sev") {
      c.appendChild(severityBadge(inc.sev));
    } else if (col.key === "status") {
      c.appendChild(statusBadge(inc.status));
    } else if (col.key === "age") {
      const box = frame("AgeBox", { dir: "VERTICAL", gap: 2 });
      box.appendChild(text(inc.age, { size: 13, color: C.textPrimary }));
      box.appendChild(text(inc.sla, { size: 11, color: inc.urgent ? C.neg : C.textSecondary }));
      c.appendChild(box);
    } else if (col.key === "id") {
      c.appendChild(text(inc.id, { size: 13, weight: 600, color: C.brand }));
    } else if (col.key === "assignee") {
      c.appendChild(text(inc.assignee, { size: 13, color: inc.assignee === "Unassigned" ? C.textMuted : C.textPrimary }));
    } else {
      c.appendChild(text(String(inc[col.key]), { size: 13, color: C.textPrimary }));
    }
    return c;
  }

  function addRow(card, inc, header) {
    const r = frame("Row", {
      dir: "HORIZONTAL", gap: 12, padX: 16, padY: header ? 10 : 12, align: "CENTER",
      fill: header ? "#FAFAFA" : C.surface
    });
    card.appendChild(r);
    fillW(r);
    COLS.forEach((col) => {
      const c = tableCell(col, inc, header);
      r.appendChild(c);
      if (col.grow) fillW(c); else fixW(c, col.w);
    });
  }

  function addSeparator(card) {
    const s = figma.createRectangle();
    s.resize(600, 1);
    s.fills = solid(C.border);
    card.appendChild(s);
    fillW(s);
  }

  function buildTable(parent) {
    const card = frame("Incident queue", { dir: "VERTICAL", gap: 0, radius: 8, fill: C.surface, border: C.border });
    card.clipsContent = true;
    parent.appendChild(card);
    fillW(card);
    addRow(card, null, true);
    INCIDENTS.forEach((inc, i) => {
      addRow(card, inc, false);
      if (i < INCIDENTS.length - 1) addSeparator(card);
    });
    return card;
  }

  // ---- detail panel (AI suggestion + RAI) -----------------------------------
  function metaRow(parent, label, value) {
    const m = frame("Meta", { dir: "HORIZONTAL", gap: 12, justify: "SPACE_BETWEEN", align: "MIN" });
    parent.appendChild(m);
    fillW(m);
    m.appendChild(text(label, { size: 12, weight: 500, color: C.textSecondary }));
    const v = text(value, { size: 12, weight: 500, color: C.textPrimary });
    v.textAlignHorizontal = "RIGHT";
    m.appendChild(v);
    fixW(v, 200);
  }

  function buildDetailPanel(parent) {
    const inc = INCIDENTS[0];
    const p = frame("Incident detail", { dir: "VERTICAL", gap: 12, pad: 16, radius: 8, fill: C.surface, border: C.border });
    parent.appendChild(p);
    fixW(p, 360);

    p.appendChild(text("INCIDENT DETAILS", { size: 11, weight: 600, color: C.textMuted, spacing: 0.5 }));
    para(p, inc.title, { size: 16, weight: 600, color: C.textPrimary });

    const badges = frame("Badges", { dir: "HORIZONTAL", gap: 8 });
    badges.appendChild(severityBadge(inc.sev));
    badges.appendChild(statusBadge(inc.status));
    p.appendChild(badges);

    const meta = frame("MetaList", { dir: "VERTICAL", gap: 8 });
    p.appendChild(meta);
    fillW(meta);
    metaRow(meta, "Incident ID", inc.id);
    metaRow(meta, "Detection source", inc.source);
    metaRow(meta, "Affected entities", inc.entities);
    metaRow(meta, "MITRE tactic", inc.tactic);
    metaRow(meta, "Age", inc.age);
    metaRow(meta, "SLA", inc.sla);

    const divider = figma.createRectangle();
    divider.resize(320, 1);
    divider.fills = solid(C.border);
    p.appendChild(divider);
    fillW(divider);

    const ai = frame("AI triage suggestion", { dir: "VERTICAL", gap: 8, pad: 12, radius: 8, fill: C.aiBg });
    p.appendChild(ai);
    fillW(ai);
    const aiHead = frame("AIHead", { dir: "HORIZONTAL", gap: 8, align: "CENTER" });
    aiHead.appendChild(badge("AI", C.aiChip, "#FFFFFF"));
    aiHead.appendChild(text("Triage suggestion", { size: 13, weight: 600, color: C.aiFg }));
    ai.appendChild(aiHead);
    para(ai, "Likely a malicious OAuth consent. Recommended actions: revoke the DataSync app grant, disable sign-in for j.reyes, and export the consent audit logs for review.", { size: 13, color: C.textPrimary });
    para(ai, "AI-generated — verify before acting. Not a substitute for analyst judgment.", { size: 11, color: C.textSecondary });
    const fb = frame("Feedback", { dir: "HORIZONTAL", gap: 8 });
    fb.appendChild(button("Helpful", false));
    fb.appendChild(button("Not helpful", false));
    ai.appendChild(fb);

    const actions = frame("Actions", { dir: "HORIZONTAL", gap: 8 });
    p.appendChild(actions);
    fillW(actions);
    actions.appendChild(button("Assign to me", true));
    actions.appendChild(button("Escalate", false));
    return p;
  }

  // ---- shared shell pieces ---------------------------------------------------
  function addHeader(page) {
    const h = frame("Header", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
    page.appendChild(h);
    fillW(h);
    const titleBlock = frame("TitleBlock", { dir: "VERTICAL", gap: 4 });
    titleBlock.appendChild(text("Incident triage", { size: 28, weight: 600, color: C.textPrimary }));
    titleBlock.appendChild(text("Security operations · Tier-1 queue", { size: 13, weight: 400, color: C.textSecondary }));
    h.appendChild(titleBlock);
    const actions = frame("HeaderActions", { dir: "HORIZONTAL", gap: 8, align: "CENTER" });
    actions.appendChild(button("Export", false));
    actions.appendChild(button("Assign to me", true));
    h.appendChild(actions);
  }

  function addKpiRow(page) {
    const row = frame("KPIs", { dir: "HORIZONTAL", gap: 16 });
    page.appendChild(row);
    fillW(row);
    [
      kpi("Open incidents", "128", "+12 vs yesterday", C.neg),
      kpi("High severity", "9", "3 breaching SLA", C.neg),
      kpi("Unassigned", "14", "5 over 1h old", C.warn),
      kpi("Mean time-to-ack", "18m", "4m under target", C.pos)
    ].forEach((c) => { row.appendChild(c); fillW(c); });
  }

  function addFilterBar(page) {
    const bar = frame("Filters", { dir: "HORIZONTAL", gap: 8, align: "CENTER" });
    page.appendChild(bar);
    fillW(bar);
    ["Severity: All", "Status: All", "Assignee: All", "Time: Last 24h"].forEach((l) => bar.appendChild(dropdown(l)));
    const spacer = frame("Spacer", { dir: "HORIZONTAL" });
    bar.appendChild(spacer);
    fillW(spacer);
    const search = frame("Search", { dir: "HORIZONTAL", gap: 8, padX: 12, padY: 6, radius: 4, align: "CENTER", fill: C.surface, border: C.stroke });
    search.appendChild(text("Search incidents", { size: 13, color: C.textMuted }));
    bar.appendChild(search);
    fixW(search, 220);
  }

  function pageFrame(name) {
    const f = frame(name, { dir: "VERTICAL", pad: 32, gap: 24, fill: C.pageBg });
    f.counterAxisSizingMode = "FIXED";
    f.resize(CONTENT_W, 100);
    return f;
  }

  // ---- screens ---------------------------------------------------------------
  function buildDashboard() {
    const page = pageFrame("Triage dashboard — Default");
    addHeader(page);
    addKpiRow(page);
    addFilterBar(page);
    const content = frame("Content", { dir: "HORIZONTAL", gap: 16, align: "MIN" });
    page.appendChild(content);
    fillW(content);
    buildTable(content);
    buildDetailPanel(content);
    return page;
  }

  function buildEmpty() {
    const page = pageFrame("Triage dashboard — Empty");
    addHeader(page);
    addFilterBar(page);
    const card = frame("EmptyState", { dir: "VERTICAL", gap: 8, pad: 48, radius: 8, fill: C.surface, border: C.border, align: "CENTER", justify: "CENTER" });
    page.appendChild(card);
    fillW(card);
    card.appendChild(text("No incidents match your filters", { size: 16, weight: 600, color: C.textPrimary }));
    card.appendChild(text("Try clearing filters or widening the time range.", { size: 13, color: C.textSecondary }));
    const cta = frame("CtaWrap", { dir: "HORIZONTAL", padY: 4 });
    cta.appendChild(button("Clear filters", true));
    card.appendChild(cta);
    return page;
  }

  function buildError() {
    const page = pageFrame("Triage dashboard — Error");
    addHeader(page);
    const card = frame("ErrorState", { dir: "VERTICAL", gap: 8, pad: 32, radius: 8, fill: C.surface, border: C.border });
    page.appendChild(card);
    fillW(card);
    card.appendChild(text("Couldn't load incidents", { size: 16, weight: 600, color: C.textPrimary }));
    para(card, "The detection service didn't respond in time (timed out after 30s). This is usually temporary — retry, or check service health if it persists.", { size: 13, color: C.textSecondary });
    const row = frame("ErrActions", { dir: "HORIZONTAL", gap: 8 });
    row.appendChild(button("Retry", true));
    row.appendChild(button("View service health", false));
    card.appendChild(row);
    return page;
  }

  function buildLoading() {
    const page = pageFrame("Triage dashboard — Loading");
    addHeader(page);
    const krow = frame("KPIsSkeleton", { dir: "HORIZONTAL", gap: 16 });
    page.appendChild(krow);
    fillW(krow);
    for (let i = 0; i < 4; i++) {
      const c = frame("KPISkel", { dir: "VERTICAL", gap: 10, pad: 16, radius: 8, fill: C.surface, border: C.border });
      c.appendChild(skel(90, 10));
      c.appendChild(skel(60, 22));
      c.appendChild(skel(110, 8));
      krow.appendChild(c);
      fillW(c);
    }
    const card = frame("TableSkeleton", { dir: "VERTICAL", gap: 0, radius: 8, fill: C.surface, border: C.border });
    card.clipsContent = true;
    page.appendChild(card);
    fillW(card);
    for (let i = 0; i < 6; i++) {
      const r = frame("SkelRow", { dir: "HORIZONTAL", gap: 12, padX: 16, padY: 14, align: "CENTER" });
      card.appendChild(r);
      fillW(r);
      [80, 260, 70, 90, 100, 90].forEach((w) => r.appendChild(skel(w, 12)));
      if (i < 5) addSeparator(card);
    }
    return page;
  }

  // ---- assemble & place ------------------------------------------------------
  // Remove frames from a previous run so re-running is idempotent (only touches
  // this plugin's own generated frames, matched by exact name).
  const PLUGIN_FRAMES = [
    "Triage dashboard — Default",
    "Triage dashboard — Empty",
    "Triage dashboard — Error",
    "Triage dashboard — Loading"
  ];
  figma.currentPage.children.forEach((n) => {
    if (n.type === "FRAME" && PLUGIN_FRAMES.indexOf(n.name) > -1) n.remove();
  });

  const screens = [buildDashboard(), buildEmpty(), buildError(), buildLoading()];
  let x = 0;
  screens.forEach((s) => {
    figma.currentPage.appendChild(s);
    s.x = x;
    s.y = 0;
    x += s.width + 80;
  });

  figma.currentPage.selection = screens;
  figma.viewport.scrollAndZoomIntoView(screens);
  figma.closePlugin("Triage dashboard rebuilt — 4 frames (Default, Empty, Error, Loading).");
})();
