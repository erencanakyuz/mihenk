# Demo clips

Selected, final demo media - hand-picked from `clips/` (git-ignored, see
`tools/capture.mjs`) and committed here so the root README renders without a
build step. Regenerate any of them with:

```bash
npm run capture -- --only=<id> --size=1280x720
```

then copy the chosen file from `clips/` here under the shorter name below.

| File | Scenario id | Shows |
|---|---|---|
| `activation.gif` | `activation` | Normal feed → toast → pinned card lands → crisis tab appears |
| `verification.gif` | `verification` | Crisis feed, all four verification badges, filter chips re-flowing |
| `imdat.gif` | `imdat` | Full İmdat (help-request) flow through to the status chain |
| `tab-switch.gif` | `tab-switch` | Switching all three tabs, palette cross-fade, underline spring |

Captured deterministically (virtual clock, frame-for-frame identical on
re-run) - see `tools/capture.mjs` header comment for how.
