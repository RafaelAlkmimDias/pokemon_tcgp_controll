// Mirrors templates/card_detail.html. Unlike the Askama template, this
// actually renders `image_url` - it was already computed but the old HTML
// template never wired it in (see docs/rust-migration-checklist.md).

use crate::app::{Ctx, Nav, Screen};
use crate::i18n::dictionaries::{card_detail_available_in_packs, get_dictionary};
use crate::queries::cards::CardDetail;
use crate::ui::widgets::image::uri_for;
use crate::ui::widgets::rarity_color;

pub fn render(ui: &mut egui::Ui, ctx: &Ctx, detail: &CardDetail) -> Option<Nav> {
    let dict = get_dictionary(ctx.locale);
    let mut nav = None;

    ui.horizontal(|ui| {
        if ui.link(dict.breadcrumb.collections).clicked() {
            nav = Some(Nav::Goto(Screen::Collections));
        }
        ui.label("/");
        if ui.link(&detail.collection_name).clicked() {
            nav = Some(Nav::Goto(Screen::CollectionDetail {
                code: detail.collection_code.clone(),
            }));
        }
    });

    ui.horizontal(|ui| {
        ui.heading(format!("#{} {}", detail.number, detail.name));
        ui.colored_label(rarity_color(detail.rarity_css_class), detail.rarity_label);
    });

    // All card art is 367x512 (ratio 0.717): at a 220px height that's
    // 157.6x220. Fixed size (maintain_aspect_ratio(false)) avoids depending
    // on the loaded texture's size, same as card_tile.rs.
    ui.add(
        egui::Image::new(uri_for(ctx.images_root, &detail.image_url))
            .fit_to_exact_size(egui::vec2(157.6, 220.0))
            .maintain_aspect_ratio(false),
    );

    egui::Grid::new("card_detail_fields").num_columns(2).show(ui, |ui| {
        ui.label(dict.card_detail_page.collection_label);
        ui.label(&detail.collection_name);
        ui.end_row();

        if let Some(type_value) = detail.type_label {
            ui.label(dict.card_detail_page.type_label);
            ui.label(type_value);
            ui.end_row();
        }
        if let Some(element_value) = &detail.element_label {
            ui.label(dict.card_detail_page.element_label);
            ui.label(element_value);
            ui.end_row();
        }
        if let Some(stage_value) = &detail.stage_value {
            ui.label(dict.card_detail_page.stage_label);
            ui.label(stage_value);
            ui.end_row();
        }
        if let Some(evolves_from) = &detail.evolves_from {
            ui.label(dict.card_detail_page.evolves_from_label);
            ui.label(evolves_from);
            ui.end_row();
        }
        if let Some(health) = detail.health {
            ui.label(dict.card_detail_page.health_label);
            ui.label(health.to_string());
            ui.end_row();
        }
        if let Some(retreat_cost) = detail.retreat_cost {
            ui.label(dict.card_detail_page.retreat_cost_label);
            ui.label(retreat_cost.to_string());
            ui.end_row();
        }
        if let Some(weakness) = &detail.weakness {
            ui.label(dict.card_detail_page.weakness_label);
            ui.label(weakness);
            ui.end_row();
        }
    });

    ui.separator();
    ui.heading(card_detail_available_in_packs(ctx.locale, detail.is_pack_exclusive));
    if detail.packs.is_empty() {
        ui.label(dict.card_detail_page.no_pack_empty_state);
    } else {
        ui.horizontal_wrapped(|ui| {
            for pack in &detail.packs {
                if ui.button(&pack.display_name).clicked() {
                    nav = Some(Nav::Goto(Screen::PackDetail {
                        code: detail.collection_code.clone(),
                        pack: pack.name.clone(),
                    }));
                }
            }
        });
    }

    if !detail.sibling_cards.is_empty() {
        ui.separator();
        ui.heading(dict.card_detail_page.also_available_in_title);
        ui.label(dict.card_detail_page.reprint_note);
        ui.horizontal_wrapped(|ui| {
            for sibling in &detail.sibling_cards {
                let label = format!("{} (#{})", sibling.collection_name, sibling.number);
                if ui.button(label).clicked() {
                    nav = Some(Nav::Goto(Screen::CardDetail {
                        code: sibling.collection_code.clone(),
                        number: sibling.number,
                    }));
                }
            }
        });
    }

    nav
}
