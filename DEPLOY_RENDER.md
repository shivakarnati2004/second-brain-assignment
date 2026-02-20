# Deploy on Render (A to Z)

This guide deploys the app using the included Blueprint file `render.yaml`.

## 0) Prerequisites

- GitHub/GitLab repo with this project pushed
- Render account
- Gemini API key from https://aistudio.google.com/

## 1) Repository setup

1. Ensure `render.yaml` is present at project root.
2. Commit and push all latest changes.

## 2) Create via Blueprint

1. Open Render dashboard.
2. Click **New** → **Blueprint**.
3. Connect your Git provider and choose this repository.
4. Select the branch to deploy.
5. Click **Apply**.

Render creates:

- Web service: `second-brain`
- PostgreSQL: `second-brain-db`

## 3) Set environment variables (required)

In the `second-brain` service, set:

- `GEMINI_API_KEY` = your Gemini key
- `NEXT_PUBLIC_APP_URL` = your Render app URL (example: `https://second-brain.onrender.com`)
- `PUBLIC_BRAIN_API_KEY` = random secure key
- `NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY` = same value as `PUBLIC_BRAIN_API_KEY`
- `PUBLIC_BRAIN_ALLOWED_ORIGINS` = your Render app URL

Auto-managed by Blueprint:

- `DATABASE_URL` (from Render Postgres)
- `AUTH_SECRET` (generated)
- `GEMINI_MODEL` (`gemini-2.5-flash`)

## 4) Build and boot behavior

Configured in `render.yaml`:

- Build: `npm ci && npm run build`
- Start: `npm run db:init && npm run start`

So schema setup runs automatically before app start.

## 5) Important Render settings

- Runtime: Node
- Node version env: `NODE_VERSION=20`
- Health check path: `/`
- Auto deploy: enabled

If your repository root is one level above this app, set **Root Directory** to:

- `second-brain`

## 6) First deployment verification

After deploy is green:

1. Open service URL and confirm landing page loads.
2. Open `/login` and create account.
3. Login and open `/dashboard`.
4. Add one item and run one query.
5. Open graph view and verify nodes render.
6. Upload a `.txt` or `.md` file and confirm extraction.

## 7) API smoke test (optional, recommended)

From project directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-curl.ps1
```

Expected: `PASSED: all checks passed`

## 8) Troubleshooting

### 401 on private APIs

- Ensure login succeeded.
- Ensure `AUTH_SECRET` exists and remains set.
- Ensure browser allows cookies.

### Gemini errors

- Recheck `GEMINI_API_KEY`.
- Query/chat use fallback responses if model is temporarily unavailable.

### DB/schema issues

- Confirm Render Postgres is healthy.
- Redeploy service to rerun `npm run db:init`.

### CORS/public API issues

- Ensure `PUBLIC_BRAIN_ALLOWED_ORIGINS` exactly matches deployed URL.

## 9) Updating deployment

1. Push commits to the connected branch.
2. Render auto-deploys.
3. Check deploy logs and run quick app sanity checks.
