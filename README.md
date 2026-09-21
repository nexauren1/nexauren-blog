# Nexauren Story

The official Nexauren editorial portal.

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
OPENAI_API_KEY
TRANSLATION_MODEL
```

The first successful login using `ADMIN_EMAIL` + `ADMIN_PASSWORD` creates the first `owner` account in D1. Change that password later in Admin → Settings → Security.

Never commit an ImageKit private key or OpenAI API key to GitHub or frontend code.

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
`/`, `/post/:slug`, category pages, `/search`, `/sitemap.xml`, `/rss.xml`.

Admin:
`/admin`

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

As publicações possuem armazenamento bilingue em D1. Ao definir `OPENAI_API_KEY`, o Worker pode gerar automaticamente a versão em inglês quando uma publicação é criada ou atualizada; `TRANSLATION_MODEL` pode alterar o modelo usado.

Antes de usar a nova versão, execute `database/editorial-upgrade.sql` no D1 existente. Esse SQL também substitui a taxonomia antiga pelas novas categorias e preserva a classificação básica das publicações.

## Publicidade

`frontend/assets/ads.js` é carregado no shell público, mas os anúncios só são inseridos pelo renderizador de páginas `/post/*`. Assim, páginas de categoria, pesquisa e início não recebem os dois scripts publicitários.

A verificação automática do encaixe dos anúncios está em `.github/workflows/validate-post-ads.yml`.
