# Nexauren D1 — instalação manual

O Worker usa **dois bancos D1 independentes**:

1. **Primary D1 (`DB`)** — conteúdo editorial, administração, sessões, auditoria, mídia, redirects, configurações e uso das ferramentas.
2. **Nexauren D1 (`ACCOUNTS_DB`)** — contas Firebase, preferências, assinaturas PayPal, desbloqueios de ferramentas e traduções da interface/catálogo Nexauren.

## Instalação

### Primary D1

No D1 ligado ao binding `DB`, execute **todo** o conteúdo de:

`database/primary-complete.sql`

### Nexauren D1

No D1 ligado ao binding `ACCOUNTS_DB`, execute **todo** o conteúdo de:

`database/accounts-complete.sql`

Para ativar o armazenamento das traduções da interface e das ferramentas, execute também **manualmente**:

`database/i18n.sql`

Esse SQL de i18n pertence ao D1 **nexauren**. Não execute o `i18n.sql` no D1 `nexauren-blog`.

As traduções dos artigos/posts continuam no D1 principal através de `post_translations`.

**Não misture os dois SQLs.** O SQL do Primary não deve ser executado no Accounts D1 e vice-versa.

## Verificação manual

Depois de executar cada SQL:

```sql
PRAGMA foreign_keys;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

No Primary D1, confirme especialmente:

```sql
SELECT name FROM sqlite_master
WHERE type='table'
AND name IN (
  'users',
  'sessions',
  'audit_logs',
  'categories',
  'media',
  'posts',
  'post_translations',
  'tags',
  'post_tags',
  'revisions',
  'redirects',
  'navigation',
  'settings',
  'tool_usage'
 )
ORDER BY name;
```

No Accounts D1:

```sql
SELECT name FROM sqlite_master
WHERE type='table'
AND name IN (
  'nexauren_accounts',
  'nexauren_account_preferences',
  'nexauren_billing_config',
  'nexauren_subscriptions',
  'nexauren_tool_unlocks'
 )
ORDER BY name;
```

## PayPal

O Worker recebe webhooks em:

`https://nexaurenstory.com/api/paypal/webhook`

O secret privado `PAYPAL_WEBHOOK_ID` também precisa estar configurado no Worker.

## Importante

Os ficheiros SQL desta pasta são **schemas completos para instalação manual**. Não há instruções de migração de banco nesta documentação e o Worker não deve depender de migrações automáticas.

O SQL não contém segredos, credenciais Firebase, PayPal ou ImageKit.