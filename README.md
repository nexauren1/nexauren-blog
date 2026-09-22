# Nexauren Story

The official Nexauren editorial portal, powered by Cloudflare Workers, D1, ImageKit and Workers AI.

## Stack

- Cloudflare Workers + Static Assets
- Cloudflare D1
- ImageKit
- GitHub

## D1

Binding: `DB`

Database: `nexauren-blog`

The complete SQL is in `schema.sql`.

**This project does not run D1 migrations automatically.** Create the tables manually in the D1 dashboard/console by running `schema.sql` once.

## Secrets

Configure these privately on the Worker:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_URL_ENDPOINT
TRANSLATION_AI_MODEL
```

The first successful login using `ADMIN_EMAIL` + `ADMIN_PASSWORD` creates the first `owner` account in D1. Change that password later in Admin → Settings → Security.

Never commit ImageKit private keys, admin credentials, or other secrets to GitHub or frontend code. Cloudflare Workers AI is accessed through the `AI` binding in `wrangler.json`.

## Deploy

Cloudflare's build command can simply remain:

```bash
npm run deploy
```

The repository includes a local Wrangler dependency and the `deploy` script. Cloudflare will install the dependencies and run Wrangler.

For local development:

```bash
npm install
npm run dev
```

## Routes

Public:
`/` (porta de entrada), `/blog/`, `/blog/post/:slug`, `/blog/:categoria`, `/blog/search`, `/sitemap.xml`, `/rss.xml`.

URLs antigas do blog (`/post/:slug`, `/posts`, `/about`, `/search` e categorias) são redirecionadas para `/blog/...` para preservar acessos e referências existentes.

Admin:
`/admin`

## Platform foundation

### Public accounts

The public account system is intentionally separate from editorial/admin users. Its API is:

- `/api/account/register`
- `/api/account/login`
- `/api/account/logout`
- `/api/account/me`

Run `database/platform-upgrade.sql` once on the existing D1 database before enabling public account registration. Fresh installations already get the account tables from `schema.sql`.

### Nexauren Tool

The tools area lives under `/tool/`. The official registry is `frontend/tool/data/data.json`, and category pages read that registry through `frontend/tool/categories/category.js`.

Every future tool must be isolated in:

```text
frontend/tool/categories/<category>/<tool-id>/
├── index.html
├── style.css
├── script.js
└── assets/
```

The shared Tool shell must not contain individual tool logic. The `access` registry field is reserved for future public/account/premium gating.

## Admin capabilities

- Email/password authentication
- Secure session cookie
- Dashboard
- Post create/edit/delete
- Draft, published, scheduled and archived states
- Categories and tags
- ImageKit direct upload
- Media library
- SEO fields
- Featured stories
- Activity/audit log
- Password change
- Automatic scheduled publication via Worker cron


## Idiomas

O portal público começa por pedir ao visitante o idioma, Português ou Inglês. A escolha fica guardada no navegador e pode ser alterada pelo botão de idioma.

As publicações possuem armazenamento bilingue em D1. Com a binding `AI` do Cloudflare Workers AI, o Worker pode gerar automaticamente a versão em inglês e preencher metadados SEO em PT/EN quando uma publicação é criada ou atualizada. `TRANSLATION_AI_MODEL` pode alterar o modelo usado.

Antes de usar a nova versão, execute `database/editorial-upgrade.sql` no D1 existente. Esse SQL também substitui a taxonomia antiga pelas novas categorias e preserva a classificação básica das publicações.

## Publicidade

`frontend/assets/ads.js` é carregado apenas quando um artigo é renderizado. O site usa somente o Monetag In-Page Push (zona `11183778`); Vignette e Direct Link não são usados. Páginas de categoria, pesquisa e início não carregam Monetag.

As verificações automáticas estão em `.github/workflows/validate-post-ads.yml` e `.github/workflows/seo-sitemap.yml`. O segundo workflow verifica a implementação e, diariamente, confere o sitemap, robots.txt e as URLs públicas.
