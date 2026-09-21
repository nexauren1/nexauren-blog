PRAGMA foreign_keys = ON;

-- 1) Add bilingual post storage required by the new Worker.
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
CREATE INDEX IF NOT EXISTS idx_post_translations_post_lang
  ON post_translations(post_id, language);

-- 2) Create the new editorial categories before removing the old taxonomy.
INSERT OR IGNORE INTO categories (id,name,slug,description,icon,parent_id,sort_order,created_at,updated_at) VALUES
('cat-breaking-news','Notícias de última hora','breaking-news','Informações urgentes e acontecimentos recentes.','⚡',NULL,10,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-tecnologia','Tecnologia','tecnologia','Tecnologia, inovação, software, dispositivos e tendências.','💻',NULL,20,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-entretenimento','Entretenimento','entretenimento','Cultura digital, música, vídeo, jogos e entretenimento.','🎬',NULL,30,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-nexauren','Nexauren','nexauren','Produtos, aplicativos, projetos e novidades da Nexauren.','✦',NULL,40,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-eventos','Eventos','eventos','Eventos, lançamentos ao vivo e encontros da Nexauren.','📅',NULL,50,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('cat-ferramentas','Ferramentas','ferramentas','Ferramentas, utilitários e soluções publicadas pela Nexauren.','🧰',NULL,60,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- 3) Reclassify common old categories so existing posts are not left without a category.
UPDATE posts SET category_id=(SELECT id FROM categories WHERE slug='breaking-news')
WHERE category_id IN (SELECT id FROM categories WHERE slug='news');
UPDATE posts SET category_id=(SELECT id FROM categories WHERE slug='ferramentas')
WHERE category_id IN (SELECT id FROM categories WHERE slug='apps');
UPDATE posts SET category_id=(SELECT id FROM categories WHERE slug='nexauren')
WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('products','releases','updates','announcements','stories'));
UPDATE posts SET category_id=(SELECT id FROM categories WHERE slug='tecnologia')
WHERE category_id IN (SELECT id FROM categories WHERE slug IN ('guides','tutorials'));

-- 4) Remove every legacy category.
DELETE FROM categories
WHERE slug NOT IN ('breaking-news','tecnologia','entretenimento','nexauren','eventos','ferramentas');

-- 5) Replace the old header navigation with the new taxonomy.
DELETE FROM navigation;
INSERT INTO navigation (id,location,label,url,icon,sort_order,visible,parent_id) VALUES
('nav-home','header','Início','/','⌂',10,1,NULL),
('nav-breaking-news','header','Últimas notícias','/breaking-news','⚡',20,1,NULL),
('nav-tecnologia','header','Tecnologia','/tecnologia','💻',30,1,NULL),
('nav-entretenimento','header','Entretenimento','/entretenimento','🎬',40,1,NULL),
('nav-nexauren','header','Nexauren','/nexauren','✦',50,1,NULL),
('nav-eventos','header','Eventos','/eventos','📅',60,1,NULL),
('nav-ferramentas','header','Ferramentas','/ferramentas','🧰',70,1,NULL);

UPDATE settings
SET value='pt',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='default_language';

-- Verify with:
-- SELECT slug,name,sort_order FROM categories ORDER BY sort_order;
