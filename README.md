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
```

The first successful login using `ADMIN_EMAIL` + `ADMIN_PASSWORD` creates the first `owner` account in D1. Change that password later in Admin → Settings → Security.

Never commit an ImageKit private key to GitHub or frontend code.

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

