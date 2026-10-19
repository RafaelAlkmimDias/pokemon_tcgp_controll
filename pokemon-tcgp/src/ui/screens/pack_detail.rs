// Mirrors templates/pack_detail.html - structurally identical to
// collection_cards.rs, just scoped to one pack.

use crate::app::{Ctx, Nav, Screen};
use crate::i18n::dictionaries::{get_dictionary, pack_page_title};
use crate::queries::packs::PackDetail;
use crate::ui::widgets::card_tile::CardTileAction;
use crate::ui::widgets::{card_count_lines, card_filter, card_grid, card_tile};

pub fn render(ui: &mut egui::Ui, ctx: &Ctx, data: &PackDetail) -> Option<Nav> {
    let dict = get_dictionary(ctx.locale);
    let mut nav = None;

    ui.horizontal(|ui| {
        if ui.link(dict.breadcrumb.collections).clicked() {
            nav = Some(Nav::Goto(Screen::Collections));
        }
        ui.label("/");
        if ui.link(&data.collection_name).clicked() {
            nav = Some(Nav::Goto(Screen::CollectionDetail {
                code: data.collection_code.clone(),
            }));
        }
    });

    ui.heading(pack_page_title(ctx.locale, &data.pack_display_name));
    ui.label(&data.collection_name);
    card_count_lines::render(ui, &data.stats, dict);
    ui.separator();

    let query = card_filter::render(ui, &dict.card_filter, (&data.collection_code, &data.pack_display_name));
    let visible: Vec<_> = data.cards.iter().filter(|card| card_filter::matches(&query, &card.name)).collect();

    if data.cards.is_empty() {
        ui.label(dict.pack_page.empty_state);
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
