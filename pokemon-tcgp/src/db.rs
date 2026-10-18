use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::Path;
use std::str::FromStr;

pub async fn connect(db_path: &str) -> anyhow::Result<SqlitePool> {
    if let Some(parent) = Path::new(db_path).parent() {
        std::fs::create_dir_all(parent)?;
    }

    let options = SqliteConnectOptions::from_str(&format!("sqlite://{db_path}"))?
        .create_if_missing(true)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}

// Safe live backup: VACUUM INTO writes a consistent snapshot without
// blocking concurrent readers, unlike copying the file bytes directly
// (which can race a WAL checkpoint). Called from the /backup route.
pub async fn backup_to(pool: &SqlitePool, dest_path: &str) -> anyhow::Result<()> {
    sqlx::query("VACUUM INTO ?1")
        .bind(dest_path)
        .execute(pool)
        .await?;
    Ok(())
}
