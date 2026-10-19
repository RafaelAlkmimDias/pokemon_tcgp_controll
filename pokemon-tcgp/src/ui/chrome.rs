// Persistent top bar on every screen: app title/home, Decks, language
// toggle. Replaces `LayoutChrome`/`layout.html`/`_language_switcher.html` -
// no intermediate struct needed, just read the dictionary directly.

use crate::app::{Nav, Screen};
use crate::i18n::dictionaries::get_dictionary;
use crate::locale::Locale;

pub struct ChromeOutcome {
    pub nav: Option<Nav>,
    pub locale: Option<Locale>,
}

pub fn render(ui: &mut egui::Ui, locale: Locale, can_go_back: bool) -> ChromeOutcome {
    let dict = get_dictionary(locale);
    let mut outcome = ChromeOutcome { nav: None, locale: None };

    ui.horizontal(|ui| {
        if ui
            .add_enabled(can_go_back, egui::Button::new(dict.layout.back_link))
            .clicked()
        {
            outcome.nav = Some(Nav::Back);
        }
        if ui.button(dict.layout.home_link).clicked() {
            outcome.nav = Some(Nav::Goto(Screen::Collections));
        }
        if ui.button(dict.layout.decks_link).clicked() {
            outcome.nav = Some(Nav::Goto(Screen::Decks));
        }

        ui.add_space(16.0);
        ui.label(dict.language_switcher.label);
        if locale == Locale::Pt {
            ui.strong(dict.language_switcher.pt);
        } else if ui.button(dict.language_switcher.pt).clicked() {
            outcome.locale = Some(Locale::Pt);
        }
        ui.label("·");
        if locale == Locale::En {
            ui.strong(dict.language_switcher.en);
        } else if ui.button(dict.language_switcher.en).clicked() {
            outcome.locale = Some(Locale::En);
        }
    });

    outcome
}
