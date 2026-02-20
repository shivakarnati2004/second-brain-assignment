# Deploy on Netlify (Free Tier) — A to Z

This project is a Next.js 14 app with API routes. Netlify can host it on the free tier using the Next.js runtime plugin.

## 0) Prerequisites

- GitHub repo: `shivakarnati2004/second-brain-assignment`
- Netlify account
- External Postgres DB (Neon/Supabase free tier)
- Gemini API key

## 1) Repo readiness

Ensure these files are in the repository root:

- `netlify.toml`
- `package.json`

`netlify.toml` used by this project:

```toml
[build]
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## 2) Import project into Netlify

1. Open Netlify dashboard.
2. Click **Add new site** → **Import an existing project**.
3. Connect GitHub and select `shivakarnati2004/second-brain-assignment`.
4. Branch: `main`.
5. If needed, set **Base directory** to `second-brain`.

## 3) Build settings

- Build command: `npm run build`
- Publish directory: leave empty

(Next plugin handles SSR/API output automatically.)

## 4) Environment variables (required)

Set in **Site configuration → Environment variables**:

- `DATABASE_URL` = production Postgres connection string
- `GEMINI_API_KEY` = Gemini key
- `GEMINI_MODEL` = `gemini-2.5-flash`
- `NEXT_PUBLIC_APP_URL` = `https://<your-site>.netlify.app`
- `AUTH_SECRET` = long random secret (32+ chars)
- `PUBLIC_BRAIN_API_KEY` = long random token
- `NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY` = same value as `PUBLIC_BRAIN_API_KEY`
- `PUBLIC_BRAIN_ALLOWED_ORIGINS` = `https://<your-site>.netlify.app,http://localhost:3000`

## 5) First deploy

1. Click **Deploy site**.
2. Wait for deploy to finish.
3. Open:
   - `/`
   - `/login`
   - `/dashboard` (after auth)

## 6) Initialize database schema (one-time)

Run locally against your production DB:

```powershell
$env:DATABASE_URL = "<your-production-db-url>"
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

## 8) Free-tier notes

- Netlify free tier includes build minutes and serverless limits.
- Cold starts may cause first request latency.
- Database must be external (Netlify does not provide Postgres).

## 9) Troubleshooting

### Build fails

- Confirm `NODE_VERSION=20`
- Confirm plugin line exists in `netlify.toml`

### 401 on private APIs

- Verify login flow and session cookie
- Confirm `AUTH_SECRET` is set

### API/database errors

- Verify `DATABASE_URL`
- Run `npm run db:init` against production DB once

### Gemini errors

- Verify `GEMINI_API_KEY`
- Query/chat fallback responses may appear if AI is unavailable
