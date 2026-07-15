// Cosmo — SFE Key Test
// RUN THIS IN COSMO-TEST (the target file), not the library. It attempts to
// import a few extracted SFE keys via importComponentByKeyAsync /
// importComponentSetByKeyAsync and place real instances. If they appear, the
// extracted key map resolves against the published SFE library enabled here.

figma.showUI(__html__, { width: 480, height: 520, title: "SFE key test" });

// Mix of component SETS and standalone COMPONENTS from the extracted catalog.
const CANDIDATES = [
  { name: "Button", key: "7e65b00c1a9c1202ae05aab7e8d11420894e97ca", type: "set" },
  { name: "Badge", key: "03716f3c5e05824b3ec65e151eb54ca0919e8496", type: "set" },
  { name: "SeverityIndicator", key: "deb7dd95ff63df0b27df74822fda08f25a0fd445", type: "set" },
  { name: "StatusIndicator", key: "6b34542ce4ce2d33a45fb1a7e78c8ca456b60bdb", type: "set" },
  { name: "MetricGroupCard", key: "b480fe317845b7812785d150bcf25042b1b70d2a", type: "set" },
  { name: "CompositeDataGrid", key: "ed5ca00937c61c9a7a4f239c22200dd7ad7f4e71", type: "component" }
];

figma.ui.onmessage = (msg) => {
  if (msg && msg.type === "close") figma.closePlugin("SFE key test complete.");
};

(async () => {
  const results = [];
  const placed = [];
  let x = 0;

  for (const cand of CANDIDATES) {
    try {
      let comp = null;
      if (cand.type === "set") {
        const set = await figma.importComponentSetByKeyAsync(cand.key);
        comp = set.defaultVariant || set.children.find((c) => c.type === "COMPONENT");
      } else {
        comp = await figma.importComponentByKeyAsync(cand.key);
      }
      if (!comp) throw new Error("Imported but no usable component/variant");

      const inst = comp.createInstance();
      inst.x = x;
      inst.y = 0;
      x += (inst.width || 120) + 48;
      figma.currentPage.appendChild(inst);
      placed.push(inst);
      results.push({ name: cand.name, ok: true, note: "imported + placed" });
    } catch (e) {
      results.push({ name: cand.name, ok: false, note: (e && e.message) || String(e) });
    }
  }

  if (placed.length) {
    figma.currentPage.selection = placed;
    figma.viewport.scrollAndZoomIntoView(placed);
  }

  figma.ui.postMessage({
    type: "report",
    file: figma.root.name,
    okCount: results.filter((r) => r.ok).length,
    total: results.length,
    results
  });
})();
