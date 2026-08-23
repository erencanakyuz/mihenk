# MİHENK — kriz modu akış prototipi

A production-fidelity, self-contained UI/UX prototype of a social feed with a
crisis-mode tab. No backend, no framework, no build step. All data is seeded,
fictional and local.

Reference: X (Twitter) web, dark theme. Turkish UI.

---

## Run it

```bash
# any static server works; this one serves index.html for unknown paths
# so the /takip and /kriz routes resolve on a hard refresh
node tools/serve.mjs 8321      # → http://localhost:8321
```

Or open `dist/mihenk.html` directly — it is the same app inlined into one file
and runs from `file://` with zero requests.

| URL | What it shows |
|---|---|
| `/` | Sana Özel (For You) |
| `/takip` | Takip (Following) |
| `/kriz` | Kriz Var — only reachable while crisis mode is active |
| `?demo=1` | scripted-scenario control panel + in-page WebM recording |
| `?demo=1&scenario=<id>&capture=1` | one scenario, capture chrome, caption strip |

Crisis mode is started from **Prototip kontrolleri** in the right column (or at
the end of the feed on narrow screens), from the `?demo=1` panel, or by the
scripted demo runner.

When the app is served from a deeper path (a single hosted file, for example),
routing falls back to `?t=takip` / `?t=kriz` on the same pathname so a reload
still resolves. Both modes use the History API.

---

## Files

```
index.html                 shell + <noscript> plain document (generated)
styles/tokens.css          both palettes; colour tokens registered with
                           @property so a palette swap cross-fades
styles/base.css            reset, shell, nav, tabs, overlays, focus rings
styles/feed.css            post rows, action bar, composer, feed transitions
styles/crisis.css          pinned card, verification, filters, İmdat flow
styles/plain.css           low-bandwidth mode + the no-JS document
scripts/app.js             icons, state, routing, shell, tab transitions
scripts/feed.js            rendering, skeletons, stagger, optimistic actions
scripts/crisis.js          activation, verification, filters, interception
scripts/imdat.js           help-request flow
scripts/demo.js            scripted scenarios on a rAF frame-count clock
scripts/capture.js         in-page MediaRecorder → WebM download
data/seed.js               people, posts, generated SVG avatars and media
tools/capture.mjs          headless deterministic clip generation
tools/bundle.mjs           single-file build (dist/)
tools/gen-static.mjs       regenerates the <noscript> document from seed.js
tools/contrast.mjs         WCAG 2.2 AA audit of both palettes
tools/verify.mjs           acceptance checks in a real browser
tools/seamdiff.mjs         renders the loop seam of one clip for inspection
tools/serve.mjs            dev server
dist/                      single-file builds
clips/                     generated clips
```

Load order matters: `seed.js` → `app.js` → everything else. `app.js` defines the
icon set and shell that the other modules use, and defers its own boot to
`DOMContentLoaded`.

---

## How the pieces work

**Palette cross-fade.** Every colour token is registered with `@property` as a
`<color>`, so `:root` can *transition* them. Switching to the crisis tab flips
`data-palette="crisis"` on `<html>` and the whole interface changes temperature
over 400 ms. Nothing else in the CSS knows a mode exists.

**Three feeds, three states.** The two normal feeds stay mounted for the whole
session. The crisis panel is appended on activation and removed on
deactivation. Each tab keeps its own scroll position, restored after the
incoming panel is laid out.

**Tab transition.** Outgoing feed slides 12 px in the direction of travel and
fades out (180 ms) → shimmer skeleton (340 ms) → incoming feed slides in from
12 px the other way (220 ms) with a 30 ms per-row stagger over the first six
rows. The underline springs between tabs and squashes to `scaleX(1.4)`
mid-travel.

**Pinned card.** Inserting it measures the posts below, applies the inverse
transform, then plays it out (FLIP) so the push-down animates on the compositor.
The same runs in reverse on deactivation.

**Verification.** Four states, each with its own token, icon, pill and a 3 px
coloured slab down the left edge of the row — the state is readable across a
room without reading the text. Filter chips re-flow the list with FLIP.

**Interception.** Composing in a normal feed while crisis mode is active runs
the text against a Turkish keyword list. A match opens the interstitial; the
user always chooses, and either choice posts.

**Low-bandwidth mode.** `data-plain="1"` on `<html>` strips animation, blur,
shadow, radius, avatars, media and engagement chrome, and switches to a system
monospace stack. The byte comparison chip is **measured**, not asserted — it
reads the Navigation and Resource Timing entries for this page and the byte
length of the `<noscript>` document.

**No JavaScript at all.** `index.html` carries a full `<noscript>` document with
all 24 crisis posts and the first 10 normal posts — verification state, text,
time, location, tag. `tools/gen-static.mjs` regenerates it from `data/seed.js`.

---

## Demo runner and clips

`?demo=1` exposes six scenarios. Each runs on a virtual clock driven by
`requestAnimationFrame` frame counts, with a synthetic cursor and click
ripples, and each ends in exactly the state it started in.

| # | id | length | shows |
|---|---|---|---|
| 1 | `activation` | 7.6 s | normal feed → toast → pinned card lands → crisis tab appears → crisis ends |
| 2 | `tab-switch` | 6.2 s | all three tabs, palette shift, skeletons, underline spring |
| 3 | `verification` | 8.9 s | scrolling the crisis feed, four badge states, filter chips re-flowing |
| 4 | `interception` | 11.2 s | composing → interstitial → crisis composer → tag → post lands `Doğrulanmamış`, upgrades to `Doğrulanmış` |
| 5 | `imdat` | 14.3 s | full help-request flow through to `AFAD'a iletildi` |
| 6 | `plain-mode` | 6.0 s | low-bandwidth toggle, interface stripping down, byte comparison |

Each length is the scripted timeline plus a 0.6 s tail so every in-flight
transition settles before the loop point.

**In-page capture** (`scripts/capture.js`): `MediaRecorder` over
`captureStream()` from the app root, WebM at 30 fps, one file per scenario —
buttons live in the `?demo=1` panel. Run locally it saves through an anchor
download; inside a sandboxed host it hands the file to the host's own save
surface if one is offered, and says so plainly if not. Nothing is uploaded
either way.

**Headless capture** (`tools/capture.mjs`):

```bash
node tools/capture.mjs                              # all scenarios, both sizes
node tools/capture.mjs --only=imdat --size=1280x720 # one clip
node tools/capture.mjs --keep                       # keep the PNG frames
```

It loads `?demo=1&scenario=<id>&capture=1`, pauses the page clock with CDP
`Emulation.setVirtualTimePolicy`, then advances **exactly one rAF frame of
virtual time** per step while calling `__mihenk.step()` once — so the CSS
timeline and the scripted timeline move together and the same script produces
the same frames every run. Frames are grabbed with `Page.captureScreenshot`
and encoded by ffmpeg.

Two things had to be handled specially, and both are worth knowing if you
extend the runner. A paused compositor does not tick compositor-driven
animations, so promoted layers can be left out of a frame grab: capture mode
sets `will-change: auto` on everything, and drives the synthetic cursor's fade
and the warning-glyph pulse from the clock instead of from CSS. And an infinite
animation is a guaranteed seam unless its period divides the clip, so the pulse
period is computed per clip.

Output per scenario, at 1080×1350 and 1280×720: `.webm` (VP9), `.mp4` (H.264)
and `.gif`. The runner also reports the loop seam as the PSNR between the first
and last frame; `identical` means they match pixel for pixel.

---

## Acceptance criteria

Checked with `node tools/verify.mjs` (real browser) and `node tools/contrast.mjs`.

| # | Criterion | Result |
|---|---|---|
| 1 | Reads as a real client on open | Icon rail, 600 px column, hairline dividers, hover halos, sticky blurred tab bar, header hides on scroll |
| 2 | Staged activation; normal feeds keep content and scroll | PASS — For You returns to y=900 after a round trip through the crisis tab |
| 3 | Tab switches never flash unstyled content, animation stays on the compositor | Only `transform`/`opacity` are animated; skeleton covers the swap |
| 4 | Four verification states distinguishable at two metres | PASS — pill + coloured left slab, all four present |
| 5 | Interception only on crisis-relevant text, never blocks posting | PASS — both branches asserted |
| 6 | Plain mode usable with JavaScript disabled | PASS — `<noscript>` document renders 34 posts with JS off |
| 7 | Every interactive element keyboard-reachable | PASS — 344 focusable elements, every one with a ≥2 px focus ring; roving tabindex on the tablist with arrow-key movement (including onto the crisis tab); focus trap + Escape in modals; İmdat and Doğrula operable with Enter |
| 8 | WCAG 2.2 AA in both palettes | PASS — all 31 pairs; see below |
| 9 | Six scenarios record cleanly and loop without a seam | PASS — first-to-last-frame PSNR 39–95 dB, `activation` at 1280×720 pixel-identical |
| 10 | Zero network requests after initial load | PASS — 0 requests; the single-file build makes exactly 1 request total |

### Contrast (WCAG 2.2 AA)

`node tools/contrast.mjs` audits 31 foreground/background pairs — body text,
meta text, links, filled buttons, engagement icons, the four verification
badges against their own tinted pill backgrounds and against the page, and
plain mode. All pass. Highlights:

| Pair | Ratio | Needs |
|---|---|---|
| body text on background (normal / crisis) | 17.24:1 / 17.99:1 | 4.5:1 |
| meta text on background (normal / crisis) | 7.13:1 / 7.99:1 | 4.5:1 |
| accent text on background (normal / crisis) | 7.00:1 / 9.80:1 | 4.5:1 |
| button label on accent fill (normal / crisis) | 4.61:1 / 9.32:1 | 4.5:1 |
| `Doğrulanmış` / `Resmî Kurum` chrome on its pill | 8.04:1 / 6.76:1 | 3:1 |
| `Doğrulanmamış` / `Çelişkili` chrome on its pill | 8.63:1 / 5.66:1 | 3:1 |

---

## Deliberate deviations from the brief

Three, all in service of a criterion the brief also sets:

1. **Two accent blues instead of one.** X's `#1d9bf0` under white text is
   3.00:1 — it fails AA, and criterion 8 is non-negotiable. `--c-accent`
   (`#1d9bf0`) still carries text, icons, borders and the tab underline; a
   second token `--c-accent-fill` (`#157abd`, 4.61:1 with white) carries filled
   buttons. At a glance the buttons read as the same blue. The crisis palette
   needs no such split: dark ink on amber is 9.32:1.

2. **The byte chip reports measured bytes, not `~340 KB · ~12 KB`.** The real
   figures are ~160 KB and ~11 KB, read at runtime from Navigation/Resource
   Timing and the `<noscript>` document. A chip whose whole job is a size
   comparison should not print a number the page can disprove.

3. **Clip lengths run 0.6–4 s over the table.** Each scenario gets a 0.6 s
   settle tail so it loops without a seam, and `imdat` and `interception` need
   the extra beats to keep the pacing calm rather than clipped. GIFs are written
   at half scale and 15 fps; the WebM and MP4 are full size at 30 fps.

Everything else follows the brief. Nothing outside it was added, except the
**Prototip kontrolleri** card — the demo control the brief calls for, placed
where it is reachable without the query string.

---

## Content

All accounts are fictional template accounts. `AFAD`, `Valilik`, `Kızılay` and
`Meteoroloji` are represented by placeholder accounts and are not affiliated
with, endorsed by, or speaking for those institutions. Post text is written for
this prototype; place names are public district names. No real personal data,
no phone numbers, no addresses. Avatars and media are generated SVG.
