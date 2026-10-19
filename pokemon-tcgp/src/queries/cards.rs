// Mirrors getCardDetail in src/lib/queries.ts.

use sqlx::SqlitePool;

use crate::display::{element_label, rarity_label, type_label};
use crate::images::card_image_url;
use crate::locale::Locale;
use crate::models::{CardType, Rarity};
use crate::queries::resolve_name;

pub struct CardDetail {
    pub collection_code: String,
    pub collection_name: String,
    pub image_url: String,
    pub number: i64,
    pub name: String,
    pub rarity_label: &'static str,
    pub rarity_css_class: &'static str,
    pub type_label: Option<&'static str>,
    pub element_label: Option<String>,
    pub stage_value: Option<String>,
    pub evolves_from: Option<String>,
    pub health: Option<i64>,
    pub retreat_cost: Option<i64>,
    pub weakness: Option<String>,
    pub is_pack_exclusive: bool,
    pub packs: Vec<CardDetailPack>,
    pub sibling_cards: Vec<SiblingCard>,
}

pub struct CardDetailPack {
    pub name: String,
    pub display_name: String,
}

pub struct SiblingCard {
    pub collection_code: String,
    pub collection_name: String,
    pub number: i64,
}

#[derive(sqlx::FromRow)]
struct CollectionRow {
    id: i64,
    code: String,
    name: String,
    name_pt: Option<String>,
    pack_count: i64,
}

#[derive(sqlx::FromRow)]
struct CardRow {
    id: i64,
    print_id: i64,
    number: i64,
    name: String,
    name_pt: Option<String>,
    rarity: Rarity,
    #[sqlx(rename = "type")]
    card_type: Option<CardType>,
    element: Option<String>,
    stage: Option<String>,
    health: Option<i64>,
    retreat_cost: Option<i64>,
    weakness: Option<String>,
    evolves_from: Option<String>,
}

#[derive(sqlx::FromRow)]
struct PackRow {
    name: String,
    name_pt: Option<String>,
}

#[derive(sqlx::FromRow)]
struct SiblingRow {
    number: i64,
    code: String,
    name: String,
    name_pt: Option<String>,
}

// Mirrors cardDetailStageValue in src/lib/i18n/dictionaries.ts (the "basic"
// vs "stage N" wording lives in display.rs so it stays with the other
// dynamic dictionary strings).
fn stage_value(locale: Locale, stage: &str) -> String {
    crate::i18n::dictionaries::card_detail_stage_value(locale, stage)
}

pub async fn get_card_detail(
    pool: &SqlitePool,
    collection_code: &str,
    number: i64,
    locale: Locale,
) -> anyhow::Result<Option<CardDetail>> {
    let collection: Option<CollectionRow> = sqlx::query_as(
        r#"
        SELECT
          c.id, c.code, c.name, c.name_pt,
          (SELECT COUNT(*) FROM packs WHERE packs.collection_id = c.id) as pack_count
        FROM collections c
        WHERE c.code = ?1
        "#,
    )
    .bind(collection_code)
    .fetch_optional(pool)
    .await?;

    let Some(collection) = collection else {
        return Ok(None);
    };

    let card: Option<CardRow> = sqlx::query_as(
        r#"
        SELECT id, print_id, number, name, name_pt, rarity, type, element, stage,
               health, retreat_cost, weakness, evolves_from
        FROM cards
        WHERE collection_id = ?1 AND number = ?2
        "#,
    )
    .bind(collection.id)
    .bind(number)
    .fetch_optional(pool)
    .await?;

    let Some(card) = card else {
        return Ok(None);
    };

    let pack_rows: Vec<PackRow> = sqlx::query_as(
        r#"
        SELECT packs.name, packs.name_pt
        FROM card_packs
        JOIN packs ON packs.id = card_packs.pack_id
        WHERE card_packs.card_id = ?1
        ORDER BY packs.name ASC
        "#,
    )
    .bind(card.id)
    .fetch_all(pool)
    .await?;

    let sibling_rows: Vec<SiblingRow> = sqlx::query_as(
        r#"
        SELECT cards.number, collections.code, collections.name, collections.name_pt
        FROM cards
        JOIN collections ON collections.id = cards.collection_id
        WHERE cards.print_id = ?1 AND cards.id != ?2
        ORDER BY collections.release_date ASC
        "#,
    )
    .bind(card.print_id)
    .bind(card.id)
    .fetch_all(pool)
    .await?;

    let is_pack_exclusive = pack_rows.len() == 1 && collection.pack_count > 1;

    Ok(Some(CardDetail {
        collection_name: resolve_name(&collection.name, collection.name_pt.as_deref(), locale),
        image_url: card_image_url(&collection.code, card.number),
        name: resolve_name(&card.name, card.name_pt.as_deref(), locale),
        rarity_label: rarity_label(card.rarity, locale),
        rarity_css_class: card.rarity.css_class(),
        type_label: card.card_type.map(|t| type_label(t, locale)),
        element_label: card.element.as_deref().map(|e| element_label(e, locale)),
        stage_value: card.stage.as_deref().map(|s| stage_value(locale, s)),
        evolves_from: card.evolves_from,
        health: card.health,
        retreat_cost: card.retreat_cost,
        weakness: card.weakness,
        is_pack_exclusive,
        packs: pack_rows
            .into_iter()
            .map(|pack| CardDetailPack {
                display_name: resolve_name(&pack.name, pack.name_pt.as_deref(), locale),
                name: pack.name,
            })
            .collect(),
        sibling_cards: sibling_rows
            .into_iter()
            .map(|sibling| SiblingCard {
                collection_name: resolve_name(
                    &sibling.name,
                    sibling.name_pt.as_deref(),
                    locale,
                ),
                collection_code: sibling.code,
                number: sibling.number,
            })
            .collect(),
        number: card.number,
        collection_code: collection.code,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connect_for_test;
    use crate::test_support::{insert_card, insert_collection, insert_pack, insert_print, link_card_pack, NewCard};

    #[tokio::test]
    async fn get_card_detail_returns_none_for_unknown_collection_or_number() {
        let (pool, _dir) = connect_for_test().await;
        let a1 = insert_collection(&pool, "A1", "Genetic Apex", None, "Series A", None).await;
        let print1 = insert_print(&pool, "p1", 1).await;
        insert_card(&pool, NewCard::new(a1, print1, 1, "Bulbasaur")).await;

        assert!(get_card_detail(&pool, "NOPE", 1, Locale::En).await.unwrap().is_none());
        assert!(get_card_detail(&pool, "A1", 999, Locale::En).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn get_card_detail_resolves_fields_and_locale_dependent_labels() {
        let (pool, _dir) = connect_for_test().await;
        let a1 = insert_collection(&pool, "A1", "Genetic Apex", None, "Series A", None).await;
        let print1 = insert_print(&pool, "p1", 1).await;
        let mut card = NewCard::new(a1, print1, 5, "Mewtwo");
        card.card_type = Some("POKEMON");
        card.element = Some("fire");
        card.stage = Some("basic");
        card.health = Some(60);
        card.retreat_cost = Some(1);
        card.weakness = Some("water");
        insert_card(&pool, card).await;

        let detail = get_card_detail(&pool, "A1", 5, Locale::En)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(detail.name, "Mewtwo");
        assert_eq!(detail.type_label, Some("Pokémon"));
        assert_eq!(detail.element_label, Some("Fire".to_string()));
        assert_eq!(detail.stage_value, Some("Basic".to_string()));
        assert_eq!(detail.health, Some(60));
        assert_eq!(detail.retreat_cost, Some(1));
        assert_eq!(detail.weakness, Some("water".to_string()));
        assert_eq!(detail.image_url, "cards/a1/005.webp");
    }

    #[tokio::test]
    async fn is_pack_exclusive_only_when_card_has_exactly_one_pack_in_a_multi_pack_collection() {
        let (pool, _dir) = connect_for_test().await;
        let a1 = insert_collection(&pool, "A1", "Genetic Apex", None, "Series A", None).await;
        let pack1 = insert_pack(&pool, a1, "Charizard", None).await;
        let pack2 = insert_pack(&pool, a1, "Pikachu", None).await;

        let print1 = insert_print(&pool, "p1", 1).await;
        let exclusive_card = insert_card(&pool, NewCard::new(a1, print1, 1, "Exclusive")).await;
        link_card_pack(&pool, exclusive_card, pack1).await;

        let print2 = insert_print(&pool, "p2", 1).await;
        let shared_card = insert_card(&pool, NewCard::new(a1, print2, 2, "Shared")).await;
        link_card_pack(&pool, shared_card, pack1).await;
        link_card_pack(&pool, shared_card, pack2).await;

        let exclusive = get_card_detail(&pool, "A1", 1, Locale::En).await.unwrap().unwrap();
        assert!(exclusive.is_pack_exclusive);

        let shared = get_card_detail(&pool, "A1", 2, Locale::En).await.unwrap().unwrap();
        assert!(!shared.is_pack_exclusive);
    }

    #[tokio::test]
    async fn sibling_cards_are_other_cards_sharing_the_same_print() {
        let (pool, _dir) = connect_for_test().await;
        let a1 = insert_collection(&pool, "A1", "Genetic Apex", None, "Series A", Some("2024-01-01")).await;
        let a2 = insert_collection(&pool, "A2", "Mythical Island", None, "Series A", Some("2024-03-01")).await;

        let shared_print = insert_print(&pool, "shared", 1).await;
        insert_card(&pool, NewCard::new(a1, shared_print, 5, "Mewtwo")).await;
        insert_card(&pool, NewCard::new(a2, shared_print, 1, "Mewtwo Reprint")).await;

        let detail = get_card_detail(&pool, "A1", 5, Locale::En)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(detail.sibling_cards.len(), 1);
        assert_eq!(detail.sibling_cards[0].collection_code, "A2");
        assert_eq!(detail.sibling_cards[0].number, 1);
    }
}
