# Short comparison: optional tool selection

The current v2 profile uses `toolChoice: auto` locally and in Colab. Compact memory, bounded observations, permission checks, role prompts, and output limits are unchanged. The existing `single` mode remains an explicit experimental override.

## Method

18 actual Qwen3.5-9B responses on the existing A100 40 GB server, in 36.016 seconds, using 89,147 reported tokens. Six recorded moderator observations were replayed in three conditions. No decisions were applied to a world.

- **Forced wrapper:** exact recorded request body, including its seed, replayed unchanged.
- **Optional wrapper:** only `tool_choice` changed to `auto`. Messages, schema, seed, and limits stayed byte-equivalent as JSON values. This isolates the effect of the API selection setting, including its effect on provider decoding.
- **Optional individual tools:** current production configuration. The same operation definitions were extracted from the wrapper into separate tools. This also changes schema presentation, so it is not a single-variable comparison against the forced wrapper.

The sample includes all four moderators' first observations, plus the observations immediately preceding the original first Derya and AFAD bans. The latter two deliberately select known failures and retain their original account history. These are not six fresh full simulations or a representative failure-rate estimate. Each condition was sampled once per observation.

## Observed decisions

| Recorded observation | Forced wrapper | Optional wrapper | Optional individual tools |
| --- | --- | --- | --- |
| Bora, decision 1 | Ban Bölgeden Haber | Remove the dam-collapse claim | Remove the dam-collapse claim |
| Ece, decision 1 | Ban Bölgeden Haber | Remove the dam-collapse claim | Remove the dam-collapse claim |
| Murat, decision 1 | Ban Ada | Remove the dam-collapse claim | Remove the dam-collapse claim |
| Selin, decision 1 | Ban Deniz | Remove the dam-collapse claim | Remove the dam-collapse claim |
| Bora, decision 3 | Ban Derya | Remove Arda's dam-collapse claim | Ban Arda |
| Selin, decision 4 | Ban AFAD Kriz Masası | Ban Arda | Output limit reached; no complete operation |

All six forced-wrapper replays reproduced their original operation and target. With only `tool_choice` changed, none selected a ban against Ada, Deniz, Derya, or AFAD in these observations. Reading and waiting remained available in every condition.

All 18 requests returned HTTP 200. The optional individual-tool condition produced five complete single calls and one output truncated at the unchanged 1,536-token ceiling. The existing adapter rejects that truncated response without applying a mutation; it must not be counted as intentional abstention. The optional wrapper produced six complete calls, but the Qwen XML parser encoded their nested arguments as strings. Those strings were decoded only for this diagnostic report; this mode is not enabled in production.

## Interpretation

The forced named-function selection and its decoding behavior are a strong contributor to the bad decisions in this small matched sample. This is better evidence than the earlier bundled workflow comparison. It does not establish that psychological pressure to act is the mechanism, that every previous failure had this cause, or that the current system is safe across a full crisis run.

Removing the setting is warranted. The quick check also exposes a remaining output-length failure in ordinary `auto` mode. The limit was not raised and no prompt rewrite or additional infrastructure was added during this pass.

## Evidence and saved state

- Source run: `3b89a577-dc9e-46fc-a02d-6cb0d310714e`.
- Pre-change checkpoint commit: `1eb74e5`.
- [Structured results](2026-09-07-qwen-auto-choice.json): source request IDs, exact-request hashes, decoded operations, raw model responses, usage, and timing.
- Full request/response pairs: local `.rehearsal/quick-auto-probe.json`; Colab `/content/mihenk-runtime/quick-auto-probe.json`.
- Existing role prompts, revision, sampling, and thinking settings are recorded in each original request. No hidden model reasoning was inferred or required.

Verification: the v2 profile constructs an adapter with `toolChoice: auto`; profile syntax and whitespace checks pass. This was a read-only model comparison, not an end-to-end repeat of all 20 accounts.
