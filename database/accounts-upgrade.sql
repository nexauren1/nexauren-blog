PRAGMA foreign_keys = ON;

-- Public Nexauren identities are authenticated by Firebase Authentication.
-- D1 stores only the application profile/preferences needed by the Nexauren ecosystem.
-- Firebase ID tokens are verified by the Worker before any profile operation.
CREATE TABLE IF NOT EXISTS nexauren_accounts (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL DEFAULT 'Nexauren User',
  photo_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  last_login_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nexauren_account_preferences (
  account_id TEXT PRIMARY KEY REFERENCES nexauren_accounts(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'pt' CHECK (language IN ('pt','en')),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  timezone TEXT NOT NULL DEFAULT 'Africa/Maputo',
  marketing_emails INTEGER NOT NULL DEFAULT 0 CHECK (marketing_emails IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nexauren_accounts_email ON nexauren_accounts(email);
CREATE INDEX IF NOT EXISTS idx_nexauren_accounts_uid ON nexauren_accounts(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_nexauren_accounts_status ON nexauren_accounts(status);
