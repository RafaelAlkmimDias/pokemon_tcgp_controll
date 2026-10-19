// Mirrors getCollections/getCollectionDetail/getCollectionCards in
// src/lib/queries.ts.

use sqlx::SqlitePool;
use std::collections::HashMap;

use crate::card_tile::CardTileData;
use crate::cardstats::{compute_card_stats, CardStats};
use crate::display::format_date;
use crate::i18n::dictionaries::{home_packs_count, home_series};
use crate::images::pack_image_url;
use crate::locale::Locale;
use crate::models::Rarity;
use crate::queries::resolve_name;

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

// Mirrors getCollectionDetail.

pub struct CollectionDetail {
    pub code: String,
    pub name: String,
    pub release_date_label: String,
    pub stats: CardStats,
    pub packs: Vec<CollectionDetailPack>,
    pub cards_without_pack: Vec<CardTileData>,
}

pub struct CollectionDetailPack {
    // Raw English name - a pack has no separate code, so this doubles as
    // its routing key (mirrors resolvePackName's doc comment in queries.ts).
    pub name: String,
    pub display_name: String,
    pub image_url: Option<String>,
    pub stats: CardStats,
}

#[derive(sqlx::FromRow)]
struct CollectionLookupRow {
    id: i64,
    code: String,
    name: String,
    name_pt: Option<String>,
    release_date: Option<String>,
}

#[derive(sqlx::FromRow)]
struct PackRow {
    id: i64,
    name: String,
    name_pt: Option<String>,
}

#[derive(sqlx::FromRow)]
struct CollectionCardRow {
    id: i64,
    print_id: i64,
    number: i64,
    name: String,
    name_pt: Option<String>,
    rarity: Rarity,
    owned_quantity: i64,
    pack_id: Option<i64>,
}

pub async fn get_collection_detail(
    pool: &SqlitePool,
    code: &str,
    locale: Locale,
) -> anyhow::Result<Option<CollectionDetail>> {
    let collection: Option<CollectionLookupRow> = sqlx::query_as(
        "SELECT id, code, name, name_pt, release_date FROM collections WHERE code = ?1",
    )
    .bind(code)
    .fetch_optional(pool)
    .await?;

    let Some(collection) = collection else {
        return Ok(None);
    };

    let packs: Vec<PackRow> = sqlx::query_as(
        "SELECT id, name, name_pt FROM packs WHERE collection_id = ?1 ORDER BY name ASC",
    )
    .bind(collection.id)
    .fetch_all(pool)
    .await?;

    // LEFT JOIN so a card with no pack still comes back (with a NULL
    // pack_id) instead of being dropped; a card in several packs repeats
    // once per pack, grouped back below.
    let card_rows: Vec<CollectionCardRow> = sqlx::query_as(
        r#"
        SELECT
          cards.id, cards.print_id, cards.number, cards.name, cards.name_pt, cards.rarity,
          prints.owned_quantity, card_packs.pack_id
        FROM cards
        JOIN prints ON prints.id = cards.print_id
        LEFT JOIN card_packs ON card_packs.card_id = cards.id
        WHERE cards.collection_id = ?1
        ORDER BY cards.number ASC
        "#,
    )
    .bind(collection.id)
    .fetch_all(pool)
    .await?;

    let mut card_order: Vec<i64> = Vec::new();
    let mut card_by_id: HashMap<i64, &CollectionCardRow> = HashMap::new();
    let mut card_pack_ids: HashMap<i64, Vec<i64>> = HashMap::new();
    for row in &card_rows {
        card_by_id.entry(row.id).or_insert_with(|| {
            card_order.push(row.id);
            row
        });
        if let Some(pack_id) = row.pack_id {
            card_pack_ids.entry(row.id).or_default().push(pack_id);
        }
    }

    let all_stats_input: Vec<(Rarity, i64)> = card_order
        .iter()
        .map(|id| {
            let row = card_by_id[id];
            (row.rarity, row.owned_quantity)
        })
        .collect();

    let mut cards_by_pack_id: HashMap<i64, Vec<(Rarity, i64)>> = HashMap::new();
    let mut cards_without_pack = Vec::new();
    for id in &card_order {
        let row = card_by_id[id];
        match card_pack_ids.get(id) {
            None => {
                let name = resolve_name(&row.name, row.name_pt.as_deref(), locale);
                cards_without_pack.push(CardTileData::owned_only(
                    &collection.code,
                    row.print_id,
                    row.number,
                    name,
                    row.rarity,
                    row.owned_quantity,
                    locale,
                ));
            }
            Some(pack_ids) => {
                for pack_id in pack_ids {
                    cards_by_pack_id
                        .entry(*pack_id)
                        .or_default()
                        .push((row.rarity, row.owned_quantity));
                }
            }
        }
    }

    let detail_packs = packs
        .into_iter()
        .map(|pack| {
            let stats_input = cards_by_pack_id.remove(&pack.id).unwrap_or_default();
            CollectionDetailPack {
                display_name: resolve_name(&pack.name, pack.name_pt.as_deref(), locale),
                image_url: pack_image_url(&pack.name),
                name: pack.name,
                stats: compute_card_stats(&stats_input),
            }
        })
        .collect();

    Ok(Some(CollectionDetail {
        name: resolve_name(&collection.name, collection.name_pt.as_deref(), locale),
        release_date_label: format_date(collection.release_date.as_deref(), locale),
        code: collection.code,
        stats: compute_card_stats(&all_stats_input),
        packs: detail_packs,
        cards_without_pack,
    }))
}

// Mirrors getCollectionCards.

pub struct CollectionCards {
    pub code: String,
    pub name: String,
    pub stats: CardStats,
    pub cards: Vec<CardTileData>,
}

#[derive(sqlx::FromRow)]
struct PlainCardRow {
    print_id: i64,
    number: i64,
    name: String,
    name_pt: Option<String>,
    rarity: Rarity,
    owned_quantity: i64,
}

pub async fn get_collection_cards(
    pool: &SqlitePool,
    code: &str,
    locale: Locale,
) -> anyhow::Result<Option<CollectionCards>> {
    let collection: Option<CollectionLookupRow> = sqlx::query_as(
        "SELECT id, code, name, name_pt, release_date FROM collections WHERE code = ?1",
    )
    .bind(code)
    .fetch_optional(pool)
    .await?;

    let Some(collection) = collection else {
        return Ok(None);
    };

    let rows: Vec<PlainCardRow> = sqlx::query_as(
        r#"
        SELECT cards.print_id, cards.number, cards.name, cards.name_pt, cards.rarity, prints.owned_quantity
        FROM cards
        JOIN prints ON prints.id = cards.print_id
        WHERE cards.collection_id = ?1
        ORDER BY cards.number ASC
        "#,
    )
    .bind(collection.id)
    .fetch_all(pool)
    .await?;

    let stats_input: Vec<(Rarity, i64)> = rows.iter().map(|r| (r.rarity, r.owned_quantity)).collect();

    let cards = rows
        .into_iter()
        .map(|row| {
            let name = resolve_name(&row.name, row.name_pt.as_deref(), locale);
            CardTileData::owned_only(
                &collection.code,
                row.print_id,
                row.number,
                name,
                row.rarity,
                row.owned_quantity,
                locale,
            )
        })
        .collect();

    Ok(Some(CollectionCards {
        name: resolve_name(&collection.name, collection.name_pt.as_deref(), locale),
        code: collection.code,
        stats: compute_card_stats(&stats_input),
        cards,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connect_for_test;
    use crate::test_support::{insert_card, insert_collection, insert_pack, insert_print, link_card_pack, NewCard};

    async fn seed(pool: &SqlitePool) -> (i64, i64) {
        let a1 = insert_collection(
            pool,
            "A1",
            "Genetic Apex",
            Some("Ápice Genético"),
            "Series A",
            Some("2024-01-30"),
        )
        .await;
        let a2 = insert_collection(pool, "A2", "Mythical Island", None, "Series A", Some("2024-03-01")).await;

        let pack1 = insert_pack(pool, a1, "Charizard", None).await;
        let pack2 = insert_pack(pool, a1, "Pikachu", None).await;

        let print1 = insert_print(pool, "p1", 1).await;
        let print2 = insert_print(pool, "p2", 0).await;
        let print3 = insert_print(pool, "p3", 2).await;

        let card1 = insert_card(pool, NewCard::new(a1, print1, 1, "Bulbasaur")).await;
        link_card_pack(pool, card1, pack1).await;

        let card2 = insert_card(pool, NewCard::new(a1, print2, 2, "Charmander")).await;
        link_card_pack(pool, card2, pack2).await;

        // Card with no pack at all - must still show up (LEFT JOIN), bucketed
        // into `cards_without_pack` rather than dropped.
        insert_card(pool, NewCard::new(a1, print3, 3, "Squirtle")).await;

        (a1, a2)
    }

    #[tokio::test]
    async fn get_collections_orders_by_release_date_desc_and_resolves_locale() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let summaries = get_collections(&pool, Locale::En).await.unwrap();
        assert_eq!(summaries.len(), 2);
        // A2 released later than A1, so it must come first.
        assert_eq!(summaries[0].code, "A2");
        assert_eq!(summaries[1].code, "A1");

        let pt_summaries = get_collections(&pool, Locale::Pt).await.unwrap();
        assert_eq!(
            pt_summaries.iter().find(|s| s.code == "A1").unwrap().name,
            "Ápice Genético"
        );
        // A2 has no name_pt - must fall back to the English name, not panic
        // or show an empty string.
        assert_eq!(
            pt_summaries.iter().find(|s| s.code == "A2").unwrap().name,
            "Mythical Island"
        );
    }

    #[tokio::test]
    async fn get_collections_aggregates_pack_count_and_card_stats_per_collection() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let summaries = get_collections(&pool, Locale::En).await.unwrap();
        let a1 = summaries.iter().find(|s| s.code == "A1").unwrap();
        assert_eq!(a1.pack_count, 2);
        assert_eq!(a1.stats.all_total, 3);
        // print1 (qty 1) and print3 (qty 2) are owned, print2 (qty 0) isn't.
        assert_eq!(a1.stats.all_owned, 2);

        let a2 = summaries.iter().find(|s| s.code == "A2").unwrap();
        assert_eq!(a2.pack_count, 0);
        assert_eq!(a2.stats.all_total, 0);
    }

    #[tokio::test]
    async fn get_collection_detail_returns_none_for_unknown_code() {
        let (pool, _dir) = connect_for_test().await;
        assert!(get_collection_detail(&pool, "NOPE", Locale::En)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn get_collection_detail_groups_cards_by_pack_and_leaves_packless_cards_aside() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let detail = get_collection_detail(&pool, "A1", Locale::En)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(detail.packs.len(), 2);
        assert_eq!(detail.cards_without_pack.len(), 1);
        assert_eq!(detail.cards_without_pack[0].name, "Squirtle");

        let charizard_pack = detail.packs.iter().find(|p| p.name == "Charizard").unwrap();
        assert_eq!(charizard_pack.stats.all_total, 1);
        assert_eq!(charizard_pack.stats.all_owned, 1);
    }

    #[tokio::test]
    async fn get_collection_cards_returns_none_for_unknown_code() {
        let (pool, _dir) = connect_for_test().await;
        assert!(get_collection_cards(&pool, "NOPE", Locale::En)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn get_collection_cards_lists_every_card_ordered_by_number() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let cards = get_collection_cards(&pool, "A1", Locale::En)
            .await
            .unwrap()
            .unwrap();
        let numbers: Vec<i64> = cards.cards.iter().map(|c| c.number).collect();
        assert_eq!(numbers, vec![1, 2, 3]);
    }
}
