export const PROMO_SLUGS: Record<string, string> = {
  "PROMO-A": "pa",
  "PROMO-B": "pb",
};

// Only these packs ship their own box art; the "Vol. N" promo packs don't.
export const PACKS_WITH_ART = new Set([
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

// These resolve to files downloaded by scripts/download-images.ts into
// public/images - served locally, no runtime dependency on GitHub.

export function cardImageUrl(collectionCode: string, number: number) {
  const slug = PROMO_SLUGS[collectionCode] ?? collectionCode.toLowerCase();
  const padded = String(number).padStart(3, "0");
  return `/images/cards/${slug}/${padded}.webp`;
}

export function packImageUrl(packName: string): string | null {
  if (!PACKS_WITH_ART.has(packName)) return null;
  return `/images/packs/${encodeURIComponent(packName)}.webp`;
}

export function collectionLogoUrl(collectionCode: string) {
  return `/images/sets/${encodeURIComponent(collectionCode)}.webp`;
}
