PRAGMA foreign_keys = ON;

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

CREATE INDEX IF NOT EXISTS idx_nexauren_subscriptions_paypal
  ON nexauren_subscriptions(paypal_subscription_id);

CREATE INDEX IF NOT EXISTS idx_nexauren_subscriptions_plan_status
  ON nexauren_subscriptions(plan,status);
