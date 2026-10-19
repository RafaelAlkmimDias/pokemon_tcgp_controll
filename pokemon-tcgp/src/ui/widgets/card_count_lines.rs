// Two-line completion stat, reused wherever a `CardStats` is shown.
// Mirrors templates/_card_count_lines.html.

use crate::cardstats::CardStats;
use crate::i18n::dictionaries::Dictionary;

pub fn render(ui: &mut egui::Ui, stats: &CardStats, dict: &Dictionary) {
    ui.horizontal(|ui| {
        ui.label(format!(
            "{}/{} {}",
            stats.common_owned, stats.common_total, dict.card_count_lines.cards_label
        ));
        if stats.common_total > 0 && stats.common_owned == stats.common_total {
            ui.label("✓").on_hover_text(dict.card_count_lines.complete_aria_label);
        }
    });
    ui.horizontal(|ui| {
        ui.label(format!(
            "{}/{} {}",
            stats.all_owned, stats.all_total, dict.card_count_lines.total_cards_label
        ));
        if stats.all_total > 0 && stats.all_owned == stats.all_total {
            ui.label("✓").on_hover_text(dict.card_count_lines.complete_aria_label);
        }
    });
}
