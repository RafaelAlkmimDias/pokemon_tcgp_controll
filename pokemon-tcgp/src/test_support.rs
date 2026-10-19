// Shared fixture builders for the integration-style tests in `queries/*`.
// Only compiled under `cfg(test)` - see `db::connect_for_test` for why these
// hit a real temp-file SQLite instead of mocking sqlx.
#![cfg(test)]

use sqlx::SqlitePool;

pub async fn insert_collection(
    pool: &SqlitePool,
    code: &str,
    name: &str,
    name_pt: Option<&str>,
    series: &str,
    release_date: Option<&str>,
) -> i64 {
    sqlx::query(
        "INSERT INTO collections (code, name, name_pt, series, release_date) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(code)
    .bind(name)
    .bind(name_pt)
    .bind(series)
    .bind(release_date)
    .execute(pool)
    .await
    .unwrap()
    .last_insert_rowid()
}

pub async fn insert_pack(
    pool: &SqlitePool,
    collection_id: i64,
    name: &str,
    name_pt: Option<&str>,
) -> i64 {
    sqlx::query("INSERT INTO packs (collection_id, name, name_pt) VALUES (?1, ?2, ?3)")
        .bind(collection_id)
        .bind(name)
        .bind(name_pt)
        .execute(pool)
        .await
        .unwrap()
        .last_insert_rowid()
}

pub async fn insert_print(pool: &SqlitePool, image_url: &str, owned_quantity: i64) -> i64 {
    sqlx::query("INSERT INTO prints (image_url, owned_quantity) VALUES (?1, ?2)")
        .bind(image_url)
        .bind(owned_quantity)
        .execute(pool)
        .await
        .unwrap()
        .last_insert_rowid()
}

pub struct NewCard<'a> {
    pub collection_id: i64,
    pub print_id: i64,
    pub number: i64,
    pub name: &'a str,
    pub name_pt: Option<&'a str>,
    pub rarity: &'a str,
    pub card_type: Option<&'a str>,
    pub element: Option<&'a str>,
    pub stage: Option<&'a str>,
    pub health: Option<i64>,
    pub retreat_cost: Option<i64>,
    pub weakness: Option<&'a str>,
    pub evolves_from: Option<&'a str>,
}

impl<'a> NewCard<'a> {
    pub fn new(collection_id: i64, print_id: i64, number: i64, name: &'a str) -> Self {
        Self {
            collection_id,
            print_id,
            number,
            name,
            name_pt: None,
            rarity: "C",
            card_type: None,
            element: None,
            stage: None,
            health: None,
            retreat_cost: None,
            weakness: None,
            evolves_from: None,
        }
    }
}

pub async fn insert_card(pool: &SqlitePool, card: NewCard<'_>) -> i64 {
    sqlx::query(
        r#"
        INSERT INTO cards (
          collection_id, print_id, number, name, name_pt, rarity,
          type, element, stage, health, retreat_cost, weakness, evolves_from
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        "#,
    )
    .bind(card.collection_id)
    .bind(card.print_id)
    .bind(card.number)
    .bind(card.name)
    .bind(card.name_pt)
    .bind(card.rarity)
    .bind(card.card_type)
    .bind(card.element)
    .bind(card.stage)
    .bind(card.health)
    .bind(card.retreat_cost)
    .bind(card.weakness)
    .bind(card.evolves_from)
    .execute(pool)
    .await
    .unwrap()
    .last_insert_rowid()
}

pub async fn link_card_pack(pool: &SqlitePool, card_id: i64, pack_id: i64) {
    sqlx::query("INSERT INTO card_packs (card_id, pack_id) VALUES (?1, ?2)")
        .bind(card_id)
        .bind(pack_id)
        .execute(pool)
        .await
        .unwrap();
}

pub struct NewDeck<'a> {
    pub slug: &'a str,
    pub display_name: &'a str,
    pub popularity: f64,
    pub expected_win_rate: f64,
    pub meta_score: f64,
    pub is_built: bool,
}

impl<'a> NewDeck<'a> {
    pub fn new(slug: &'a str, display_name: &'a str) -> Self {
        Self {
            slug,
            display_name,
            popularity: 0.5,
            expected_win_rate: 0.5,
            meta_score: 0.5,
            is_built: false,
        }
    }
}

pub async fn insert_deck(pool: &SqlitePool, deck: NewDeck<'_>) -> i64 {
    sqlx::query(
        r#"
        INSERT INTO decks (slug, display_name, popularity, expected_win_rate, meta_score, is_built)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#,
    )
    .bind(deck.slug)
    .bind(deck.display_name)
    .bind(deck.popularity)
    .bind(deck.expected_win_rate)
    .bind(deck.meta_score)
    .bind(deck.is_built)
    .execute(pool)
    .await
    .unwrap()
    .last_insert_rowid()
}

pub async fn link_deck_card(pool: &SqlitePool, deck_id: i64, card_id: i64, quantity: i64) {
    sqlx::query("INSERT INTO deck_cards (deck_id, card_id, quantity) VALUES (?1, ?2, ?3)")
        .bind(deck_id)
        .bind(card_id)
        .bind(quantity)
        .execute(pool)
        .await
        .unwrap();
}
