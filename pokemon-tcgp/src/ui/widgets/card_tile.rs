// The most-reused building block: thumbnail, number/name (clickable),
// rarity badge, and a qty stepper that mutates directly instead of
// POSTing to /prints/{id}/increment|decrement. Mirrors
// templates/_card_tile.html.

use crate::app::Ctx;
use crate::card_tile::CardTileData;
use crate::queries::mutations::adjust_owned_quantity;
use crate::ui::widgets::image::uri_for;
use crate::ui::widgets::rarity_color;

pub enum CardTileAction {
    None,
    Clicked,
    Mutated,
}

// Mirrors .card-tile-owned / .card-tile-missing in globals.css:
// color-mix(in srgb, #22c55e/#ef4444 14%/12%, var(--surface)).
const OWNED_TINT: egui::Color32 = egui::Color32::from_rgba_unmultiplied_const(34, 197, 94, 36);
const MISSING_TINT: egui::Color32 = egui::Color32::from_rgba_unmultiplied_const(239, 68, 68, 31);

pub fn render(ui: &mut egui::Ui, ctx: &Ctx, card: &CardTileData) -> CardTileAction {
    let mut action = CardTileAction::None;

    let frame = egui::Frame::group(ui.style()).fill(if card.is_complete {
        OWNED_TINT
    } else {
        MISSING_TINT
    });
    frame.show(ui, |ui| {
        ui.set_width(160.0);
        ui.vertical(|ui| {
            // All card art is 367x512 (ratio 0.717): at the card's 160px
            // width that's 160x223.2. Fixed size (maintain_aspect_ratio(false))
            // avoids depending on the loaded texture's size - while it's
            // still loading asynchronously egui falls back to a 24x24
            // placeholder instead, so the tile would render inconsistently
            // sized for a frame or more.
            ui.add(
                egui::Image::new(uri_for(ctx.images_root, &card.image_url))
                    .fit_to_exact_size(egui::vec2(160.0, 223.2))
                    .maintain_aspect_ratio(false),
            );

            if ui.link(format!("#{} {}", card.number, card.name)).clicked() {
                action = CardTileAction::Clicked;
            }
            ui.colored_label(rarity_color(card.rarity_css_class), card.rarity_label);

            ui.columns(3, |columns| {
                columns[0].with_layout(egui::Layout::left_to_right(egui::Align::Center), |ui| {
                    if ui.button("−").on_hover_text(&card.decrease_aria_label).clicked() {
                        let _ = ctx.rt.block_on(adjust_owned_quantity(ctx.pool, card.print_id, -1));
                        action = CardTileAction::Mutated;
                    }
                });
                columns[1].with_layout(
                    egui::Layout::centered_and_justified(egui::Direction::LeftToRight),
                    |ui| {
                        ui.label(&card.qty_label);
                    },
                );
                columns[2].with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.button("+").on_hover_text(&card.increase_aria_label).clicked() {
                        let _ = ctx.rt.block_on(adjust_owned_quantity(ctx.pool, card.print_id, 1));
                        action = CardTileAction::Mutated;
                    }
                });
            });
        });
    });

    action
}
