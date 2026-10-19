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

// Test strategy (block 6 of docs/rust-migration-checklist.md): a real
// temp-file SQLite per test, not `sqlite::memory:` - with the connection
// pool's max_connections(5), a bare in-memory URI would hand out a fresh
// empty database to each connection instead of one shared database.
// `tempfile::TempDir` is returned alongside the pool so the directory (and
// the `.db`/`.db-wal`/`.db-shm` files in it) lives exactly as long as the
// test and is removed automatically on drop - never touches
// `data/pokemon_tcgp.db`, the real database.
#[cfg(test)]
pub async fn connect_for_test() -> (SqlitePool, tempfile::TempDir) {
    let dir = tempfile::tempdir().expect("create temp dir for test db");
    let db_path = dir.path().join("test.db");
    let pool = connect(db_path.to_str().expect("utf-8 temp path"))
        .await
        .expect("connect to temp test db");
    (pool, dir)
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
