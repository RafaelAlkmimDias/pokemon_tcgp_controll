# `card-names-pt.json` / `collection-names-pt.json` / `pack-names-pt.json`

Portuguese names for Pokémon TCG Pocket cards and collections (sets), both
extracted from the same source/snapshot described below.

- `card-names-pt.json` is keyed by the internal game asset ID (e.g.
  `PK_10_000010_00`) — the same ID embedded in each card's image filename
  (`Print.imageUrl`, e.g. `cPK_10_000010_00_FUSHIGIDANE_C.webp`).
- `collection-names-pt.json` is keyed by collection code, uppercased (e.g.
  `A1A`, `B4B`). It covers all 24 sets, unlike `sets.json`'s own `pt` field
  (stage 2a's source), which only had 2 of 24 translated at the time - so
  `prisma/seed.ts` prefers this file for collection names and only falls back
  to `sets.json`'s `pt` field when a code is missing here. The two promo
  "sets" (`PROMO-A`/`PROMO-B`) are excluded: the source's `pt` value for them
  was just the code echoed back, not an actual translation.
- `pack-names-pt.json` is a small, hand-curated `{ "<English pack name>": "<pt name>" }`
  map - **not** extracted from the pokemongohub snapshot. Most pack names are
  Pokémon species names (unchanged between locales), so a full extraction
  wasn't worth it; instead this covers only the handful of packs where a
  reliable translation was already available from data we'd already imported:
  6 packs whose name exactly matches a full collection English name (so they
  reuse that collection's already-verified `namePt`, e.g. "Crimson Blaze" →
  "Chama Carmesim"), plus "Team Rocket" → "Equipe Rocket" (derived from the
  card "Team Rocket Grunt" → "Recruta da Equipe Rocket", the same phrase
  appearing in the B4a collection name translation too). Everything else
  falls back to English - correctly, for species-name packs.

## Provenance

Extracted on 2026-10-16 from a complete, saved copy of
`https://pocket.pokemongohub.net/pt/cards` (the "Todas as cartas" listing),
provided by the user. That page embeds its full card dataset (all ~4306
cards) **and** the full list of sets with their Portuguese names, as a
Next.js RSC flight payload used for client-side filtering - even though only
a fraction of cards render as DOM at any scroll position, the full dataset
ships with the page regardless. The `name` field per card is the
Portuguese-localized card name; `image_id` is the internal asset ID (e.g.
`a3/PK_10_013070_00`). The sets list is a separate, smaller flight chunk with
`{ code, name }` pairs directly.

This is treated as a reliable (not self-translated) source: it's structured
per-card/per-set data served by the site itself, and spot-checks against
known official localizations (e.g. NPC name "Hau" → "Hibi", matching the real
Pokémon Sun/Moon Brazilian Portuguese localization) confirm it's genuine
in-game/official text, not community guesswork.

## Format

`collection-names-pt.json` is a flat `{ "<CODE>": "<pt name>" }` map.

`card-names-pt.json` entries are `{ "pt": "<localized name>", "en": "<source's own English name>" }`.
`en` isn't displayed anywhere - `prisma/seed.ts` compares it against our own
(flibustier-sourced) English `card.name` before trusting `pt`, and skips the
entry entirely on a mismatch. This exists because the source has occasional
row-level bugs: a handful of cards had their `pt` name field pointing at the
*wrong* card (e.g. one specific Machamp card's `pt` field said "Machop", a
Nidoran♂ card said "Nidoran♀" - both one step off from the right evolution/
form), even though nothing about them looked structurally wrong (no
conflicting duplicate for that asset ID). Comparing against the source's own
stated English name catches this class of error; ~10 entries were excluded
this way on the initial import. The tradeoff is losing a few entries that
were actually fine but spelled slightly differently from our own English name
(e.g. "Palkia" vs. the source's "Origin Forme Palkia") - an acceptable cost
for not risking a wrong translation.

## Known gaps

- Two asset IDs (`PK_10_001450_00` Machamp, `PK_10_001660_00` Nidoran♀) had a
  `pt` field that was simply wrong at the source - pointing at a different,
  specific card (Machop, Nidoran♂) - while that same row's own `en` field was
  correct, so the cross-check above didn't catch them. Found by manually
  spot-checking a sample of entries where our name differs from `pt`, and
  removed from this file by hand. This is a known limitation: an isolated bug
  in just the `pt` field, with a correct `en` field on the same row, can't be
  caught by cross-checking against `en` - only a broader manual audit would
  catch more of these if they exist.
- The site (and therefore this snapshot) doesn't fully cover the two newest
  sets at extraction time (`B4`, `B4a`) - they weren't indexed there yet.
  Cards from those sets correctly fall back to the English name.
- A handful of asset IDs (9, all concentrated in set `A2b`) had conflicting
  `pt` names across different entries in the source data itself (a data
  quality issue on the site's side, not ours) - those were dropped entirely
  rather than risk assigning a wrong name.
- `pocket.pokemongohub.net` is behind Cloudflare bot protection, so this
  pipeline **cannot** re-fetch automatically like `sets.json` does for
  collection names (stage 2a). Refreshing means manually saving the page
  again and re-running the extraction script below - there's no way to
  automate the download step itself.

## Is this a good source to keep using?

Yes. It's the best one found so far for Portuguese card/collection names (see
"Provenance" above): it's structured per-card/per-set data straight from the
site, not a community translation, and it's held up well under scrutiny - 88%
card coverage, corroborated against an independent source (`sets.json`) where
they overlap (both agreed exactly on `A1`/`A1a`), and only 2 confirmed bad
rows found out of hundreds manually checked. **When new sets release, or
whenever more cards/collections should be covered than are today, come back
to this same source** rather than looking for a different one:

1. Open `https://pocket.pokemongohub.net/pt/cards` in a real browser (it
   blocks headless/automated fetches) and save the complete page (e.g.
   Ctrl+S / Cmd+S → "Webpage, Complete") somewhere Claude can read it, such as
   your Downloads folder.
2. Run the extraction script against that saved file:
   ```bash
   npx tsx scripts/extract-pokemongohub-names.ts "<path to the saved .html file>"
   ```
   This regenerates `card-names-pt.json` and `collection-names-pt.json` in
   place (sorted/indented, so `git diff` shows exactly what changed) and
   prints a coverage summary. It does **not** touch `pack-names-pt.json`
   (hand-curated) - review that one by hand if new packs might now have a
   reliable translation available (see its description above).
3. Skim `git diff prisma/data/` - new sets should show up as new keys; nothing
   existing should change names outright (if something does, double-check it
   before trusting it, the same way the `PK_10_001450_00`/`PK_10_001660_00`
   issue above was caught).
4. Run `npm run db:seed` to apply the refreshed data (this also re-fetches
   `sets.json`/`cards.json` from flibustier, so it picks up brand new
   sets/cards there too, not just the translated names).
