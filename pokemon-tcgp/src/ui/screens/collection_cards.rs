// Mirrors templates/collection_cards.html.

use crate::app::{Ctx, Nav, Screen};
use crate::i18n::dictionaries::get_dictionary;
use crate::queries::collections::CollectionCards;
use crate::ui::widgets::card_tile::CardTileAction;
use crate::ui::widgets::{card_count_lines, card_filter, card_grid, card_tile};

pub fn render(ui: &mut egui::Ui, ctx: &Ctx, data: &CollectionCards) -> Option<Nav> {
    let dict = get_dictionary(ctx.locale);
    let mut nav = None;

    ui.horizontal(|ui| {
        if ui.link(dict.breadcrumb.collections).clicked() {
            nav = Some(Nav::Goto(Screen::Collections));
        }
        ui.label("/");
        if ui.link(&data.name).clicked() {
            nav = Some(Nav::Goto(Screen::CollectionDetail {
                code: data.code.clone(),
            }));
        }
    });

    ui.heading(dict.collection_cards_page.title);
    ui.label(&data.name);
    card_count_lines::render(ui, &data.stats, dict);
    ui.separator();

    let query = card_filter::render(ui, &dict.card_filter, &data.code);
    let visible: Vec<_> = data.cards.iter().filter(|card| card_filter::matches(&query, &card.name)).collect();

    if data.cards.is_empty() {
        ui.label(dict.collection_cards_page.empty_state);
    } else if visible.is_empty() {
        ui.label(dict.card_filter.empty_state);
    } else {
        card_grid(ui, 160.0, &visible, |ui, card| {
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
    }

    nav
}
