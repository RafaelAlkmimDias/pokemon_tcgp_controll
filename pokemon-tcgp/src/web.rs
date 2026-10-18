// `askama_axum` is deprecated upstream; this is the one-line replacement it
// used to provide — render the template and wrap it as an HTML response.

use askama::Template;
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse, Response};

pub struct Render<T>(pub T);

impl<T: Template> IntoResponse for Render<T> {
    fn into_response(self) -> Response {
        match self.0.render() {
            Ok(html) => Html(html).into_response(),
            Err(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Template error: {err}"),
            )
                .into_response(),
        }
    }
}
