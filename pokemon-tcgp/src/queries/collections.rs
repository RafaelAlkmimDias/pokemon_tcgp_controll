// Mirrors getCollections in src/lib/queries.ts.

use sqlx::SqlitePool;
use std::collections::HashMap;

use crate::cardstats::{compute_card_stats, CardStats};
use crate::display::format_date;
use crate::i18n::dictionaries::{home_packs_count, home_series};
use crate::locale::Locale;
use crate::models::Rarity;

pub struct CollectionSummary {
    pub code: String,
    pub name: String,
    pub series_label: String,
    pub release_date_label: String,
    pub pack_count: i64,
    pub packs_count_label: String,
    pub stats: CardStats,
}

#[derive(sqlx::FromRow)]
struct CollectionRow {
    id: i64,
    code: String,
    name: String,
    name_pt: Option<String>,
    series: String,
    release_date: Option<String>,
    pack_count: i64,
}

pub async fn get_collections(
    pool: &SqlitePool,
    locale: Locale,
) -> anyhow::Result<Vec<CollectionSummary>> {
    // Runtime-checked (not the `query_as!` macro): the macro needs either a
    // live DATABASE_URL or a committed `.sqlx` cache at compile time, which
    // would force every clone of this repo to set one up before `cargo
    // build` works. Not worth it for a single-user local app.
    let rows: Vec<CollectionRow> = sqlx::query_as(
        r#"
        SELECT
          c.id as id,
          c.code,
          c.name,
          c.name_pt,
          c.series,
          c.release_date,
          (SELECT COUNT(*) FROM packs WHERE packs.collection_id = c.id) as pack_count
        FROM collections c
        ORDER BY c.release_date DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let card_rows: Vec<(i64, Rarity, i64)> = sqlx::query_as(
        r#"
        SELECT cards.collection_id, cards.rarity, prints.owned_quantity
        FROM cards
        JOIN prints ON prints.id = cards.print_id
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut cards_by_collection: HashMap<i64, Vec<(Rarity, i64)>> = HashMap::new();
    for (collection_id, rarity, owned_quantity) in card_rows {
        cards_by_collection
            .entry(collection_id)
            .or_default()
            .push((rarity, owned_quantity));
    }

    Ok(rows
        .into_iter()
        .map(|row| {
            let name = if locale == Locale::Pt {
                row.name_pt.unwrap_or(row.name)
            } else {
                row.name
            };
            let cards = cards_by_collection.remove(&row.id).unwrap_or_default();
            CollectionSummary {
                code: row.code,
                name,
                series_label: home_series(locale, &row.series),
                release_date_label: format_date(row.release_date.as_deref(), locale),
                pack_count: row.pack_count,
                packs_count_label: home_packs_count(locale, row.pack_count),
                stats: compute_card_stats(&cards),
            }
        })
        .collect())
}
