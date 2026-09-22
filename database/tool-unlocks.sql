PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS nexauren_tool_unlocks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES nexauren_accounts(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  paypal_order_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  amount TEXT NOT NULL DEFAULT '0.50',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nexauren_tool_unlock_account_tool
  ON nexauren_tool_unlocks(account_id, tool_id);
