# Nexauren Story

Nexauren Story is the official editorial portal for Nexauren.

## Stack

- Cloudflare Worker + Static Assets
- Cloudflare D1
- ImageKit
- GitHub

## D1

Binding: \`DB\`

Database: \`nexauren-blog\`

Migration: \`migrations/0001_initial.sql\`

Apply to production:

\`\`\`bash
npx wrangler d1 migrations apply nexauren-blog --remote
\`\`\`

## Worker secrets

Configure these privately in the Worker:

\`\`\`bash
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put IMAGEKIT_PUBLIC_KEY
npx wrangler secret put IMAGEKIT_PRIVATE_KEY
npx wrangler secret put IMAGEKIT_URL_ENDPOINT
\`\`\`

The first successful login with \`ADMIN_EMAIL\` + \`ADMIN_PASSWORD\` creates the first \`owner\` in D1. After that, change the password in Admin > Settings > Security.

Never commit an ImageKit private key to GitHub or frontend code.

## Deploy

\`\`\`bash
npx wrangler deploy
\`\`\`

## Public routes

\`/\`, \`/post/:slug\`, category pages, \`/search\`, \`/sitemap.xml\`, \`/rss.xml\`.

## Admin

\`/admin\`

Features in V1:

- secure login/session cookies
- dashboard
- post CRUD
- draft/published/scheduled/archived states
- categories and tags
- ImageKit direct uploads
- media library
- SEO fields
- activity audit log
- password change
- scheduled publication through the Worker cron trigger
