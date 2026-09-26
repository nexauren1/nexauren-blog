PRAGMA foreign_keys = ON;

-- Nexauren accounts D1 database (the ACCOUNTS_DB Worker binding).
-- Firebase Authentication remains the identity provider; D1 stores application profile state.

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

CREATE TABLE IF NOT EXISTS nexauren_billing_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nexauren_subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES nexauren_accounts(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
  status TEXT NOT NULL DEFAULT 'FREE',
  paypal_subscription_id TEXT UNIQUE,
  paypal_plan_id TEXT,
  amount TEXT NOT NULL DEFAULT '5.00',
  currency TEXT NOT NULL DEFAULT 'USD',
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nexauren_subscriptions_paypal ON nexauren_subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_nexauren_subscriptions_plan_status ON nexauren_subscriptions(plan,status);



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
