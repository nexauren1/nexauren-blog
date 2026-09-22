PRAGMA foreign_keys = ON;

-- Public Nexauren accounts. Separate from editorial/admin users.
CREATE TABLE IF NOT EXISTS account_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Nexauren User',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES account_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS account_login_attempts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0,1)),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_sessions_token ON account_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_account_sessions_expires ON account_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_account_login_identifier ON account_login_attempts(identifier,created_at);

-- Future account capabilities can be added without touching editorial users.
-- The current public account API exposes register, login, logout and session state.
