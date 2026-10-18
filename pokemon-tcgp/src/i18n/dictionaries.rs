// Mirrors src/lib/i18n/dictionaries.ts. Fields that were functions in the
// TS dictionary (e.g. `home.series(name)`) are free functions below instead
// of closures, since the rest of the dictionary is plain &'static str data
// that can live in a `const`.

use crate::locale::Locale;
use crate::models::{CardType, Rarity};

pub struct Dictionary {
    pub layout: Layout,
    pub language_switcher: LanguageSwitcher,
    pub home: Home,
    pub decks_page: DecksPage,
    pub deck_detail_page: DeckDetailPage,
    pub deck_star: DeckStar,
    pub decks_list: DecksList,
    pub card_count_lines: CardCountLines,
    pub card_tile: CardTile,
    pub card_filter: CardFilter,
    pub breadcrumb: Breadcrumb,
    pub collection_page: CollectionPage,
    pub collection_cards_page: CollectionCardsPage,
    pub pack_page: PackPage,
    pub card_detail_page: CardDetailPage,
    pub rarity: RarityLabels,
    pub card_type: CardTypeLabels,
    pub element: ElementLabels,
    pub display: Display,
}

pub struct Layout {
    pub meta_title: &'static str,
    pub meta_description: &'static str,
    pub html_lang: &'static str,
    pub home_link: &'static str,
    pub decks_link: &'static str,
}

pub struct LanguageSwitcher {
    pub label: &'static str,
    pub pt: &'static str,
    pub en: &'static str,
}

pub struct Home {
    pub title: &'static str,
    pub subtitle: &'static str,
}

pub struct DecksPage {
    pub title: &'static str,
    pub subtitle: &'static str,
    pub empty_state_prefix: &'static str,
    pub empty_state_suffix: &'static str,
}

pub struct DeckDetailPage {
    pub sufficient_cards_label: &'static str,
    pub complete_aria_label: &'static str,
    pub meta_share_suffix: &'static str,
    pub expected_win_rate_suffix: &'static str,
}

pub struct DeckStar {
    pub mark: &'static str,
    pub unmark: &'static str,
    pub built: &'static str,
}

pub struct DecksList {
    pub all: &'static str,
    pub sort_by: &'static str,
    pub sort_meta_score: &'static str,
    pub sort_popularity: &'static str,
    pub sort_expected_win_rate: &'static str,
    pub sort_sufficient_count: &'static str,
    pub empty_state: &'static str,
    pub meta_share_suffix: &'static str,
    pub expected_win_rate_suffix: &'static str,
    pub sufficient_cards_label: &'static str,
}

pub struct CardCountLines {
    pub cards_label: &'static str,
    pub total_cards_label: &'static str,
    pub complete_aria_label: &'static str,
}

pub struct CardTile {
    pub decrease_label_prefix: &'static str,
    pub increase_label_prefix: &'static str,
    pub sufficient_aria_label: &'static str,
}

pub struct CardFilter {
    pub placeholder: &'static str,
    pub input_aria_label: &'static str,
    pub empty_state: &'static str,
}

pub struct Breadcrumb {
    pub collections: &'static str,
}

pub struct CollectionPage {
    pub view_all_cards: &'static str,
    pub packs_title: &'static str,
    pub no_own_packs_empty_state: &'static str,
}

pub struct CollectionCardsPage {
    pub title: &'static str,
    pub empty_state: &'static str,
}

pub struct PackPage {
    pub empty_state: &'static str,
}

pub struct CardDetailPage {
    pub collection_label: &'static str,
    pub type_label: &'static str,
    pub element_label: &'static str,
    pub stage_label: &'static str,
    pub evolves_from_label: &'static str,
    pub health_label: &'static str,
    pub retreat_cost_label: &'static str,
    pub weakness_label: &'static str,
    pub no_pack_empty_state: &'static str,
    pub also_available_in_title: &'static str,
    pub reprint_note: &'static str,
}

pub struct RarityLabels {
    pub c: &'static str,
    pub u: &'static str,
    pub r: &'static str,
    pub rr: &'static str,
    pub ar: &'static str,
    pub sr: &'static str,
    pub sar: &'static str,
    pub im: &'static str,
    pub ur: &'static str,
    pub s: &'static str,
    pub ssr: &'static str,
    pub unknown: &'static str,
}

impl RarityLabels {
    pub fn get(&self, rarity: Rarity) -> &'static str {
        match rarity {
            Rarity::C => self.c,
            Rarity::U => self.u,
            Rarity::R => self.r,
            Rarity::Rr => self.rr,
            Rarity::Ar => self.ar,
            Rarity::Sr => self.sr,
            Rarity::Sar => self.sar,
            Rarity::Im => self.im,
            Rarity::Ur => self.ur,
            Rarity::S => self.s,
            Rarity::Ssr => self.ssr,
            Rarity::Unknown => self.unknown,
        }
    }
}

pub struct CardTypeLabels {
    pub pokemon: &'static str,
    pub supporter: &'static str,
    pub item: &'static str,
    pub tool: &'static str,
    pub fossil: &'static str,
}

impl CardTypeLabels {
    pub fn get(&self, card_type: CardType) -> &'static str {
        match card_type {
            CardType::Pokemon => self.pokemon,
            CardType::Supporter => self.supporter,
            CardType::Item => self.item,
            CardType::Tool => self.tool,
            CardType::Fossil => self.fossil,
        }
    }
}

pub struct ElementLabels {
    pub grass: &'static str,
    pub fire: &'static str,
    pub water: &'static str,
    pub lightning: &'static str,
    pub psychic: &'static str,
    pub fighting: &'static str,
    pub darkness: &'static str,
    pub metal: &'static str,
    pub dragon: &'static str,
    pub colorless: &'static str,
}

impl ElementLabels {
    pub fn get(&self, element: &str) -> Option<&'static str> {
        Some(match element {
            "grass" => self.grass,
            "fire" => self.fire,
            "water" => self.water,
            "lightning" => self.lightning,
            "psychic" => self.psychic,
            "fighting" => self.fighting,
            "darkness" => self.darkness,
            "metal" => self.metal,
            "dragon" => self.dragon,
            "colorless" => self.colorless,
            _ => return None,
        })
    }
}

pub struct Display {
    pub unknown_date: &'static str,
    pub date_locale: &'static str,
}

const PT: Dictionary = Dictionary {
    layout: Layout {
        meta_title: "Pokémon TCG Pocket — Controle de Coleção",
        meta_description: "Coleções, pacotes e cartas do Pokémon TCG Pocket.",
        html_lang: "pt-BR",
        home_link: "Pokémon TCG Pocket — Controle",
        decks_link: "Baralhos",
    },
    language_switcher: LanguageSwitcher {
        label: "Idioma",
        pt: "Português",
        en: "English",
    },
    home: Home {
        title: "Coleções",
        subtitle: "Escolha uma coleção para ver seus pacotes e as cartas disponíveis em cada um.",
    },
    decks_page: DecksPage {
        title: "Baralhos competitivos",
        subtitle: "Arquétipos do meta atual, baseados em resultados de torneios (Limitless TCG via PocketDecks).",
        empty_state_prefix: "Nenhum baralho importado ainda. Rode ",
        empty_state_suffix: ".",
    },
    deck_detail_page: DeckDetailPage {
        sufficient_cards_label: "cartas na quantidade certa",
        complete_aria_label: "Baralho completo",
        meta_share_suffix: "do meta",
        expected_win_rate_suffix: "de vitórias esperada",
    },
    deck_star: DeckStar {
        mark: "Marcar como montado",
        unmark: "Desmarcar como montado",
        built: "Montado",
    },
    decks_list: DecksList {
        all: "Todos",
        sort_by: "Ordenar por",
        sort_meta_score: "Relevância no meta",
        sort_popularity: "% do meta",
        sort_expected_win_rate: "% de vitórias esperadas",
        sort_sufficient_count: "Cartas na quantidade certa",
        empty_state: "Nenhum baralho desse tipo no meta atual.",
        meta_share_suffix: "do meta",
        expected_win_rate_suffix: "de vitórias esperada",
        sufficient_cards_label: "cartas na quantidade certa",
    },
    card_count_lines: CardCountLines {
        cards_label: "cartas",
        total_cards_label: "cartas totais",
        complete_aria_label: "Completo",
    },
    card_tile: CardTile {
        decrease_label_prefix: "Diminuir quantidade de",
        increase_label_prefix: "Aumentar quantidade de",
        sufficient_aria_label: "Quantidade suficiente",
    },
    card_filter: CardFilter {
        placeholder: "Filtrar por nome...",
        input_aria_label: "Filtrar cartas por nome",
        empty_state: "Nenhuma carta encontrada para esse filtro.",
    },
    breadcrumb: Breadcrumb {
        collections: "Coleções",
    },
    collection_page: CollectionPage {
        view_all_cards: "Ver todas as cartas da coleção",
        packs_title: "Pacotes",
        no_own_packs_empty_state: "Esta coleção não tem pacotes próprios.",
    },
    collection_cards_page: CollectionCardsPage {
        title: "Todas as cartas",
        empty_state: "Nenhuma carta cadastrada para esta coleção.",
    },
    pack_page: PackPage {
        empty_state: "Nenhuma carta cadastrada para este pacote.",
    },
    card_detail_page: CardDetailPage {
        collection_label: "Coleção",
        type_label: "Tipo",
        element_label: "Elemento",
        stage_label: "Estágio",
        evolves_from_label: "Evolui de",
        health_label: "Pontos de Vida",
        retreat_cost_label: "Custo de Recuo",
        weakness_label: "Fraqueza",
        no_pack_empty_state: "Esta carta não é obtida por um pacote específico (ex: recompensa ou promo).",
        also_available_in_title: "Também disponível em",
        reprint_note: "É a mesma impressão (mesma arte) reaproveitada — marcar como possuída aqui também conta nas coleções abaixo, e vice-versa.",
    },
    rarity: RarityLabels {
        c: "Comum",
        u: "Incomum",
        r: "Rara",
        rr: "Dupla Rara",
        ar: "Arte Rara",
        sr: "Rara Especial",
        sar: "Arte Rara Especial",
        im: "Rara Imersiva",
        ur: "Ultra Rara",
        s: "Shiny",
        ssr: "Super Rara Especial",
        unknown: "Desconhecida",
    },
    card_type: CardTypeLabels {
        pokemon: "Pokémon",
        supporter: "Suporte",
        item: "Item",
        tool: "Ferramenta",
        fossil: "Fóssil",
    },
    element: ElementLabels {
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
    display: Display {
        unknown_date: "Data desconhecida",
        date_locale: "pt-BR",
    },
};

const EN: Dictionary = Dictionary {
    layout: Layout {
        meta_title: "Pokémon TCG Pocket — Collection Tracker",
        meta_description: "Collections, packs, and cards from Pokémon TCG Pocket.",
        html_lang: "en-US",
        home_link: "Pokémon TCG Pocket — Tracker",
        decks_link: "Decks",
    },
    language_switcher: LanguageSwitcher {
        label: "Language",
        pt: "Português",
        en: "English",
    },
    home: Home {
        title: "Collections",
        subtitle: "Choose a collection to see its packs and the cards available in each one.",
    },
    decks_page: DecksPage {
        title: "Competitive decks",
        subtitle: "Current meta archetypes, based on tournament results (Limitless TCG via PocketDecks).",
        empty_state_prefix: "No decks imported yet. Run ",
        empty_state_suffix: ".",
    },
    deck_detail_page: DeckDetailPage {
        sufficient_cards_label: "cards at the right quantity",
        complete_aria_label: "Deck complete",
        meta_share_suffix: "of the meta",
        expected_win_rate_suffix: "expected win rate",
    },
    deck_star: DeckStar {
        mark: "Mark as built",
        unmark: "Unmark as built",
        built: "Built",
    },
    decks_list: DecksList {
        all: "All",
        sort_by: "Sort by",
        sort_meta_score: "Meta relevance",
        sort_popularity: "% of meta",
        sort_expected_win_rate: "% expected win rate",
        sort_sufficient_count: "Cards at the right quantity",
        empty_state: "No deck of that type in the current meta.",
        meta_share_suffix: "of the meta",
        expected_win_rate_suffix: "expected win rate",
        sufficient_cards_label: "cards at the right quantity",
    },
    card_count_lines: CardCountLines {
        cards_label: "cards",
        total_cards_label: "total cards",
        complete_aria_label: "Complete",
    },
    card_tile: CardTile {
        decrease_label_prefix: "Decrease quantity of",
        increase_label_prefix: "Increase quantity of",
        sufficient_aria_label: "Enough copies",
    },
    card_filter: CardFilter {
        placeholder: "Filter by name...",
        input_aria_label: "Filter cards by name",
        empty_state: "No card matches this filter.",
    },
    breadcrumb: Breadcrumb {
        collections: "Collections",
    },
    collection_page: CollectionPage {
        view_all_cards: "View all cards in the collection",
        packs_title: "Packs",
        no_own_packs_empty_state: "This collection has no packs of its own.",
    },
    collection_cards_page: CollectionCardsPage {
        title: "All cards",
        empty_state: "No cards registered for this collection.",
    },
    pack_page: PackPage {
        empty_state: "No cards registered for this pack.",
    },
    card_detail_page: CardDetailPage {
        collection_label: "Collection",
        type_label: "Type",
        element_label: "Element",
        stage_label: "Stage",
        evolves_from_label: "Evolves from",
        health_label: "HP",
        retreat_cost_label: "Retreat cost",
        weakness_label: "Weakness",
        no_pack_empty_state: "This card isn't obtained from a specific pack (e.g. reward or promo).",
        also_available_in_title: "Also available in",
        reprint_note: "It's the same print (same artwork) reused — marking it owned here also counts for the collections below, and vice versa.",
    },
    rarity: RarityLabels {
        c: "Common",
        u: "Uncommon",
        r: "Rare",
        rr: "Double Rare",
        ar: "Art Rare",
        sr: "Special Rare",
        sar: "Special Art Rare",
        im: "Immersive Rare",
        ur: "Ultra Rare",
        s: "Shiny",
        ssr: "Special Super Rare",
        unknown: "Unknown",
    },
    card_type: CardTypeLabels {
        pokemon: "Pokémon",
        supporter: "Supporter",
        item: "Item",
        tool: "Tool",
        fossil: "Fossil",
    },
    element: ElementLabels {
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
    display: Display {
        unknown_date: "Unknown date",
        date_locale: "en-US",
    },
};

pub fn get_dictionary(locale: Locale) -> &'static Dictionary {
    match locale {
        Locale::Pt => &PT,
        Locale::En => &EN,
    }
}

// --- Dynamic strings (functions in the TS dictionary) ---

pub fn home_series(locale: Locale, name: &str) -> String {
    match locale {
        Locale::Pt => format!("Série {name}"),
        Locale::En => format!("Series {name}"),
    }
}

pub fn home_packs_count(locale: Locale, count: i64) -> String {
    match locale {
        Locale::Pt => format!("{count} pacote(s)"),
        Locale::En => format!("{count} pack(s)"),
    }
}

pub fn collection_page_pack_alt(locale: Locale, pack_name: &str) -> String {
    match locale {
        Locale::Pt => format!("Pacote {pack_name}"),
        Locale::En => format!("Pack {pack_name}"),
    }
}

pub fn collection_page_cards_without_pack_title(locale: Locale, count: i64) -> String {
    match locale {
        Locale::Pt => format!("Cartas sem pacote específico ({count})"),
        Locale::En => format!("Cards without a specific pack ({count})"),
    }
}

pub fn pack_page_title(locale: Locale, pack_name: &str) -> String {
    match locale {
        Locale::Pt => format!("Pacote {pack_name}"),
        Locale::En => format!("Pack {pack_name}"),
    }
}

pub fn card_detail_stage_value(locale: Locale, stage: &str) -> String {
    match locale {
        Locale::Pt if stage == "basic" => "Básico".to_string(),
        Locale::Pt => format!("Estágio {stage}"),
        Locale::En if stage == "basic" => "Basic".to_string(),
        Locale::En => format!("Stage {stage}"),
    }
}

pub fn card_detail_available_in_packs(locale: Locale, exclusive: bool) -> String {
    match locale {
        Locale::Pt => format!(
            "Disponível {}no(s) pacote(s)",
            if exclusive { "exclusivamente " } else { "" }
        ),
        Locale::En => format!(
            "Available {}in pack(s)",
            if exclusive { "exclusively " } else { "" }
        ),
    }
}
