This Chrome extension adds the following features to make Perplexity a little more convenient:

- Keyboard shortcuts
- Mermaid diagram preview

## Keyboard shortcuts

Markdown editor like operations:

- `Shift + Enter`: Add Markdown list symbols and indentation along with line breaks
- `Tab`: Indent the current line (Selection operation support)
- `Shift + Tab`: Outdent the current line (Selection operation support)
- Feature:
    - Automatic renumbering of numbered lists when indent and outdent

Change Pro-search options:

- `Ctrl + ArrowDown`: Switch to the next model
- `Ctrl + ArrowUp`: Switch to the previous model
- `Ctrl + Shift + .`: Toggle Web search source

Some optimizations:

- `Esc`: Focus on the response area (You can scroll with the arrow keys)

## Mermaid preview

Automatically detects Mermaid diagrams within tags and adds a preview display button.

## Library

```sh
# Mermaid.js ver: 11.4.1
curl https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js -o lib/mermaid.min.js
# svg-pan-zoom ver: 3.5.0
curl https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.2/dist/svg-pan-zoom.min.js -o lib/svg-pan-zoom.min.js
# turndown.js ver: 7.2.0
curl https://unpkg.com/turndown@7.2.0/dist/turndown.js -o lib/turndown.js
```

### Copyright

- Mermaid by [Knut Sveidqvist](https://github.com/mermaid-js/mermaid)
- svg-pan-zoom by [Andrea Leofreddi](https://github.com/bumbu/svg-pan-zoom)
- turndown by [Dom Christie](https://github.com/mixmark-io/turndown?tab=readme-ov-file)
- Asset icons by [Icons8](https://icons8.com)
