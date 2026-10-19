pub mod cards;
pub mod collections;
pub mod decks;
pub mod mutations;
pub mod packs;

use crate::locale::Locale;

// Mirrors resolveCollectionName/resolveCardName/resolvePackName in
// src/lib/queries.ts: all three are the same pt-fallback-to-en rule, so one
// helper covers collections, cards, and packs.
pub fn resolve_name(name: &str, name_pt: Option<&str>, locale: Locale) -> String {
    match locale {
        Locale::Pt => name_pt.unwrap_or(name).to_string(),
        Locale::En => name.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn english_always_uses_the_english_name() {
        assert_eq!(resolve_name("Charizard", Some("Charizard PT"), Locale::En), "Charizard");
        assert_eq!(resolve_name("Charizard", None, Locale::En), "Charizard");
    }

    #[test]
    fn portuguese_falls_back_to_english_when_no_translation_exists() {
        assert_eq!(
            resolve_name("Charizard", Some("Charizard PT"), Locale::Pt),
            "Charizard PT"
        );
        assert_eq!(resolve_name("Charizard", None, Locale::Pt), "Charizard");
    }
}
