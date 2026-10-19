// App state and navigation (stages b-f of the egui rewrite, see
// docs/rust-migration-plan.md). One `Screen` variant per former route;
// no navigation stack - each variant already carries the fields needed to
// rebuild its own breadcrumb, same as the deleted Askama templates did.

use std::path::{Path, PathBuf};

use sqlx::SqlitePool;
use tokio::runtime::Runtime;

use crate::locale::Locale;
use crate::queries;
use crate::settings;
use crate::ui;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Screen {
    Collections,
    CollectionDetail { code: String },
    CollectionCards { code: String },
    CardDetail { code: String, number: i64 },
    PackDetail { code: String, pack: String },
    Decks,
    DeckDetail { slug: String },
}

pub enum ScreenData {
    Collections(Vec<queries::collections::CollectionSummary>),
    CollectionDetail(queries::collections::CollectionDetail),
    CollectionCards(queries::collections::CollectionCards),
    CardDetail(queries::cards::CardDetail),
    PackDetail(queries::packs::PackDetail),
    Decks(Vec<queries::decks::DeckSummary>),
    DeckDetail(queries::decks::DeckDetail),
    NotFound,
    Error(String),
}

// What a screen/widget wants the app to do next: either navigate, or just
// reload the current screen's data (after a mutation) without changing
// which screen is showing.
pub enum Nav {
    Goto(Screen),
    Back,
    Reload,
}

// Bundles what every screen/widget render function needs, so it's one
// parameter instead of four. All blocking calls through `rt`/`pool` happen
// on click (navigation or mutation), never once per frame - see the
// "async/sync bridge" decision in docs/rust-migration-plan.md.
pub struct Ctx<'a> {
    pub pool: &'a SqlitePool,
    pub rt: &'a Runtime,
    pub locale: Locale,
    pub images_root: &'a Path,
}

pub struct App {
    pool: SqlitePool,
    rt: Runtime,
    locale: Locale,
    images_root: PathBuf,
    screen: Screen,
    data: ScreenData,
    // Screens navigated away from via `Nav::Goto`, most recent last - popped
    // by `Nav::Back`. `Nav::Reload` (re-running a mutation's own screen)
    // never touches this, so toggling a star/quantity doesn't add a step.
    history: Vec<Screen>,
}

impl App {
    pub fn new(pool: SqlitePool, rt: Runtime, locale: Locale, images_root: PathBuf) -> Self {
        let mut app = Self {
            pool,
            rt,
            locale,
            images_root,
            screen: Screen::Collections,
            data: ScreenData::Collections(Vec::new()),
            history: Vec::new(),
        };
        app.reload();
        app
    }

    fn ctx(&self) -> Ctx<'_> {
        Ctx {
            pool: &self.pool,
            rt: &self.rt,
            locale: self.locale,
            images_root: &self.images_root,
        }
    }

    fn goto(&mut self, screen: Screen) {
        self.history.push(self.screen.clone());
        self.data = self.load(&screen);
        self.screen = screen;
    }

    fn go_back(&mut self) {
        if let Some(previous) = self.history.pop() {
            self.data = self.load(&previous);
            self.screen = previous;
        }
    }

    fn reload(&mut self) {
        self.data = self.load(&self.screen.clone());
    }

    fn load(&self, screen: &Screen) -> ScreenData {
        let pool = &self.pool;
        let locale = self.locale;
        match screen {
            Screen::Collections => {
                match self.rt.block_on(queries::collections::get_collections(pool, locale)) {
                    Ok(list) => ScreenData::Collections(list),
                    Err(err) => ScreenData::Error(err.to_string()),
                }
            }
            Screen::CollectionDetail { code } => match self
                .rt
                .block_on(queries::collections::get_collection_detail(pool, code, locale))
            {
                Ok(Some(detail)) => ScreenData::CollectionDetail(detail),
                Ok(None) => ScreenData::NotFound,
                Err(err) => ScreenData::Error(err.to_string()),
            },
            Screen::CollectionCards { code } => match self
                .rt
                .block_on(queries::collections::get_collection_cards(pool, code, locale))
            {
                Ok(Some(cards)) => ScreenData::CollectionCards(cards),
                Ok(None) => ScreenData::NotFound,
                Err(err) => ScreenData::Error(err.to_string()),
            },
            Screen::CardDetail { code, number } => match self
                .rt
                .block_on(queries::cards::get_card_detail(pool, code, *number, locale))
            {
                Ok(Some(detail)) => ScreenData::CardDetail(detail),
                Ok(None) => ScreenData::NotFound,
                Err(err) => ScreenData::Error(err.to_string()),
            },
            Screen::PackDetail { code, pack } => match self
                .rt
                .block_on(queries::packs::get_pack_detail(pool, code, pack, locale))
            {
                Ok(Some(detail)) => ScreenData::PackDetail(detail),
                Ok(None) => ScreenData::NotFound,
                Err(err) => ScreenData::Error(err.to_string()),
            },
            Screen::Decks => match self.rt.block_on(queries::decks::get_decks(pool, locale)) {
                Ok(list) => ScreenData::Decks(list),
                Err(err) => ScreenData::Error(err.to_string()),
            },
            Screen::DeckDetail { slug } => {
                match self.rt.block_on(queries::decks::get_deck_detail(pool, slug, locale)) {
                    Ok(Some(detail)) => ScreenData::DeckDetail(detail),
                    Ok(None) => ScreenData::NotFound,
                    Err(err) => ScreenData::Error(err.to_string()),
                }
            }
        }
    }

    fn apply(&mut self, nav: Nav) {
        match nav {
            Nav::Goto(screen) => self.goto(screen),
            Nav::Back => self.go_back(),
            Nav::Reload => self.reload(),
        }
    }

    fn set_locale(&mut self, locale: Locale) {
        if locale == self.locale {
            return;
        }
        self.locale = locale;
        // Best-effort persistence: if the write fails the UI still switches
        // language for this session, it just won't stick on next launch.
        let _ = self.rt.block_on(settings::set_locale(&self.pool, locale));
        self.reload();
    }
}

impl eframe::App for App {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let mut nav = None;
        let mut new_locale = None;

        egui::Panel::top("chrome").show(ui, |ui| {
            let outcome = ui::chrome::render(ui, self.locale, !self.history.is_empty());
            new_locale = outcome.locale;
            nav = outcome.nav;
        });

        egui::CentralPanel::default().show(ui, |ui| {
            egui::ScrollArea::vertical().auto_shrink([false, false]).show(ui, |ui| {
                let ctx = self.ctx();
                let screen_nav = match &self.data {
                    ScreenData::Collections(list) => ui::screens::collections::render(ui, &ctx, list),
                    ScreenData::CollectionDetail(detail) => {
                        ui::screens::collection_detail::render(ui, &ctx, detail)
                    }
                    ScreenData::CollectionCards(cards) => {
                        ui::screens::collection_cards::render(ui, &ctx, cards)
                    }
                    ScreenData::CardDetail(detail) => ui::screens::card_detail::render(ui, &ctx, detail),
                    ScreenData::PackDetail(detail) => ui::screens::pack_detail::render(ui, &ctx, detail),
                    ScreenData::Decks(list) => ui::screens::decks::render(ui, &ctx, list),
                    ScreenData::DeckDetail(detail) => ui::screens::deck_detail::render(ui, &ctx, detail),
                    ScreenData::NotFound => {
                        ui.heading("404");
                        None
                    }
                    ScreenData::Error(message) => {
                        ui.colored_label(egui::Color32::RED, message);
                        None
                    }
                };
                if screen_nav.is_some() {
                    nav = screen_nav;
                }
            });
        });

        if let Some(locale) = new_locale {
            self.set_locale(locale);
        } else if let Some(nav) = nav {
            self.apply(nav);
        }
    }
}
