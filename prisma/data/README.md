# `card-names-pt.json`

Portuguese card names for Pokémon TCG Pocket, keyed by the internal game asset
ID (e.g. `PK_10_000010_00`) — the same ID embedded in each card's image
filename (`Print.imageUrl`, e.g. `cPK_10_000010_00_FUSHIGIDANE_C.webp`).

## Provenance

Extracted on 2026-10-16 from a complete, saved copy of
`https://pocket.pokemongohub.net/pt/cards` (the "Todas as cartas" listing),
provided by the user. That page embeds its full card dataset (all ~4306
cards) as a Next.js RSC flight payload for client-side filtering - even
though only a fraction renders as DOM at any scroll position, the full
dataset ships with the page. The `name` field in that payload is the
Portuguese-localized card name; `image_id` is this same internal asset ID
(e.g. `a3/PK_10_013070_00`).

This is treated as a reliable (not self-translated) source: it's structured
per-card data served by the site itself, and spot-checks against known
official localizations (e.g. NPC name "Hau" → "Hibi", matching the real
Pokémon Sun/Moon Brazilian Portuguese localization) confirm it's genuine
in-game/official text, not community guesswork.

## Format

Each entry is `{ "pt": "<localized name>", "en": "<source's own English name>" }`.
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
  collection names (stage 2a). Refreshing this file means someone manually
  re-saving the page (ideally scrolled through fully, or once newer sets are
  indexed) and re-running the extraction.

## Refreshing

1. Open `https://pocket.pokemongohub.net/pt/cards` in a real browser, scroll
   through so the virtualized list mounts every card (not strictly required -
   the full dataset ships in the page regardless, see above), then save the
   complete page (HTML).
2. Extract the `self.__next_f.push(...)` script with the `initialCards` JSON
   array embedded in it, parse out `{ image_id, name }` pairs, and rebuild the
   `asset_id -> name` map the same way this file was generated - see the
   git history of this file/directory for the extraction script used.
3. Re-run `npm run db:seed` to apply it (prisma/seed.ts reads this file).
