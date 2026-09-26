PRAGMA foreign_keys = ON;

-- Avaliações e favoritos das ferramentas Nexauren.
-- Estas tabelas pertencem ao D1 ACCOUNTS_DB (nexauren).
-- tool_id corresponde ao ID estável do catálogo de ferramentas.

CREATE TABLE IF NOT EXISTS nexauren_tool_reviews (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES nexauren_accounts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL DEFAULT '',
  display_mode TEXT NOT NULL DEFAULT 'profile'
    CHECK (display_mode IN ('profile','anonymous')),
  display_name TEXT NOT NULL DEFAULT '',
  anonymous_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tool_id, account_id)
);

CREATE TABLE IF NOT EXISTS nexauren_tool_favorites (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES nexauren_accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(tool_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_reviews_tool_date
  ON nexauren_tool_reviews(tool_id,created_at);

CREATE INDEX IF NOT EXISTS idx_tool_reviews_tool_rating
  ON nexauren_tool_reviews(tool_id,rating);

CREATE INDEX IF NOT EXISTS idx_tool_reviews_account_date
  ON nexauren_tool_reviews(account_id,created_at);

CREATE INDEX IF NOT EXISTS idx_tool_favorites_tool
  ON nexauren_tool_favorites(tool_id);

CREATE INDEX IF NOT EXISTS idx_tool_favorites_account
  ON nexauren_tool_favorites(account_id,tool_id);
