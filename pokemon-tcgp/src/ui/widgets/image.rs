// Turns a relative path fragment from images.rs (e.g. "cards/a1/007.webp")
// into a `file://` URI egui_extras's FileLoader can read. Requires the
// `file` feature on egui_extras (see Cargo.toml) and
// `egui_extras::install_image_loaders` called once at startup.

use std::path::Path;

pub fn uri_for(images_root: &Path, relative: &str) -> String {
    format!("file://{}", images_root.join(relative).display())
}
