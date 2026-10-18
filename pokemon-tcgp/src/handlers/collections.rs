use askama::Template;
use axum::extract::State;
use axum::http::StatusCode;
use axum_extra::extract::cookie::CookieJar;

use crate::i18n::dictionaries::get_dictionary;
use crate::locale::Locale;
use crate::queries::collections::{get_collections, CollectionSummary};
use crate::web::Render;
use crate::AppState;

#[derive(Template)]
#[template(path = "collections_list.html")]
pub struct CollectionsListTemplate {
    pub html_lang: &'static str,
    pub meta_title: &'static str,
    pub meta_description: &'static str,
    pub home_link: &'static str,
    pub decks_link: &'static str,
    pub title: &'static str,
    pub subtitle: &'static str,
    pub cards_label: &'static str,
    pub total_cards_label: &'static str,
    pub collections: Vec<CollectionSummary>,
}

pub async fn index(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<Render<CollectionsListTemplate>, (StatusCode, String)> {
    let locale = Locale::from_cookie(&jar);
    let dict = get_dictionary(locale);

    let collections = get_collections(&state.pool, locale)
        .await
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;

    Ok(Render(CollectionsListTemplate {
        html_lang: dict.layout.html_lang,
        meta_title: dict.layout.meta_title,
        meta_description: dict.layout.meta_description,
        home_link: dict.layout.home_link,
        decks_link: dict.layout.decks_link,
        title: dict.home.title,
        subtitle: dict.home.subtitle,
        cards_label: dict.card_count_lines.cards_label,
        total_cards_label: dict.card_count_lines.total_cards_label,
        collections,
    }))
}
