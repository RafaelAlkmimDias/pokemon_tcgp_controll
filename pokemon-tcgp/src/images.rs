// Mirrors src/lib/images.ts. Images are served locally from public/images
// (copied over from the Next.js project's public/ dir, same layout) via
// tower-http's ServeDir — no runtime dependency on GitHub.

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
    format!("/images/cards/{slug}/{number:03}.webp")
}

pub fn pack_image_url(pack_name: &str) -> Option<String> {
    if !PACKS_WITH_ART.contains(pack_name) {
        return None;
    }
    Some(format!(
        "/images/packs/{}.webp",
        urlencoding::encode(pack_name)
    ))
}

pub fn collection_logo_url(collection_code: &str) -> String {
    format!(
        "/images/sets/{}.webp",
        urlencoding::encode(collection_code)
    )
}
