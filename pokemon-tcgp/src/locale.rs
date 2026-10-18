// Mirrors src/lib/i18n/locale.ts + getLocale.ts: locale is read from a
// cookie, defaulting to English when absent or unrecognized.

use axum_extra::extract::cookie::CookieJar;

pub const LOCALE_COOKIE: &str = "locale";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Locale {
    En,
    Pt,
}

impl Locale {
    pub fn as_str(self) -> &'static str {
        match self {
            Locale::En => "en",
            Locale::Pt => "pt",
        }
    }

    pub fn from_cookie(jar: &CookieJar) -> Self {
        match jar.get(LOCALE_COOKIE).map(|c| c.value()) {
            Some("pt") => Locale::Pt,
            _ => Locale::En,
        }
    }
}
