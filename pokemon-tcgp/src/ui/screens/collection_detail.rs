// Mirrors templates/collection_detail.html.

use crate::app::{Ctx, Nav, Screen};
use crate::i18n::dictionaries::{collection_page_cards_without_pack_title, get_dictionary};
use crate::queries::collections::CollectionDetail;
use crate::ui::widgets::card_tile::CardTileAction;
use crate::ui::widgets::image::uri_for;
use crate::ui::widgets::{card_count_lines, card_grid, card_tile};

pub fn render(ui: &mut egui::Ui, ctx: &Ctx, detail: &CollectionDetail) -> Option<Nav> {
    let dict = get_dictionary(ctx.locale);
    let mut nav = None;

    if ui.link(dict.breadcrumb.collections).clicked() {
        nav = Some(Nav::Goto(Screen::Collections));
    }

    ui.heading(&detail.name);
    ui.label(format!("{} · {}", detail.code, detail.release_date_label));
    card_count_lines::render(ui, &detail.stats, dict);

    if ui.button(dict.collection_page.view_all_cards).clicked() {
        nav = Some(Nav::Goto(Screen::CollectionCards {
            code: detail.code.clone(),
        }));
    }

    ui.separator();
    ui.heading(dict.collection_page.packs_title);
    if detail.packs.is_empty() {
        ui.label(dict.collection_page.no_own_packs_empty_state);
    } else {
        card_grid(ui, 200.0, &detail.packs, |ui, pack| {
            let group = ui.group(|ui| {
                ui.set_width(200.0);
                ui.vertical(|ui| {
                    if let Some(image_url) = &pack.image_url {
                        // All pack art is 160x256 (0.625 ratio): 200x320 is
                        // that same ratio at the card's width, so this box
                        // isn't a distortion. It has to come from a fixed
                        // size (maintain_aspect_ratio(false) skips using the
                        // loaded texture's size), not from the real aspect
                        // ratio computed via max_width - while a pack's
                        // texture is still loading asynchronously, egui
                        // sizes it from a 24x24 fallback instead, so the
                        // card would render square for a frame or more.
                        ui.add(
                            egui::Image::new(uri_for(ctx.images_root, image_url))
                                .fit_to_exact_size(egui::vec2(200.0, 320.0))
                                .maintain_aspect_ratio(false),
                        );
                    }
                    if ui.link(&pack.display_name).clicked() {
                        nav = Some(Nav::Goto(Screen::PackDetail {
                            code: detail.code.clone(),
                            pack: pack.name.clone(),
                        }));
                    }
                    card_count_lines::render(ui, &pack.stats, dict);
                });
            });
            let card = group
                .response
                .interact(egui::Sense::click())
                .on_hover_cursor(egui::CursorIcon::PointingHand);
            if card.clicked() {
                nav = Some(Nav::Goto(Screen::PackDetail {
                    code: detail.code.clone(),
                    pack: pack.name.clone(),
                }));
            }
        });
    }

    if !detail.cards_without_pack.is_empty() {
        ui.separator();
        ui.heading(collection_page_cards_without_pack_title(
            ctx.locale,
            detail.cards_without_pack.len() as i64,
        ));
        card_grid(ui, 160.0, &detail.cards_without_pack, |ui, card| {
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
