# Nexauren Tool

## Registro central

`data/data.json` is the official registry. `categories/category.js` reads it; category pages must not contain tool business logic.

## New tool contract

Each tool lives in its own folder:

```text
frontend/tool/categories/<category>/<tool-id>/
├── index.html
├── style.css
├── script.js
└── assets/
```

Register it in `data/data.json` with a unique `id`, the matching category id, public path, version, status and tags.

The optional `access` field is reserved for future account/premium gating:
- `public`
- `account`
- `premium`

The central frontend must never contain the implementation of an individual tool.

## Shared frontend

`frontend/tool.css` is for the Nexauren Tool shell. A tool's `style.css` belongs only to that tool.

`frontend/templates/tool/` is the copyable starter template for future tools.
