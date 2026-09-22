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

### Public Nexauren accounts

Public accounts use **Firebase Authentication** and are intentionally separate from editorial/admin users.

Firebase handles:
- email/password registration and login
- Google sign-in
- email verification
- password recovery
- password changes
- account/browser authentication state

The public account UI lives at `/account` and uses the Firebase web configuration in `frontend/account/firebase-config.js`.

The Worker does not authenticate public accounts with the editorial `users` table. Firebase ID tokens are sent over HTTPS and verified on the Worker before the Firebase UID is accepted. The verified UID is stored in `nexauren_accounts`; application preferences live in `nexauren_account_preferences`.

The public account API is:
- `/api/account/me`
- `/api/account/sync`

The account profile stores no password and no Firebase browser session. Passwords, providers and authentication state remain in Firebase Authentication.

In the Firebase console, add `nexaurenstory.com` to Authentication → Settings → Authorized domains.

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

## Nexauren Accounts D1

The public Nexauren account system is isolated from the blog database. The blog uses the `DB` binding; public Firebase-backed accounts use the separate `ACCOUNTS_DB` binding. Create a separate Cloudflare D1 database named `nexauren-accounts`, replace `REPLACE_WITH_ACCOUNTS_D1_ID` in `wrangler.json` with its database ID, and apply `database/accounts-upgrade.sql` to that database. Never apply the account migration to the blog D1.
