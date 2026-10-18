-- Mirrors ../prisma/schema.prisma, with two deliberate changes documented
-- in the project's design chat: integer autoincrement ids (no need for
-- distributed-safe cuids in a single-writer local app) and enums stored as
-- TEXT with CHECK constraints (SQLite has no native enum type).

CREATE TABLE collections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  name_pt      TEXT,
  series       TEXT NOT NULL,
  release_date TEXT,
  card_count   INTEGER,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE packs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  name_pt       TEXT,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  image_url     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (collection_id, name)
);

CREATE TABLE prints (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url      TEXT NOT NULL UNIQUE,
  owned_quantity INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  print_id      INTEGER NOT NULL REFERENCES prints(id),
  number        INTEGER NOT NULL,
  name          TEXT NOT NULL,
  name_pt       TEXT,
  rarity        TEXT NOT NULL DEFAULT 'UNKNOWN'
                CHECK (rarity IN ('C','U','R','RR','AR','SR','SAR','IM','UR','S','SSR','UNKNOWN')),
  type          TEXT CHECK (type IN ('POKEMON','SUPPORTER','ITEM','FOSSIL','TOOL')),
  element       TEXT,
  stage         TEXT,
  health        INTEGER,
  retreat_cost  INTEGER,
  weakness      TEXT,
  evolves_from  TEXT,
  good_with     TEXT, -- JSON, serialized as text (sqlx "json" feature maps this)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (collection_id, number)
);

CREATE TABLE card_packs (
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  pack_id INTEGER NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, pack_id)
);

CREATE TABLE decks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  popularity        REAL NOT NULL,
  expected_win_rate REAL NOT NULL,
  power_score       REAL,
  meta_score        REAL,
  is_built          INTEGER NOT NULL DEFAULT 0,
  synced_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE deck_cards (
  deck_id  INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id  INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  PRIMARY KEY (deck_id, card_id)
);

CREATE INDEX idx_packs_collection ON packs(collection_id);
CREATE INDEX idx_cards_collection ON cards(collection_id);
CREATE INDEX idx_cards_print ON cards(print_id);
CREATE INDEX idx_card_packs_pack ON card_packs(pack_id);
CREATE INDEX idx_deck_cards_card ON deck_cards(card_id);
