// Mirrors getDecks/getDeckDetail in src/lib/queries.ts. getDecks's
// committed/available math is the most complex logic in the project - see
// the long comment below and src/lib/queries.ts lines 185-267.

use sqlx::SqlitePool;
use std::collections::{BTreeSet, HashMap};

use crate::card_tile::CardTileData;
use crate::display::{element_label, format_percent};
use crate::locale::Locale;
use crate::models::Rarity;
use crate::queries::resolve_name;

pub struct DeckSummary {
    pub id: i64,
    pub slug: String,
    pub display_name: String,
    pub is_built: bool,
    pub popularity_label: String,
    pub expected_win_rate_label: String,
    pub elements_label: String,
    pub total_cards: i64,
    pub sufficient_count: i64,
}

#[derive(sqlx::FromRow)]
struct DeckCardRow {
    deck_id: i64,
    slug: String,
    display_name: String,
    popularity: f64,
    expected_win_rate: f64,
    is_built: bool,
    print_id: i64,
    element: Option<String>,
    quantity: i64,
    owned_quantity: i64,
}

pub async fn get_decks(pool: &SqlitePool, locale: Locale) -> anyhow::Result<Vec<DeckSummary>> {
    // One row per (deck, deck_card). A deck with zero cards never appears -
    // matches the TS version, which would also show 0 total/0 sufficient
    // for such a deck, but that can't happen here since sync-decks.ts always
    // writes at least one DeckCard per Deck.
    let rows: Vec<DeckCardRow> = sqlx::query_as(
        r#"
        SELECT
          decks.id as deck_id, decks.slug, decks.display_name, decks.popularity,
          decks.expected_win_rate, decks.is_built,
          cards.print_id, cards.element, deck_cards.quantity, prints.owned_quantity
        FROM deck_cards
        JOIN decks ON decks.id = deck_cards.deck_id
        JOIN cards ON cards.id = deck_cards.card_id
        JOIN prints ON prints.id = cards.print_id
        ORDER BY decks.meta_score DESC, decks.popularity DESC, decks.id, deck_cards.card_id
        "#,
    )
    .fetch_all(pool)
    .await?;

    // Every print quantity committed by ANY built deck (not grouped by deck
    // yet - a deck subtracts its own share of this back out below so it
    // isn't penalized for having claimed its own cards).
    let mut committed_by_all_built: HashMap<i64, i64> = HashMap::new();
    for row in &rows {
        if row.is_built {
            *committed_by_all_built.entry(row.print_id).or_insert(0) += row.quantity;
        }
    }

    let mut order: Vec<i64> = Vec::new();
    let mut grouped: HashMap<i64, Vec<&DeckCardRow>> = HashMap::new();
    for row in &rows {
        if !grouped.contains_key(&row.deck_id) {
            order.push(row.deck_id);
        }
        grouped.entry(row.deck_id).or_default().push(row);
    }

    let mut summaries = Vec::with_capacity(order.len());
    for deck_id in order {
        let deck_rows = &grouped[&deck_id];
        let first = deck_rows[0];

        let mut committed_by_own: HashMap<i64, i64> = HashMap::new();
        if first.is_built {
            for row in deck_rows {
                *committed_by_own.entry(row.print_id).or_insert(0) += row.quantity;
            }
        }

        let mut sufficient_count = 0i64;
        let mut elements: BTreeSet<String> = BTreeSet::new();
        for row in deck_rows {
            if let Some(el) = &row.element {
                elements.insert(el.clone());
            }
            let committed_other = if first.is_built {
                committed_by_all_built.get(&row.print_id).copied().unwrap_or(0)
                    - committed_by_own.get(&row.print_id).copied().unwrap_or(0)
            } else {
                committed_by_all_built.get(&row.print_id).copied().unwrap_or(0)
            };
            let available = (row.owned_quantity - committed_other).max(0);
            if available >= row.quantity {
                sufficient_count += 1;
            }
        }

        let elements_label = elements
            .iter()
            .map(|e| element_label(e, locale))
            .collect::<Vec<_>>()
            .join(", ");

        summaries.push(DeckSummary {
            id: deck_id,
            slug: first.slug.clone(),
            display_name: first.display_name.clone(),
            is_built: first.is_built,
            popularity_label: format_percent(first.popularity),
            expected_win_rate_label: format_percent(first.expected_win_rate),
            elements_label,
            total_cards: deck_rows.len() as i64,
            sufficient_count,
        });
    }

    Ok(summaries)
}

pub struct DeckDetail {
    pub id: i64,
    pub display_name: String,
    pub is_built: bool,
    pub popularity_label: String,
    pub expected_win_rate_label: String,
    pub sufficient_count: i64,
    pub total_cards: i64,
    pub cards: Vec<CardTileData>,
}

#[derive(sqlx::FromRow)]
struct DeckRow {
    id: i64,
    display_name: String,
    popularity: f64,
    expected_win_rate: f64,
    is_built: bool,
}

#[derive(sqlx::FromRow)]
struct DeckDetailCardRow {
    print_id: i64,
    quantity: i64,
    owned_quantity: i64,
    number: i64,
    name: String,
    name_pt: Option<String>,
    rarity: Rarity,
    collection_code: String,
}

#[derive(sqlx::FromRow)]
struct CommittedRow {
    print_id: i64,
    total: i64,
}

pub async fn get_deck_detail(
    pool: &SqlitePool,
    slug: &str,
    locale: Locale,
) -> anyhow::Result<Option<DeckDetail>> {
    let deck: Option<DeckRow> = sqlx::query_as(
        "SELECT id, display_name, popularity, expected_win_rate, is_built FROM decks WHERE slug = ?1",
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    let Some(deck) = deck else {
        return Ok(None);
    };

    let card_rows: Vec<DeckDetailCardRow> = sqlx::query_as(
        r#"
        SELECT
          cards.print_id, deck_cards.quantity, prints.owned_quantity,
          cards.number, cards.name, cards.name_pt, cards.rarity, collections.code as collection_code
        FROM deck_cards
        JOIN cards ON cards.id = deck_cards.card_id
        JOIN prints ON prints.id = cards.print_id
        JOIN collections ON collections.id = cards.collection_id
        WHERE deck_cards.deck_id = ?1
        ORDER BY deck_cards.quantity DESC, cards.name ASC
        "#,
    )
    .bind(deck.id)
    .fetch_all(pool)
    .await?;

    let committed_rows: Vec<CommittedRow> = sqlx::query_as(
        r#"
        SELECT cards.print_id, SUM(deck_cards.quantity) as total
        FROM deck_cards
        JOIN decks ON decks.id = deck_cards.deck_id
        JOIN cards ON cards.id = deck_cards.card_id
        WHERE decks.is_built = 1 AND decks.id != ?1
        GROUP BY cards.print_id
        "#,
    )
    .bind(deck.id)
    .fetch_all(pool)
    .await?;

    let committed_by_other_built: HashMap<i64, i64> = committed_rows
        .into_iter()
        .map(|row| (row.print_id, row.total))
        .collect();

    let mut sufficient_count = 0i64;
    let cards = card_rows
        .into_iter()
        .map(|row| {
            let committed = committed_by_other_built.get(&row.print_id).copied().unwrap_or(0);
            let available = (row.owned_quantity - committed).max(0);
            if available >= row.quantity {
                sufficient_count += 1;
            }
            let name = resolve_name(&row.name, row.name_pt.as_deref(), locale);
            CardTileData::with_needed(
                &row.collection_code,
                row.print_id,
                row.number,
                name,
                row.rarity,
                available,
                row.quantity,
                locale,
            )
        })
        .collect::<Vec<_>>();

    Ok(Some(DeckDetail {
        id: deck.id,
        display_name: deck.display_name,
        is_built: deck.is_built,
        popularity_label: format_percent(deck.popularity),
        expected_win_rate_label: format_percent(deck.expected_win_rate),
        total_cards: cards.len() as i64,
        sufficient_count,
        cards,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connect_for_test;
    use crate::test_support::{
        insert_card, insert_collection, insert_print, link_deck_card, insert_deck, NewCard, NewDeck,
    };

    // A built deck reserves its own copies without being penalized by its
    // own reservation, but an unbuilt deck competing for the same print
    // sees its availability reduced by what the built deck has claimed -
    // this is the `committedByBuiltDecks`/`sufficientCount` logic ported
    // from src/lib/queries.ts (see the long comment above `get_decks`).
    async fn seed(pool: &SqlitePool) -> (i64, i64, i64, i64) {
        let collection = insert_collection(pool, "A1", "Genetic Apex", None, "Series A", None).await;

        let print_x = insert_print(pool, "px", 2).await;
        let mut card_x = NewCard::new(collection, print_x, 1, "Card X");
        card_x.element = Some("fire");
        let card_x = insert_card(pool, card_x).await;

        let print_y = insert_print(pool, "py", 5).await;
        let mut card_y = NewCard::new(collection, print_y, 2, "Card Y");
        card_y.element = Some("water");
        let card_y = insert_card(pool, card_y).await;

        let mut built = NewDeck::new("deck-built", "Deck Built");
        built.is_built = true;
        let deck_built = insert_deck(pool, built).await;
        link_deck_card(pool, deck_built, card_x, 2).await;

        let other = NewDeck::new("deck-other", "Deck Other");
        let deck_other = insert_deck(pool, other).await;
        link_deck_card(pool, deck_other, card_x, 1).await;
        link_deck_card(pool, deck_other, card_y, 3).await;

        (deck_built, deck_other, card_x, card_y)
    }

    #[tokio::test]
    async fn built_deck_does_not_penalize_itself_for_its_own_reservation() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let summaries = get_decks(&pool, Locale::En).await.unwrap();
        let built = summaries.iter().find(|d| d.slug == "deck-built").unwrap();
        assert_eq!(built.total_cards, 1);
        // owns 2, needs 2, and its own 2-copy reservation is subtracted back
        // out - if it weren't, this would read 0 and fail.
        assert_eq!(built.sufficient_count, 1);
    }

    #[tokio::test]
    async fn unbuilt_deck_loses_availability_to_a_built_decks_reservation() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let summaries = get_decks(&pool, Locale::En).await.unwrap();
        let other = summaries.iter().find(|d| d.slug == "deck-other").unwrap();
        assert_eq!(other.total_cards, 2);
        // card_x: owns 2, all 2 claimed by the built deck -> 0 available,
        // needs 1 -> insufficient. card_y: untouched -> sufficient.
        assert_eq!(other.sufficient_count, 1);
        assert_eq!(other.elements_label, "Fire, Water");
    }

    #[tokio::test]
    async fn get_deck_detail_mirrors_the_same_math_as_get_decks() {
        let (pool, _dir) = connect_for_test().await;
        seed(&pool).await;

        let built = get_deck_detail(&pool, "deck-built", Locale::En)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(built.sufficient_count, 1);

        let other = get_deck_detail(&pool, "deck-other", Locale::En)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(other.sufficient_count, 1);
        // Sorted by quantity DESC, so Card Y (needs 3) comes before Card X
        // (needs 1).
        assert_eq!(other.cards[0].name, "Card Y");
        assert_eq!(other.cards[1].name, "Card X");
    }

    #[tokio::test]
    async fn get_deck_detail_returns_none_for_unknown_slug() {
        let (pool, _dir) = connect_for_test().await;
        assert!(get_deck_detail(&pool, "nope", Locale::En).await.unwrap().is_none());
    }
}
