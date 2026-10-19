// Mirrors templates/decks_list.html.

use crate::app::{Ctx, Nav, Screen};
use crate::i18n::dictionaries::get_dictionary;
use crate::queries::decks::DeckSummary;
use crate::queries::mutations::toggle_deck_built;
use crate::ui::widgets::card_grid;

pub fn render(ui: &mut egui::Ui, ctx: &Ctx, decks: &[DeckSummary]) -> Option<Nav> {
    let dict = get_dictionary(ctx.locale);
    let mut nav = None;

    ui.heading(dict.decks_page.title);
    ui.label(dict.decks_page.subtitle);
    ui.separator();

    if decks.is_empty() {
        // The web empty-state pointed at `npm run sync:decks`, a dev-only
        // script that doesn't apply to a desktop app - just the prefix.
        ui.label(dict.decks_page.empty_state_prefix);
    } else {
        let card_inner_spacing = ui.spacing().item_spacing;
        ui.spacing_mut().item_spacing = egui::vec2(20.0, 20.0);

        card_grid(ui, 240.0, decks, |ui, deck| {
            // The star toggles `is_built` rather than navigating, so its own
            // click must not also count as a click on the card below.
            let mut star_clicked = false;
            let group = ui.group(|ui| {
                // The 20px gap above is for between cards; restore the
                // tighter default for the lines stacked inside this one.
                ui.spacing_mut().item_spacing = card_inner_spacing;
                ui.set_width(240.0);
                ui.vertical(|ui| {
                    ui.horizontal(|ui| {
                        let star = if deck.is_built { "★" } else { "☆" };
                        let hover = if deck.is_built {
                            dict.deck_star.unmark
                        } else {
                            dict.deck_star.mark
                        };
                        if ui.button(star).on_hover_text(hover).clicked() {
                            star_clicked = true;
                            let _ = ctx.rt.block_on(toggle_deck_built(ctx.pool, deck.id));
                            nav = Some(Nav::Reload);
                        }
                        ui.label(&deck.display_name);
                    });
                    ui.label(format!(
                        "{} {} · {} {}",
                        deck.popularity_label,
                        dict.decks_list.meta_share_suffix,
                        deck.expected_win_rate_label,
                        dict.decks_list.expected_win_rate_suffix
                    ));
                    ui.label(format!(
                        "{}/{} {}",
                        deck.sufficient_count, deck.total_cards, dict.decks_list.sufficient_cards_label
                    ));
                    if !deck.elements_label.is_empty() {
                        ui.label(&deck.elements_label);
                    }
                });
            });
            let card = group
                .response
                .interact(egui::Sense::click())
                .on_hover_cursor(egui::CursorIcon::PointingHand);
            if card.clicked() && !star_clicked {
                nav = Some(Nav::Goto(Screen::DeckDetail {
                    slug: deck.slug.clone(),
                }));
            }
        });
    }

    nav
}
