# MİHENK Repository Hardening Design

## Goal

Keep MİHENK a zero-backend, framework-free prototype while making its repository, local tooling, navigation, controls, accessibility, assets, and standalone build reliable enough to publish on GitHub.

## Repository boundaries

- `index.html` remains the multi-file entry point.
- `scripts/`, `styles/`, and `data/` remain readable source modules; no framework or bundler runtime is introduced.
- `assets/img/` contains source image templates. Source code references these files instead of embedding base64 payloads.
- `dist/mihenk.html` remains the self-contained deliverable. `tools/bundle.mjs` converts local image references to data URIs while building it.
- `clips/` is local generated output and must never appear in pushed Git history. Chosen presentation media will later be copied explicitly into `assets/demos/`.
- `tools/` contains development-only server, bundle, capture, contrast, and verification commands.
- `package.json` and its lockfile define the reproducible Node toolchain. `node_modules/` stays ignored.

## Runtime behavior

- `/`, `/takip`, and `/kriz` resolve consistently on direct load, refresh, Back, and Forward. A crisis URL without an active crisis session falls back to the normal feed and replaces the stale URL.
- Core controls perform real prototype actions: home/logo navigation, tab navigation, compose focus, crisis activation, filtering, verification, low-bandwidth mode, İmdat flow, likes/reposts/replies, sharing, search, and follow toggles.
- Controls outside the prototype scope are visibly and semantically disabled. They never claim that an action succeeded when it did not.
- The share action uses the Clipboard API when available and reports failure honestly.
- Inactive panels and modal backgrounds are removed from keyboard and accessibility navigation. Dialogs always have a valid accessible name and restore focus when closed.
- Non-interactive posts are not tab stops; their actual buttons remain keyboard reachable.

## Local tooling and security

- The development server binds to `127.0.0.1`, rejects malformed URLs and path traversal, serves only files under the repository root, and uses platform-correct direct-execution detection.
- Unknown application routes fall back to `index.html`; missing static assets return `404` instead of the app shell.
- The broken in-page MediaRecorder path is removed. Deterministic headless capture remains the only clip generator.
- Temporary screenshots use `os.tmpdir()` instead of Unix-only paths.
- Secrets, local environments, temporary frames, logs, and generated clips are ignored.

## Assets

- `template-a.jpg` and `template-b.jpg` are local visual templates used deterministically by seeded posts.
- Each rendered image has meaningful alt text supplied by seed data; duplicate/decorative use may use an empty alt value.
- The asset source and license are documented before publication.
- Future image contributors add optimized `.jpg`, `.png`, `.webp`, or `.avif` files under `assets/img/` and reference them through seed data; they do not add base64 blobs to JavaScript.

## Verification and release

- No new test suite or test infrastructure is added.
- Existing syntax, contrast, static-document, bundle, and browser verification commands are repaired and run.
- Real-browser checks cover desktop and mobile layouts, direct routes, history navigation, crisis activation/deactivation, all enabled controls, keyboard focus, dialogs, console errors, and post-load network activity.
- Before push, the Git tree and every commit being published are checked to confirm that `clips/` is absent.
- Work from the concurrent image contributor is preserved and integrated only after its files are complete.

