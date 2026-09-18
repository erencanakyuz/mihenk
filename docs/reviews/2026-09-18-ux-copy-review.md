# MİHENK help-request feature: UX and Turkish copy review

**Date:** 18 September 2026. **Branch reviewed:** `feature/request-thread-page`
(tip `722c223`, which contains sections 19–21 of the implementation plan).
**Fixes applied on:** `fix/request-ux-copy` (see the end of this file).

Reviewed sources: `scripts/request-page.js`, `scripts/crisis.js`
(`cpostHTML`, `requestBlock`, `statePill`), `scripts/request-thread.js`
(`helpActions`, `M.cardActions`), `scripts/imdat.js`, `styles/request-page.css`,
against `docs/HELP_REQUEST_IMPLEMENTATION_PLAN.md` sections 5–8, 14, 18–21 and the
concept in `docs/references/help-request-concept-v1.png`.

Screenshots examined: `local-*`, `shared-*`, `card-*`, `page-local-plain-1440.png`
(1440 / 768 / 390 / 320 px; owner, moderator, outsider; request vs plain help call;
local vs shared).

Two caveats about the evidence:

- The screenshot set was captured at 21:15, `scripts/request-page.js` was last edited at
  21:16, so some captures are one revision old. Where a capture and the code disagree the
  code wins, and the difference is called out (see F7).
- Plan section 21 (announcements, offer withdrawal, filters) landed during this review.
  Findings below are against the code as it stands, not against section 20 alone.

Every Turkish string is quoted exactly as it appears in the source.

---

## A. Feed card (entry point)

### F1. The card says the same thing three times — high

**Location:** `scripts/crisis.js` → `cpostHTML` (`.cpost__body`) + `requestBlock`;
text generated in `scripts/imdat.js` (local) and `scripts/transport.js` line 57.
**Current:** body `Barınma ve ısınma, Gıda ve su ihtiyacı var. 4 kişi.`, then need chips
`Barınma ve ısınma` `Gıda ve su`, then the fact `4 kişi`. Visible in
`card-local-request-1440.png` and `card-shared-owner-390.png`.
**Problem:** the card's largest text carries no information the chips do not already
carry, and the requester's actual statement (`details`, e.g.
`Çadırda iki çocukla bekliyoruz. Battaniye ve su gerekiyor; sokağa araç girişi zor, yaya
ulaşım mümkün.`) is not shown anywhere in the feed. The reader must open the page and then
expand a disclosure to learn anything specific. On a phone this triple duplication eats
the whole card.
**Change:** for help cards prefer the statement: render `p.details` when present and fall
back to the generated sentence; clamp to 4 lines. Keep the chips as the structured layer.
**Severity:** high.

### F2. Counts use vocabulary that exists nowhere else, and are dead text — medium

**Location:** `scripts/request-thread.js` → `helpActions`.
**Current:** `p.updates+' güncelleme'`, `p.support+' topluluk mesajı'`, joined with `' · '`,
else `Henüz mesaj yok`.
**Problem:** (a) the two channels are called `Yetkililerle iletişim` and `Topluluk desteği`
on the page, but `güncelleme` / `topluluk mesajı` on the card — four names for two things;
(b) `güncelleme` counts *readable* coordination messages, so for the owner it counts their
own private messages: "2 güncelleme" for two messages the owner wrote themselves is
misleading; (c) the counts are a `<span>`, so the only visible hint that a community
conversation exists is not clickable — users will click it.
**Change:** anchor the wording to the tab names and make the numbers actionable:
`Yetkililerle iletişim: 2 · Topluluk desteği: 1`, rendered as two buttons that open the
page on the matching channel.
**Severity:** medium.

### F3. `Henüz mesaj yok` on a closed request promises a future — low

**Location:** `scripts/request-thread.js` → `helpActions`.
**Current:** `Henüz mesaj yok` regardless of `p.resolved`.
**Problem:** "not yet" on a closed request implies messages may still arrive; the request
is closed and no one can write.
**Change:** `Mesaj yok` when `p.resolved`, `Henüz mesaj yok` otherwise.
**Severity:** low.

### F4. The community entry point silently disappears — medium

**Location:** `scripts/request-thread.js` → `helpActions`
(`offer=request&&!mine&&!p.resolved&&(!M.shared||p.actions.includes('offer.create'))`).
**Current:** `card-shared-neighbor-1440.png` shows a neighbour's card with `Talebi aç`,
the counts, the like and the report action — and **no** `Destek öner`.
**Problem:** when the actor lacks `offer.create` the only path into `Topluluk desteği` is
to open the page and notice the second tab. Nothing on the card says the tab exists.
**Change:** always render an entry to the community channel for non-owners (a
`Topluluk desteği` secondary button that opens `?channel=community`), and reserve
`Destek öner` for actors who may actually create an offer. F2's clickable counts also
cover this.
**Severity:** medium.

### F5. `Destek öner` drops the user at the top of the page — medium

**Location:** `scripts/request-thread.js` → `M.openThread` →
`M.openRequestPage(id,{view:view,offer:!!offer})`; `scripts/request-page.js` →
`M.openRequestPage` (`window.scrollTo(0,0)`), `draft().kind='offer'`.
**Current:** pressing `Destek öner` opens the community tab, scrolls to the top and
preselects `Destek önerisi` in a `<select>` at the very bottom of the page.
**Problem:** the user asked to do one thing (offer support) and is given a reading view;
the state they asked for is off-screen and unannounced.
**Change:** after an `offer` entry, focus the composer textarea and scroll it into view
once the thread has loaded (`{preventScroll:false}` on `#rp-text`), and show the reply/offer
mode as visible text, not only as a selected option (see F27).
**Severity:** medium.

### F6. The whole card is clickable but only the body looks it — low

**Location:** `scripts/request-thread.js` document click handler
(`var card=e.target.closest('.cpost[data-help]')`); `styles/request-page.css`
`.cpost[data-help] .cpost__body { cursor:pointer; }`.
**Current:** clicking the author name, avatar, verification pill, location or tag opens the
request page; only `.cpost__body` shows a pointer cursor and a hover colour change.
**Problem:** inconsistent affordance in both directions — the body reads like a link but is
not one, and the rest is a hit target that looks inert.
**Change:** give the whole help card a hover surface (`.cpost[data-help]:hover`) so the
affordance matches the hit area; keep `Talebi aç` as the keyboard/AT path.
**Severity:** low.

---

## B. Request page header and overview

### F7. A plain help call has no heading at all — medium

**Location:** `scripts/request-page.js` → `statement`
(`summary?'<h2>'+esc(summary)+'</h2>':p.kind==='request'?'<h2>Yardım ihtiyacı</h2>':''`).
**Current:** for a post tagged `yardim` with no `need`, the overview renders no `<h2>`, so
the row contains only the verification chip `Beyan · Henüz doğrulanmadı`.
`page-local-plain-1440.png` still shows a large `Yardım çağrısı` heading because it was
captured one revision earlier; the committed code no longer renders it.
**Problem:** the document jumps from `h1` to the `h3` of an empty state, and the first
content row of the page is a lone yellow chip with nothing to attach to.
**Change:** for help calls render the first line of the statement as the `h2`
(truncated), or a neutral `<h2>Yardım çağrısı</h2>` — but then suppress the identical
`h1` duplication by keeping `#id` and the state chip in the sticky bar only.
**Severity:** medium.

### F8. The raw UUID fragment is the only thing next to the title — low

**Location:** `scripts/request-page.js` → `render`, `<span class="rp-id">#'+esc(p.id.slice(0,8))`.
**Current:** `#8fe50463`, `#4f42967e`, `#c3`.
**Problem:** meaningless to a requester reading it out to a volunteer on the phone; the
concept used a short human reference (`#1042`). It is also hidden on mobile
(`.rp-id { display:none }`), so it cannot be relied on for anything.
**Change:** drop it, or derive a short numeric reference and show it on all viewports.
**Severity:** low.

### F9. Absolute timestamps on the page, relative ones on the card — medium

**Location:** `scripts/request-page.js` → `date()`
(`toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})`)
vs `scripts/crisis.js` card (`p.t`, e.g. `6 dk`, `şimdi`, `güncellendi`).
**Current:** the card says `6 dk`, the page says `18 Eyl 20:48` for the same post.
**Problem:** in a crisis feed recency is the primary signal; switching formats between the
two screens forces the reader to do arithmetic, and the page format omits the year.
**Change:** use relative time under 24 h (`12 dakika önce`) with the absolute value in
`title`/`datetime`, matching the concept.
**Severity:** medium.

### F10. The h1 focus ring reads as a bordered chip — medium

**Location:** `scripts/request-page.js` → `M.openRequestPage`
(`page.node.querySelector('h1')?.focus(...)`, `<h1 tabindex="-1">`);
`styles/request-page.css` focus rules list buttons, links, summaries, inputs, selects and
textareas — not `h1`.
**Current:** every entry capture (`local-1440-collapsed.png`, `local-320-collapsed.png`,
`shared-owner-390-*.png`) shows a white rounded box around `Yardım talebi`.
**Problem:** moving focus to the title is correct; inheriting the UA ring is not — it is
white while every other ring on the page is `var(--c-accent)`, and it looks like a
disabled button.
**Change:** add `.request-page h1:focus-visible { outline:2px solid var(--c-accent);
outline-offset:4px; }` and `.request-page h1:focus:not(:focus-visible){ outline:none; }`.
**Severity:** medium.

### F11. `Kişi sayısı bilinmiyor` contradicts the approved string and the wizard — low

**Location:** `scripts/request-page.js` → `statement`; `scripts/crisis.js` → `requestBlock`;
`scripts/imdat.js` → review row.
**Current:** page and card say `Kişi sayısı bilinmiyor`; the plan's approved copy (section
18) is `Kişi sayısı henüz bilinmiyor`; the wizard review row says `Henüz bilinmiyor`.
**Change:** use `Kişi sayısı henüz bilinmiyor` in all three places.
**Severity:** low.

### F12. `Konum kesin değil` is the only fact with no icon — low

**Location:** `scripts/request-page.js` → `statement` (`'<span>Konum kesin değil</span>'`)
vs `scripts/crisis.js` → `requestBlock`, which prefixes `icon('questionc','ic--sm')`.
**Change:** use the same `questionc` glyph on the page.
**Severity:** low.

---

## C. Statement disclosure and private fields

### F13. The collapsed statement shows no statement — high

**Location:** `scripts/request-page.js` → `statement` → `detail('statement', …)`;
`styles/request-page.css` `.rp-statement summary`.
**Current:** the collapsed summary is `Talep sahibinin beyanı` plus
`Deniz K. · 18 Eyl 20:48`. Plan section 5 (mobile) asks for a statement summary of "one or
two lines".
**Problem:** in the default state of every capture — `local-1440-collapsed.png`,
`local-320-collapsed.png`, `shared-outsider-768.png` — the page shows a need summary, a
people count, a location and *zero words from the person asking for help*. An outsider who
arrives from a link sees a collapsed box and one public update. The card does not show the
statement either (F1), so the statement is two clicks from the feed.
**Change:** put a 2-line clamped preview of `p.details||p.text` inside the summary, hidden
when the disclosure is open. Cheap, keeps the collapsed layout, and removes the "expand to
find out whether there is anything here" gamble.
**Severity:** high.

### F14. Expanding can yield nothing new — medium

**Location:** `scripts/request-page.js` → `statement` (`esc(p.details||p.text)`).
**Current:** when the requester writes no statement, `details` is empty and the body falls
back to the generated `p.text`, e.g. `Barınma ve ısınma, Gıda ve su ihtiyacı var. 4 kişi.`
— a verbatim repeat of the `h2` and the people fact directly above it.
**Change:** when `details` is empty, either omit the disclosure for viewers with no private
fields, or label it honestly: summary `Beyan eklenmedi`, body
`Talep sahibi ek bir açıklama yazmadı.`
**Severity:** medium.

### F15. Three names for one thing: the private-information disclosure — medium

**Location:** `scripts/request-page.js` → `fields` (`İletişim bilgileri ve görünürlük`);
`scripts/imdat.js` step 1 (`Adres, telefon ve görünürlük (isteğe bağlı)`); plan section 18
approved copy (`Özel bilgiler ve görünürlük`).
**Change:** use `Özel bilgiler ve görünürlük` in both places, or change the approved copy —
but not three variants.
**Severity:** medium.

### F16. The lock icon and the privacy promise are unconditional — high

**Location:** `scripts/request-page.js` → `fields`.
**Current:** the summary always renders `glyph('lock')`, and the hint always reads
`Görünürlüğü değiştirmek için beyanınızı düzenleyin. Özel bilgileri yalnızca siz ve yetkili
moderatörler görebilir.`
**Problem:** both are false when a field is public. A legacy request defaults to
`privacy:{address:'public'}` (`scripts/imdat.js` edit branch, matching plan section 15), so
the owner can be told "only you and authorised moderators can see this" on the same screen
where the row below it says `Herkese açık`. That is the one sentence in this feature that
must never be wrong.
**Change:** pick the icon from the actual state (`lock` only if some field is private,
else `globe`); split the hint —
`Özel işaretli bilgileri yalnızca siz ve yetkili moderatörler görebilir.` shown only when
something is private, plus
`Herkese açık işaretlediğiniz bilgiler talebi görebilen herkese görünür.` when something is
public.
**Severity:** high.

### F17. "Edit your statement to change visibility" points at the wrong object — medium

**Location:** `scripts/request-page.js` → `fields` hint, and the button
`Beyanı ve bilgileri düzenle`.
**Current:** `Görünürlüğü değiştirmek için beyanınızı düzenleyin.`
**Problem:** visibility is not part of the `beyan`; the user is told to edit the wrong
thing. The button then lands on `Konumunuz` (step index 1), not on the statement field,
which is on the next step — so the label and the destination disagree twice.
**Change:** hint → `Görünürlüğü değiştirmek için talep bilgilerini düzenleyin.`; button →
`Talep bilgilerini düzenle`.
**Severity:** medium.

### F18. Private fields give no hint of what is inside — medium

**Location:** `scripts/request-page.js` → `fields`.
**Current:** a moderator sees a collapsed row inside a collapsed row; the address and phone
— the two facts a volunteer actually needs — are two disclosures deep with no indication
that they exist at all.
**Change:** add the field names to the summary, e.g. `Özel bilgiler ve görünürlük · Adres,
telefon`, so a moderator can decide whether to open it.
**Severity:** medium.

### F19. `Adres tarifi` / `Ayrıntılı adres tarifi` / `Açık adres` — low

**Location:** `scripts/request-page.js` → `fields` (`Adres tarifi`); `scripts/imdat.js`
(`Ayrıntılı adres tarifi`); concept image (`Açık adres`).
**Change:** one term. `Ayrıntılı adres` reads best next to the public
`Herkese açık yer tarifi`.
**Severity:** low.

---

## D. Management controls (owner / moderator)

### F20. Irreversible-looking actions fire on a single click, while withdrawing an offer asks — high

**Location:** `scripts/request-page.js` → `handleClick`, `if(button.dataset.manage)`;
compare the `data-withdraw-offer` branch right above it, which opens
`Destek önerisi geri çekilsin mi?` in a modal, and `scripts/request-thread.js`, where
`post.remove` and `account.ban` both confirm.
**Current:** `Mesajları durdur`, `Herkese kapat` and `Talebi kapat` send immediately.
**Problem:** the least reversible actions in the feature (stopping a community channel,
hiding a live request from every outsider, closing it) have less friction than withdrawing
one's own support offer. `Herkese kapat` and `Talebi kapat` also sit 80 px apart with
similar labels (F21) — one mis-click removes a live request from every outsider's feed.
**Change:** reuse the existing modal pattern for all three, with the consequence spelled
out, e.g. `Talep herkese kapatılsın mı?` /
`Talep akışta, aramada ve bağlantılarda görünmez. Talep sahibi ve yetkili moderatörler
erişmeye devam eder.` / confirm `Herkese kapat`.
**Severity:** high.

### F21. Management labels drift from the approved copy and collide with each other — high

**Location:** `scripts/request-page.js` → `management`.
**Current:** `Mesajları durdur` / `Mesajları aç`, `Herkese kapat` / `Herkese aç`,
`Talebi kapat`; the plan (section 9) specifies `Topluluk mesajlarını durdur`,
`Talebi herkese kapat` and `Talebi kapat`.
**Problem:** the shortened labels only make sense while reading the heading above them
(`shared-moderator-1440-management.png`). `Herkese kapat` and `Talebi kapat` are adjacent,
visually identical `rp-button`s and both read as "close"; one pauses outsider access, the
other ends the request.
**Change:** use the approved strings. They are longer, but `.rp-manage-body>div` is a
space-between row with room, and they wrap on mobile.
**Severity:** high.

### F22. `Kamusal erişim` is the wrong register — medium

**Location:** `scripts/request-page.js` → `management`.
**Current:** `Kamusal erişim` with the description
`Kapattığınızda yalnızca talep sahibi ve yetkili moderatörler erişir.`
**Problem:** `kamusal` is legal/academic Turkish and appears nowhere else in the product;
the rest of the UI consistently says `Herkese açık`.
**Change:** `Herkese açık erişim`.
**Severity:** medium.

### F23. The close reason defaults to `Diğer` — medium

**Location:** `scripts/request-page.js` → `management`
(`<option value="other" selected>Diğer</option>`).
**Current:** the default choice is the one that carries no information; closing with the
default produces the header chip `Talep kapalı` with no reason.
**Problem:** the safe-by-default reasoning (plan section 9: do not claim
`İhtiyaç karşılandı` without evidence) is right, but pre-selecting `Diğer` means the common
case — help arrived — is usually recorded as "other" because the control is a dropdown the
user does not need to touch.
**Change:** make the reason an explicit choice: first option
`<option value="" selected>Kapatma nedenini seçin</option>`, block the send with an inline
message when it is empty.
**Severity:** medium.

### F24. The owner's two most important actions are now invisible — high

**Location:** `scripts/request-page.js` → `management` +
`styles/request-page.css` `.rp-management>summary { justify-content:flex-end; padding:6px 0;
font-size:12px; color:var(--c-text-2); }`; plan section 20 removed the card buttons
`İhtiyacım karşılandı` and `Talebi güncelle`.
**Current:** for the owner the whole lifecycle lives behind a right-aligned, 12 px,
secondary-coloured `Talep işlemleri` summary (`local-1440-collapsed.png`,
`shared-owner-390-expanded.png`), and editing lives inside the statement disclosure.
**Problem:** the card buttons were deliberately removed, but nothing took their place: a
requester who wants to say "we are fine now" must recognise a 12 px grey label as a control,
open it, read a dropdown and press a button. This is the most important state change in the
product and it now has the lowest affordance on the page.
**Change:** keep destructive/rare controls in the disclosure, but give the owner one
persistent action in the overview: `İhtiyacım karşılandı` (primary, opens the confirm
modal from F20, sends `reason: 'resolved'`) and, secondarily, `Talep bilgilerini düzenle`.
Style the `Talep işlemleri` summary as a visible control rather than a footnote.
**Severity:** high.

### F25. `Talep işlemleri` sits between the statement and the tabs, expanded — medium

**Location:** `scripts/request-page.js` → `statement` (management is appended inside
`.rp-overview`), expansion persisted in `page.expanded`.
**Current:** once opened, the close-reason dropdown and `Talebi kapat` stay between the
statement and the conversation on every render and on every tab switch
(`local-1440-community.png`, `local-390-composer.png`).
**Problem:** plan section 9 explicitly asks for these controls to stay out of the way. A
destructive control permanently parked above the thread is the opposite.
**Change:** do not persist `management` expansion across renders (drop it from the
preserved sections, or collapse it after a successful action).
**Severity:** medium.

---

## E. Coordination tab (`Yetkililerle iletişim`)

### F26. The tab label promises outsiders something they cannot do — medium

**Location:** `scripts/request-page.js` → `labels`.
**Current:** every viewer sees the tab `Yetkililerle iletişim`. For an outsider the panel
is a read-only list of public updates (`shared-outsider-768.png`) and the note below it
says `Herkese açık güncellemeler. Destek için Topluluk desteği sekmesini kullanın.`
**Problem:** "communication with the authorities" is exactly what an outsider cannot have
here; the label invites a tap that ends in a read-only notice.
**Change:** keep the approved label for the owner and moderators; for viewers without
coordination access label the tab `Resmî güncellemeler` (the panel content is already
different, so the label should be too).
**Severity:** medium.

### F27. `Talep sahibi` / `talep sahibi` on a page titled `Yardım çağrısı` — medium

**Location:** `scripts/request-page.js` → `messageHTML`
(`role=m.authorId===p.authorId?'Talep sahibi':…`), `composer` read-only
(`Buraya talep sahibi ve yetkili moderatörler yazabilir.`), `statement`
(`Talep sahibinin beyanı`), `unavailable` (`<h1>Yardım talebi</h1>`,
`Bu talep şu anda görüntülenemiyor.`, `Bu talep kaldırıldı.`,
`Talep yüklenemedi. Bağlantınızı kontrol edin.`, `Talep yükleniyor…`), section
`aria-label="Talep özeti"` and `aria-label="Yardım talebi"`.
**Current:** plan section 20 introduced a second object type whose title is
`Yardım çağrısı`, but every string inside the page still says `talep`.
`page-local-plain-1440.png` shows `Yardım çağrısı` in the header and
`Talep sahibinin beyanı` plus `Buraya talep sahibi ve yetkili moderatörler yazabilir.`
below it.
**Problem:** the feature now has two objects and one vocabulary; readers cannot tell
whether "talep" is a synonym or a different thing they are missing.
**Change:** derive the noun from `p.kind`: `Talep sahibinin beyanı` / `Çağrı metni`,
`Talep sahibi` / `Çağrıyı paylaşan`,
`Buraya çağrıyı paylaşan kişi ve yetkili moderatörler yazabilir.`, and kind-aware
`aria-label`s and error strings.
**Severity:** medium.

### F28. `Henüz moderatör yanıtı yok` is addressed to the wrong reader half the time — medium

**Location:** `scripts/request-page.js` → `messagesHTML`.
**Current:** `canReadPrivate` → `Henüz moderatör yanıtı yok`, with the body
`Eklemek istediğiniz bilgiyi aşağıdan paylaşabilirsiniz.` when the viewer may write.
**Problem:** `canReadPrivate` is true for both the requester *and* the moderator. Shown to
a moderator, "no moderator reply yet" is a complaint about the reader; it also reads as a
status report about an assignment that, per plan section 4, does not exist.
**Change:** branch on the role. Owner: `Henüz moderatör yanıtı yok` +
`Eklemek istediğiniz bilgiyi aşağıdan paylaşabilirsiniz.`; moderator:
`Henüz mesaj yok` + `Talep sahibine ilk güncellemeyi yazabilirsiniz.`
**Severity:** medium.

### F29. The outsider empty state invites the reader into a channel that may be closed — medium

**Location:** `scripts/request-page.js` → `messagesHTML`, non-writing branch.
**Current:** `Henüz herkese açık bir güncelleme yok` +
`Topluluk desteği sekmesinden bilgi veya destek paylaşabilirsiniz.` — emitted whenever the
viewer cannot write in coordination, without checking `canWriteCommunity`.
**Problem:** with the community paused (`communityOpen:false`), the request closed, or a
write-banned account, the page invites the reader to do something the next screen refuses.
`page-local-plain-1440.png` shows this invitation on a help call.
**Change:** only invite when `capabilities.canWriteCommunity` is true; otherwise
`Yeni bir güncelleme paylaşıldığında burada görünür.`
**Severity:** medium.

### F30. The channel note is a sentence fragment, and the read-only note repeats it — low

**Location:** `scripts/request-page.js` → `render` (`.rp-channel-note`) and `composer`.
**Current:** `Talep sahibi ve yetkili moderatörler arasında iletişim` (no verb, no full
stop) at the top; for an outsider `Herkese açık güncellemeler. Destek için Topluluk desteği
sekmesini kullanın.` at the top and `Buraya talep sahibi ve yetkili moderatörler yazabilir.`
at the bottom — the same fact twice, 400 px apart (`shared-outsider-768.png`).
**Change:** note → `Bu sekmede talep sahibi ve yetkili moderatörler yazışır.`; drop the
read-only line for outsiders whose channel note already explains the restriction.
**Severity:** low.

---

## F. Community tab (`Topluluk desteği`)

### F31. `Henüz destek önerisi yok` mislabels the channel — medium

**Location:** `scripts/request-page.js` → `messagesHTML`.
**Current:** empty community shows `Henüz destek önerisi yok` while the composer right
below it is labelled `Bilgi veya destek öneriniz` and accepts both kinds
(`<option value="reply">Bilgi / yanıt</option>`).
**Problem:** the empty state declares the channel to be offers-only, contradicting the
composer, the channel note (`Yapabileceğiniz desteği ve güncel bilgileri paylaşın.`) and
plan section 7, which asks for information *and* offers.
**Change:** `Henüz topluluk mesajı yok`.
**Severity:** medium.

### F32. The community empty state speaks to helpers, including when the owner is reading — medium

**Location:** `scripts/request-page.js` → `messagesHTML`, community branch.
**Current:** `Yapabileceğiniz desteği veya güncel bilgiyi paylaşın.` for everyone.
**Problem:** the requester deliberately visiting their own community tab (plan section 7)
is told to offer support for their own request.
**Change:** owner → `Buraya gelen bilgi ve destek önerilerini burada göreceksiniz.`;
writer → keep; non-writer → `Şu anda bu sekmeye yazamıyorsunuz.`
**Severity:** medium.

### F33. Four near-identical sentences stack in one screen — medium

**Location:** `scripts/request-page.js` → `render` (`.rp-channel-note`), `messagesHTML`
(empty body), `composer` (`<label>`, `placeholder`, `.rp-compose-hint`).
**Current, in reading order:** `Yapabileceğiniz desteği ve güncel bilgileri paylaşın.` →
`Yapabileceğiniz desteği veya güncel bilgiyi paylaşın.` → `Bilgi veya destek öneriniz` →
`Paylaşabileceğiniz bilgiyi veya desteği yazın…` → `Destek önerisi, yardımın ulaştığı
anlamına gelmez.`
**Problem:** the first two differ only in `ve`/`veya` and singular/plural. Visible in
`local-320-composer.png`, where they occupy most of the viewport.
**Change:** keep the channel note as the framing, drop the near-duplicate from the empty
state body (it is covered by F32), keep the placeholder, keep the offer caveat.
**Severity:** medium.

### F34. Every community message carries a `Herkese açık` badge — medium

**Location:** `scripts/request-page.js` → `messageHTML` (`.rp-audience`).
**Current:** in a channel that is public by definition, and whose composer states
`Herkese açık` as a fixed label, every message repeats the globe plus `Herkese açık`
(`shared-outsider-768-community.png`).
**Problem:** noise that dilutes the badge exactly where it matters — the coordination
channel, where `Özel` vs `Herkese açık` is a real distinction.
**Change:** render `.rp-audience` only in coordination.
**Severity:** medium.

### F35. `Destek önerisi` vs `Bilgi / yanıt` is the only feature explained nowhere — medium

**Location:** `scripts/request-page.js` → `composer` (`.rp-kind` select, label
`<span class="sr-only">Mesaj türü</span>`).
**Current:** a sighted user sees an unlabelled dropdown containing `Bilgi / yanıt` and
`Destek önerisi`; nothing says what changes when you pick the second (it becomes a
withdrawable offer, counted separately).
**Problem:** plan section 7 requires that "an ordinary comment must not accidentally create
another offer"; the current UI makes the distinction invisible instead.
**Change:** replace the bare select with a visible label (`Mesaj türü`) and a one-line hint
for the offer state: `Destek önerileri ayrı listelenir ve geri çekilebilir.` Also drop the
slash: `Bilgi veya yanıt`.
**Severity:** medium.

---

## G. Composer

### F36. Two different labels for the same retry — low

**Location:** `scripts/request-page.js` → `composer` (`d.pending?'Yeniden dene':'Gönder'`)
vs `send` error path (`button.textContent=d.pending?'Gönderimi yeniden dene':'Gönder'`).
**Current:** after a failed send the button says `Gönderimi yeniden dene`; after a reload
with the same pending command it says `Yeniden dene`. The approved copy (section 18) is
`Gönderimi yeniden dene`.
**Change:** use `Gönderimi yeniden dene` in both.
**Severity:** low.

### F37. A disabled dropdown carries the private-reply rule — medium

**Location:** `scripts/request-page.js` → `composer`
(`<select name="visibility" … disabled>`); `styles/request-page.css` has no
`select:disabled` rule.
**Current:** replying to a private message disables the visibility select but leaves it
looking identical to an enabled one (`local-1440-reply.png`); the rule is explained only in
11 px text at the bottom: `Özel bir mesaja verdiğiniz yanıt da özel kalır.`
**Problem:** users will click a control that looks live; a disabled control with no visual
state is also an accessibility failure (no affordance difference beyond the DOM attribute).
**Change:** when the parent is private, render static text instead of a control:
`<span class="rp-public-note">` + lock + `Özel · Yanıt özel kalır`, and keep the hint.
**Severity:** medium.

### F38. The composer hint answers a question nobody asked — low

**Location:** `scripts/request-page.js` → `composer` (`.rp-compose-hint`).
**Current:** coordination default hint
`Göndermeden önce mesajın tamamı için görünürlüğü seçin.`
**Problem:** it describes the mechanics of the control next to it rather than the
consequence. The useful fact is who will read the message.
**Change:** `Özel mesajları yalnızca talep sahibi ve yetkili moderatörler görür. Herkese
açık seçtiğinizde mesaj talebi görebilen herkese görünür.`
**Severity:** low.

### F39. Blocking the reply target while a send is pending explains nothing — low

**Location:** `scripts/request-page.js` → `handleClick`, reply/cancel branch.
**Current:** `M.toast('Önce bekleyen mesajın gönderimini tamamlayın.')`
**Problem:** the user pressed `Yanıtla`; they are told to finish something they may not see
(the pending state is a button label further down the page), with no way to abandon it.
**Change:** `Bekleyen mesaj gönderilmeden yanıt hedefi değiştirilemez. Aşağıdan
gönderimi yeniden deneyin.`
**Severity:** low.

---

## H. Empty, error, loading and read-only states

### F40. The loading screen is the error screen — medium

**Location:** `scripts/request-page.js` → `M.openRequestPage`
(`unavailable('Talep yükleniyor…')`) and `unavailable`.
**Current:** while loading, the page shows a padlock glyph, `Talep yükleniyor…` as an `h2`
and a `Yeniden dene` button.
**Problem:** a padlock reads as "no access", and a retry button offered before the first
attempt has finished invites a pointless click. It is also the first thing every visitor
from a link sees.
**Change:** a dedicated loading render: no lock, no button, `Talep yükleniyor…` as status
text with `role="status"`.
**Severity:** medium.

### F41. A failed refresh reveals a button that says `Yeni mesajlar` — high

**Location:** `scripts/request-page.js` → `load` catch branch (`.rp-connection` +
`refresh.hidden=false`), `send` conflict branch, and `render`
(`<button class="rp-updates" data-refresh-request hidden>Yeni mesajlar · Güncelle</button>`).
**Current:** one button with one label serves three causes: new messages arrived, the load
failed (`Bağlantı kurulamadı. Son bilgiler ve taslağınız korundu.`) and a version conflict
on send.
**Problem:** after a network failure the page claims there are new messages. After a
conflict it claims the same. That is a factual error in the most fragile state of the
feature, and it teaches users to distrust the badge. The label is also redundant —
`· Güncelle` restates the button.
**Change:** set the label from the cause: `Yeni mesajlar` (SSE), `Yeniden yükle`
(connection failure), `Talep güncellendi · Yeniden yükle` (conflict).
**Severity:** high.

### F42. Closed + paused + restricted are three states with one line of room — medium

**Location:** `scripts/request-page.js` → `composer` read-only chain and `render`
(`.rp-notice`).
**Current:** the read-only chain is ordered `status==='closed'` → community paused →
coordination → fallback, so a closed request never shows why the community is paused, and
`Talep kapalı. Yeni mesaj yazılamaz.` appears only at the bottom of the thread, while the
closure reason appears only in the sticky header chip
(`Talep kapalı · İhtiyaç karşılandı`).
**Problem:** plan section 5 requires closure notices not to be hidden; a reader who lands
mid-thread sees neither. The header chip abbreviates differently from the select
(` · Mükerrer` vs `Mükerrer talep`, ` · Geri çekildi` vs `Talep geri çekildi`).
**Change:** render a single `.rp-notice` above the tabs for closure, pause and restriction
(they can stack), carrying actor-free reason text; align the reason wording with the select.
**Severity:** medium.

### F43. Management actions succeed silently — low

**Location:** `scripts/request-page.js` → `handleClick` manage branch (`if(result.ok)await
load(false)`).
**Current:** no toast, no status message; the only feedback is a re-render. Compare the
offer-withdraw branch, which now toasts `Destek önerisi geri çekildi.`
**Change:** toast the outcome: `Talep kapatıldı.`, `Talep yeniden açıldı.`,
`Topluluk mesajları durduruldu.`, `Talep herkese kapatıldı.`
**Severity:** low.

---

## I. Wizard (`scripts/imdat.js`)

### F44. Formal and informal address mixed inside single steps — high

**Location:** `scripts/imdat.js` → `stepHTML` (steps 1, 2, 3, 4) and `CHAIN`.
**Current:** `Konumunuz` + `Mahalle, sokak veya yakınındaki belirgin bir yeri yaz.`;
`Kaç kişisiniz?` + `Biliyorsan toplam sayıyı yaz. Daha sonra güncelleyebilirsin.`;
`Çağrınızı gözden geçirin` + `İhtiyacını ve adres tarifini son kez kontrol et.`;
`Talebiniz paylaşıldı` + `Tekrar paylaşmana gerek yok. Durumunu Taleplerim’den takip
edebilirsin.` — while the page, the review rows and the error messages
(`Devam etmek için bir ihtiyaç seçin.`) are consistently formal.
**Problem:** heading and hint disagree in the same visual block, four times. In an
emergency form this reads as machine-generated text and undermines trust.
**Change:** convert every hint to the formal register used by the headings and the rest of
the product.
**Severity:** high.

### F45. The public-location hint tells people to publish their street — high

**Location:** `scripts/imdat.js` → `stepHTML(1)`.
**Current:** hint `Mahalle, sokak veya yakınındaki belirgin bir yeri yaz.` directly above
the field `Herkese açık yer tarifi`, with `Ayrıntılı adres tarifi` hidden inside the
collapsed `Adres, telefon ve görünürlük (isteğe bağlı)` disclosure below.
**Problem:** plan section 6 requires the public landmark to stay separate from the detailed
address. The hint instructs the opposite, in the one field that is public by design, and
the private alternative is collapsed out of sight.
**Change:** `Mahalle veya yakınındaki belirgin bir yeri yazın. Sokak ve bina bilgisini
aşağıdaki özel alana ekleyin.`
**Severity:** high.

### F46. The review screen omits the public location and can claim there is none — high

**Location:** `scripts/imdat.js` → `afterRender`, step 3 review rows.
**Current:** `row('Konum', (st.region ? st.region + ' · ' : '') + (st.addr || (st.region ?
'' : 'Konum belirtilmedi')) …)`. `st.publicLocationText` is never shown.
**Problem:** two failures on the screen whose entire job is "check what you are about to
publish": (a) the row labelled `Konum` shows the *private* `Ayrıntılı adres tarifi`, so the
requester reviews private text as if it were the public location; (b) a requester who fills
only `Herkese açık yer tarifi` (which passes validation) sees `Konum belirtilmedi`, i.e.
the review denies the existence of the value they just typed.
**Change:** separate rows — `İlçe`, `Herkese açık yer tarifi`, `Ayrıntılı adres (özel)` —
and mark each with its audience.
**Severity:** high.

### F47. Filling only the public location flags the request as uncertain — medium

**Location:** `scripts/imdat.js` → `afterRender` step 1; `st.locationKnown` is only set by
`#addr` input and `#request-region` change.
**Current:** typing `Çınar Parkı kuzey girişi` into `Herkese açık yer tarifi` leaves
`locationKnown:false`, so the card and the page both display `Konum kesin değil`.
**Problem:** the most precise public information the requester can give is recorded as
uncertainty, and plan section 18 reserves `Konum kesin değil` for genuine uncertainty.
**Change:** include `publicLocationText` in the `locationKnown` computation.
**Severity:** medium.

### F48. `Çağrınızı gözden geçirin` now names a different object — medium

**Location:** `scripts/imdat.js` → `stepHTML(3)`.
**Current:** the review step calls the thing being created a `çağrı`, while the rest of the
wizard, the success screen and the page call it a `talep`; `Yardım çağrısı` is now the page
title of a *different* object (plan section 20).
**Change:** `Talebinizi gözden geçirin`.
**Severity:** medium.

### F49. The wizard's close button is called `Talebi kapat` — high

**Location:** `scripts/imdat.js` → `M.openImdat`
(`<button type="button" data-flow="close" aria-label="Talebi kapat">`).
**Current:** the dialog's dismiss control carries the exact string used on the request page
for ending a request.
**Problem:** for a screen-reader user the only announced label on that button is "close the
request". Two irreconcilable meanings for one string, one of which is destructive.
**Change:** `aria-label="Formu kapat"`.
**Severity:** high.

### F50. The success screen repeats its own heading and lies on edits — medium

**Location:** `scripts/imdat.js` → `stepHTML(4)` + `CHAIN[0]`.
**Current:** heading `Talebiniz paylaşıldı` and chain item 0 `Talebiniz paylaşıldı` are
identical, 40 px apart; after an edit (`Değişiklikleri kaydet`) the same screen still says
`Talebiniz paylaşıldı`.
**Change:** kind-aware heading (`Talebiniz paylaşıldı` / `Talebiniz güncellendi`) and a
distinct first chain item, e.g. `Kriz Var akışında görünüyor`.
**Severity:** medium.

### F51. `Taleplerime git` opens a single request — medium

**Location:** `scripts/imdat.js` → `footHTML(4)` and the `requests` click branch
(`if(st.savedId){M.closeModal();M.openRequestPage(st.savedId);return;}`).
**Current:** the button says "go to my requests" (plural list) and the hint says
`Durumunu Taleplerim’den takip edebilirsin`, but the action opens the new request's page.
**Change:** `Talebimi aç` when `savedId` exists, keeping `Taleplerime git` for the fallback
path that filters the feed.
**Severity:** medium.

### F52. The statement is a footnote under "how many people are you?" — medium

**Location:** `scripts/imdat.js` → `stepHTML(2)`.
**Current:** step 2 asks `Kaç kişisiniz?`, renders the stepper, then the field
`Beyanınız (herkese açık, isteğe bağlı)`, then the hint `Biliyorsan toplam sayıyı yaz.
Daha sonra güncelleyebilirsin.` — which belongs to the stepper but sits under the textarea.
**Problem:** the free text that becomes the headline content of the request page (F13) is a
secondary field on a screen about counting people, and the hint next to it is about
something else. Plan section 5 promises one question per screen.
**Change:** at minimum move the stepper hint above the statement field; better, give the
statement its own step (note: `scripts/demo.js` drives the wizard with four
`[data-flow="next"]` clicks, so a fifth step needs the demo updated).
**Severity:** medium.

### F53. `Görünürlük` means two different things on the review screen — low

**Location:** `scripts/imdat.js` → `afterRender` step 3.
**Current:** rows `Adres görünürlüğü`, `Telefon görünürlüğü` (privacy) and `Görünürlük`
with the value `Kriz Var akışı · Doğrulanmamış olarak başlar` (feed placement).
**Change:** rename the last row `Akışta`.
**Severity:** low.

### F54. `İhtiyaç özeti kullanılacak` is not a sentence the reader can act on — low

**Location:** `scripts/imdat.js` → `afterRender` step 3, `row('Beyan', …)`.
**Change:** `Yazmadınız · Yalnızca ihtiyaç başlıkları görünecek`.
**Severity:** low.

### F55. `Tatbikat` vs `Yerel prototip` for the same disclaimer — low

**Location:** `scripts/imdat.js` (`Tatbikat · Gerçek yardım iletilmez`) vs
`scripts/request-page.js` → `render`
(`<footer class="rp-local">Yerel prototip · Gerçek yardım iletilmez.</footer>`).
**Current:** `Tatbikat` is the house term (`scripts/app.js`, `scripts/crisis.js`,
`scripts/simulation.js`); the new page invents `Yerel prototip`.
**Change:** `Tatbikat · Gerçek yardım iletilmez.` on the page footer too.
**Severity:** low.

### F56. The creation dialog is titled like the object it creates — low

**Location:** `scripts/imdat.js` → `M.openImdat`, shared-mode header `Yardım talebi`.
**Change:** `Yardım talebi oluştur`, or `Talebi düzenle` when `st.editId` is set.
**Severity:** low.

---

## J. Accessibility and mobile

### F57. Switching tabs by click drops focus to `<body>` — high

**Location:** `scripts/request-page.js` → `handleClick`
(`switchChannel(button.dataset.requestChannel,false)`) → `switchChannel` → `load` →
`render` (`page.node.innerHTML=…`).
**Current:** arrow-key navigation passes `focus=true` and restores focus; clicking or
pressing Enter/Space on a tab passes `false`, and the whole page is re-rendered, destroying
the button that had focus.
**Problem:** a keyboard user who activates the second tab loses their position entirely and
must tab in from the top of the document; a screen reader announces nothing about the new
panel.
**Change:** pass `true` from the click handler (the same `preventScroll` refocus already
exists), or re-render only the panel.
**Severity:** high.

### F58. Any background refresh destroys focus, caret and selection — high

**Location:** `scripts/request-page.js` → `load` → `render`, triggered by
`visibilitychange`, `[data-refresh-request]`, SSE (`M.requestChanged`) and every management
action.
**Current:** `render()` rewrites `page.node.innerHTML`. `capture()` saves the draft text,
but nothing saves focus, caret position or selection.
**Problem:** plan section 10 requires that "updates must not steal focus, collapse
sections, reset drafts, or interrupt text selection". Returning to the browser tab while
typing a message re-renders the page: the textarea is rebuilt, focus is lost and the caret
jumps to the end. Copying an address while an SSE event lands clears the selection.
**Change:** record `document.activeElement.id` plus `selectionStart/End` before render and
restore them after; skip the re-render entirely when nothing relevant changed (the
`[data-refresh-request]` button already exists for that purpose).
**Severity:** high.

### F59. The unread dot is invisible to assistive technology — medium

**Location:** `scripts/request-page.js` → `render` and `M.requestChanged`
(`<span class="rp-new-dot" aria-label="Yeni mesaj"></span>`).
**Problem:** `aria-label` on a `<span>` with no role is ignored by most screen readers, so
the only "new messages" signal on the other tab is a 7 px colour dot — colour alone, which
plan section 10 rules out.
**Change:** `role="img"` on the dot, or a `.sr-only` text node inside the tab button.
**Severity:** medium.

### F60. Reply actions and the mobile back button are below the 44 px target — medium

**Location:** `styles/request-page.css` `.rp-message-actions>button { min-height:36px; }`
and, at `max-width:700px`, `.rp-back { width:32px; }`; `.rp-parent` is a 12 px inline link
with no padding.
**Current:** `Yanıtla`, `Önerimi geri çek` are 36 px tall; the back control is 32 px wide;
`Deadlock Greed kişisine yanıt` is a bare 12 px link.
**Problem:** plan section 10 sets a 44 px minimum. These are the primary per-message
actions on a phone (`local-320-collapsed.png`).
**Change:** 44 px minimum for `.rp-message-actions>button` and `.rp-back` on small
viewports; give `.rp-parent` vertical padding.
**Severity:** medium.

### F61. The empty-state icon is not centred — low

**Location:** `styles/request-page.css` `.rp-empty { text-align:center }` +
`.rp-empty>.ic`, against `styles/base.css` `.ic { display:block }`.
**Current:** in `page-local-plain-1440.png` the glyph sits at the left edge of the centred
block while the heading and paragraph are centred.
**Change:** `.rp-empty>.ic { margin:0 auto 14px; }`.
**Severity:** low.

### F62. Heading levels are inconsistent between the two empty surfaces — low

**Location:** `scripts/request-page.js` → `messagesHTML` (`<h3>`) vs `unavailable`
(`<h2>` inside a `div`, under an `<h1>Yardım talebi</h1>`).
**Change:** one level per surface; keep the conversation's empty state at `h3` and give the
unavailable screen an `h2` that names the state, not the error sentence.
**Severity:** low.

### F63. `Beyanın alındı` is the only informal string on the card — low

**Location:** `scripts/crisis.js` → `cpostHTML` (`Ben de gördüm` / `Beyanın alındı`).
**Current:** pre-existing, but it now sits inside the redesigned help card next to formal
copy.
**Change:** `Beyanınız alındı`.
**Severity:** low.

---

## The ten fixes worth doing first

1. **F20 + F21** — confirm `Topluluk mesajlarını durdur`, `Talebi herkese kapat` and
   `Talebi kapat` before sending, and restore the approved, non-colliding labels. Two
   adjacent one-click buttons that both read "close" is the only place in this feature
   where a mis-click is not recoverable by the person who made it.
2. **F16** — stop the privacy hint and the padlock from claiming "only you and authorised
   moderators can see this" when a field is `Herkese açık`.
3. **F46 + F45** — make the review screen show the public landmark and the private address
   as separate, labelled rows, and stop the location hint from asking for a street in the
   public field. This is the last screen before publication.
4. **F13** — put two lines of the statement in the collapsed summary, so the page and the
   feed stop hiding the only text the requester actually wrote.
5. **F24** — give the owner a visible `İhtiyacım karşılandı` (and edit) action instead of a
   12 px grey disclosure summary.
6. **F58 + F57** — preserve focus, caret and selection across re-renders, and keep focus on
   the tab that was clicked.
7. **F41** — label the refresh button by cause; never say `Yeni mesajlar` after a failed
   load or a version conflict.
8. **F1** — show the statement on the card instead of repeating the need chips as a
   sentence.
9. **F44 + F49** — unify the wizard's register, and rename the dialog close control so
   `Talebi kapat` means exactly one thing in the product.
10. **F27 + F31** — one vocabulary: kind-aware `talep` / `çağrı` strings, and an empty
    community state that matches what the channel accepts.

---

## What was applied on `fix/request-ux-copy`

Copy and UX fixes were applied in a separate worktree
(`../mihenk-ux-fixes`, branch `fix/request-ux-copy`, based on `722c223`). See that
branch's commit for the exact diff; findings left unfixed there are listed in its commit
message, chiefly F52 (needs a wizard step split and a `scripts/demo.js` update), F9
(relative timestamps), F26 (role-dependent tab label) and F7's heading decision, which
needs a product call rather than an edit.
