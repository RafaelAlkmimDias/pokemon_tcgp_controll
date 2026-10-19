// Mirrors getPackDetail in src/lib/queries.ts.

use sqlx::SqlitePool;

use crate::card_tile::CardTileData;
use crate::cardstats::{compute_card_stats, CardStats};
use crate::locale::Locale;
use crate::models::Rarity;
use crate::queries::resolve_name;

pub struct PackDetail {
    pub collection_code: String,
    pub collection_name: String,
    pub pack_display_name: String,
    pub stats: CardStats,
    pub cards: Vec<CardTileData>,
}

#[derive(sqlx::FromRow)]
struct CollectionRow {
    id: i64,
    code: String,
    name: String,
    name_pt: Option<String>,
}

#[derive(sqlx::FromRow)]
struct PackRow {
    id: i64,
    name: String,
    name_pt: Option<String>,
}

#[derive(sqlx::FromRow)]
struct CardRow {
    print_id: i64,
    number: i64,
    name: String,
    name_pt: Option<String>,
    rarity: Rarity,
    owned_quantity: i64,
}

pub async fn get_pack_detail(
    pool: &SqlitePool,
    collection_code: &str,
    pack_name: &str,
    locale: Locale,
) -> anyhow::Result<Option<PackDetail>> {
    let collection: Option<CollectionRow> =
        sqlx::query_as("SELECT id, code, name, name_pt FROM collections WHERE code = ?1")
            .bind(collection_code)
            .fetch_optional(pool)
            .await?;

    let Some(collection) = collection else {
        return Ok(None);
    };

    let pack: Option<PackRow> = sqlx::query_as(
        "SELECT id, name, name_pt FROM packs WHERE collection_id = ?1 AND name = ?2",
    )
    .bind(collection.id)
    .bind(pack_name)
    .fetch_optional(pool)
    .await?;

    let Some(pack) = pack else {
        return Ok(None);
    };

    let rows: Vec<CardRow> = sqlx::query_as(
        r#"
        SELECT cards.print_id, cards.number, cards.name, cards.name_pt, cards.rarity, prints.owned_quantity
        FROM card_packs
        JOIN cards ON cards.id = card_packs.card_id
        JOIN prints ON prints.id = cards.print_id
        WHERE card_packs.pack_id = ?1
        ORDER BY cards.number ASC
        "#,
    )
    .bind(pack.id)
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

    Ok(Some(PackDetail {
        collection_name: resolve_name(&collection.name, collection.name_pt.as_deref(), locale),
        collection_code: collection.code,
        pack_display_name: resolve_name(&pack.name, pack.name_pt.as_deref(), locale),
        stats: compute_card_stats(&stats_input),
        cards,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connect_for_test;
    use crate::test_support::{insert_card, insert_collection, insert_pack, insert_print, link_card_pack, NewCard};

    async fn seed(pool: &SqlitePool) -> (i64, i64, i64) {
        let a1 = insert_collection(pool, "A1", "Genetic Apex", None, "Series A", None).await;
        let charizard_pack = insert_pack(pool, a1, "Charizard", Some("Charizard PT")).await;
        let pikachu_pack = insert_pack(pool, a1, "Pikachu", None).await;

        let print1 = insert_print(pool, "p1", 1).await;
        let card1 = insert_card(pool, NewCard::new(a1, print1, 2, "Charmander")).await;
        link_card_pack(pool, card1, charizard_pack).await;

        let print2 = insert_print(pool, "p2", 0).await;
        let card2 = insert_card(pool, NewCard::new(a1, print2, 1, "Charizard")).await;
        link_card_pack(pool, card2, charizard_pack).await;

        // In a different pack entirely - must not leak into Charizard's list.
        let print3 = insert_print(pool, "p3", 1).await;
        let card3 = insert_card(pool, NewCard::new(a1, print3, 3, "Pikachu")).await;
        link_card_pack(pool, card3, pikachu_pack).await;

        (a1, charizard_pack, pikachu_pack)
    }

    #[tokio::test]
    async fn returns_none_for_unknown_collection_or_pack() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        assert!(get_pack_detail(&pool, "NOPE", "Charizard", Locale::En)
            .await
            .unwrap()
            .is_none());
        assert!(get_pack_detail(&pool, "A1", "Not A Pack", Locale::En)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn lists_only_cards_in_that_pack_ordered_by_number() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let detail = get_pack_detail(&pool, "A1", "Charizard", Locale::En)
            .await
            .unwrap()
            .unwrap();
        let numbers: Vec<i64> = detail.cards.iter().map(|c| c.number).collect();
        assert_eq!(numbers, vec![1, 2]);
        assert_eq!(detail.stats.all_total, 2);
        assert_eq!(detail.stats.all_owned, 1);
    }

    #[tokio::test]
    async fn resolves_pack_display_name_by_locale() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let en = get_pack_detail(&pool, "A1", "Charizard", Locale::En)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(en.pack_display_name, "Charizard");

        let pt = get_pack_detail(&pool, "A1", "Charizard", Locale::Pt)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(pt.pack_display_name, "Charizard PT");
    }
}
