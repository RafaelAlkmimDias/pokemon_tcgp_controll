// Small key/value settings table (migrations/0002_app_settings.sql),
// replacing the `locale` cookie from the Axum version - see
// docs/rust-migration-plan.md for why this lives in SQLite rather than a
// separate config file.

use sqlx::SqlitePool;

use crate::locale::Locale;

const LOCALE_KEY: &str = "locale";

pub async fn get_locale(pool: &SqlitePool) -> anyhow::Result<Locale> {
    let value: Option<String> = sqlx::query_scalar("SELECT value FROM app_settings WHERE key = ?1")
        .bind(LOCALE_KEY)
        .fetch_optional(pool)
        .await?;

    Ok(match value.as_deref() {
        Some("pt") => Locale::Pt,
        _ => Locale::En,
    })
}

pub async fn set_locale(pool: &SqlitePool, locale: Locale) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(LOCALE_KEY)
    .bind(locale.as_str())
    .execute(pool)
    .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connect_for_test;

    #[tokio::test]
    async fn defaults_to_english_when_no_locale_is_stored() {
        let (pool, _dir) = connect_for_test().await;
        assert_eq!(get_locale(&pool).await.unwrap(), Locale::En);
    }

    #[tokio::test]
    async fn set_locale_round_trips_through_get_locale() {
        let (pool, _dir) = connect_for_test().await;
        set_locale(&pool, Locale::Pt).await.unwrap();
        assert_eq!(get_locale(&pool).await.unwrap(), Locale::Pt);

        set_locale(&pool, Locale::En).await.unwrap();
        assert_eq!(get_locale(&pool).await.unwrap(), Locale::En);
    }

    #[tokio::test]
    async fn setting_locale_twice_overwrites_rather_than_erroring() {
        let (pool, _dir) = connect_for_test().await;
        set_locale(&pool, Locale::Pt).await.unwrap();
        set_locale(&pool, Locale::Pt).await.unwrap();
        assert_eq!(get_locale(&pool).await.unwrap(), Locale::Pt);
    }
}
