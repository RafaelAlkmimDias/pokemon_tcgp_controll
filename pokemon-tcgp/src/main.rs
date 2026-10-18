mod cardstats;
mod db;
mod display;
mod handlers;
mod i18n;
mod images;
mod locale;
mod models;
mod queries;
mod web;

use axum::routing::get;
use axum::Router;
use sqlx::SqlitePool;
use tower_http::services::ServeDir;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "data/pokemon_tcgp.db".into());
    let pool = db::connect(&db_path).await?;
    let state = AppState { pool };

    let app = Router::new()
        .route("/", get(handlers::collections::index))
        .nest_service("/public", ServeDir::new("public"))
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".into());
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{port}")).await?;
    tracing::info!("listening on http://127.0.0.1:{port}");
    axum::serve(listener, app).await?;

    Ok(())
}
