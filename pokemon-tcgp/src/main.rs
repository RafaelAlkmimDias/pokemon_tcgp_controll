mod app;
mod card_tile;
mod cardstats;
mod db;
mod display;
mod i18n;
mod images;
mod locale;
mod models;
mod queries;
mod settings;
#[cfg(test)]
mod test_support;
mod ui;

use std::path::PathBuf;

fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let rt = tokio::runtime::Runtime::new()?;

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "data/pokemon_tcgp.db".into());
    let pool = rt.block_on(db::connect(&db_path))?;
    let locale = rt.block_on(settings::get_locale(&pool))?;

    let images_root =
        PathBuf::from(std::env::var("IMAGES_PATH").unwrap_or_else(|_| "public/images".into()));

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([1100.0, 750.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Pokémon TCG Pocket",
        options,
        Box::new(move |cc| {
            egui_extras::install_image_loaders(&cc.egui_ctx);
            Ok(Box::new(app::App::new(pool, rt, locale, images_root)))
        }),
    )
    .map_err(|err| anyhow::anyhow!(err.to_string()))?;

    Ok(())
}
