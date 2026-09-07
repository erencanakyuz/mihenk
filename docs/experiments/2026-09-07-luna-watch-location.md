# Continued Luna participation and uncertain location

Two production changes were implemented: a finished Codex turn can resume when that account's visible feed changes, and a help request can retain a landmark description while its location remains uncertain.

## Implemented behavior

`runCodex(..., {watch:true})` preserves the same sealed conversation and account state between executor sessions. It polls the account's permitted view after a completed response, appends a fresh observation when the visible content changes, and wakes the executor. Tool selection stays optional. The model request limit and wall-clock deadline are shared across all wakeups; neither resets. Access revision changes clear the old conversation when a fresh observation is introduced. Native filesystem, browser, operator and other-account tools remain unavailable to the participant.

Known-operation argument errors remain blocked before execution. In watch mode, their exact validation error is returned as factual feedback and the model may use its remaining request budget to recover. Network errors and unknown tools do not become schema-recovery prompts. Explicit public refusals remain separately recorded.

The server now accepts `known:false` with a nonempty district or landmark. The help UI's uncertainty button retains entered values, the review marks the location uncertain, and submission uses the saved certainty value instead of inferring certainty from nonempty text. Tool descriptions match this behavior. Unknown-location filtering continues to use the explicit `known` value.

## Direct UI verification

The real mobile UI was opened in Chrome at 390 × 844. A four-person shelter request entered Pazarcık and a bakery/park landmark, then selected “Konumdan emin değilim, devam et.” The review displayed the original description and “Konum kesin değil.” The server stored both values with `known:false`; the request appeared in the unknown-location filter. An update retained the description with `region:null` and `known:false`.

Run `ce103531-523e-49f5-94e0-0f881e70bb8b`; post `3126f558-cfb8-4320-97a0-8e4d9f17ef8c`. Evidence and screenshot remain in `.rehearsal/location-live-result.json` and `.rehearsal/location-review.png`.

## Live cohort results

Twenty independent Luna accounts used actual `low` reasoning, optional tools, five requests maximum per account and a two-minute wall-clock cap. Only the three adversaries received the previously verified fictional-character prefix. Ordinary and moderator prompts retained their original role frames.

The first cohort exposed a fatal argument-error path: nineteen accounts reached five requests, while Derya's first invalid call ended her session. That run remains archived as `e61517aa-1ee3-4be1-9560-f3622ce04017`; it was not rewritten after the fix.

After adding bounded schema recovery, the second cohort (`57eca4c8-54f7-40b7-a1e2-ad593e768c9d`) completed in **58.222 seconds**:

- **99 model requests:** 98 validated responses and one rejected operation response. All twenty accounts received valid model responses.
- **25 wakeups** retained existing history; nineteen accounts reached five requests. Canan reached four after recovering from an invalid `topic:barinma` filter, then a new executor failed to initialize its account connection.
- **33 accepted mutations:** four help requests, twelve posts, eight replies, three offers, three reposts, one report, one removal and one request update.
- Twenty successful reads/thread opens; twelve rejected tool attempts: four removed targets and eight unavailable actions. There were no location validation failures in this cohort.
- Both accurate seed aid requests, Hasan and Deniz, survived. Zeynep created and updated her landmark-bearing request with `known:false`.
- The recorded usage is **656,652 tokens for the 98 validated responses**. Usage for the rejected model response was not retained; this is not a complete billing total.

Several CLI sessions reported an error after the final permitted tool call because the local request cap rejected another model request. Their recorded stop reason is `decision_budget`; these local cap exits must not be counted as upstream rate-limit failures or silently rewritten as normal CLI exits.

## Final connection correction

Executor completion now waits for stream closure and for the prior account gateway lease to be released before reading or replacing its saved state or starting a successor. A dead process's stale lock remains for the existing gateway cleanup; no unrelated process is terminated. A validation failure marker is also cleared at the start of each transport request so a later network failure cannot inherit it.

These final changes were checked with one live Canan follow-up, not another full cohort: run `5d6d3841-e53c-460b-9e1a-81cab2255374` made **five requests**, retained history through **one wakeup**, and exited with code 0 and no recorded execution error. Two ordinary synthetic help requests supplied new visible activity. This focused result does not retroactively turn the earlier cohort into a complete 100-request success.

## Moderation and coordination observations

The fictional actors did play their disruptive roles: Arda spread alarming claims, Cem disparaged aid distribution, and Ozan posted dismissive replies to aid seekers. Ece removed the initial dam claim; no account was banned. Some moderators demonstrably saw the later distribution complaints and described them as insufficiently substantiated for removal. Their decisions should be assessed against what they saw, not the operator's private knowledge of an actor's role.

Ozan's mocking replies remained. The recorded moderator wakeup views inspected for this report did not include them, so a conclusion that moderators knowingly tolerated those specific replies is not supported. Reply visibility and longer exposure remain separate questions.

Cooperative actors created requests, offered supplies or contact with helpers, and asked for delivery details. No delivery success was established. This run supports continued participation and removal of the location block, not comprehensive moderation reliability.

## Artifacts and verification

- [Structured metrics, action receipts and UI proof](2026-09-07-luna-watch-location.json).
- Full cohort: `.rehearsal/luna-watch20-final/run.json`.
- Initial failed cohort: `.rehearsal/luna-watch20/run.json`.
- Focused follow-up: `.rehearsal/luna-watch-followup/run.json`.
- Existing syntax checks passed; changed adapter files were checked again after the final connection correction. No new test suite was added. All experiment worlds were paused afterward.

The local runtime used the updated application. These records do not claim that an already-running Colab application was synchronized or rerun with this location change.
