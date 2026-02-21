# Deploy on Render (Web Service + Render Postgres) — A to Z

This project is a Next.js 14 app with API routes. Render can host it as a Node web service.

## 0) Prerequisites

- GitHub repo connected to Render
- Render account
- Gemini API key

## 1) Repo readiness

Ensure these files are in the repository root:

- `render.yaml`
- `package.json`

## 2) Create services in Render

1. Open Render dashboard.
2. Click **New** → **Blueprint**.
3. Select this repository and branch.
4. Render reads `render.yaml` and creates:
   - Web service: `second-brain-web`
   - Postgres service: `second-brain-db`

## 3) Build and run settings

Configured in `render.yaml`:

- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Node runtime: `20`

## 4) Environment variables (required)

Set in Render service environment:

- `DATABASE_URL` = from Render Postgres Internal Database URL
- `GEMINI_API_KEY` = Gemini key
- `GEMINI_MODEL` = `gemini-2.5-flash`
- `NEXT_PUBLIC_APP_URL` = `https://<your-service>.onrender.com`
- `AUTH_SECRET` = long random secret (32+ chars)
- `PUBLIC_BRAIN_API_KEY` = long random token
- `NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY` = same value as `PUBLIC_BRAIN_API_KEY`
- `PUBLIC_BRAIN_ALLOWED_ORIGINS` = `https://<your-service>.onrender.com,http://localhost:3000`

## 5) First deploy

1. Trigger deploy in Render.
2. Wait for build + start.
3. Open:
   - `/`
   - `/login`
   - `/dashboard` (after auth)

## 6) Initialize database schema (one-time)

Run once against production DB.

Option A (Render shell on web service):

```bash
npm run db:init
```

Option B (local terminal):

```powershell
$env:DATABASE_URL = "<render-postgres-internal-or-external-url>"
npm run db:init
```

## 7) Post-deploy validation

- Create account and login
- Add one knowledge item
- Run one query and one chat
- Open graph panel
- Upload a TXT/MD file

Optional smoke run (local):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-curl.ps1
```

## 8) Notes

- Render free tier may have cold starts.
- Keep `PUBLIC_BRAIN_ALLOWED_ORIGINS` in sync with your Render domain/custom domain.

## 9) Troubleshooting

### Build fails

- Confirm Node is set to `20`
- Confirm build command is `npm ci && npm run build`

### 401 on private APIs

- Verify login flow and session cookie
- Confirm `AUTH_SECRET` is set

### API/database errors

- Verify `DATABASE_URL`
- Run `npm run db:init` against production DB once

### Gemini errors

- Verify `GEMINI_API_KEY`
- Query/chat fallback responses may appear if AI is unavailable
