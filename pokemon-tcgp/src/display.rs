// Mirrors src/lib/display.ts.

use time::{format_description, OffsetDateTime};

use crate::i18n::dictionaries::get_dictionary;
use crate::locale::Locale;
use crate::models::{CardType, Rarity};

pub fn rarity_label(rarity: Rarity, locale: Locale) -> &'static str {
    get_dictionary(locale).rarity.get(rarity)
}

pub fn type_label(card_type: CardType, locale: Locale) -> &'static str {
    get_dictionary(locale).card_type.get(card_type)
}

pub fn element_label(element: &str, locale: Locale) -> String {
    get_dictionary(locale)
        .element
        .get(element)
        .map(str::to_string)
        .unwrap_or_else(|| capitalize(element))
}

// `date` is stored as SQLite TEXT (ISO 8601, e.g. "2024-01-30 00:00:00"),
// parsed here rather than kept as a typed column to avoid pulling a full
// locale/calendar crate for what's otherwise a one-line format.
pub fn format_date(date: Option<&str>, locale: Locale) -> String {
    let dict = get_dictionary(locale);
    let Some(date) = date else {
        return dict.display.unknown_date.to_string();
    };
    let format = format_description::parse("[year]-[month]-[day]").unwrap();
    let Ok(parsed) = OffsetDateTime::parse(&date[..10], &format) else {
        return dict.display.unknown_date.to_string();
    };

    let month_names: &[&str] = match locale {
        Locale::Pt => &[
            "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
            "setembro", "outubro", "novembro", "dezembro",
        ],
        Locale::En => &[
            "January", "February", "March", "April", "May", "June", "July", "August",
            "September", "October", "November", "December",
        ],
    };
    let month = month_names[parsed.month() as usize - 1];

    match locale {
        Locale::Pt => format!("{} de {} de {}", parsed.day(), month, parsed.year()),
        Locale::En => format!("{} {}, {}", month, parsed.day(), parsed.year()),
    }
}

pub fn capitalize(value: &str) -> String {
    let mut chars = value.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

pub fn format_percent(value: f64) -> String {
    format!("{:.1}%", value * 100.0)
}
