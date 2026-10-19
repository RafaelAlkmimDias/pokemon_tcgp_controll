// Mirrors templates/deck_detail.html.

use crate::app::{Ctx, Nav, Screen};
use crate::i18n::dictionaries::get_dictionary;
use crate::queries::decks::DeckDetail;
use crate::queries::mutations::toggle_deck_built;
use crate::ui::widgets::card_tile::CardTileAction;
use crate::ui::widgets::{card_grid, card_tile};

pub fn render(ui: &mut egui::Ui, ctx: &Ctx, detail: &DeckDetail) -> Option<Nav> {
    let dict = get_dictionary(ctx.locale);
    let mut nav = None;

    if ui.link(dict.layout.decks_link).clicked() {
        nav = Some(Nav::Goto(Screen::Decks));
    }

    ui.horizontal(|ui| {
        ui.heading(&detail.display_name);
        let star = if detail.is_built { "★" } else { "☆" };
        let hover = if detail.is_built {
            dict.deck_star.unmark
        } else {
            dict.deck_star.mark
        };
        if ui.button(star).on_hover_text(hover).clicked() {
            let _ = ctx.rt.block_on(toggle_deck_built(ctx.pool, detail.id));
            nav = Some(Nav::Reload);
        }
    });

    ui.label(format!(
        "{} {} · {} {}",
        detail.popularity_label,
        dict.deck_detail_page.meta_share_suffix,
        detail.expected_win_rate_label,
        dict.deck_detail_page.expected_win_rate_suffix
    ));

    ui.horizontal(|ui| {
        ui.label(format!(
            "{}/{} {}",
            detail.sufficient_count, detail.total_cards, dict.deck_detail_page.sufficient_cards_label
        ));
        if detail.sufficient_count == detail.total_cards {
            ui.label("✓").on_hover_text(dict.deck_detail_page.complete_aria_label);
        }
    });

    ui.separator();
    card_grid(ui, 160.0, &detail.cards, |ui, card| {
        match card_tile::render(ui, ctx, card) {
            CardTileAction::Clicked => {
                nav = Some(Nav::Goto(Screen::CardDetail {
                    code: card.collection_code.clone(),
                    number: card.number,
                }));
            }
            CardTileAction::Mutated => nav = Some(Nav::Reload),
            CardTileAction::None => {}
        }
    });

    nav
}
