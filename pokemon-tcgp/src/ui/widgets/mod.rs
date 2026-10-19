pub mod card_count_lines;
pub mod card_filter;
pub mod card_tile;
pub mod image;

/// `ui.horizontal_wrapped` only wraps widgets whose size is known before
/// they're drawn (buttons, labels, ...). Every card here is an auto-sized
/// `ui.group()`, which never triggers that wrap check - it would place all
/// items on a single row no matter how narrow the window is - so the grid
/// is built by hand: pick a column count from the available width, then lay
/// out complete rows.
pub fn card_grid<T>(
    ui: &mut egui::Ui,
    card_width: f32,
    items: &[T],
    mut render_item: impl FnMut(&mut egui::Ui, &T),
) {
    let spacing = ui.spacing().item_spacing.x;
    let columns = (((ui.available_width() + spacing) / (card_width + spacing)).floor() as usize).max(1);

    // Only rows inside (or just past) the scrolled viewport get rendered for
    // real; the rest reserve their layout space but skip `render_item`
    // entirely, so their images are never asked to load. egui_extras's file
    // loader spawns an OS thread per image the moment `egui::Image` is added
    // regardless of whether it ends up on-screen, so without this a
    // big collection would fire off hundreds of loads/decodes in one frame
    // and stall navigation. Rows come back into view - and start loading -
    // incrementally as the user scrolls, one screenful at a time.
    let clip_rect = ui.clip_rect();
    let mut row_height: Option<f32> = None;

    for row in items.chunks(columns) {
        let visible = row_height.is_none_or(|height| {
            let top = ui.next_widget_position().y;
            top <= clip_rect.bottom() + height && top + height >= clip_rect.top() - height
        });

        if visible {
            let response = ui.horizontal(|ui| {
                for item in row {
                    render_item(ui, item);
                }
            });
            row_height.get_or_insert(response.response.rect.height());
        } else {
            ui.allocate_space(egui::vec2(ui.available_width(), row_height.unwrap()));
        }
    }
}

// Replaces `Rarity::css_class()`'s CSS classes for the native UI only -
// `css_class()` itself is unchanged in models.rs (still read by
// `card_tile.rs::CardTileData.rarity_css_class`).
pub fn rarity_color(css_class: &str) -> egui::Color32 {
    match css_class {
        "rarity-epic" => egui::Color32::from_rgb(168, 85, 247),
        "rarity-legendary" => egui::Color32::from_rgb(234, 179, 8),
        _ => egui::Color32::GRAY,
    }
}
