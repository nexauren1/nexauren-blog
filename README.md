# Nexauren Tools

The Nexauren platform for online tools, accounts and paid features.

## Stack

- Cloudflare Workers + Static Assets
- Cloudflare D1
- Firebase Authentication
- PayPal
- ImageKit
- Workers AI
- GitHub

## D1

Binding: `DB`

The current Cloudflare D1 resource name remains `nexauren-blog` for deployment compatibility. It is not used as an application concept; the runtime is now tool-focused. Renaming the live D1 resource would require a separate data migration and is intentionally not part of this cleanup.

The complete schemas are in `database/primary-complete.sql` and `database/accounts-complete.sql`.

**D1 setup is manual.** Execute the complete SQL files directly in the corresponding D1 database.

## Secrets

Configure these privately on the Worker:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_URL_ENDPOINT
TRANSLATION_AI_MODEL
PAYPAL_WEBHOOK_ID
```

Never commit secrets to GitHub or frontend code.

## PayPal

Webhook endpoint:

`https://nexaurenstory.com/api/paypal/webhook`

The Worker verifies PayPal webhook signatures before updating subscription state.

## Public routes

- `/` — platform home
- `/tool/` — tools catalog
- `/account` — Firebase account area
- `/account/upgrade/` — Pro plan
- `/legal/privacidade/`
- `/legal/termos/`
- `/legal/cookies/`
- `/sitemap.xml`

## Tools

The official registry is:

`frontend/tool/data/data.json`

Tool pages live under:

```text
frontend/tool/categories/<category>/<tool-id>/
├── index.html
├── style.css
├── script.js
└── assets/
```

The shared tool shell must not contain individual tool logic. The `access` registry field supports public, account and premium access.

## Public accounts

Public accounts use Firebase Authentication and remain separate from administrative users.

Firebase handles:
- email/password registration and login
- Google sign-in
- email verification
- password recovery
- password changes

The public account UI lives at `/account`.

## Admin

The administration area is available at `/admin`.

It focuses on:
- tool catalog management
- tool access, featured and popular flags
- user management
- operational statistics
- media management
- settings
- audit/activity records

## Advertising

The advertising integration is kept in `frontend/assets/ads.js`. Blog/editorial ad validation has been removed together with the editorial platform; tool-related advertising remains part of the project.

## Deploy

```bash
npm install
npm run deploy
```

For local development:

```bash
npm run dev
```
