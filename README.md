# ImaGen Figma Plugin
This is the repository for the Imagen Figma Plugin.

This is a Figma plugin that allows you to export Figma layers as ImaGen-compatible templates. (.dicetemplate files)

*This plugin is built with [Create Figma Plugin](https://yuanqing.github.io/create-figma-plugin/).*

### Pre-requisites

- [Node.js](https://nodejs.org) – v20
- [Figma desktop app](https://figma.com/downloads/)

### Build the plugin

To build the plugin:

```
$ npm run build
```

This will generate a [`manifest.json`](https://figma.com/plugin-docs/manifest/) file and a `build/` directory containing the JavaScript bundle(s) for the plugin.

To watch for code changes and rebuild the plugin automatically:

```
$ npm run watch
```

### Install the plugin
#### From GitHub Releases
1. Download the latest release from the [Releases](https://github.com/dicedvo/imagen-figma/releases) page.
2. Extract the contents of the ZIP file.
3. In the Figma desktop app, open a Figma document.
4. Search for and run `Import plugin from manifest…` via the Quick Actions search bar.
5. Select the `manifest.json` file in the newly extracted folder.

#### For Development
1. Build the plugin by running `npm run build` or `npm run watch`.
2. In the Figma desktop app, open a Figma document.
3. Search for and run `Import plugin from manifest…` via the Quick Actions search bar.
4. Select the `manifest.json` file in the repository folder.

### Debugging

Use `console.log` statements to inspect values in your code.

To open the developer console, search for and run `Show/Hide Console` via the Quick Actions search bar.

## See also

- [Create Figma Plugin docs](https://yuanqing.github.io/create-figma-plugin/)
- [`yuanqing/figma-plugins`](https://github.com/yuanqing/figma-plugins#readme)

Official docs and code samples from Figma:

- [Plugin API docs](https://figma.com/plugin-docs/)
- [`figma/plugin-samples`](https://github.com/figma/plugin-samples#readme)
