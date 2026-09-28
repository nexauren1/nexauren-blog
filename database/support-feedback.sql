PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS support_feedback (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('problem','support','suggestion','feature','other')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  tool_id TEXT,
  tool_name TEXT,
  tool_category TEXT,
  tool_access TEXT,
  tool_path TEXT,
  source_path TEXT,
  page_url TEXT,
  referrer TEXT,
  language TEXT,
  locale TEXT,
  timezone TEXT,
  user_agent TEXT,
  platform TEXT,
  screen_json TEXT,
  viewport_json TEXT,
  connection_json TEXT,
  client_time TEXT,
  touch_points INTEGER NOT NULL DEFAULT 0,
  online INTEGER NOT NULL DEFAULT 1,
  cookies_enabled INTEGER NOT NULL DEFAULT 0,
  color_scheme TEXT,
  account_id TEXT,
  firebase_uid TEXT,
  account_email TEXT,
  account_display_name TEXT,
  account_email_verified INTEGER,
  account_plan TEXT,
  ip_hash TEXT,
  country TEXT,
  cf_ray TEXT,
  requester_email TEXT,
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_feedback_created ON support_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_feedback_kind ON support_feedback(kind,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_feedback_tool ON support_feedback(tool_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_feedback_account ON support_feedback(account_id,created_at DESC);
