// Shared presentational shape for a card tile, reused by the collection,
// pack, and deck-detail queries. Mirrors the owned/needed + tint logic and
// the +/- mutation forms in src/components/CardTile.tsx. Rendered through
// templates/_card_tile.html (an Askama `include`, not yet a true standalone
// component - see "componentes Askama reutilizáveis" in
// docs/rust-migration-checklist.md).

use crate::display::rarity_label;
use crate::i18n::dictionaries::get_dictionary;
use crate::images::card_image_url;
use crate::locale::Locale;
use crate::models::Rarity;

pub struct CardTileData {
    pub collection_code: String,
    pub print_id: i64,
    pub number: i64,
    pub name: String,
    pub image_url: String,
    pub rarity_label: &'static str,
    pub rarity_css_class: &'static str,
    pub qty_label: String,
    pub is_complete: bool,
    pub decrease_aria_label: String,
    pub increase_aria_label: String,
}

impl CardTileData {
    // No target quantity (plain collection/pack browsing): "complete" just
    // means at least one copy is owned.
    pub fn owned_only(
        collection_code: &str,
        print_id: i64,
        number: i64,
        name: String,
        rarity: Rarity,
        owned_quantity: i64,
        locale: Locale,
    ) -> Self {
        Self::build(
            collection_code,
            print_id,
            number,
            name,
            rarity,
            owned_quantity.to_string(),
            owned_quantity > 0,
            locale,
        )
    }

    // Target quantity set (deck detail): shows "available/needed" and tints
    // complete only once available meets needed.
    pub fn with_needed(
        collection_code: &str,
        print_id: i64,
        number: i64,
        name: String,
        rarity: Rarity,
        available_quantity: i64,
        needed_quantity: i64,
        locale: Locale,
    ) -> Self {
        Self::build(
            collection_code,
            print_id,
            number,
            name,
            rarity,
            format!("{available_quantity}/{needed_quantity}"),
            available_quantity >= needed_quantity,
            locale,
        )
    }

    fn build(
        collection_code: &str,
        print_id: i64,
        number: i64,
        name: String,
        rarity: Rarity,
        qty_label: String,
        is_complete: bool,
        locale: Locale,
    ) -> Self {
        let dict = get_dictionary(locale);
        Self {
            collection_code: collection_code.to_string(),
            print_id,
            number,
            image_url: card_image_url(collection_code, number),
            rarity_label: rarity_label(rarity, locale),
            rarity_css_class: rarity.css_class(),
            qty_label,
            is_complete,
            decrease_aria_label: format!("{} {}", dict.card_tile.decrease_label_prefix, name),
            increase_aria_label: format!("{} {}", dict.card_tile.increase_label_prefix, name),
            name,
        }
    }
}
