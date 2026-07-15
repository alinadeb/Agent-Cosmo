# Figma tooling plugins

The plugins the agent **needs** to read your component library. These are the required tooling plugins — the design output the agent *generates* lives in [`../generated/`](../generated/).

| Item | Purpose |
|---|---|
| [`sfe-key-extractor/`](sfe-key-extractor/) | Run once inside the **published** component library — exports every component's name → Figma `key` into `sfe-component-keys.json` (the key catalog). |
| [`sfe-key-test/`](sfe-key-test/) | Run in the target file — imports a few keys to confirm the library is published and enabled before a full build. |
| [`sfe-instance-key-reader/`](sfe-instance-key-reader/) | Debug helper — reads the main-component key of a selected instance. |
| `sfe-component-keys.json` | The generated key catalog the agent reads (`figma-plugins/tooling/sfe-component-keys.json`). |

## Running a plugin

Figma desktop → **Plugins → Development → Import plugin from manifest…** → pick the plugin's `manifest.json`. Open the file you want to act on (the library for the extractor; the target file for key-test), then run it from **Plugins → Development**.

The agent ([`../../cosmo.system-prompt.md`](../../cosmo.system-prompt.md)) reads `sfe-component-keys.json` as its component **identity + key** source.
