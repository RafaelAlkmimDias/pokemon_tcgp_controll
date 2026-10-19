-- Key/value store for small app-wide settings (currently just the UI
-- locale). Kept in the same SQLite file as everything else - see
-- docs/rust-migration-plan.md: one `.db` file is the whole app's state,
-- backed up via `VACUUM INTO`, so a second config file would undo that.
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
