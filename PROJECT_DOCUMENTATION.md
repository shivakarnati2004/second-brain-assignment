# Second Brain Project Documentation

This document describes architecture, APIs, operations, and validation for the current project state.

## 1) Architecture Overview

Second Brain is a full-stack personal knowledge system built with:

- Next.js (Pages Router for UI + API routes)
- PostgreSQL (`pg` + raw SQL)
- Gemini AI (summarization, tagging, query/chat answers, upload metadata extraction)
- `iron-session` cookie-based authentication
- `pgvector` for semantic retrieval with lexical fallback

Primary flows:

1. Capture knowledge (`/api/knowledge`) and persist immediately.
2. Run asynchronous AI enrichment (summary, tags, embedding).
3. Query/chat over retrieved context (`/api/query`, `/api/chat`).
4. Visualize inferred relationships (`/api/graph` + React Flow UI).
5. Upload files (`/api/upload`) and extract text + metadata before optional save.

## 2) Key Principles

### Portable architecture

- `lib/db.ts` isolates DB connectivity via `query()`.
- `lib/gemini.ts` encapsulates all model interaction logic.
- API routes are separated from UI concerns.

### Graceful degradation

- Core capture/list features work even when AI is unavailable.
- Query/chat endpoints return deterministic fallback responses if model calls fail.
- Upload extraction preserves parsed content even if metadata generation fails.

### Clear contracts

- APIs return JSON with stable success/error semantics.
- Auth-protected routes enforce session checks through `requireSessionUser`.

## 3) Important Files

- `pages/dashboard.tsx`: Main app shell (filters, chat, graph toggle, command palette)
- `components/AddItemModal.tsx`: Capture modal with upload-assisted autofill
- `components/KnowledgeGraph.tsx`: React Flow graph viewer
- `components/CommandPalette.tsx`: Keyboard command palette (`Ctrl/Cmd + K`)
- `pages/api/knowledge/index.ts`: Knowledge list/create + async AI processing
- `pages/api/query.ts`: Private query API (semantic retrieval + fallback)
- `pages/api/chat/index.ts`: Multi-turn chat API (semantic retrieval + fallback)
- `pages/api/graph.ts`: Inferred relationship graph API
- `pages/api/upload.ts`: File upload extraction API
- `lib/semantic.ts`: pgvector + lexical retrieval behavior
- `scripts/init-db.js`: Database initialization script
- `scripts/smoke-curl.ps1`: End-to-end smoke test script

## 4) Setup and Operations

### Required environment variables (`.env.local`)

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET`
- `PUBLIC_BRAIN_API_KEY`
- `NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY`
- `PUBLIC_BRAIN_ALLOWED_ORIGINS`

### Database initialization

```bash
npm run db:init
```

Creates/maintains:

- `users`
- `knowledge_items`
- `brain_queries`
- `chat_sessions`
- `chat_messages`

Also attempts to enable `pgvector` and creates the embedding index when available.

### Run locally

```bash
npm run dev
```

App URL: `http://localhost:3000`

### Auth behavior

- Sign up on `/login`
- Sign in with the same credentials
- `register` creates account only; `login` establishes session cookie

## 5) API Endpoints

### Auth/session

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Private app APIs

- `GET /api/knowledge`
- `POST /api/knowledge`
- `GET /api/knowledge/:id`
- `PATCH /api/knowledge/:id`
- `DELETE /api/knowledge/:id`
- `POST /api/query`
- `GET /api/stats`
- `GET /api/chat`
- `POST /api/chat`
- `GET /api/chat/:sessionId`
- `GET /api/graph`
- `POST /api/upload`

### Public API

- `GET /api/public/brain/query?q=...`
- Required header: `X-API-Key: <public_key>`

### Widget

- `GET /widget`

## 6) Validation

Run full API smoke checks:

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-curl.ps1
```

Coverage includes:

- server health
- auth/session lifecycle
- protected endpoint authorization
- knowledge create/list
- private query + chat
- graph API
- upload extraction (TXT + MD)

## 7) Render Deployment Runbook

Deployment file:

- `render.yaml` (Blueprint for web service + Postgres)

What Render provisions:

- Web service: `second-brain` (Node runtime)
- Postgres: `second-brain-db`

Important runtime behavior:

- Build command: `npm ci ; npm run build`
- Start command: `npm run db:init ; npm run start`
- DB schema is initialized automatically at service boot.

Required Render environment variables to set manually:

- `GEMINI_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `PUBLIC_BRAIN_API_KEY`
- `NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY` (must match `PUBLIC_BRAIN_API_KEY`)
- `PUBLIC_BRAIN_ALLOWED_ORIGINS`

Auto-managed via Blueprint:

- `DATABASE_URL` (from Render Postgres connection string)
- `AUTH_SECRET` (generated)
- `GEMINI_MODEL` default (`gemini-2.5-flash`)

Post-deploy checks:

1. Service health endpoint `/` returns 200.
2. `/login` is reachable.
3. Register/login works.
4. Create one knowledge item and verify dashboard listing.
5. Run local smoke suite against prod URL if needed.

## 8) Troubleshooting

### `401 Not authenticated` on private APIs

- Ensure login occurred successfully.
- Confirm `AUTH_SECRET` is set and stable across restarts.
- Verify requests include session cookies.

### Query/chat degradation or `GEMINI_CONFIG_ERROR`

- Verify `GEMINI_API_KEY` and model settings.
- Fallback responses are expected if model access fails.

### Upload extraction errors

- Ensure file type is supported (PDF, DOCX, TXT/MD, CSV/JSON, images).
- Empty/unreadable files return 4xx.
- AI metadata extraction failure falls back to basic metadata.

### DB connectivity/schema issues

- Verify `DATABASE_URL` and database availability.
- Re-run `npm run db:init` after DB changes.

## 9) Notes

- `/docs` page is intentionally removed; docs live in `README.md` and this file.
- Footer implementation remains as previously provided.
