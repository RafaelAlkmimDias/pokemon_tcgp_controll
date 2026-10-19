// Mirrors src/lib/display.ts.

use time::{format_description, Date};

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
    // `Date`, not `OffsetDateTime`: the stored value is a calendar date with
    // no time-of-day, and `OffsetDateTime::parse` requires the format to
    // carry a UTC offset or it errors on every row (silently falling back to
    // "unknown date" for every real date).
    let format = format_description::parse_borrowed::<1>("[year]-[month]-[day]").unwrap();
    let Ok(parsed) = Date::parse(&date[..10], &format) else {
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
    let month = month_names[u8::from(parsed.month()) as usize - 1];

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_date_none_falls_back_to_unknown_date() {
        assert_eq!(format_date(None, Locale::En), "Unknown date");
        assert_eq!(format_date(None, Locale::Pt), "Data desconhecida");
    }

    #[test]
    fn format_date_unparseable_falls_back_to_unknown_date() {
        // Not a plain calendar date (this is the bug the migration notes
        // call out: `OffsetDateTime::parse` used to fall back to this on
        // every real row because it demanded a UTC offset).
        assert_eq!(format_date(Some("not-a-date"), Locale::En), "Unknown date");
    }

    #[test]
    fn format_date_parses_sqlite_text_in_both_locales() {
        // Stored as "YYYY-MM-DD 00:00:00" (SQLite TEXT); only the first 10
        // chars are parsed, so the time-of-day suffix must be ignored.
        assert_eq!(
            format_date(Some("2024-01-30 00:00:00"), Locale::En),
            "January 30, 2024"
        );
        assert_eq!(
            format_date(Some("2024-01-30 00:00:00"), Locale::Pt),
            "30 de janeiro de 2024"
        );
    }

    #[test]
    fn capitalize_uppercases_first_char_only() {
        assert_eq!(capitalize("fire"), "Fire");
        assert_eq!(capitalize(""), "");
        assert_eq!(capitalize("A"), "A");
    }

    #[test]
    fn format_percent_rounds_to_one_decimal() {
        assert_eq!(format_percent(0.5), "50.0%");
        assert_eq!(format_percent(0.12345), "12.3%");
        assert_eq!(format_percent(0.0), "0.0%");
    }

    #[test]
    fn element_label_falls_back_to_capitalized_key_when_unknown() {
        assert_eq!(element_label("fire", Locale::En), "Fire");
        assert_eq!(element_label("fire", Locale::Pt), "Fogo");
        // Not in the dictionary: falls back to a capitalized version of the
        // raw key instead of panicking or returning an empty label.
        assert_eq!(element_label("not_a_real_element", Locale::En), "Not_a_real_element");
    }
}
