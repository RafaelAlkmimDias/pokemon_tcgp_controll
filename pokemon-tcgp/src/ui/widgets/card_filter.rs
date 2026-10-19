// Case-insensitive substring filter box. Mirrors CardNameFilterGrid.tsx's
// `nameFilter` state - just a plain `useState` there, so here the typed
// query lives in egui's per-id temp storage instead of being threaded
// through `App`/`ScreenData`. `scope` keys that storage so each screen that
// embeds a filter (and each collection/pack within it) keeps its own text.

use crate::i18n::dictionaries::CardFilter;

pub fn render(ui: &mut egui::Ui, dict: &CardFilter, scope: impl std::hash::Hash + std::fmt::Debug) -> String {
    let id = egui::Id::unique("card_name_filter").with(scope);
    let mut query: String = ui.ctx().data_mut(|data| data.get_temp(id).unwrap_or_default());

    ui.add(
        egui::TextEdit::singleline(&mut query)
            .hint_text(dict.placeholder)
            .desired_width(240.0),
    )
    .on_hover_text(dict.input_aria_label);

    ui.ctx().data_mut(|data| data.insert_temp(id, query.clone()));
    query
}

pub fn matches(query: &str, card_name: &str) -> bool {
    let query = query.trim();
    query.is_empty() || card_name.to_lowercase().contains(&query.to_lowercase())
}
