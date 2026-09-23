PRAGMA foreign_keys = ON;

-- Nexauren primary D1 database.
-- Safe for a fresh database. All statements are idempotent where SQLite permits it.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT 'Nexauren User',
  role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('owner','admin','editor','author')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role,status);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_hash TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type,entity_id,created_at DESC);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  file_id TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT 'image',
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_file_id ON media(file_id);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content_format TEXT NOT NULL DEFAULT 'markdown',
  type TEXT NOT NULL DEFAULT 'article',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  cover_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
  social_image TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  scheduled_at TEXT,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  allow_comments INTEGER NOT NULL DEFAULT 1 CHECK (allow_comments IN (0,1)),
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id,status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured,status,published_at DESC);

CREATE TABLE IF NOT EXISTS post_translations (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('pt','en')),
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(post_id,language)
);
CREATE INDEX IF NOT EXISTS idx_post_translations_post_lang ON post_translations(post_id,language);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id,tag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id,post_id);

CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  editor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  revision_number INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(post_id,revision_number)
);
CREATE INDEX IF NOT EXISTS idx_revisions_post ON revisions(post_id,revision_number DESC);

CREATE TABLE IF NOT EXISTS redirects (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301,302,307,308)),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_redirects_destination ON redirects(destination);

CREATE TABLE IF NOT EXISTS navigation (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL DEFAULT 'header',
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0,1)),
  parent_id TEXT REFERENCES navigation(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_navigation_location ON navigation(location,sort_order);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nexauren_tool_usage (
  account_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(account_id,tool_id,usage_date)
);
CREATE INDEX IF NOT EXISTS idx_tool_usage_date ON nexauren_tool_usage(usage_date);

CREATE TABLE IF NOT EXISTS nexauren_billing_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nexauren_subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS nexauren_tool_unlocks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  paypal_order_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  amount TEXT NOT NULL DEFAULT '0.50',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(account_id,tool_id)
);
CREATE INDEX IF NOT EXISTS idx_nexauren_tool_unlock_paypal ON nexauren_tool_unlocks(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_nexauren_tool_unlock_account ON nexauren_tool_unlocks(account_id,tool_id);

-- Baseline configuration.
INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES
('default_language','pt',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('site_name','Nexauren',strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO categories(id,name,slug,description,icon,parent_id,sort_order,created_at,updated_at) VALUES
('cat-breaking-news','Notícias de última hora','breaking-news','Informações urgentes e acontecimentos recentes.','⚡',NULL,10,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-tecnologia','Tecnologia','tecnologia','Tecnologia, inovação, software, dispositivos e tendências.','💻',NULL,20,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-entretenimento','Entretenimento','entretenimento','Cultura digital, música, vídeo, jogos e entretenimento.','🎬',NULL,30,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-nexauren','Nexauren','nexauren','Produtos, aplicativos, projetos e novidades da Nexauren.','✦',NULL,40,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-eventos','Eventos','eventos','Eventos, lançamentos ao vivo e encontros da Nexauren.','📅',NULL,50,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-ferramentas','Ferramentas','ferramentas','Ferramentas, utilitários e soluções publicadas pela Nexauren.','🧰',NULL,60,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO navigation(id,location,label,url,icon,sort_order,visible,parent_id) VALUES
('nav-home','header','Início','/','⌂',10,1,NULL),
('nav-breaking-news','header','Últimas notícias','/breaking-news','⚡',20,1,NULL),
('nav-tecnologia','header','Tecnologia','/tecnologia','💻',30,1,NULL),
('nav-entretenimento','header','Entretenimento','/entretenimento','🎬',40,1,NULL),
('nav-nexauren','header','Nexauren','/nexauren','✦',50,1,NULL),
('nav-eventos','header','Eventos','/eventos','📅',60,1,NULL),
('nav-ferramentas','header','Ferramentas','/ferramentas','🧰',70,1,NULL);
