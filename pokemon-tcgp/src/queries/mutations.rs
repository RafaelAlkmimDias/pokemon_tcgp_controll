// Mirrors adjustOwnedQuantity/incrementOwnedQuantity/decrementOwnedQuantity/
// toggleDeckBuilt in src/lib/actions.ts. Unlike the Next.js version (a React
// server action invoked in place, no navigation), these are called from a
// plain HTML form POST and the handler redirects back afterwards - see
// docs/rust-migration-plan.md's "Mutations" decision.

use sqlx::SqlitePool;

// Returns false if the print doesn't exist, so the handler can 404 instead
// of silently no-op'ing.
pub async fn adjust_owned_quantity(
    pool: &SqlitePool,
    print_id: i64,
    delta: i64,
) -> anyhow::Result<bool> {
    let current: Option<i64> =
        sqlx::query_scalar("SELECT owned_quantity FROM prints WHERE id = ?1")
            .bind(print_id)
            .fetch_optional(pool)
            .await?;

    let Some(current) = current else {
        return Ok(false);
    };

    let next = (current + delta).max(0);
    sqlx::query("UPDATE prints SET owned_quantity = ?1, updated_at = datetime('now') WHERE id = ?2")
        .bind(next)
        .bind(print_id)
        .execute(pool)
        .await?;

    Ok(true)
}

pub async fn toggle_deck_built(pool: &SqlitePool, deck_id: i64) -> anyhow::Result<bool> {
    let current: Option<bool> = sqlx::query_scalar("SELECT is_built FROM decks WHERE id = ?1")
        .bind(deck_id)
        .fetch_optional(pool)
        .await?;

    let Some(current) = current else {
        return Ok(false);
    };

    sqlx::query("UPDATE decks SET is_built = ?1, updated_at = datetime('now') WHERE id = ?2")
        .bind(!current)
        .bind(deck_id)
        .execute(pool)
        .await?;

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connect_for_test;
    use crate::test_support::{insert_print, NewDeck, insert_deck};

    #[tokio::test]
    async fn increment_and_decrement_adjust_owned_quantity() {
        let (pool, _dir) = connect_for_test().await;
        let print_id = insert_print(&pool, "print-1", 2).await;

        assert!(adjust_owned_quantity(&pool, print_id, 1).await.unwrap());
        let qty: i64 = sqlx::query_scalar("SELECT owned_quantity FROM prints WHERE id = ?1")
            .bind(print_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(qty, 3);

        assert!(adjust_owned_quantity(&pool, print_id, -1).await.unwrap());
        let qty: i64 = sqlx::query_scalar("SELECT owned_quantity FROM prints WHERE id = ?1")
            .bind(print_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(qty, 2);
    }

    #[tokio::test]
    async fn decrement_clamps_at_zero_instead_of_going_negative() {
        let (pool, _dir) = connect_for_test().await;
        let print_id = insert_print(&pool, "print-1", 0).await;

        assert!(adjust_owned_quantity(&pool, print_id, -5).await.unwrap());
        let qty: i64 = sqlx::query_scalar("SELECT owned_quantity FROM prints WHERE id = ?1")
            .bind(print_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(qty, 0);
    }

    #[tokio::test]
    async fn adjust_owned_quantity_returns_false_for_missing_print() {
        let (pool, _dir) = connect_for_test().await;
        assert!(!adjust_owned_quantity(&pool, 999, 1).await.unwrap());
    }

    #[tokio::test]
    async fn toggle_deck_built_flips_back_and_forth() {
        let (pool, _dir) = connect_for_test().await;
        let deck_id = insert_deck(&pool, NewDeck::new("deck-1", "Deck One")).await;

        assert!(toggle_deck_built(&pool, deck_id).await.unwrap());
        let is_built: bool = sqlx::query_scalar("SELECT is_built FROM decks WHERE id = ?1")
            .bind(deck_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(is_built);

        assert!(toggle_deck_built(&pool, deck_id).await.unwrap());
        let is_built: bool = sqlx::query_scalar("SELECT is_built FROM decks WHERE id = ?1")
            .bind(deck_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(!is_built);
    }

    #[tokio::test]
    async fn toggle_deck_built_returns_false_for_missing_deck() {
        let (pool, _dir) = connect_for_test().await;
        assert!(!toggle_deck_built(&pool, 999).await.unwrap());
    }
}
