import fs from "node:fs";
import path from "node:path";

// Regenerates prisma/data/card-names-pt.json and
// prisma/data/collection-names-pt.json from a saved copy of
// https://pocket.pokemongohub.net/pt/cards (the "Todas as cartas" listing).
// See prisma/data/README.md for why this source is trusted and how the
// page's data is structured.
//
// Usage: npx tsx scripts/extract-pokemongohub-names.ts <path-to-saved-page.html>
//
// After running this, re-run `npm run db:seed` to apply the refreshed names.

const ASSET_ID_RE = /(PK|TR)_\d+_\d+_\d+/;

// Known-bad asset IDs: the source's own `pt` field was simply wrong for
// these (pointing at a different, specific card) while its `en` field on
// the same row was correct - so the en-mismatch cross-check in seed.ts
// doesn't catch them. Found by manual spot-checking; see prisma/data/README.md.
// Excluded here so a future re-extraction doesn't silently reintroduce them.
const KNOWN_BAD_ASSET_IDS = new Set([
  "PK_10_001450_00", // source said "Machop" (pt) for this Machamp card
  "PK_10_001660_00", // source said "Nidoran♂" (pt) for this Nidoran♀ card
]);

type PghCard = {
  name: string;
  base_name: string | null;
  image_id: string | null;
};

type PghSet = {
  code: string;
  name: string;
};

function extractFlightStrings(html: string): string[] {
  const results: string[] = [];
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html))) {
    const body = match[1];
    const prefix = "self.__next_f.push(";
    if (!body.startsWith(prefix)) continue;
    let jsonSrc = body.slice(prefix.length);
    if (jsonSrc.endsWith(")")) jsonSrc = jsonSrc.slice(0, -1);
    try {
      const outer = JSON.parse(jsonSrc) as [number, string];
      results.push(outer[1]);
    } catch {
      // Not a [id, string] flight chunk (or malformed) - skip it.
    }
  }
  return results;
}

/** Finds `"<key>":[` in `text` and returns the matching, bracket-balanced JSON array. */
function extractJsonArray(text: string, key: string): unknown[] | null {
  const needle = `"${key}":[`;
  const start = text.indexOf(needle);
  if (start === -1) return null;
  const arrayStart = start + needle.length - 1; // position of '['

  let depth = 0;
  let inString = false;
  let escaped = false;
  let i = arrayStart;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else {
      if (c === '"') inString = true;
      else if (c === "[") depth++;
      else if (c === "]") {
        depth--;
        if (depth === 0) break;
      }
    }
  }

  return JSON.parse(text.slice(arrayStart, i + 1)) as unknown[];
}

function main() {
  const htmlPath = process.argv[2];
  if (!htmlPath) {
    console.error("Usage: npx tsx scripts/extract-pokemongohub-names.ts <path-to-saved-page.html>");
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, "utf-8");
  const flightStrings = extractFlightStrings(html);
  console.log(`Found ${flightStrings.length} Next.js flight chunks.`);

  let cards: PghCard[] | null = null;
  let sets: PghSet[] | null = null;
  for (const flight of flightStrings) {
    if (!cards) {
      const found = extractJsonArray(flight, "initialCards");
      if (found) cards = found as PghCard[];
    }
    if (!sets) {
      const found = extractJsonArray(flight, "sets");
      if (found && (found[0] as PghSet | undefined)?.code) sets = found as PghSet[];
    }
  }

  if (!cards) throw new Error("Could not find the 'initialCards' payload in this page.");
  if (!sets) throw new Error("Could not find the 'sets' payload in this page.");
  console.log(`Found ${cards.length} cards and ${sets.length} sets in the page data.`);

  // --- Cards, keyed by internal asset ID ---
  const byAsset = new Map<string, { pt: string; en: string | null }[]>();
  for (const card of cards) {
    const match = card.image_id?.match(ASSET_ID_RE);
    if (!match) continue;
    const list = byAsset.get(match[0]) ?? [];
    list.push({ pt: card.name, en: card.base_name });
    byAsset.set(match[0], list);
  }

  const cardNamesPt: Record<string, { pt: string; en: string | null }> = {};
  let conflicts = 0;
  let knownBad = 0;
  for (const [asset, entries] of byAsset) {
    if (KNOWN_BAD_ASSET_IDS.has(asset)) {
      knownBad++;
      continue;
    }
    const ptNames = new Set(entries.map((e) => e.pt));
    if (ptNames.size > 1) {
      conflicts++;
      continue; // Source itself disagrees on this asset's pt name - don't trust it.
    }
    const en = entries.find((e) => e.en)?.en ?? null;
    cardNamesPt[asset] = { pt: entries[0].pt, en };
  }
  console.log(
    `Card names: ${Object.keys(cardNamesPt).length} usable, ${conflicts} excluded (conflicting pt ` +
      `name for the same asset ID), ${knownBad} excluded (known-bad, see KNOWN_BAD_ASSET_IDS).`,
  );
  console.log(
    "Reminder: the cross-check above only catches *conflicting* pt names for an asset ID, not " +
      "isolated row-level bugs (correct en, wrong pt). Consider spot-checking a sample of entries " +
      "where our name differs from pt after reseeding - see prisma/data/README.md.",
  );

  // --- Sets (collections), keyed by code ---
  const collectionNamesPt: Record<string, string> = {};
  for (const set of sets) {
    const code = set.code.toUpperCase();
    // Promo "sets" just echo their own code as the pt name - not a real translation.
    if (set.name.toUpperCase().replace(/-/g, "") === code.replace(/-/g, "")) continue;
    collectionNamesPt[code] = set.name;
  }
  console.log(`Collection names: ${Object.keys(collectionNamesPt).length} of ${sets.length} sets.`);

  // Sorted + indented so future re-extractions produce a readable git diff.
  function writeSorted(filePath: string, obj: Record<string, unknown>) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) sorted[key] = obj[key];
    fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n");
  }

  const dataDir = path.join(import.meta.dirname, "..", "prisma", "data");
  writeSorted(path.join(dataDir, "card-names-pt.json"), cardNamesPt);
  writeSorted(path.join(dataDir, "collection-names-pt.json"), collectionNamesPt);

  console.log("\nWrote prisma/data/card-names-pt.json and prisma/data/collection-names-pt.json.");
  console.log(
    "Reminder: this does NOT touch pack-names-pt.json (hand-curated) - review it manually " +
      "if new sets/packs might now have an exact-match or well-known translation.",
  );
  console.log("Next: review `git diff prisma/data/`, then run `npm run db:seed` to apply.");
}

main();
