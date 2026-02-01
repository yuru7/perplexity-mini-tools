This Chrome extension adds the following features to make Perplexity a little more convenient:

- Keyboard shortcuts
- Mermaid diagram preview

## Keyboard shortcuts

Navigation:

- `Ctrl(Cmd) + K`: Navigate to "/library"
- `Ctrl(Cmd) + Shift + K`: Navigate to "/spaces"
- `Up/Down & Enter on "/library" search box`: Navigate through search results
- `Up/Down/Left/Right & Enter on "/spaces"`: Navigate through spaces

Change Pro-search options:

- `Ctrl + ArrowDown`: Switch to the next model
- `Ctrl + ArrowUp`: Switch to the previous model
- `Ctrl + .`: Select the AI model
- `Ctrl + Shift + .`: Toggle Web search source
- `Ctrl + Shift + ArrowDown`: Switch to the next search mode (cycles Web / Deep Research / Labs)
- `Ctrl + Shift + ArrowUp`: Switch to the previous search mode (cycles backward)

Simple Copy:

- `Shift + Click the Copy button` Copy text to clipboard without including citation links

Some optimizations:

- `Esc`: Focus on the response area (You can scroll with the arrow keys)
- `Ctrl + V`: Prevents the cursor from jumping to the end when pasting text

## Mermaid preview

Automatically detects Mermaid diagrams within tags and adds a preview display button.

## Library

```sh
# Mermaid.js ver: 11.6.0
curl https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js -o lib/mermaid.min.js
# svg-pan-zoom ver: 3.6.2
curl https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.2/dist/svg-pan-zoom.min.js -o lib/svg-pan-zoom.min.js
# turndown.js ver: 7.2.0
curl https://unpkg.com/turndown@7.2.0/dist/turndown.js -o lib/turndown.js
# turndown-plugin-gfm.js ver: 1.0.2
curl https://unpkg.com/turndown-plugin-gfm@1.0.2/dist/turndown-plugin-gfm.js -o lib/turndown-plugin-gfm.js
```

### Copyright

- Mermaid by [Knut Sveidqvist](https://github.com/mermaid-js/mermaid)
- svg-pan-zoom by [Andrea Leofreddi](https://github.com/bumbu/svg-pan-zoom)
- turndown by [Dom Christie](https://github.com/mixmark-io/turndown?tab=readme-ov-file)
- Asset icons by [Icons8](https://icons8.com)
