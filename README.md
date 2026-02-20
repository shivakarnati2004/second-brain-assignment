# 🧠 Second Brain — AI-Powered Knowledge System

A full-stack AI knowledge management platform built with Next.js, PostgreSQL, and Google Gemini AI. Captures, organizes, and intelligently surfaces your accumulated knowledge.

## ✨ Features

- **Knowledge Capture** — Store notes, links, insights, and articles with rich metadata
- **AI Summarization** — Gemini auto-generates concise summaries for every item
- **Auto-Tagging** — AI intelligently categorizes content and merges with your tags
- **Conversational Query** — Ask your brain questions in natural language
- **Knowledge Graph** — Visualize inferred relationships between notes
- **Document Upload Extraction** — Upload PDF/images/text/DOCX with AI metadata extraction
- **Command Palette** — Power actions via `Cmd/Ctrl + K`
- **Accessibility Baseline** — Improved ARIA labels, focus visibility, and keyboard navigation
- **Smart Dashboard** — Search, filter, sort with beautiful animated UI
- **Public API** — Secured endpoint with API key + origin allowlist
- **Embeddable Widget** — `/widget` page for external embedding
- **Project Documentation** — see `PROJECT_DOCUMENTATION.md`

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + React 18 |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Database | PostgreSQL |
| AI | Google Gemini (default model: 2.5 Flash) |
| Type Safety | TypeScript |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Google Gemini API key (free at https://aistudio.google.com/)

### 1. Install Dependencies

```bash
cd second-brain
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Local PostgreSQL:
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/second_brain

# Cloud options (easier to set up):
# Neon (free): https://neon.tech - get connection string from dashboard
# Supabase (free): https://supabase.com - use the "connection string" from settings

# Get your free Gemini API key:
# 1. Go to https://aistudio.google.com/
# 2. Click "Get API Key"
# 3. Create a new key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Public API security and widget key
PUBLIC_BRAIN_API_KEY=replace_with_public_api_key
NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY=replace_with_public_api_key
PUBLIC_BRAIN_ALLOWED_ORIGINS=http://localhost:3000

# Auth/session (required)
AUTH_SECRET=replace_with_long_random_secret_min_32_chars
```

### 3. Initialize Database

```bash
npm run db:init
```

This creates:

- `users`
- `knowledge_items`
- `brain_queries`
- `chat_sessions`
- `chat_messages`

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Create Account, then Sign In

- Open `/login`
- Create a real account (Sign Up)
- Then sign in with those credentials
- No demo or default account is auto-created

## 📁 Project Structure

```
second-brain/
├── pages/
│   ├── index.tsx              # Landing page with parallax animations
│   ├── dashboard.tsx          # Main knowledge management app
│   ├── login.tsx              # Auth page (signup/signin)
│   ├── widget.tsx             # Embeddable widget interface
│   └── api/
│       ├── auth/              # Session auth routes (register/login/logout/me)
│       ├── chat/              # Multi-turn chat APIs
│       ├── graph.ts           # Inferred note relationship graph API
│       ├── knowledge/
│       │   ├── index.ts       # GET (list/filter) + POST (create)
│       │   └── [id].ts        # GET, PATCH, DELETE single item
│       ├── query.ts           # Private conversational brain query
│       ├── stats.ts           # Dashboard statistics
│       ├── upload.ts          # File upload + metadata extraction API
│       └── public/
│           └── brain/
│               └── query.ts   # Public API endpoint (CORS-enabled)
├── components/
│   ├── CommandPalette.tsx     # Ctrl/Cmd+K command palette
│   ├── KnowledgeGraph.tsx     # React Flow graph visualization
│   ├── ChatPanel.tsx          # Multi-turn chat panel
│   ├── KnowledgeCard.tsx      # Card with delete, type badge, tags
│   ├── AddItemModal.tsx       # Capture form modal
│   ├── StatsBar.tsx           # Stats + top tags bar
│   └── SkeletonCard.tsx       # Loading skeleton
├── lib/
│   ├── db.ts                  # PostgreSQL pool (swappable)
│   ├── gemini.ts              # AI abstraction (summarize, tag, query, extraction)
│   └── semantic.ts            # pgvector + lexical retrieval logic
├── types/index.ts             # Shared TypeScript types
├── styles/globals.css         # Design system + animations
├── scripts/init-db.js         # One-time DB setup script
├── scripts/smoke-curl.ps1     # End-to-end smoke test script
└── PROJECT_DOCUMENTATION.md    # Full project architecture and operations docs
```

## 🌐 API Reference

### Public API

```bash
# Query your brain publicly
GET /api/public/brain/query?q=what+do+I+know+about+AI
# Required header:
# X-API-Key: your_public_api_key

# Response:
{
  "query": "what do I know about AI?",
  "answer": "Based on your knowledge base...",
  "sources": [{ "id": "...", "title": "...", "summary": "..." }],
  "total_knowledge_items": 42,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Private API

```bash
# List items
GET /api/knowledge?search=&type=note&sort=created_at

# Create item (triggers async AI processing)
POST /api/knowledge
{ "title": "...", "content": "...", "type": "note", "tags": [], "source_url": "" }

# Delete item
DELETE /api/knowledge/:id

# Dashboard stats
GET /api/stats

# Private brain query
POST /api/query
{ "query": "what are my key insights?" }

# Session auth
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

# Chat
GET /api/chat
POST /api/chat
GET /api/chat/:sessionId

# Inferred relationship graph
GET /api/graph

# Upload + metadata extraction
POST /api/upload
# multipart/form-data with "file"
```

## ✅ Validation (Smoke Test)

Run the full end-to-end API smoke test (auth/session, knowledge, query/chat, graph, upload):

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-curl.ps1
```

Expected result:

- `PASSED: all checks passed`

## ☁️ Deployment

### Netlify + Neon/Supabase (Free Tier)

1. Import repo into Netlify (**Add new site → Import existing project**)
2. Set branch to `main`
3. If required, set base directory to `second-brain`
4. Keep build command: `npm run build`
5. Add environment variables in Netlify:
      - `DATABASE_URL`
      - `GEMINI_API_KEY`
      - `GEMINI_MODEL=gemini-2.5-flash`
      - `NEXT_PUBLIC_APP_URL=https://<your-site>.netlify.app`
      - `AUTH_SECRET`
      - `PUBLIC_BRAIN_API_KEY`
      - `NEXT_PUBLIC_PUBLIC_BRAIN_API_KEY` (same as `PUBLIC_BRAIN_API_KEY`)
      - `PUBLIC_BRAIN_ALLOWED_ORIGINS=https://<your-site>.netlify.app,http://localhost:3000`
6. Deploy site
7. Run schema initialization once against production DB:
      ```bash
      DATABASE_URL=<production_db_url> npm run db:init
      ```

Detailed step-by-step guide: `DEPLOY_NETLIFY.md`

## 🎨 Design System

The UI uses a dark obsidian theme with:
- **Fonts:** Playfair Display (display) + DM Sans (body) + JetBrains Mono (code)
- **Colors:** Obsidian backgrounds, Ember (#ff6b35), Aurora (#4ecdc4), Neural (#9d4edd)
- **Effects:** Glassmorphism cards, mesh gradient backgrounds, noise texture overlay
- **Animation:** Framer Motion for page transitions and micro-interactions
- **Skeleton loaders:** Shimmer effect during data fetching

## 🤖 AI Pipeline

```
User creates item
      │
      ▼
POST /api/knowledge
      │
      ├── Saves to DB immediately (returns to user)
      │
      └── Async: processWithAI()
            │
            ├── summarizeContent() → Gemini model (configurable)
            ├── generateTags()    → Gemini model (configurable)
            └── Updates DB with summary + AI tags
```

## 📐 Architecture Principles

See `PROJECT_DOCUMENTATION.md` for detailed documentation on:

1. **Portable Architecture** — Swappable components at every layer
2. **Principles-Based UX** — 5 design principles for AI interactions
3. **Agent Thinking** — Background automation that improves over time
4. **Infrastructure Mindset** — Public API + reliable operational contracts

## 🔑 Getting a Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" → "Create API Key"
4. Copy the key to your `.env.local`

The free tier includes generous usage limits for development and personal use.

---

Built for the Altibbe/Hedamo Full-Stack Engineering Internship Assessment.
