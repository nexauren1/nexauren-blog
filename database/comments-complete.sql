PRAGMA foreign_keys = ON;

-- Nexauren Story Blog — comments and moderation extension
-- Execute this in the BLOG D1 (binding DB), not in ACCOUNTS_DB.

CREATE TABLE IF NOT EXISTS blog_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  parent_id TEXT REFERENCES blog_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hidden')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_comment_reactions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES blog_comments(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at TEXT NOT NULL,
  UNIQUE(comment_id, account_id)
);

CREATE TABLE IF NOT EXISTS blog_comment_reports (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES blog_comments(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(comment_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_status_date
  ON blog_comments(post_id,status,created_at);

CREATE INDEX IF NOT EXISTS idx_blog_comments_parent
  ON blog_comments(parent_id,created_at);

CREATE INDEX IF NOT EXISTS idx_blog_comments_account_date
  ON blog_comments(account_id,created_at);

CREATE INDEX IF NOT EXISTS idx_blog_comment_reactions_comment
  ON blog_comment_reactions(comment_id,reaction);

CREATE INDEX IF NOT EXISTS idx_blog_comment_reactions_account
  ON blog_comment_reactions(account_id,comment_id);

CREATE INDEX IF NOT EXISTS idx_blog_comment_reports_status
  ON blog_comment_reports(status,created_at);

INSERT OR IGNORE INTO settings (key,value,type,updated_at) VALUES
('comments.require_approval','1','number',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('comments.allow_replies','1','number',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('comments.allow_reactions','1','number',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('comments.max_length','5000','number',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('comments.rate_limit_count','5','number',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('comments.rate_limit_minutes','10','number',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
