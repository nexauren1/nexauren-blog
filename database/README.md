# Nexauren D1 schema

O Worker usa **dois bancos D1**:

1. **Primary D1 (`DB`)** — conteúdo, sessão administrativa, auditoria, mídia, billing/unlocks e uso das ferramentas.
2. **Accounts D1 (`ACCOUNTS_DB`)** — perfil/estado das contas autenticadas pelo Firebase.

## Instalação nova

### 1. Primary D1

Execute `database/primary-complete.sql` no banco ligado ao binding `DB`.

### 2. Accounts D1

Execute `database/accounts-complete.sql` no banco ligado ao binding `ACCOUNTS_DB`.

Depois valide:

```sql
PRAGMA foreign_keys;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

## Migração de uma instalação existente

Os arquivos antigos `accounts-upgrade.sql`, `editorial-upgrade.sql`, `paypal-subscriptions.sql` e `tool-unlocks.sql` continuam no repositório para histórico/compatibilidade. Para uma instalação já em produção, **não execute `primary-complete.sql` cegamente** sobre dados existentes: compare o schema atual primeiro e aplique uma migração controlada para colunas ausentes.

Em especial, `editorial-upgrade.sql` contém alterações de taxonomia e remoção de categorias legadas; faça backup/export antes de executá-lo.

## Requisitos do Worker

O binding `DB` deve apontar para o Primary D1 e `ACCOUNTS_DB` para o Accounts D1. O endpoint de webhook do PayPal também requer o secret `PAYPAL_WEBHOOK_ID`.

O schema SQL não contém segredos, credenciais Firebase, PayPal ou ImageKit.
