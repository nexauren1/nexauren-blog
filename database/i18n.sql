-- Nexauren i18n — instalação manual no D1 nexauren.
-- Use o D1 ligado ao binding ACCOUNTS_DB. Não execute no D1 nexauren-blog.
-- Não é uma migration. Execute este ficheiro manualmente quando quiser ativar o armazenamento de traduções da interface e das ferramentas.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  translation_key TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('pt','en')),
  source_text TEXT NOT NULL DEFAULT '',
  translated_text TEXT NOT NULL DEFAULT '',
  source_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','translated','approved','stale','error')),
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(scope,entity_id,translation_key,language)
);

CREATE INDEX IF NOT EXISTS idx_translations_lookup
  ON translations(scope,language,translation_key);

CREATE INDEX IF NOT EXISTS idx_translations_entity
  ON translations(scope,entity_id,language);

CREATE INDEX IF NOT EXISTS idx_translations_status
  ON translations(language,status,updated_at);


CREATE TABLE IF NOT EXISTS translation_state (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('pt','en')),
  source_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'translated'
    CHECK (status IN ('pending','translated','approved','stale','error')),
  error_message TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  UNIQUE(entity_type,entity_id,language)
);

CREATE INDEX IF NOT EXISTS idx_translation_state_entity
  ON translation_state(entity_type,entity_id,language);

CREATE INDEX IF NOT EXISTS idx_translation_state_status
  ON translation_state(language,status,updated_at);
