# Code review: help-request thread page (18 September 2026)

Branch `feature/request-thread-page`, reviewed at commit `7444e40`
(`docs(request): record announcement, offer and filter follow-ups`). All line numbers
below refer to that commit. The tree moved several times during the review; the reviewed
files were snapshotted, and the branch `review/request-page-fixes` (worktree
`../mihenk-review`) carries the fixes described in the last section.

Reference: `docs/HELP_REQUEST_IMPLEMENTATION_PLAN.md` sections 7–9, 11, 13–15, 17, 19, 20.

## Verification performed

- `npm run check:syntax` passes (unchanged tree).
- `node lab/request-access-check.mjs` passes 56 of 56 at `7444e40` (the plan record in §19/§20
  still says 45 and 52; the record has drifted behind the script).
- Additional live probes were run against an in-process rehearsal server with owner,
  request moderator, region-scoped moderator, removal moderator, participant and observer
  sessions to confirm or refute each server-side claim below. Findings marked
  **probe-confirmed** were reproduced that way; findings marked **unverified** were not
  exercised end to end and are labelled as such.

## What holds up

These were checked end to end and are correct, so they are recorded here to bound the
findings rather than to pad them:

- Projection order (§11): `publicPost` resolves the canonical post behind a repost before
  projecting (`server/views.mjs:14`), and `requestProjection` overwrites the raw
  `location` for every `kind==='request'`, including reposts. Probe-confirmed: an
  outsider's repost item carries `location:{known,region}` with no `text` and no `phone`,
  while the owner still sees both through the same repost row.
- Thread pagination is computed after readability filtering (`server/views.mjs:82-91`), so
  `earlierCount`, `newerCount` and `nextMessageOffset` cannot be derived from hidden
  messages. `parents` is drawn from the same filtered list (`:89`), so an unreadable parent
  is never previewed.
- Search matches only `p.text` (`server/views.mjs:67`), which for requests is the generated
  needs summary; `details`, `phone` and `location.text` never influence a match.
- SSE payloads carry only ids and channel names, gated by `canReadMessage`
  (`server/http.mjs:182-184`); a private message produces no event for an outsider.
- `canTarget` now requires `canReadMessage` for message authors (`server/access.mjs:51-52`),
  so a private-message author is not made bannable to people who cannot read the message.
- Banned actors: probe-confirmed that a banned owner keeps `canReadPrivate:true` but loses
  every write capability and an empty `actions` array, and a coordination write is rejected.
- `/monitor` and `/export` live only on the operator server behind the operator bearer token;
  the participant server exposes `/api/view`, `/api/commands`, `/api/activity`, `/api/events`
  only. No read-all shortcut is reachable by a participant.
- Both entry points and the bundle include the new assets (`index.html:16,236`,
  `participant.html:15,28`, `tools/bundle.mjs:18,20`), satisfying that §17 item.

## Findings

### 1. A second `request.close` rewrites the recorded closure — medium

`server/world.mjs:142-147`

The `request.close`/`request.reopen` branch sets `target.status` unconditionally. There is no
check that the request is actually open (or closed). `requestCapabilities` gates the UI
(`canClose` requires `status==='open'`), but the server does not.

Failing scenario (probe-confirmed): the owner closes their request with
`reason:'resolved'` (version 2, `closedBy` = owner). A request moderator then sends
`request.close` with `expectedVersion:2, reason:'duplicate'`. It is accepted:
`closeReason` becomes `duplicate`, `closedBy` becomes the moderator, `closedAt` is
rewritten and the version becomes 3. §9 requires the actor, time and reason to be recorded,
and requires `İhtiyaç karşılandı` to be said only when that was the reported reason; a
later close silently replaces that record.

Fix: reject a close on a non-open request and a reopen on a non-closed request with
`conflict`, before mutating anything.

### 2. `request.reopen` on an open request and `request.manage` with an empty payload bump the version — medium

`server/world.mjs:135-149`

`request.manage` accepts a payload with neither `communityOpen` nor `publicAccess`; it then
writes `target.accessChange` and increments `target.version`. `request.reopen` on an
already-open request does the same.

Failing scenario (probe-confirmed): the owner opens the wizard to edit their statement
(holding `expectedVersion:N`). A request moderator sends `request.manage` with
`payload:{}` — accepted, version becomes N+1. The owner's save now fails with
`conflict` ("Talep güncellendi"), and the owner has no way to see what changed, because
nothing did. Repeating it is an unbounded way to block the owner's edits while leaving an
`accessChange` audit trail of no-ops. §11 explicitly asks that field-edit versions not be
invalidated unnecessarily.

Fix: require at least one setting in `request.manage`; reject a no-op reopen with
`conflict`.

### 3. A frozen pending command is discarded when its reply parent leaves the loaded window — medium

`scripts/request-page.js:74`

```js
var d=draft();if(d.parentId&&!parent()){d.parentId=null;delete d.pending;persist();}
```

`parent()` searches only `page.thread.messages` plus `page.thread.parents`, i.e. the
currently loaded window (40 messages per `scripts/transport.js:92`). `render()` runs on every
load, so a parent that merely fell out of the window — not one that became unreadable —
deletes the frozen pending command.

Failing scenario: the user presses `Önceki mesajları göster`, replies to an older message,
and the send times out (`retryable:true`, so `d.pending` is deliberately kept at `:95`). A
tab switch, an SSE refresh or `visibilitychange` (`:194`) triggers `load(false)`, which
resets the window to the newest 40 messages. The parent is no longer present, so `render()`
deletes `d.pending`. The next send generates a **new** `commandId`, and if the first
command had in fact been applied server-side, the request now carries two identical
messages. This is the §17 item "Uncertain retries produce one message rather than
duplicates" and the §8 rule "Retry an uncertain send with the identical command ID".

Fix: clear only `parentId`; the pending command carries its own frozen `parentId`, and a
genuinely unreadable parent produces a definite `validation` rejection on retry, which is
already handled at `:95`.

### 4. A send error is written into a detached composer — medium

`scripts/request-page.js:88-101`

`form` and `error` are captured before `await M.transport.send(...)`. Any re-render during
the send (`M.requestChanged` → `load` → `render`, a channel-independent refresh, or the
reply-target rebuild) replaces the composer node. The `page===current` guard at `:98` does
not detect this, so `error.textContent=result.error.message` lands on a node that is no
longer in the document.

Failing scenario: the user sends a coordination message; while the request is in flight a
moderator posts a public update, so SSE marks the channel and the user presses
`Yeni mesajlar`; the send then fails with `conflict`. The composer shows
`Gönderimi yeniden dene` (restored from the draft) but no error text, and the
`[data-refresh-request]` reveal at `:100` applies to the new DOM while the message is lost.
§10 requires actionable errors to stay inline.

Fix: when `!form.isConnected`, re-render and surface the message (a toast is the only
remaining channel), instead of writing to the orphan.

### 5. A leftover text selection anywhere on the page makes help cards unopenable — medium

`scripts/request-thread.js:131`

```js
!String(window.getSelection?window.getSelection():'')
```

`String(selection)` is the whole document's selection, not the card's. Any non-empty
selection left over from elsewhere (a copied region name, a double-clicked word in the
composer, a selection made before scrolling) suppresses the card-body click for **every**
help card until the user clicks on empty space to clear it.

Failing scenario: the user double-clicks a word in the crisis composer, closes the
composer, then clicks a request card body. Nothing happens; only the `Talebi aç` button
still works. §20 specifies "clicking the card text also opens the page unless text is
selected", meaning selected inside that card.

Fix: require the selection to be non-collapsed and anchored inside the clicked card.

### 6. The community tab dot never appears for help-call moderators — low

`scripts/request-page.js:185`

The predicate is `other==='coordination'||page.thread?.post.capabilities.canManagePublicAccess`.
`canManagePublicAccess` requires `p.kind==='request'` (`server/request-policy.mjs:19`), and
§20 states help calls have no management. So a request moderator reading the coordination
tab of a `yardim` help call is never told about new community messages, although §20's
"community changes still mark only moderators" is meant to include them.

Failing scenario: a moderator opens a help call's coordination tab; a neighbour posts in
community; no dot appears on the community tab and the moderator only discovers it by
switching tabs.

Fix: recognise a moderator as "has private access on a post they do not own"
(`canReadPrivate && authorId !== me`), which covers requests and help calls and still
excludes the requester.

### 7. `accessChanged` is broadcast for every account change in the run — low

`server/http.mjs:178,185`

`accessChanged:!!delta.actors` is true for any actor delta: a ban of an unrelated account,
an `/access` change for somebody else, and even a new participant joining
(`/sessions` → `service.mutate` → `account-created`). Every open request page then runs
`M.transport.clearRequestCache();load(false)` (`scripts/request-page.js:180`).

Failing scenario: the operator hands out a fifth session mid-rehearsal. Every participant's
request page reloads: the `Önceki mesajları göster` pages they had loaded collapse back to
the newest 40 messages and the scroll anchor moves. §10 requires updates not to collapse
sections or interrupt reading.

Fix: `accessChanged` should mean "this viewer's own actor row changed"; report other
accounts separately (`actorsChanged`) so the feed can still refresh author actions without
forcing a privileged-cache drop on the request page. Note the deliberate trade-off after
the fix: an unrelated ban no longer refreshes author-action buttons already rendered on an
open request page. That is the lesser problem — a stale `Hesabı engelle` button fails
server-side with a clear message — but it is a behaviour change worth knowing about.

### 8. Author actions offered on a parent message are rejected by the `seen` gate — low

`server/views.mjs:129` and `:86`

`projectMessage` computes `authorActions` for `thread.parents` as well as `thread.messages`,
but only `thread.messages` ids and authors are recorded in `seen`. `service.command` rejects
any command whose `targetId` is not in `seen` (`server/world.mjs:224-228`).

Failing scenario: a removal moderator opens a paginated thread where a reply's parent is
above the window. The parent renders with `authorActions:['account.ban','account.follow']`;
clicking `Hesabı engelle` returns `unauthorized` / "Önce ilgili kaydı açın."

Fix: include `thread.parents` in the `seen` write.

### 9. Local adapter crashes on a partial `request.update` and on a missing target — medium (local mode only)

`scripts/transport.js:53-58,65`

- `:56` dereferences `p.location.region` unconditionally. A seed card has no `location`
  object (`publicOffline` at `:48` synthesises one precisely because of that), and
  `request.update` is a partial command, so `location` may be absent from both the payload
  and the post. Result: `TypeError` inside `offlineSend`, which is called outside any
  `try` in `M.transport.send` (`:115`), so the rejection escapes into
  `request-page.send()`/`imdat` and leaves the composer stuck on "Gönderiliyor…".
- `:57` dereferences `p.need.map` the same way.
- `:58` (`request.close`/`request.reopen`) and `:65` (`offer.withdraw`) dereference `p` /
  `offer` without a null check, so a stale id from a restored `sessionStorage` receipt
  throws instead of returning `not_found`.

Failing scenario: local mode, `mihenk:requests:v1` restored from a previous session,
the user opens a request whose id no longer exists in the seed and presses
`Önerimi geri çek` → uncaught `TypeError`, button stays disabled.

Fix: synthesise a location when one is missing, validate `need`, and return `not_found` /
`conflict` results instead of throwing.

### 10. Local adapter parity gaps — low (local mode only)

`scripts/transport.js:102-104`

- The channel filter uses `p.need||p.tag==='yardim'`, which still treats an **official**
  `yardim` announcement as a help post, unlike `helpPost` on the server
  (`server/request-policy.mjs:5`).
- `parents` is computed as "any message some visible child points at", without excluding
  the messages already in the slice, so parents duplicate the page. `messagesHTML`
  deduplicates (`scripts/request-page.js:53-55`), which is why this is invisible, but the
  local `thread` shape diverges from the server's.
- `newerCount` is never returned locally.
- `offlineSend` stores `payload.visibility` verbatim for community messages
  (`scripts/transport.js:62`); the server forces `public` (`server/world.mjs:159`). Nothing
  in the current UI sends a private community message, so this is latent.
- The local thread filter also keys on `p.need||p.tag==='yardim'` while `publicOffline`
  already excludes official announcements (`scripts/transport.js:49`), so the two halves of
  the local adapter disagree about what a help post is.

Fix: mirror `helpPost`, exclude the slice from `parents`, return `newerCount`, and force
`public` for community.

### 11. The card's "Konum kesin değil" note depends on the viewer's privileges — low

`scripts/crisis.js:45`

`if (p.location && !p.location.known && (p.location.text || p.location.region))`

For a request whose address is private and whose region is null, an outsider's projection
has no `location.text` at all (`server/request-policy.mjs:38-39`), so the uncertainty note
disappears — for the owner and moderators it shows. The request page has no such
dependency (`scripts/request-page.js:41` uses `!p.location.known` alone).

Failing scenario: owner creates a request with `known:false`, `region:null`,
a private `text`. The owner's card says `Konum kesin değil`; every outsider's card omits
it, so the least-informed reader loses the uncertainty warning. §18 lists
`Konum kesin değil` as a property of the request, and §9 keeps location certainty
independent of visibility.

Fix: for requests, key the note on `!p.location.known` alone.

### 12. `data-help` and the card entry button disagree after a local verification change — low

`scripts/crisis.js:58` vs `:81` and `scripts/request-thread.js:20`

`cpostHTML` computes `help` from the effective verification `v = state.verified[p.id] || p.v`,
but passes the unmodified `p` to `M.cardActions`, which re-tests `p.v`.

Failing scenario: local/demo mode where `state.verified[id]` is set to `official` for a
`yardim` post. The card loses `data-help` (body click dead) while `cardActions` still
renders `Talebi aç`. The mirror case leaves a clickable body with no entry button.

Fix: pass the effective verification to `cardActions`.

### 13. `M.openRequestPage` `data-offer` on an already-open page sets an unreachable draft kind — low

`scripts/request-page.js:133-144`

When `first` is false (same request id), `opts.channel` is ignored but
`if(opts.offer)draft().kind='offer'` still runs against the current channel. On the
coordination channel the `kind` select is not rendered (`:67` requires
`page.channel==='community'`), so the draft carries `kind:'offer'` invisibly; the next send
still resolves to `reply.create` because of the `channel==='community'` guard at `:93`, so
this is currently benign — but the state is inconsistent and the `Destek öner` entry does
nothing visible. Unverified whether the feed can produce this click while the page is open.

Fix: when `opts.offer` is set, switch to the community channel rather than only setting the
draft kind.

### 14. Help drafts left in `localStorage` by an earlier build are never cleaned up — low

`scripts/imdat.js:26,158`

The wizard moved from `localStorage` to `sessionStorage` (good — §8 asks for
session-scoped persistence of sensitive drafts). The stale `mihenk:help:<run>:<actor>`
entries written by the previous build — which contain the private address and phone —
remain on the device indefinitely and are simply no longer read.

Fix: `localStorage.removeItem(draftKey())` once on first open.

### 15. `page.id` drifts from the URL id for reposts, orphaning the draft key — low

`scripts/request-page.js:14,110,140`

`key(channel)` is built from `page.id`, which is the id the page was opened with until the
first load replaces it with the canonical id (`:110`), while the URL keeps the original id
(`:140`). Entering through a repost therefore writes the first draft snapshot under the
repost id and everything afterwards under the canonical id; a `popstate` back to that entry
compares `page?.id===id` (`:193`) against the canonical id, fails, and rebuilds the page —
reloading drafts from the repost-keyed slot. Unverified in a browser; derived from reading
the two id sources.

Fix: keep the entry id and the canonical id as separate fields and key drafts on the
canonical one, or rewrite the URL to the canonical id after the first load.

### 16. Request moderators are run-wide, and `request.manage` has no per-request assignment — low (documented)

`server/access.mjs:33`, `server/request-policy.mjs:19`

`privateRequestAccess` grants private access to any actor holding `request_manage` within
scope. Probe-confirmed: a request moderator reads the private address and phone of a
request they have never interacted with. §19 records this as an accepted v1 limit
("every `request_moderator` within scope can coordinate any request"), and the region scope
in `canSeePost` does bound it — an out-of-scope moderator gets `not_found`. Listed here only
so the limit is not mistaken for an oversight; no fix applied.

### 17. Latent: verification changing to `official` would strand existing channel messages — low, not reachable today

`server/request-policy.mjs:5`, `server/views.mjs:82`

`helpPost` now excludes `official` `yardim` posts. The thread channel filter is
`!helpPost(p)||messageChannel(x)===channel`, so if a post that already has coordination
messages later became `official`, the channel filter would switch off and public
coordination messages would be listed in the community tab (private ones stay gated by
`canReadMessage`, so this is a channel-mixing bug, not a disclosure). No code path mutates
`verification` after creation — `world.mjs:110,115` always writes `unverified` and only
`lab/scenarios.mjs` seeds `official` posts — so this is unreachable in the current build.
Worth a guard if verification ever becomes mutable.

### 18. Record drift in the plan — low

`docs/HELP_REQUEST_IMPLEMENTATION_PLAN.md:781`

§20 records "passes 52 of 52"; the script now has 56 assertions (60 with the additions
below), and the announcement/`dogrulanmamis` work landed after the §20 text was written.
Also §11's "Record actor, time, and a short reason" is only half met: the request page sends
`request.manage` without a `reason` (`scripts/request-page.js:166-167`), so
`target.accessChange.reason` is always `''` for UI-driven pauses and restrictions. The
server accepts and records an empty reason (`server/world.mjs:140`); collecting one is a UI
gap, not a server gap.

## Fixes applied

Branch `review/request-page-fixes`, commit `1f96d38`, worktree
`C:\Users\dasda\Desktop\teknoNewsosyal\mihenk-review`. Branched from the reviewed commit and
rebased cleanly onto `55a4713` (the branch head after the 1000-character cap and crisis-head
commits landed mid-review). The main working tree was not modified.

| Finding | File | Change |
| --- | --- | --- |
| 1, 2 | `server/world.mjs` | close/reopen state transitions rejected with `conflict`; `request.manage` requires a setting |
| 7 | `server/http.mjs` | `accessChanged` is per-viewer; `actorsChanged` added for other accounts |
| 8 | `server/views.mjs` | `thread.parents` added to the `seen` write |
| 3 | `scripts/request-page.js` | a missing parent clears only `parentId`, never the frozen pending command |
| 4 | `scripts/request-page.js` | a failed send on a detached composer re-renders and reports the error |
| 6 | `scripts/request-page.js` | community dot for any non-owner with private access |
| 5 | `scripts/request-thread.js` | only a selection inside the clicked card blocks the body click |
| 11, 12 | `scripts/crisis.js` | uncertainty note independent of private fields; card actions get the effective verification |
| 9, 10 | `scripts/transport.js` | partial-update and missing-target guards, public-only community visibility, `helpPost` parity, deduplicated local parents, `newerCount` |
| 14 | `scripts/imdat.js` | stale `localStorage` help draft removed on first open |
| 1, 2 | `lab/request-access-check.mjs` | four new assertions covering the close, reopen and manage guards |

Not fixed (deliberate): 13, 15, 16, 17, 18 — 16 and 17 are documented/unreachable, 13 and 15
need a small state refactor rather than a patch, and 18 is a documentation update for whoever
owns the plan record.

Checks in the worktree after the fixes and the rebase: `npm run check:syntax` passes;
`node lab/request-access-check.mjs` reports 0 failed of 62 (the four added assertions are
`reopening an open request is rejected`, `management without a setting is rejected`,
`a rejected close or manage leaves the version untouched` and
`a second close cannot rewrite the recorded closure reason`).

## Prioritised top ten

1. **#1** A second `request.close` rewrites `closedBy`, `closedAt` and `closeReason` — record
   integrity for the closure decision (medium, fixed).
2. **#3** A frozen pending command is dropped when its parent scrolls out of the window,
   producing duplicate messages on retry (medium, fixed).
3. **#2** Empty `request.manage` and no-op `request.reopen` bump the request version and
   break the owner's in-progress statement edit (medium, fixed).
4. **#9** Local adapter throws on a partial `request.update` or a stale target id, leaving the
   composer stuck (medium, fixed).
5. **#5** A leftover selection anywhere on the page disables every help-card body click
   (medium, fixed).
6. **#4** Send errors are written into a detached composer and never shown (medium, fixed).
7. **#7** Any account change in the run forces every request page to drop caches and reload,
   collapsing loaded pagination (low, fixed).
8. **#6** Help-call moderators never get a community-tab dot (low, fixed).
9. **#11 / #12** Card details that change with the viewer's privileges or with a local
   verification override (low, fixed).
10. **#15 / #13** `page.id` drift for reposts and the ignored `opts.offer` channel on an
    already-open page — both need a small state refactor (low, not fixed).

No privacy leak of private message text, private address, private phone, parent previews,
hidden-message counts or private search matches was found in any participant-reachable
response: feed items, thread, `parents`, `updates`, `relatedPosts`, `ownRequests`, repost
projections, SSE payloads and the `seen` list were each traced end to end and are gated by
`canSeePost`/`canReadMessage`/`canReadPrivate`. The findings above are authorization-state,
idempotency and client-state defects.
