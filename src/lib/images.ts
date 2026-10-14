const PROMO_SLUGS: Record<string, string> = {
  "PROMO-A": "pa",
  "PROMO-B": "pb",
};

// Only these packs ship their own box art; the "Vol. N" promo packs don't.
const PACKS_WITH_ART = new Set([
  "Arceus",
  "Charizard",
  "Crimson Blaze",
  "Deluxe Pack Mega",
  "Deluxe",
  "Dialga",
  "Eevee",
  "Everyday Wonders",
  "Extradimensional",
  "Gardevoir",
  "Ho-Oh",
  "Lugia",
  "Lunala",
  "Mega Altaria",
  "Mega Blaziken",
  "Mega Gyarados",
  "Mega Shine",
  "Mew",
  "Mewtwo",
  "Paldean",
  "Palkia",
  "Paradox Drive",
  "Pikachu",
  "Pulsing Aura",
  "Ruler of the Skies",
  "Secluded",
  "Shining",
  "Solgaleo",
  "Team Rocket",
]);

export function cardImageUrl(collectionCode: string, number: number) {
  const slug = PROMO_SLUGS[collectionCode] ?? collectionCode.toLowerCase();
  const padded = String(number).padStart(3, "0");
  return `https://raw.githubusercontent.com/PocketDecks/pokemon-tcg-pocket-cards/main/images/webp/cards/${slug}/${padded}.webp`;
}

export function packImageUrl(packName: string): string | null {
  if (!PACKS_WITH_ART.has(packName)) return null;
  return `https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/images/packs/${encodeURIComponent(packName)}.webp`;
}

export function collectionLogoUrl(collectionCode: string) {
  return `https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/images/sets/LOGO_expansion_${collectionCode}_en_US.webp`;
}
