# MİHENK Repository Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a clean, secure, navigable, accessible, reproducible MİHENK prototype without generated clips in GitHub history.

**Architecture:** Preserve the framework-free multi-file application and deterministic headless tooling. Keep source assets as normal files, inline them only in the standalone distribution, and make every enabled control expose a truthful prototype behavior.

**Tech Stack:** HTML, CSS, browser JavaScript, Node.js ESM, Playwright, ffmpeg.

**Spec:** `docs/hardening-design.md`

## Global Constraints

- No backend or network service is introduced.
- No framework or runtime build dependency is introduced.
- Do not add or modify tests by default; repair and run the existing verification tooling.
- `clips/` must remain local and must not exist in any pushed commit.
- Preserve concurrent image-contributor changes and do not overwrite newly added assets.
- Keep all commits local until the final verification gate, then push `main` as explicitly requested.

---

### Task 1: Purge generated clips and establish asset boundaries

**Files:**
- Modify: `.gitignore`
- Modify: `data/seed.js`
- Modify: `tools/bundle.mjs`
- Modify: `README.md`
- Use: `assets/img/template-a.jpg`
- Use: `assets/img/template-b.jpg`

**Interfaces:**
- Consumes: seeded post `media` descriptors.
- Produces: `SEED.media(seed, alt)` returning local image markup and a bundle step that inlines `assets/img/*` only inside `dist/`.

- [ ] Add secret, environment, temporary, Node, and `clips/` rules to `.gitignore` without ignoring `assets/img/`.
- [ ] Remove `clips/` from the unpublished baseline commit while leaving the local files on disk.
- [ ] Replace base64 constants in `data/seed.js` with deterministic `assets/img/template-a.jpg` / `template-b.jpg` references and escaped alt text.
- [ ] Extend `tools/bundle.mjs` to replace local image URLs with MIME-correct data URIs in standalone output.
- [ ] Update the asset and generated-output policy in `README.md`.
- [ ] Verify `git rev-list --objects origin/main..HEAD` contains no path beginning with `clips/`.

### Task 2: Make the development toolchain secure and reproducible

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Modify: `tools/serve.mjs`
- Modify: `tools/verify.mjs`
- Modify: `tools/seamdiff.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: a request URL and an optional numeric port.
- Produces: `serve(port, host)` returning the listening server with a numeric `server.port` property.

- [ ] Add scripts for `serve`, `bundle`, `verify`, `contrast`, `capture`, and `check` with Playwright pinned in `devDependencies`.
- [ ] Resolve request paths against the repository root, reject decoded traversal and malformed encodings, return `404` for missing asset extensions, and bind to `127.0.0.1`.
- [ ] Replace the Windows-incompatible module-entry comparison with `fileURLToPath(import.meta.url)` and `path.resolve(process.argv[1])`.
- [ ] Replace `/tmp` screenshot paths with `path.join(os.tmpdir(), filename)`.
- [ ] Install the locked dependencies and install the Playwright Chromium runtime if missing.
- [ ] Run `npm run check` and confirm every command exits successfully.

### Task 3: Repair routes, history, navigation, and control truthfulness

**Files:**
- Modify: `scripts/app.js`
- Modify: `scripts/feed.js`
- Modify: `scripts/crisis.js`
- Modify: `styles/base.css`
- Modify: `styles/feed.css`

**Interfaces:**
- Consumes: `data-nav`, `data-action`, `data-tab`, History API events, and local seeded content.
- Produces: `MIHENK.navigate(tab, options)`, `MIHENK.focusComposer()`, and truthful local UI feedback.

- [ ] Separate deployment mode detection from current route parsing so `/takip` and `/kriz` direct loads are interpreted correctly.
- [ ] Replace stale crisis URLs with `/` when no crisis session is active.
- [ ] Wire logo, Home, bottom Home, and compose controls to the correct existing flows.
- [ ] Implement local search filtering with a clear empty state and reset behavior.
- [ ] Implement follow-button toggles and ensure shared like/repost state updates every mounted copy of a post.
- [ ] Use the Clipboard API for Share; show a truthful fallback message when unavailable.
- [ ] Render view counts as non-interactive text and mark unavailable prototype destinations disabled with explanatory labels.
- [ ] Verify Back/Forward, refresh, direct routes, and every enabled control in a real browser.

### Task 4: Repair dialogs, focus, and reduced interaction modes

**Files:**
- Modify: `scripts/app.js`
- Modify: `scripts/imdat.js`
- Modify: `scripts/crisis.js`
- Modify: `styles/base.css`
- Modify: `styles/plain.css`

**Interfaces:**
- Consumes: modal content with an existing heading element.
- Produces: `openModal(node, { labelledBy, persistent, wide })` with valid dialog naming, background isolation, focus trapping, and focus restoration.

- [ ] Give each modal heading a stable ID and apply that ID to the outer `role="dialog"` element.
- [ ] Make the application shell inert while a modal is open and restore it on close.
- [ ] Remove `tabindex="0"` from non-interactive post containers.
- [ ] Keep only active tab panels keyboard/accessibility reachable.
- [ ] Ensure reduced-motion and plain modes skip delayed removals and restore focus immediately.
- [ ] Walk the enabled interface with the keyboard in desktop and mobile browser sizes.

### Task 5: Remove the broken recorder and regenerate deliverables

**Files:**
- Delete: `scripts/capture.js`
- Modify: `scripts/demo.js`
- Modify: `index.html`
- Modify: `tools/bundle.mjs`
- Modify: `README.md`
- Regenerate: `dist/mihenk.html`
- Regenerate: `dist/artifact.html`

**Interfaces:**
- Consumes: deterministic scenario runner APIs under `window.__mihenk`.
- Produces: headless capture commands only; no unsupported in-page recording controls.

- [ ] Remove in-page recording buttons, handlers, script loading, and documentation.
- [ ] Keep scenario playback and deterministic headless capture intact.
- [ ] Regenerate the no-JavaScript document and standalone bundle.
- [ ] Confirm the standalone file opens from `file://`, loads both template images, and makes one document request.

### Task 6: Final verification, commits, and push

**Files:**
- Review: all changed production, tooling, documentation, asset, and generated distribution files.

**Interfaces:**
- Consumes: the complete working tree and local `origin/main` tracking state.
- Produces: a clean pushed `main` branch whose published commits contain no generated clips.

- [ ] Run syntax, contrast, bundle, existing browser verification, media/asset decoding, and `git diff --check`.
- [ ] Exercise desktop and mobile routes, enabled controls, dialogs, keyboard focus, console logs, and post-load requests in a real browser.
- [ ] Fetch `origin`, inspect ahead/behind and concurrent work, and integrate only complete in-scope image changes.
- [ ] Inspect `git status`, staged diff, commit contents, and `git rev-list --objects origin/main..HEAD` for ignored outputs and secrets.
- [ ] Commit the hardening changes with focused messages.
- [ ] Push `main` to `origin` and verify the remote branch points to the expected commit.
