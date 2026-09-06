# MİHENK Crisis Experience and Autonomous Simulation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Checkbox steps track implementation. Follow the repository's production-first, no-new-tests-by-default policy; do not introduce TDD, automatic commits, or worker orchestration as prerequisites.

**Goal:** Make the crisis experience coherent and dependable, then use independent AI participants in a shared private environment to discover interaction failures before a real crisis.

**Architecture:** Keep the current vanilla JavaScript interface and offline presentation. Add one local Node process with SQLite, participant-scoped views, and a shared command path. Browser participants, tool participants, and existing rule-based participants use that same application state; a separate operator interface controls scenarios and collects evidence.

**Tech Stack:** Existing HTML/CSS/JavaScript; Node 24.18.0; built-in node:sqlite; HTTP and Server-Sent Events; existing Playwright; one configurable inference adapter, with Qwen3.5-9B as the initial A100 80 GB candidate and Qwen3.5-4B as a smaller alternative.

**Spec:** The accepted requirements and decisions in Sections 1–5 of this document. The original Turkish thought note is preserved at C:/Users/dasda/Desktop/teknoNewsosyal/DUSUNCELER_UX_VE_AI_KRIZ_SIMULASYONU.md. The latest instruction below supersedes its suggestions about participant roles and personality prompts.

**Date and source baseline:** 2026-09-06. Repository: C:/Users/dasda/Desktop/teknoNewsosyal/mihenk, branch main, HEAD 35cb0dc, including the current uncommitted work.

## Global constraints

- Product UX/UI is the priority. Every addition must address a concrete broken journey or enable the requested experiment.
- Autonomous participants receive no roleplay prompt, assigned personality, behavioral goal, test agenda, scoring rubric, or instruction to produce interesting behavior.
- Participants see their own application environment, available operations, and operation results. Their private contexts are separate.
- Waiting, ignoring information, leaving, misunderstanding, and making no post are valid outcomes.
- Keep the existing non-AI simulator. Identify rule-based activity separately in operator records.
- Preserve the current design work, offline bundle, unrelated dirty files, and existing measurement tools.
- Keep participant-facing copy in Turkish. This plan and engineering notes are in English.
- Use one local server process and one local database. No distributed agent framework, microservices, vector database, or new frontend framework.
- Add no product chatbot, automatic truth judge, autonomous rescue dispatcher, reputation economy, or general messaging platform in this scope.
- Use existing checks and direct browser exercises. Do not add or modify tests by default; never start with a deliberately failing test.
- Do not commit, push, publish the rehearsal, buy compute, or connect real emergency services as part of this plan.
- Research supports design decisions; it does not authorize features unrelated to an observed problem.
- This document plans future implementation. It does not certify that the shared system or AI integration already exists.

## 1. What we are building

The desired result is a usable crisis network where people can understand what is happening, request help with incomplete information, find and respond to requests, correct information, report a problem, and recover from interrupted actions.

The simulation serves that product. Its useful output is evidence such as:

> A request was submitted without a known location. Another participant found it, asked for a landmark, and the author could update the original request. When the connection failed after submission, retrying did not create another request.

The useful output is also a failure:

> Three participants saw an old request, two offered help, and neither noticed that the author had already closed it.

A high post count or an attractive simulation dashboard is not a completion criterion.

### The participant rule

Do not supply a base RP prompt, including disguised versions such as “you are a frightened resident,” “your objective is to find your family,” or “behave like a random human.”

The minimum machine interface contains only:

1. The currently observable application view.
2. Descriptions and argument formats for available operations.
3. Previous observations and operation results belonging to that participant.
4. The output format necessary to execute an operation or wait.

If a model backend requires a system message, use only the protocol instruction:

> Return one available operation with its arguments, or wait.

It must not contain a fictional identity, crisis objective, evaluation instruction, or claim that the event is real. This is an interaction protocol, not a behavioral prompt. Preserve the exact model-visible input for inspection.

A blank account can remain a blank account. Variation may come from join time, feed exposure, visible conversations, connectivity, model sampling, and subsequent interactions. These are experimental conditions, and must be logged. Do not manufacture a personality by placing a disguised instruction in a private message.

No shared agent “mind” belongs in the participant layer. Shared knowledge must travel through application features that another participant could actually use. Reviewers may share findings outside the participant environment.

This design controls information exposure. It cannot guarantee what a model will infer about the environment, or make identical models equivalent to different human populations.

## 2. Verified starting point

These are source observations from the current working tree, not new runtime certification.

| Area | Current evidence | Consequence |
|---|---|---|
| Visual experience | Current edits to styles/tokens.css, styles/refine.css, styles/plain.css and the crisis/help flows | Continue the calmer slate/blue direction; use red selectively for the help action and destructive/error states. |
| Shared state | scripts/app.js:80–89 and scripts/crisis.js:71 keep crisis additions in the page | Separate browsers do not yet inhabit one persistent world. |
| Server | tools/serve.mjs accepts GET/HEAD and serves local files | There is no participant identity, shared write API, or persistence. |
| Existing simulator | scripts/simulation.js plans actions from predefined roles and mutates page state directly | Keep it as a rule-based baseline; its behavior must not become the AI participant prompt. |
| Help request | scripts/imdat.js stores drafts in memory and creates local records | Refresh, reconnection, delivery receipts, and ownership need a shared implementation. |
| People count | scripts/imdat.js:114 silently clamps typed values | A person's input can change without a clear explanation. |
| Assistance | scripts/simulation.js:64 increments an offer counter; the visible crisis card has no equivalent complete conversation flow | A counter cannot stand in for another participant's actionable response. |
| Trust and ranking | scripts/crisis.js:76–79 ranks by verification class; manual demo upgrading remains | Examine whether urgent unverified needs become hard to discover; isolate demo privileges from shared participants. |
| Experiment disclosure | index.html, scripts/app.js, scripts/imdat.js, scripts/crisis.js and scripts/simulation.js expose prototype/tatbikat content | A blind participant surface needs separate delivery, not merely hidden controls. |
| Verification limits | tools/contrast.mjs contains older hardcoded palettes; a previous browser run had one size-detail visibility failure | Old checks do not prove the new palette or every current behavior. Preserve and report the known limits. |

The older docs/hardening-design.md requires a zero-backend prototype. This plan supersedes that constraint only for shared rehearsal mode. The offline presentation remains supported.

## 3. UX decisions grounded in actual failure paths

For each journey, record: **situation → visible obstacle → likely consequence → smallest correction → observed result**. Start with the cases below, then research additional questions encountered during real use. This is a starting set, not a claim of an exhaustive humanitarian UX review.

“Verify” means exercise the existing behavior before changing it. “Implement” identifies a missing shared behavior or a source-confirmed problem.

| Situation and consequence | Minimum decision | Evidence and application |
|---|---|---|
| A distressed user must choose between many competing controls. Important actions become difficult to identify. | Verify one clear primary action per step, short labels, stable placement, and a readable distinction between information and help. Retain the current calm palette. | CDC describes altered information processing during crises and recommends clear, actionable communication. Applying that to this interface is our design inference. [CDC CERC](https://www.cdc.gov/cerc/php/cerc-manual/index.html). |
| Someone does not know their location or exact group size. Requiring invented precision blocks or corrupts the request. | Preserve “Konumu bilmiyorum”; allow an unknown people count; accept a landmark without coordinates. Keep unknown distinct from zero and from a known district. Do not silently replace typed counts. | This is a project decision about incomplete information. Explicit textual feedback for invalid values follows [W3C error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html). |
| The user closes the modal, goes back, loses connectivity, or refreshes. Re-entering the request causes abandonment or duplication. | Implement a draft scoped to run and account; restore it; distinguish a draft from an acknowledged submission. Preserve fields after validation failure. | Avoiding repeated entry within a process follows [W3C redundant entry](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html). Refresh persistence is our additional recovery decision. |
| A user presses submit and assumes an emergency team has been dispatched. | Show “Talebiniz paylaşıldı” only after storage acknowledgment. Show responses when they exist. Remove the implied verification/dispatch pipeline unless actual events support it. | Source-confirmed mismatch: scripts/imdat.js currently presents a team-matching chain without a shared dispatch service. |
| Many general posts or established accounts dominate the feed. A new help request gets no attention. | Verify a prominent route to open requests, visible region filters, timestamps, and access to requests with unknown locations. Do not add popularity-based urgency ranking. | A study of help-seeking during the Henan floods found substantial attention inequality and competition from other content. It motivates inspecting discoverability, not claiming the same numerical pattern here. [CSCW study](https://arxiv.org/abs/2205.12535). |
| A helper needs clarification or can only offer partial support. A bare offer count prevents coordination. | Implement a short request discussion with replies and explicitly marked offers. Both sides can see updates. An offer does not close the need or imply arrival. | Source-confirmed missing interaction loop; the minimum product addition is a request discussion, not a full chat application. |
| An old request is reposted or edited after help was offered. Others act on obsolete information. | Display last update and closure status wherever a request is opened. Reposts reference the original. Surface changed details before another consequential action. | Concrete information-lifecycle decision. Assess it using observed stale-request paths. |
| A person reports incorrect information, abuse, or exposed personal details. A long form discourages the report. | Offer a short reason list, optional details, cancel, and a stored receipt. A report does not automatically establish truth or delete another person's post. | This is a proposed product rule to validate in use; no cited standard prescribes these exact categories. |
| Someone puts a phone number or exact shelter address into a public field without understanding the audience. | Explain the audience beside the field; accept coarse location. Do not require a phone number or claim that public request replies are private. | Humanitarian guidance stresses confidentiality and communication risks. The precise field design is our application of that guidance. [IFRC and partner tip sheet](https://www.ifrc.org/document/tip-sheet-maintaining-confidential-digital-dialogue-during-humanitarian-emergencies). |
| A modal traps focus incorrectly, steals it after closing, or obscures the exit. | Verify a visible close action, Escape, contained keyboard focus, background inertness, and focus restoration. Preserve the draft when dismissed. | [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). |
| A person uses a small phone, large text, the on-screen keyboard, or one hand. | Verify 320px and 390px layouts, 200% text zoom, visible submission controls, plain mode, and reduced motion. Use 44px targets for primary crisis actions as a product target. | WCAG 2.2's minimum target criterion is generally 24×24 CSS px with exceptions; our primary-action target is intentionally larger. [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). |

Keep source status, publication age, request status, and user reports separate. “I also saw this” is another person's statement, not independent verification. Official authorship identifies the publisher; it does not make every statement current or correct.

## 4. Small shared-world architecture

### Runtime boundaries

- **Offline preview:** existing index.html and dist/mihenk.html, with explicit presentation/tatbikat context.
- **Participant application:** participant.html on 127.0.0.1:8322, using the same rendering and styles with a server-backed transport.
- **Operator control:** a second loopback listener on 127.0.0.1:8323 in the same Node process, controlled initially through a small CLI. No new dashboard is required.
- **Storage:** .rehearsal/world.sqlite and run exports under .rehearsal/runs/. Ignore this directory in Git and never serve it as static content.
- **Model access:** available only to the trusted runner. Tokens and administrative credentials never enter participant inputs.

Use SQLite transactions for identity, writes, and event receipts. Node 24.18.0 provides node:sqlite as a release-candidate API; isolate it in one module and pin the runtime used for runs. Its synchronous interface is acceptable for this bounded local system; measure contention before introducing a worker or another database. [Node 24.18.0 SQLite documentation](https://nodejs.org/download/release/v24.18.0/docs/api/sqlite.html).

### Ownership and persistence

Persist runs, actors, sessions, posts/requests, replies/offers, repost references, reactions/follows, observations, reports, command receipts, and ordered events. Store scenario ground truth separately from the participant projection.

Each stored entity carries runId, id, authorId, version, createdAt, and updatedAt where applicable. A request has:

~~~json
{
  "id": "request-41",
  "authorId": "account-12",
  "version": 1,
  "need": ["gida"],
  "people": null,
  "location": { "region": null, "text": "", "known": false },
  "status": "open",
  "source": { "kind": "firsthand", "url": null },
  "verification": "unverified"
}
~~~

Null means unknown. People counts must be positive safe integers when supplied. The UI must not impose an arbitrary 999-person cap inherited from the current stepper.

Only the author can edit, close, or reopen their request. Any eligible participant can reply, offer help, report, or make an observation through the corresponding visible control. An offer can be withdrawn by its author. A reported fulfilled need is a participant's claim; it is distinct from operator-known scenario outcomes.

Create receipts and events in the same transaction as the entity change. A command retried after a dropped acknowledgment returns the original receipt.

### Shared command and view contracts

The server obtains actor identity from the session, never from an authorId supplied by a model.

~~~json
{
  "commandId": "9f8b8100-10de-4c8f-8d9e-28ec9a061d23",
  "type": "request.update",
  "targetId": "request-41",
  "expectedVersion": 1,
  "payload": {
    "location": { "region": null, "text": "Parkın kuzey girişi", "known": true }
  }
}
~~~

Use these HTTP operations:

| Operation | Behavior |
|---|---|
| POST /api/session/redeem | Consume a one-use join code and establish one participant session. |
| GET /api/view | Return the account's requested feed page, opened thread, own updates, and permitted controls. Default page size 20. |
| POST /api/commands | Validate, authorize, apply once, and return the stored receipt. |
| GET /api/events | Send participant-scoped invalidations through SSE; the client refreshes its current view. Do not broadcast raw global events. |
| Operator /runs, /sessions, /control, /export | Create runs/accounts, release scenario events, pause/resume, and export evidence. Require a separate operator credential. |

Supported command families are post.create, post.repost, post.react, account.follow, request.create, request.update, request.close, request.reopen, reply.create, offer.create, offer.withdraw, observation.create, and report.create. Closing a request changes status; reopening requires an explicit author action. One command has one visible result.

Allow only the fields associated with each action: post content/category/location/source; request needs/count/location; reply or offer text; a report reason and optional details; or an explicit active flag for a reaction/follow. Ownership, verification, organization identity, timestamps, and run identity are always server-controlled. Reject unknown payload fields. A known location requires a nonempty description or region. Existing likes and follows must change shared state in the participant application; personal display preferences can remain local.

Command responses:

~~~json
{
  "ok": true,
  "commandId": "9f8b8100-10de-4c8f-8d9e-28ec9a061d23",
  "entityId": "request-41",
  "entityVersion": 2
}
~~~

~~~json
{
  "ok": false,
  "error": {
    "code": "conflict",
    "message": "Talep güncellendi. Son bilgileri kontrol edin.",
    "field": null,
    "retryable": false
  }
}
~~~

Use explicit validation, conflict, unauthorized, not_found, rate_limited, and unavailable errors. Reject the same commandId with a different payload. Scope receipt uniqueness to run, actor, and commandId. Use expectedVersion for updates, closure, reopening, and withdrawal; never let a stale edit overwrite a newer change.

A view contains viewId, the requested route/filter, visible items, an opened thread if requested, own updates, and permitted actions. It does not contain hidden reports, scenario annotations, other sessions, future events, private logs, or the complete database. Reconnect with a fresh view if an SSE cursor cannot be resumed.

### One application path

Expose the following frontend transport:

~~~javascript
M.transport.ready();                       // Promise<void>
M.transport.getView(query);                // Promise<ParticipantView>
M.transport.send(command);                 // Promise<CommandResult>
M.transport.subscribe(onInvalidation);     // returns unsubscribe()
~~~

Use an offline adapter for the presentation and a shared adapter for the participant application. Keep critical rendering and form validation common. Server authorization and persistence remain authoritative in shared mode.

Do not let AI or shared rule-based participants mutate M.state.extraCrisis. Adapt their accepted operations through the same command service. The older offline simulator can remain a separate demonstration, explicitly identified in operator records.

## 5. Observation, models, and experimental validity

### Two interaction paths, one population rule

**Browser participants** operate the rendered application: screenshots and visible accessibility information, click, type, scroll, navigate, and wait. They receive no repository, JavaScript evaluation tool, network inspector, window.MIHENK access, or operator tab. This path can expose visual and navigation problems.

**Tool participants** receive a bounded presentation of their current application view and the operations available there. Opening another page or thread requires an explicit operation. A model cannot act on an unseen target by guessing an ID. This path evaluates information flow and behavior; it does not prove that a person could discover a button.

Both paths use the same no-RP rule. Do not quietly provide browser participants with a desired task or tool participants with an ideal next action.

**External reviewers** inspect recorded interactions and can perform separate directed UX exercises. They know the review purpose, but their notes and instructions never enter an autonomous participant's context. If a reviewer interacts in a run, mark that as a separate directed run.

For moment-of-use feedback, record the screen, last action, expected visible result, actual visible result, and practical impact. Request concise observations, not private chains of thought.

### Input isolation and neutrality

- Keep contexts, cookies, credentials, and action history separate for every account.
- Shared scenario data becomes visible only when the application publishes it.
- Remove operator labels and prototype seed material from the private participant delivery, including metadata and accessibility text. Do not merely hide them with CSS.
- Serve an explicit public-asset allowlist. Do not reuse the existing whole-repository static serving policy for the participant listener.
- Treat posts and replies as application data; embedded instructions cannot grant tools, change system instructions, or reveal another account.
- In the first scenarios, source references lead to other records within the rehearsal. If an external URL cannot be opened, record it as uninspected rather than treating its presence as verification.
- Do not inject evaluator annotations, “rumor actor” labels, intended outcomes, or success scores into model inputs.
- Record accidental disclosure or a model's inference that this is an evaluation. Do not claim perfect subjective blinding.
- Keep all traffic within the private exercise. Participant tools cannot post to real social media or contact emergency services.

### Compute strategy

Load one model and maintain separate account histories. Fifty participants do not require fifty copies of model weights; the number of simultaneously generating requests is a separate capacity setting.

For a confirmed A100 80 GB runtime, start with Qwen3.5-9B as the candidate, using its official deployment instructions and a pinned model revision. Its official card reports BFCL-V4 66.1 and TAU2-Bench 79.1. These support trying the model; they do not establish performance on our Turkish, no-RP interaction loop or with our non-thinking output budget. Keep Qwen3.5-4B as the smaller alternative when the measured resource budget warrants it. [9B official model card](https://huggingface.co/Qwen/Qwen3.5-9B), [4B official model card](https://huggingface.co/Qwen/Qwen3.5-4B).

The proposed five-A100 configuration is a scaling option, not confirmed hardware inventory or a prerequisite for 50 participant accounts. Start with one available GPU and the five-participant pilot. If five A100 80 GB GPUs are available, run five model-serving replicas with one model copy per GPU and initially ten participant histories assigned to each replica. Keep histories independent; keep an account on the same replica when practical to reuse its cached prefix. If the GPUs are separate machines or notebook runtimes, first establish actual endpoint connectivity and record their independent failure/restart behavior; do not treat their memory as one shared pool.

Initial serving choices are vLLM, one replica, BF16 as the unquantized baseline, and a 16K model context ceiling. The per-decision input budget below remains 4K for the pilot; allocating a 16K window does not require filling it. Record continuous batching and chunked-prefill settings from the pinned serving version. Start with MTP/speculative decoding disabled; compare it under the actual concurrent workload before enabling it. Quantization and a 32K context window are measured changes, not startup requirements.

The cited 207 output-token/s result is the checkpoint author's single-user, text-only A100 PCIe result with a specific patched software stack. It neither predicts ten concurrent participants per GPU nor establishes screenshot-processing speed. Do not divide or multiply it into an agent throughput promise, and do not assume a 9B dense model must outperform a 35B-A3B quantized model under every workload. [Author's optimization report](https://huggingface.co/alityb/Qwen3.5-9B-FullINT4-MTP).

A shared 35B supervisor must not choose, improve, or repair valid participant decisions. That would change the population being observed and could suppress the very mistakes the experiment should expose. A larger model may review recordings outside the participant run, or participate as a separately labeled model cohort under the same observation rules. Keep thinking mode fixed within a comparison run; evaluate a different mode in a separate condition.

Use the existing runner's bounded queue and a configured list of model endpoints for replicas. Redis, distributed worker services, and a separate load-balancer service are unnecessary for the initial single-controller setup. Add them only if an observed requirement for multiple controllers or failure recovery justifies them.

For the first A100 run, execute the shared server, runner, and model inside the active Colab notebook runtime using loopback connections. Export the scenario, ordered events, decisions, and screenshots to inspect locally. This avoids making a free notebook a permanent public inference server. Colab resources and runtime lifetime vary, and its restrictions distinguish interactive notebook compute from other service use. [Colab FAQ](https://research.google.com/colaboratory/faq.html).

The same inference adapter can later call a user-configured endpoint. Building the local application does not depend on obtaining that endpoint now. A Colab export replay is distinct from a live connection to the Windows session.

Initial operator defaults:

~~~json
{
  "participants": 5,
  "inferenceConcurrency": 2,
  "maxDecisionsPerParticipant": 20,
  "maxInputTokensPerDecision": 4096,
  "maxOutputTokensPerDecision": 256,
  "maxTotalTokens": 450000,
  "requestTimeoutSeconds": 60,
  "maxWallMinutes": 20,
  "allowPaidProviders": false
}
~~~

These are budget settings, not predicted performance. For 50 participants at 20 decisions each, those per-decision limits imply up to 4,352,000 input-plus-output tokens before repair attempts. The explicit run budget remains a separate stopping rule. Include formatting repair and retries in accounting. Reserve each in-flight request's maximum allowance before dispatch and reconcile it with reported usage afterward; count the reserved maximum if usage is unavailable. Include the complete message template and operation definitions in the input limit.

Use the model's supported non-thinking mode for the first tool pilot if available. If required actions cannot fit within the output budget, adjust the protocol or budget and record the change; do not truncate a post silently. Keep screenshots in the smaller browser cohort rather than sending them to every participant on every turn.

When a run reaches its budget or loses compute, checkpoint and mark the stop reason. Never replace failed AI actions with scripted successes.

### Clocks and repeatability

Keep scenario time separate from generation latency.

- Start with a turn-based behavioral run. Release scheduled events at explicit ticks and shuffle participant execution order with a recorded seed.
- Give each participant at most one outstanding decision. An observation is fixed for that decision; stale results still encounter normal version checks.
- Add wall-clock runs only when measuring actual concurrent load and delivery timing.
- Record observation, accepted/rejected action, model/version, sampling parameters, timing, and the operator's global event order.

**Replay** reapplies recorded accepted events to the same initial state. **A new run** asks models to decide again and may diverge. A fixed seed does not generally promise identical online model output; vLLM documents additional reproducibility conditions. [vLLM reproducibility](https://docs.vllm.ai/en/latest/usage/reproducibility/).

Repeating small scenarios explores different paths. Separate simultaneous-load runs are still required to investigate crowd pressure.

## 6. File boundaries

All paths below are relative to C:/Users/dasda/Desktop/teknoNewsosyal/mihenk. Add each file when its task needs it; do not scaffold empty subsystems.

| Files | Responsibility |
|---|---|
| scripts/app.js, scripts/crisis.js, scripts/imdat.js, scripts/feed.js | Existing rendering, navigation, forms, and interaction entry points. |
| styles/tokens.css, styles/refine.css, styles/plain.css | Existing visual system and responsive/accessibility corrections. |
| data/catalog.js — new; data/seed.js — modify | Extract shared labels/avatar helpers from fictional seed records. Participant startup must not load the full seed. |
| scripts/transport.js — new | Offline/shared transport and participant-scoped view cache. |
| scripts/request-thread.js — new | Request replies, offers, update status, and the report dialog. |
| participant.html — new; index.html — modify | Thin entry shells using common rendering; offline retains its presentation context. |
| server/store.mjs — new | SQLite schema, transactions, receipts, and ordered event persistence. |
| server/world.mjs — new | Commands, validation, ownership, and entity state transitions. |
| server/views.mjs — new | Participant projections, visible queries, and permitted actions. |
| server/http.mjs — new | Participant/operator listeners, sessions, SSE, and asset allowlist. |
| tools/serve-rehearsal.mjs — new; tools/rehearsal.mjs — new | Start the shared service and control/export runs through the operator interface. |
| lab/scenarios.mjs — new | Small scenario definitions and private truth annotations. |
| lab/rule-participants.mjs — new; scripts/simulation.js — modify | Adapter for shared rule-based participants; preserve the offline baseline. |
| lab/model.mjs — new; lab/runner.mjs — new | Model request adapter, bounded scheduling, separate histories, and decision records. |
| lab/browser.mjs — new | Scoped browser actions and screenshot/visible-observation capture. |
| lab/report.mjs — new | Read existing run records and produce compact findings and metrics. |
| lab/colab.ipynb — new | Interactive A100 setup, bounded run, checkpoint, and export cells. |
| package.json, tools/bundle.mjs, .gitignore | Minimal startup commands, new browser modules in offline bundling, and ignored runtime output. |

Do not refactor unrelated rendering, replace the build pipeline, or edit the existing measure tools for this work.

## 7. Implementation tasks

### Task 1: Finish the essential UX decisions in the current interface

**Files:** scripts/imdat.js, scripts/crisis.js, styles/refine.css, styles/plain.css; inspect scripts/app.js.

**Output:** The help journey accepts uncertainty, describes actual outcomes, and remains usable on a small screen.

- [ ] Walk the live help, source, filter, request-update, and modal flows at 390px and desktop width. Record concrete friction using the Section 3 decision format.
- [ ] Replace silent people-count clamping with explicit validation and an unknown option. Store unknown as null; preserve what was typed until correction.
- [ ] Keep unknown location as structured state, not a special string that other code must compare. Show a clear “Konum henüz belirtilmedi” label and an update action.
- [ ] Replace the unsupported team/verification progress chain with a receipt, current request status, responses, and the author's update/close actions.
- [ ] Verify open requests and unknown-location requests are reachable from the crisis screen. Correct confirmed obstacles without adding ranking machinery.
- [ ] Check visual hierarchy, focus restoration, keyboard obstruction, large text, and plain mode. Change only the controls involved in observed failures.

Implementation contract for people count:

~~~javascript
function parsePeople(value) {
  if (value === '') return { value: null, error: null };
  var count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1) {
    return { value: null, error: 'Pozitif bir tam sayı yazın veya Bilmiyorum seçin.' };
  }
  return { value: count, error: null };
}
~~~

**Acceptance:** A request can be prepared without location or count; invalid input is explained without replacing it; back/close does not lose the current in-page draft; no receipt implies that a team has been dispatched. This task does not yet claim cross-refresh or shared persistence.

### Task 2: Prove one persistent world with two accounts

**Files:** server/store.mjs, server/world.mjs, server/views.mjs, server/http.mjs, tools/serve-rehearsal.mjs, tools/rehearsal.mjs, package.json, .gitignore.

**Interfaces:** store owns transactional reads/writes; applyCommand(session, command) returns CommandResult; projectView(session, query) returns ParticipantView. The HTTP layer calls these services rather than duplicating rules.

- [ ] Add the SQLite tables and uniqueness constraints described in Section 4, with a schema version for this disposable rehearsal database.
- [ ] Implement request.create, request.update, request.close, and request.reopen with session-derived ownership and transactional receipts.
- [ ] Implement participant sessions and paged views. Reject reads and writes across run boundaries; cap command bodies at 64 KiB. Validate browser request origins and session credentials; loopback binding alone is not authorization.
- [ ] Implement the separate operator listener and one-use participant join codes. Keep operator credentials out of cookies, page source, command logs, and model input.
- [ ] Add SSE invalidations after committed writes. Return a fresh view on reconnect instead of assuming every missed event can be replayed.
- [ ] Bind to loopback and serve only the explicitly listed participant assets. Reject access to server/, lab/, docs/, .rehearsal/, environment files, offline seed, and generated offline bundles.
- [ ] Run two independent account sessions: create in A, observe in B, update in A, refresh B, restart the process, and observe the persisted result.

Add these startup scripts while preserving existing package entries:

~~~json
{
  "rehearsal": "node tools/serve-rehearsal.mjs",
  "rehearsal:control": "node tools/rehearsal.mjs"
}
~~~

**Acceptance:** Two accounts see the same saved request. B cannot edit A's request. Resending A's command after losing the response creates no duplicate. Restart retains committed state. No AI is needed for this milestone.

### Task 3: Connect the real interface and complete the coordination loop

**Files:** data/catalog.js, data/seed.js, scripts/transport.js, scripts/request-thread.js, scripts/app.js, scripts/crisis.js, scripts/imdat.js, scripts/feed.js, participant.html, index.html, styles/refine.css, styles/plain.css, tools/bundle.mjs; extend server/world.mjs and server/views.mjs.

**Interfaces:** Use M.transport from Section 4. Both entry points use the same card/form rendering. Public display helpers come from data/catalog.js; shared account data comes from the server.

- [ ] Extract public display helpers and labels from the seed. Start the shared page only after its initial account view is ready; do not briefly render the offline world while loading.
- [ ] Replace shared-mode direct mutations, Date.now IDs, and “uid === me” ownership assumptions with transport commands and current account identity.
- [ ] Implement the remaining Section 4 commands with a visible control for every AI-accessible product action. Route existing likes, follows, reposts, and replies through the shared service. Check remaining enabled controls and clearly disable genuinely unavailable actions rather than faking success.
- [ ] Add the request discussion: public replies, marked help offers, withdrawal, and unread updates visible to the request author. Existing message icons must not suggest an unimplemented private channel.
- [ ] Add report reasons: inaccurate/outdated, spam/abuse, exposed personal information, and other. Details remain optional. Save reports with the content version and show acknowledgment after commit.
- [ ] Persist drafts by run and account. Keep an unacknowledged command ID with its draft, so a refresh/retry can retrieve or repeat the same submission safely.
- [ ] Render sending, saved, unavailable, and conflict states. A dropped request must retain user input; a conflict must show the current version before another write.
- [ ] Preserve the existing deferred “new posts” behavior while scrolling. A view refresh must not steal focus, close a draft, or move the reading position unexpectedly.

A short recovery contract:

~~~text
Draft -> Sending -> Saved receipt
              \-> Unavailable -> Retry same commandId
              \-> Conflict -> Show latest version, retain user's draft
Saved request -> Author closes -> Closed
Closed request -> Author explicitly reopens -> Open
Offer received -> Request stays open until author changes its status
~~~

**Acceptance:** A creates an uncertain-location request, B replies and offers partial help, A receives the update and adds a landmark, B sees the new version, A closes and can reopen. A report is stored without falsely deleting/verifying content. Reload and a dropped acknowledgment preserve one request and its real status.

### Task 4: Isolate participants and make scenarios repeatable

**Files:** lab/scenarios.mjs, lab/rule-participants.mjs, tools/rehearsal.mjs, scripts/simulation.js; extend server/world.mjs, server/views.mjs, server/http.mjs.

**Interfaces:** Scenarios define initial records, scheduled application events, and private truth annotations. Rule participants receive projectView results and submit applyCommand operations.

- [ ] Define three small scenarios: incomplete information with a later correction; an unanswered request amid unrelated posts; and request coordination interrupted by a stale update or connection failure.
- [ ] For the first scenario, seed one open request, one secondhand road report, ordinary background posts, and a scheduled correction linked to the original report. Do not assign participants a role or desired response.
- [ ] Keep event publication times, truth labels, actor provenance, and operator metrics out of participant responses and static assets.
- [ ] Adapt shared rule participants to the same actions and ownership rules. Remove their privileged all-post access in shared runs and retain seeded offline replay separately.
- [ ] Implement create/start/pause/resume/stop/export CLI operations. Pausing stops new scheduled events and decisions; record any already-started decision and whether it was applied.
- [ ] Export initial state, scenario version, ordered accepted events, rejected command receipts, and participant observations. Import into a new replay run, never over the active run.
- [ ] Inspect participant HTML, visible text, accessibility names, responses, and permitted URLs for operator or scenario leakage.

**Acceptance:** A participant cannot read another account's private state or future events. Rule and manual participants share one world. Replaying a completed rule run reproduces the same stored application state, while keeping it separate from the current run.

### Task 5: Add the smallest autonomous decision loop and A100 notebook

**Files:** lab/model.mjs, lab/runner.mjs, lab/colab.ipynb; extend tools/rehearsal.mjs and package.json.

**Interfaces:** decide({ observation, history, operations, limits, seed }) returns { operation, arguments, usage, durationMs } or a recorded model error. The adapter does not receive operator credentials or ground truth.

- [ ] Implement the no-RP input contract from Section 1. Retain the exact input and returned operation in operator records.
- [ ] Maintain separate histories and credentials. Keep only actual prior observations/actions/results; bound context by removing the oldest entries, recording when that happens.
- [ ] Support page navigation, thread opening, available product commands, and wait. Validate targets against what that actor has accessed; never interpret free text as an administrative command.
- [ ] Apply the default limits in Section 5. Schedule at most one pending decision per participant with a fair, seeded order.
- [ ] Allow one schema-only repair attempt for malformed output. Do not repair a valid wait or undesirable decision. Log model failures, transport failures, and product rejections separately.
- [ ] Build notebook cells for runtime/GPU inspection, pinned dependencies, model loading, local server startup, a five-participant run, checkpoint, and export. Pin the versions actually used after the first successful setup.
- [ ] Record GPU model/VRAM, model revision, runtime versions, context limits, generation latency, valid-operation rate, memory use, and stop reason from that pilot.

Scheduling contract:

~~~text
Read participant view
  -> Build that participant's model input
  -> Request one decision within the remaining budget
  -> Validate operation format and visible target
  -> Execute through participant session, or record wait/error
  -> Store observation, decision, receipt, timing, and usage
  -> Schedule the next eligible participant
~~~

**Acceptance:** Five isolated contexts can observe one another's actual posts and replies. No participant receives the scenario goal. Waiting survives unchanged. Compute failure produces a resumable checkpoint. The notebook run uses the same world code as the local service.

### Task 6: Observe genuine UI use and collect independent criticism

**Files:** lab/browser.mjs, lab/runner.mjs, lab/report.mjs; fix only relevant existing UI files when a finding is confirmed.

**Interfaces:** observeBrowser(accountSession) returns the visible screenshot/accessibility description; actBrowser(operation) executes a scoped UI action. Browser and tool records identify their interaction mode.

- [ ] Give each browser participant its own browser context and account session. Restrict navigation to the participant application; permit only screenshots, visible-element actions, scrolling, and waiting.
- [ ] Run a small browser cohort against the same UI and state rules. Record the selected target, before/after view, and actual operation result.
- [ ] Keep UI-based observations separate from API-based ones. Record an item delivered to an API page as “provided,” and a card entering the viewport as “visible”; neither proves comprehension.
- [ ] Have independent reviewers inspect different journeys and observed failures after runs. Initial review lenses are incomplete input, information freshness, accessibility, and recovery. Do not attach these lenses to autonomous participants.
- [ ] Consolidate duplicate findings and directly reproduce important ones in the interface before accepting fixes. Use additional review passes when a journey remains uncovered or a concrete concern remains unresolved.
- [ ] Append short findings as they are observed, linked to a screenshot/view and action. Do not make a new reviewer platform.

Finding format:

~~~json
{
  "journey": "update-request",
  "mode": "browser",
  "viewId": "view-78",
  "lastAction": "open request",
  "expected": "The current closure state is visible before offering help.",
  "observed": "The closed state appears below the mobile viewport.",
  "impact": "A participant can offer help based on an obsolete need.",
  "severity": "important",
  "evidence": ["screen-78.png", "action-24"],
  "reproduced": false
}
~~~

**Acceptance:** Each important UX finding has a visible trigger and evidence. A second review can challenge it without needing the original reviewer's interpretation. Reviewer notes do not influence the participant run.

### Task 7: Run a bounded experiment, fix demonstrated failures, then scale

**Files:** lab/scenarios.mjs, lab/report.mjs, lab/runner.mjs; the smallest production files required by confirmed findings.

- [ ] Run the basic two-account product exercise first, then the five-participant model pilot, then a small browser cohort. Do not skip the shared-world milestone because model setup works.
- [ ] Repeat the three scenarios with three recorded seeds at 10 participants. Record missing behavior as missing coverage; do not add a role prompt to force it.
- [ ] Review outcomes using Section 8, including failures, waits, refusals, and abandoned flows.
- [ ] Fix demonstrated blockers or important confusion; rerun the affected journey using the lightest relevant existing check and one comparable scenario.
- [ ] Increase to 50 participants only after the pilot has at least 90% valid operation output before repair, complete records for all decisions, and no unresolved ownership, receipt, or observation leak. This is a model/runner viability gate, not a human-realism score.
- [ ] Increase inference concurrency only when measurements show that memory, response time, and the intended run budget permit it. Reduce concurrency after capacity failures; do not create replacement successes.
- [ ] Combine the existing rule participants with AI participants for a separately labeled load run. Attempt 100 AI participants only when the 50-participant run fits the available compute budget.
- [ ] End with the smallest set of corrected product issues and the remaining uncovered journeys. Stop adding speculative features once the acceptance conditions are met.

**Acceptance:** Every completed run can be inspected and replayed, its experimental settings are known, and reported improvements correspond to actual application changes. Budget-stopped runs are marked incomplete. Small repeated runs and concurrent-load runs are reported separately.

## 8. Measurements that answer useful questions

| Question | Measurement and interpretation |
|---|---|
| Can incomplete help requests be submitted? | Acknowledged submissions / observed submission attempts, split by known/unknown location and count. An actor that never tries contributes no submission attempt. |
| Are requests discoverable? | Time or ticks from publication to a provided/visible request, then to a reply or offer. Report each denominator and interaction mode. No exposure is a result, not zero response time. |
| Does coordination work? | Requests with replies, offers, author updates, closure claims, and reopenings. Keep these events distinct. |
| Does misinformation persist? | For scenario claims with private truth annotations: observed exposures, reposts, correction exposures, and actions after correction. Unclassified generated claims remain unknown until reviewed. |
| Does the UI support recovery? | Attempts surviving refresh/disconnection, preserved drafts, duplicate accepted submissions, and stale-edit conflicts. |
| Are actors improperly privileged? | Accepted unauthorized changes, cross-account/run exposure, administrative leakage, and guessed-target access. Any confirmed occurrence blocks scaling. |
| Is compute shaping behavior? | Decision latency, queue delay, timeout/error rate, context truncation, waits, and decisions completed per actor. Do not interpret a slow GPU as human hesitation. |
| Did the change help? | Reproduce the original failure; compare the same exogenous scenario settings before/after, with recorded model settings. Report divergent trajectories and small sample sizes plainly. |

Do not report “people rescued” from offer counters or model-generated closure claims. A physical outcome can only be reported as an operator-defined simulated outcome when the scenario actually models it.

Do not combine these measures into a single “crisis readiness score.” The result should show which journeys worked, what failed, under what conditions, and what remains untested.

Research comparing LLM-simulated and human users has found model-dependent evaluation differences in another application domain. That supports keeping synthetic findings and human validation distinct; it does not invalidate using this system to discover defects. [Lost in Simulation](https://arxiv.org/abs/2601.17087).

## 9. Proportional verification and completion boundary

During implementation, run syntax checks for the JavaScript files touched by that task. Extend the existing check:syntax command only to cover added production modules; do not add a new test framework.

For the integrated interface, use the existing syntax, bundle, and browser checks, plus the focused journeys in Tasks 1–3. The current hardcoded contrast script must not be presented as verification of the new palette; inspect the actual rendered foreground/background combinations for changed controls. The previous size-detail browser failure is a known baseline issue, not permission to weaken an assertion or claim all checks pass.

Use direct exercises for the exceptionally important shared-state boundaries: two sessions, unauthorized edit, duplicate retry after acknowledgment loss, stale-version write, refresh/reconnect, and restart. No broad benchmark or CI project is part of this deliverable.

The first complete milestone requires all of the following:

- [ ] A coherent mobile crisis UI with no confirmed blocker in the core help, response, update, close/reopen, source, and report journeys.
- [ ] A real shared persistent world, with observable delivery status and correct ownership.
- [ ] Independent participants using only their application observations and available actions, with no RP prompt or hidden test objective.
- [ ] Separate browser, tool, directed-review, and rule-based evidence.
- [ ] One completed model-backed run with five participants, saved observations and decisions, and a successful event replay.
- [ ] A usable A100 notebook path and measured settings; 50/100 participants remain capacity milestones until actually demonstrated.
- [ ] Research-informed UX decisions verified in the interface; every important simulation finding reproduced and fixed or rejected with a concrete reason, or an explicit record that the exercised journeys produced no new finding.
- [ ] Current changed-file checks recorded accurately; known unrelated verification issues remain visible.
- [ ] No speculative extra product features, public deployment, or paid dependency introduced.

If the AI run finds no new defect, preserve that result and report which journeys it actually exercised. Do not invent a finding to satisfy the milestone.

Implementation begins with Task 1, then proves Task 2 before expanding the swarm. The target is a usable product with an inspectable experimental loop; larger populations and more elaborate scenarios follow only when the earlier result makes them useful.

## Execution checkpoint — 2026-09-06

The shared application, SQLite command service, independent account tools, bounded model runner, rule baseline, event replay, and participant observation screen are implemented. The observation screen was added at the user's request; it shows delivered content, actual operations/results, and optional one-sentence decision notes. No private chain-of-thought is exposed.

Verified in this checkpoint: mobile unknown location/count submission; explicit invalid-count feedback; real reply display and submission; reply draft recovery after reload; two-account ownership, idempotent retry, stale versions, cross-run isolation, private reports, blocked participant access to operator assets, persistence after server restart, and event replay. A 100-account scripted run completed 300 decisions with complete decision records and matching replay. This was a rule run, not an LLM run.

Current syntax and bundle checks pass. The existing browser check passed 23 of 24 checks; its pre-existing byte-comparison visibility check still fails inside the collapsed appearance settings. The test was not modified. No A100/vLLM endpoint is available yet, so the model and browser-model milestones, measured GPU settings, independent criticism cohort, and 50/100-AI scaling gates remain pending. The notebook is prepared but has not run on a GPU. Five fresh accounts are prepared locally; no Luna participant has been started at this checkpoint.

Next user-requested experiment: scripted harmful misinformation and victim-mocking posts, scripted public requests for intervention, and one independently deciding account with removal/ban permissions. Its only inputs will be its application view and operation descriptions; no assigned moderation objective or RP prompt.
