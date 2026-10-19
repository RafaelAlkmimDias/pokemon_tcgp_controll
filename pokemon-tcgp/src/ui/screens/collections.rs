// Home screen. Mirrors templates/collections_list.html.

use crate::app::{Ctx, Nav, Screen};
use crate::i18n::dictionaries::get_dictionary;
use crate::queries::collections::CollectionSummary;
use crate::ui::widgets::{card_count_lines, card_grid};

pub fn render(ui: &mut egui::Ui, ctx: &Ctx, collections: &[CollectionSummary]) -> Option<Nav> {
    let dict = get_dictionary(ctx.locale);
    let mut nav = None;

    ui.heading(dict.home.title);
    ui.label(dict.home.subtitle);
    ui.separator();
    let card_inner_spacing = ui.spacing().item_spacing;
    ui.spacing_mut().item_spacing = egui::vec2(20.0, 20.0);

    card_grid(ui, 220.0, collections, |ui, collection| {
        let group = ui.group(|ui| {
            // The 20px gap above is for between cards; restore the tighter
            // default for the lines stacked inside this one.
            ui.spacing_mut().item_spacing = card_inner_spacing;
            ui.set_width(220.0);
            ui.vertical(|ui| {
                if ui.link(&collection.name).clicked() {
                    nav = Some(Nav::Goto(Screen::CollectionDetail {
                        code: collection.code.clone(),
                    }));
                }
                ui.label(format!("{} · {}", collection.series_label, collection.release_date_label));
                ui.label(&collection.packs_count_label);
                card_count_lines::render(ui, &collection.stats, dict);
            });
        });
        let card = group
            .response
            .interact(egui::Sense::click())
            .on_hover_cursor(egui::CursorIcon::PointingHand);
        if card.clicked() {
            nav = Some(Nav::Goto(Screen::CollectionDetail {
                code: collection.code.clone(),
            }));
        }
    });

    nav
}
