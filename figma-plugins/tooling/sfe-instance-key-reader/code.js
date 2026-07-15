// Cosmo — SFE Instance Key Reader
// RUN IN COSMO-TEST after dragging the SFE components you need from the Assets
// panel onto the canvas (or a frame). It reads each instance's PUBLISHED main-
// component key via getMainComponentAsync() — these keys come from the enabled
// library, so they always resolve via importComponentByKeyAsync later.
//
// Select the frame/instances to scope it, or run with nothing selected to scan
// the whole current page.

figma.showUI(__html__, { width: 540, height: 580, title: "SFE instance keys" });

figma.ui.onmessage = (m) => {
  if (m && m.type === "close") figma.closePlugin("Done.");
};

(async () => {
  try {
    let roots = figma.currentPage.selection;
    if (!roots || roots.length === 0) roots = [figma.currentPage];

    const instances = [];
    for (const root of roots) {
      if (root.type === "INSTANCE") instances.push(root);
      if (typeof root.findAllWithCriteria === "function") {
        try {
          for (const n of root.findAllWithCriteria({ types: ["INSTANCE"] })) instances.push(n);
        } catch (e) {
          if (typeof root.findAll === "function") {
            for (const n of root.findAll((x) => x.type === "INSTANCE")) instances.push(n);
          }
        }
      } else if (typeof root.findAll === "function") {
        for (const n of root.findAll((x) => x.type === "INSTANCE")) instances.push(n);
      }
    }

    const seen = {};
    const items = [];
    for (const inst of instances) {
      let mc = null;
      try {
        mc = await inst.getMainComponentAsync();
      } catch (e) {
        continue;
      }
      if (!mc) continue;
      const isVariant = mc.parent && mc.parent.type === "COMPONENT_SET";
      const rec = {
        component: mc.name,
        componentKey: mc.key,
        set: isVariant ? mc.parent.name : null,
        setKey: isVariant ? mc.parent.key : null
      };
      const dedupe = rec.setKey || rec.componentKey;
      if (seen[dedupe]) continue;
      seen[dedupe] = true;
      items.push(rec);
    }

    items.sort((a, b) => (a.set || a.component).localeCompare(b.set || b.component));

    figma.ui.postMessage({
      type: "result",
      file: figma.root.name,
      count: items.length,
      items
    });
  } catch (err) {
    figma.ui.postMessage({ type: "error", message: (err && err.message) || String(err) });
  }
})();
