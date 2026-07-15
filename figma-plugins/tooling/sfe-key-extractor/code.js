// Cosmo — SFE Key Extractor
// Run this INSIDE the SFE library file (Figma desktop). It enumerates every
// COMPONENT and COMPONENT_SET in the document and outputs a JSON map of
// { name -> key }. Those keys are what a build plugin passes to
// figma.importComponentByKeyAsync(key).createInstance() to place real SFE
// components in another file (e.g. Cosmo-test), provided the SFE library is
// enabled there and the components are published.

// Show the UI FIRST so the user gets immediate feedback, then scan
// asynchronously page-by-page (yielding between pages) so a large library
// never blocks the main thread into an apparent hang.
figma.showUI(__html__, { width: 520, height: 600, title: "SFE component keys" });

figma.ui.onmessage = (msg) => {
  if (msg && msg.type === "close") figma.closePlugin("SFE key extraction complete.");
};

const progress = (note) => figma.ui.postMessage({ type: "progress", note });
const yieldToUi = () => new Promise((r) => setTimeout(r, 0));

(async () => {
  try {
    progress("Loading pages…");
    if (typeof figma.loadAllPagesAsync === "function") {
      try { await figma.loadAllPagesAsync(); } catch (e) {}
    }

    const pages = figma.root.children;
    const componentSets = [];
    const standaloneComponents = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (typeof page.loadAsync === "function") {
        try { await page.loadAsync(); } catch (e) {}
      }
      progress('Scanning "' + page.name + '" (' + (i + 1) + "/" + pages.length + ")…");

      let found = [];
      try {
        found = page.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] });
      } catch (e) {
        progress('Skipped "' + page.name + '": ' + ((e && e.message) || e));
        found = [];
      }

      for (const node of found) {
        if (node.type === "COMPONENT_SET") {
          componentSets.push({
            name: node.name,
            key: node.key,
            page: page.name,
            description: node.description || "",
            variants: node.children
              .filter((c) => c.type === "COMPONENT")
              .map((c) => ({ name: c.name, key: c.key }))
          });
        } else if (node.type === "COMPONENT") {
          if (node.parent && node.parent.type === "COMPONENT_SET") continue;
          standaloneComponents.push({
            name: node.name,
            key: node.key,
            page: page.name,
            description: node.description || ""
          });
        }
      }
      await yieldToUi();
    }

    const byName = (a, b) => a.name.localeCompare(b.name);
    componentSets.sort(byName);
    standaloneComponents.sort(byName);

    figma.ui.postMessage({
      type: "result",
      file: figma.root.name,
      extractedAt: new Date().toISOString(),
      counts: {
        componentSets: componentSets.length,
        standaloneComponents: standaloneComponents.length,
        totalVariants: componentSets.reduce((n, s) => n + s.variants.length, 0)
      },
      componentSets,
      standaloneComponents
    });
  } catch (err) {
    figma.ui.postMessage({ type: "error", message: (err && err.message) || String(err) });
  }
})();
