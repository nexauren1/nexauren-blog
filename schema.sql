PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Nexauren Admin',
  avatar_media_id TEXT,
  role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('owner','admin','editor','author')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0,1)),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  imagekit_file_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  alt_text TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content_format TEXT NOT NULL DEFAULT 'markdown',
  type TEXT NOT NULL DEFAULT 'article' CHECK (type IN ('article','news','guide','tutorial','announcement','release','update','story')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  cover_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
  social_image TEXT DEFAULT '',
  published_at TEXT,
  scheduled_at TEXT,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  allow_comments INTEGER NOT NULL DEFAULT 1 CHECK (allow_comments IN (0,1)),
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS post_translations (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('pt','en')),
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(post_id, language)
);
CREATE INDEX IF NOT EXISTS idx_post_translations_post_lang ON post_translations(post_id,language);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  editor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS navigation (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL DEFAULT 'header',
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0,1)),
  parent_id TEXT REFERENCES navigation(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS redirects (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301,302,307,308)),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata TEXT DEFAULT '{}',
  ip_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_identifier ON login_attempts(identifier,created_at);
CREATE INDEX IF NOT EXISTS idx_posts_status_date ON posts(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type_status ON posts(type,status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_status ON posts(category_id,status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured,status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id,post_id);
CREATE INDEX IF NOT EXISTS idx_revisions_post ON revisions(post_id,revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,read_at,created_at DESC);

-- Public Nexauren accounts are isolated from the editorial/admin users table.
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

INSERT OR IGNORE INTO settings (key,value,type,updated_at) VALUES
('site_name','Nexauren Story','string',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('site_description','Histórias, novidades, guias e atualizações do ecossistema Nexauren.','string',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('default_language','pt','string',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('timezone','Africa/Maputo','string',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('posts_per_page','12','number',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('social_github','https://github.com/nexauren1','string',strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO categories (id,name,slug,description,icon,parent_id,sort_order,created_at,updated_at) VALUES
('cat-breaking-news','Notícias de última hora','breaking-news','Informações urgentes e acontecimentos recentes.','⚡',NULL,10,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-tecnologia','Tecnologia','tecnologia','Tecnologia, inovação, software, dispositivos e tendências.','💻',NULL,20,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-entretenimento','Entretenimento','entretenimento','Cultura digital, música, vídeo, jogos e entretenimento.','🎬',NULL,30,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-nexauren','Nexauren','nexauren','Produtos, aplicativos, projetos e novidades da Nexauren.','✦',NULL,40,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-eventos','Eventos','eventos','Eventos, lançamentos ao vivo e encontros da Nexauren.','📅',NULL,50,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-ferramentas','Ferramentas','ferramentas','Ferramentas, utilitários e soluções publicadas pela Nexauren.','🧰',NULL,60,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO navigation (id,location,label,url,icon,sort_order,visible,parent_id) VALUES
('nav-home','header','Início','/','⌂',10,1,NULL),
('nav-breaking-news','header','Últimas notícias','/breaking-news','⚡',20,1,NULL),
('nav-tecnologia','header','Tecnologia','/tecnologia','💻',30,1,NULL),
('nav-entretenimento','header','Entretenimento','/entretenimento','🎬',40,1,NULL),
('nav-nexauren','header','Nexauren','/nexauren','✦',50,1,NULL),
('nav-eventos','header','Eventos','/eventos','📅',60,1,NULL),
('nav-ferramentas','header','Ferramentas','/ferramentas','🧰',70,1,NULL);
