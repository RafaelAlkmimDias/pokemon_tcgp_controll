import type { Locale } from "@/lib/i18n/locale";

export type Dictionary = {
  layout: {
    metaTitle: string;
    metaDescription: string;
    htmlLang: string;
    homeLink: string;
    decksLink: string;
  };
  languageSwitcher: {
    label: string;
    pt: string;
    en: string;
  };
  home: {
    title: string;
    subtitle: string;
    series: (name: string) => string;
    packsCount: (count: number) => string;
  };
  decksPage: {
    title: string;
    subtitle: string;
    emptyStatePrefix: string;
    emptyStateSuffix: string;
  };
  deckDetailPage: {
    sufficientCardsLabel: string;
    completeAriaLabel: string;
    metaShareSuffix: string;
    expectedWinRateSuffix: string;
  };
  deckStar: {
    mark: string;
    unmark: string;
    built: string;
  };
  decksList: {
    all: string;
    sortBy: string;
    sortMetaScore: string;
    sortPopularity: string;
    sortExpectedWinRate: string;
    sortSufficientCount: string;
    emptyState: string;
    metaShareSuffix: string;
    expectedWinRateSuffix: string;
    sufficientCardsLabel: string;
  };
  cardCountLines: {
    cardsLabel: string;
    totalCardsLabel: string;
    completeAriaLabel: string;
  };
  // Plain strings only (no functions): this dictionary slice is passed as a
  // prop into client components (e.g. CardNameFilterGrid), and React can't
  // serialize function values across the server->client boundary.
  cardTile: {
    decreaseLabelPrefix: string;
    increaseLabelPrefix: string;
    sufficientAriaLabel: string;
  };
  cardFilter: {
    placeholder: string;
    inputAriaLabel: string;
    emptyState: string;
  };
  breadcrumb: {
    collections: string;
  };
  collectionPage: {
    viewAllCards: string;
    packsTitle: string;
    noOwnPacksEmptyState: string;
    packAlt: (packName: string) => string;
    cardsWithoutPackTitle: (count: number) => string;
  };
  collectionCardsPage: {
    title: string;
    emptyState: string;
  };
  packPage: {
    title: (packName: string) => string;
    packAlt: (packName: string) => string;
    emptyState: string;
  };
  cardDetailPage: {
    collectionLabel: string;
    typeLabel: string;
    elementLabel: string;
    stageLabel: string;
    stageValue: (stage: string) => string;
    evolvesFromLabel: string;
    healthLabel: string;
    retreatCostLabel: string;
    weaknessLabel: string;
    availableInPacks: (exclusive: boolean) => string;
    noPackEmptyState: string;
    alsoAvailableInTitle: string;
    reprintNote: string;
  };
  rarity: Record<
    "C" | "U" | "R" | "RR" | "AR" | "SR" | "SAR" | "IM" | "UR" | "S" | "SSR" | "UNKNOWN",
    string
  >;
  cardType: Record<"POKEMON" | "SUPPORTER" | "ITEM" | "TOOL" | "FOSSIL", string>;
  element: Record<
    | "grass"
    | "fire"
    | "water"
    | "lightning"
    | "psychic"
    | "fighting"
    | "darkness"
    | "metal"
    | "dragon"
    | "colorless",
    string
  >;
  display: {
    unknownDate: string;
    dateLocale: string;
  };
};

const pt: Dictionary = {
  layout: {
    metaTitle: "Pokémon TCG Pocket — Controle de Coleção",
    metaDescription: "Coleções, pacotes e cartas do Pokémon TCG Pocket.",
    htmlLang: "pt-BR",
    homeLink: "Pokémon TCG Pocket — Controle",
    decksLink: "Baralhos",
  },
  languageSwitcher: {
    label: "Idioma",
    pt: "Português",
    en: "English",
  },
  home: {
    title: "Coleções",
    subtitle: "Escolha uma coleção para ver seus pacotes e as cartas disponíveis em cada um.",
    series: (name) => `Série ${name}`,
    packsCount: (count) => `${count} pacote(s)`,
  },
  decksPage: {
    title: "Baralhos competitivos",
    subtitle:
      "Arquétipos do meta atual, baseados em resultados de torneios (Limitless TCG via PocketDecks).",
    emptyStatePrefix: "Nenhum baralho importado ainda. Rode ",
    emptyStateSuffix: ".",
  },
  deckDetailPage: {
    sufficientCardsLabel: "cartas na quantidade certa",
    completeAriaLabel: "Baralho completo",
    metaShareSuffix: "do meta",
    expectedWinRateSuffix: "de vitórias esperada",
  },
  deckStar: {
    mark: "Marcar como montado",
    unmark: "Desmarcar como montado",
    built: "Montado",
  },
  decksList: {
    all: "Todos",
    sortBy: "Ordenar por",
    sortMetaScore: "Relevância no meta",
    sortPopularity: "% do meta",
    sortExpectedWinRate: "% de vitórias esperadas",
    sortSufficientCount: "Cartas na quantidade certa",
    emptyState: "Nenhum baralho desse tipo no meta atual.",
    metaShareSuffix: "do meta",
    expectedWinRateSuffix: "de vitórias esperada",
    sufficientCardsLabel: "cartas na quantidade certa",
  },
  cardCountLines: {
    cardsLabel: "cartas",
    totalCardsLabel: "cartas totais",
    completeAriaLabel: "Completo",
  },
  cardTile: {
    decreaseLabelPrefix: "Diminuir quantidade de",
    increaseLabelPrefix: "Aumentar quantidade de",
    sufficientAriaLabel: "Quantidade suficiente",
  },
  cardFilter: {
    placeholder: "Filtrar por nome...",
    inputAriaLabel: "Filtrar cartas por nome",
    emptyState: "Nenhuma carta encontrada para esse filtro.",
  },
  breadcrumb: {
    collections: "Coleções",
  },
  collectionPage: {
    viewAllCards: "Ver todas as cartas da coleção",
    packsTitle: "Pacotes",
    noOwnPacksEmptyState: "Esta coleção não tem pacotes próprios.",
    packAlt: (packName) => `Pacote ${packName}`,
    cardsWithoutPackTitle: (count) => `Cartas sem pacote específico (${count})`,
  },
  collectionCardsPage: {
    title: "Todas as cartas",
    emptyState: "Nenhuma carta cadastrada para esta coleção.",
  },
  packPage: {
    title: (packName) => `Pacote ${packName}`,
    packAlt: (packName) => `Pacote ${packName}`,
    emptyState: "Nenhuma carta cadastrada para este pacote.",
  },
  cardDetailPage: {
    collectionLabel: "Coleção",
    typeLabel: "Tipo",
    elementLabel: "Elemento",
    stageLabel: "Estágio",
    stageValue: (stage) => (stage === "basic" ? "Básico" : `Estágio ${stage}`),
    evolvesFromLabel: "Evolui de",
    healthLabel: "Pontos de Vida",
    retreatCostLabel: "Custo de Recuo",
    weaknessLabel: "Fraqueza",
    availableInPacks: (exclusive) =>
      `Disponível ${exclusive ? "exclusivamente " : ""}no(s) pacote(s)`,
    noPackEmptyState: "Esta carta não é obtida por um pacote específico (ex: recompensa ou promo).",
    alsoAvailableInTitle: "Também disponível em",
    reprintNote:
      "É a mesma impressão (mesma arte) reaproveitada — marcar como possuída aqui também conta nas coleções abaixo, e vice-versa.",
  },
  rarity: {
    C: "Comum",
    U: "Incomum",
    R: "Rara",
    RR: "Dupla Rara",
    AR: "Arte Rara",
    SR: "Rara Especial",
    SAR: "Arte Rara Especial",
    IM: "Rara Imersiva",
    UR: "Ultra Rara",
    S: "Shiny",
    SSR: "Super Rara Especial",
    UNKNOWN: "Desconhecida",
  },
  cardType: {
    POKEMON: "Pokémon",
    SUPPORTER: "Suporte",
    ITEM: "Item",
    TOOL: "Ferramenta",
    FOSSIL: "Fóssil",
  },
  element: {
    grass: "Grama",
    fire: "Fogo",
    water: "Água",
    lightning: "Elétrico",
    psychic: "Psíquico",
    fighting: "Lutador",
    darkness: "Sombrio",
    metal: "Metal",
    dragon: "Dragão",
    colorless: "Incolor",
  },
  display: {
    unknownDate: "Data desconhecida",
    dateLocale: "pt-BR",
  },
};

const en: Dictionary = {
  layout: {
    metaTitle: "Pokémon TCG Pocket — Collection Tracker",
    metaDescription: "Collections, packs, and cards from Pokémon TCG Pocket.",
    htmlLang: "en-US",
    homeLink: "Pokémon TCG Pocket — Tracker",
    decksLink: "Decks",
  },
  languageSwitcher: {
    label: "Language",
    pt: "Português",
    en: "English",
  },
  home: {
    title: "Collections",
    subtitle: "Choose a collection to see its packs and the cards available in each one.",
    series: (name) => `Series ${name}`,
    packsCount: (count) => `${count} pack(s)`,
  },
  decksPage: {
    title: "Competitive decks",
    subtitle: "Current meta archetypes, based on tournament results (Limitless TCG via PocketDecks).",
    emptyStatePrefix: "No decks imported yet. Run ",
    emptyStateSuffix: ".",
  },
  deckDetailPage: {
    sufficientCardsLabel: "cards at the right quantity",
    completeAriaLabel: "Deck complete",
    metaShareSuffix: "of the meta",
    expectedWinRateSuffix: "expected win rate",
  },
  deckStar: {
    mark: "Mark as built",
    unmark: "Unmark as built",
    built: "Built",
  },
  decksList: {
    all: "All",
    sortBy: "Sort by",
    sortMetaScore: "Meta relevance",
    sortPopularity: "% of meta",
    sortExpectedWinRate: "% expected win rate",
    sortSufficientCount: "Cards at the right quantity",
    emptyState: "No deck of that type in the current meta.",
    metaShareSuffix: "of the meta",
    expectedWinRateSuffix: "expected win rate",
    sufficientCardsLabel: "cards at the right quantity",
  },
  cardCountLines: {
    cardsLabel: "cards",
    totalCardsLabel: "total cards",
    completeAriaLabel: "Complete",
  },
  cardTile: {
    decreaseLabelPrefix: "Decrease quantity of",
    increaseLabelPrefix: "Increase quantity of",
    sufficientAriaLabel: "Enough copies",
  },
  cardFilter: {
    placeholder: "Filter by name...",
    inputAriaLabel: "Filter cards by name",
    emptyState: "No card matches this filter.",
  },
  breadcrumb: {
    collections: "Collections",
  },
  collectionPage: {
    viewAllCards: "View all cards in the collection",
    packsTitle: "Packs",
    noOwnPacksEmptyState: "This collection has no packs of its own.",
    packAlt: (packName) => `Pack ${packName}`,
    cardsWithoutPackTitle: (count) => `Cards without a specific pack (${count})`,
  },
  collectionCardsPage: {
    title: "All cards",
    emptyState: "No cards registered for this collection.",
  },
  packPage: {
    title: (packName) => `Pack ${packName}`,
    packAlt: (packName) => `Pack ${packName}`,
    emptyState: "No cards registered for this pack.",
  },
  cardDetailPage: {
    collectionLabel: "Collection",
    typeLabel: "Type",
    elementLabel: "Element",
    stageLabel: "Stage",
    stageValue: (stage) => (stage === "basic" ? "Basic" : `Stage ${stage}`),
    evolvesFromLabel: "Evolves from",
    healthLabel: "HP",
    retreatCostLabel: "Retreat cost",
    weaknessLabel: "Weakness",
    availableInPacks: (exclusive) => `Available ${exclusive ? "exclusively " : ""}in pack(s)`,
    noPackEmptyState: "This card isn't obtained from a specific pack (e.g. reward or promo).",
    alsoAvailableInTitle: "Also available in",
    reprintNote:
      "It's the same print (same artwork) reused — marking it owned here also counts for the collections below, and vice versa.",
  },
  rarity: {
    C: "Common",
    U: "Uncommon",
    R: "Rare",
    RR: "Double Rare",
    AR: "Art Rare",
    SR: "Special Rare",
    SAR: "Special Art Rare",
    IM: "Immersive Rare",
    UR: "Ultra Rare",
    S: "Shiny",
    SSR: "Special Super Rare",
    UNKNOWN: "Unknown",
  },
  cardType: {
    POKEMON: "Pokémon",
    SUPPORTER: "Supporter",
    ITEM: "Item",
    TOOL: "Tool",
    FOSSIL: "Fossil",
  },
  element: {
    grass: "Grass",
    fire: "Fire",
    water: "Water",
    lightning: "Lightning",
    psychic: "Psychic",
    fighting: "Fighting",
    darkness: "Darkness",
    metal: "Metal",
    dragon: "Dragon",
    colorless: "Colorless",
  },
  display: {
    unknownDate: "Unknown date",
    dateLocale: "en-US",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { pt, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
