// Mirrors src/lib/i18n/locale.ts: just the two supported locales. Where the
// value comes from (a cookie in the Next.js/Axum versions, now a row in
// `app_settings` - see src/settings.rs) is deliberately not this module's
// concern, same as the TS version kept `isLocale` separate from any one
// storage mechanism.

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
}
