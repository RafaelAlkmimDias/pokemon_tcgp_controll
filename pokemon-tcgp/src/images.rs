// Mirrors src/lib/images.ts. Returns relative filesystem path fragments
// (no leading slash, no "/images" prefix) under the images root (see
// src/ui/widgets/image.rs) - not URL paths, since there's no HTTP server
// anymore. Pack/collection names can contain spaces (e.g. "Mega Altaria"),
// and that's fine here: these are joined onto a filesystem path, not
// percent-encoded into a URL, and the files on disk really do have literal
// spaces in their names.

use std::collections::HashSet;
use std::sync::LazyLock;

fn promo_slug(collection_code: &str) -> String {
    match collection_code {
        "PROMO-A" => "pa".to_string(),
        "PROMO-B" => "pb".to_string(),
        other => other.to_lowercase(),
    }
}

static PACKS_WITH_ART: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    HashSet::from([
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
    ])
});

pub fn card_image_url(collection_code: &str, number: i64) -> String {
    let slug = promo_slug(collection_code);
    format!("cards/{slug}/{number:03}.webp")
}

pub fn pack_image_url(pack_name: &str) -> Option<String> {
    if !PACKS_WITH_ART.contains(pack_name) {
        return None;
    }
    Some(format!("packs/{pack_name}.webp"))
}

pub fn collection_logo_url(collection_code: &str) -> String {
    format!("sets/{collection_code}.webp")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn card_image_url_pads_number_to_three_digits() {
        assert_eq!(card_image_url("A1", 7), "cards/a1/007.webp");
        assert_eq!(card_image_url("A1", 123), "cards/a1/123.webp");
    }

    #[test]
    fn card_image_url_maps_promo_collections_to_their_short_slug() {
        assert_eq!(card_image_url("PROMO-A", 1), "cards/pa/001.webp");
        assert_eq!(card_image_url("PROMO-B", 1), "cards/pb/001.webp");
    }

    #[test]
    fn pack_image_url_only_set_for_known_packs() {
        assert_eq!(pack_image_url("Charizard"), Some("packs/Charizard.webp".to_string()));
        assert_eq!(pack_image_url("Not A Real Pack"), None);
    }

    #[test]
    fn pack_image_url_keeps_spaces_literal() {
        // "Mega Altaria" has a space in its actual filename on disk - this
        // is a filesystem path fragment now, not a URL, so no encoding.
        assert_eq!(
            pack_image_url("Mega Altaria"),
            Some("packs/Mega Altaria.webp".to_string())
        );
    }

    #[test]
    fn collection_logo_url_uses_the_bare_code() {
        assert_eq!(collection_logo_url("A1"), "sets/A1.webp");
    }
}
