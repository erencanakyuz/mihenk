# Display font

One self-hosted display face, used sparingly (wordmark, section headings, key
stats) — everything else stays on the system UI stack for density and load
speed. Loaded locally so the "zero network request" rule (see repo README)
still holds when served via `index.html` / `npm start`.

| File | Source | License |
|---|---|---|
| `archivo-700.woff2` | [Archivo](https://fonts.google.com/specimen/Archivo), weight 700, Latin + Turkish subset, served once from `fonts.gstatic.com` and saved here | [SIL Open Font License 1.1](https://openfontlicense.org/) |

## Known gap

`tools/bundle.mjs` only inlines `assets/img/*` into the single-file `dist/`
build (`inlineImageAssets`). It does not yet inline `assets/fonts/*`, so the
`dist/mihenk.html` / `dist/artifact.html` builds silently fall back to the
system stack for the display face — same visual result minus the custom font.
Extending `inlineImageAssets` (or adding a sibling `inlineFontAssets`) to also
match `assets/fonts/*.woff2` inside the `<style>` block closes this gap; not
done here to avoid colliding with in-flight edits to `bundle.mjs`.
