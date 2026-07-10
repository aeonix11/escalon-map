<img width="2541" height="1152" alt="Escalon Map timeline screenshot" src="https://github.com/user-attachments/assets/7390d4d3-1c40-4543-b088-98b886e8d8df" />

# Escalon Map

A timeline workspace for mapping **prophetic insight** and **real-world signals** on one canvas — from 2012 through 2075.

Escalon Map is built for people who track long-range narratives: dreams, prophecies, geopolitics, market cycles, and how they might line up over time. You get a single **dual-hemisphere timeline** where vision sits above the axis and earthly confirmation sits below it.

**Live demo:** [escalon-map.vercel.app](https://escalon-map.vercel.app)

---

## What you use it for

- **Build your timeline** — place milestones on prophetic or earthly tracks, grouped by colored narratives
- **Connect evidence** — attach video fragments and notes to dates; link milestones to source material
- **Watch for convergence** — zoom from decade view down to seasonal detail; spotlight one narrative to fade or hide the rest
- **Monitor the news** — RSS feeds in the Signal Hub inbox; match headlines to narratives (optional AI)
- **Ask questions of your map** — Map Intelligence chat and deep analysis (optional AI, your own API keys)
- **Share with others** — public view-only links; viewers can leave map-anchored comments when logged in

---

## Features

### Timeline

- **Dual hemispheres** — prophetic (upper) and earthly (lower) on one scrollable canvas
- **Narratives** — color-coded threads; milestones can belong to multiple narratives
- **Milestones** — fixed or fuzzy date ranges; optional personal items you can hide from view
- **AI-suggested milestones** — from deep analysis, shown as dashed boxes until accepted or dismissed
- **Notes** — pin notes to dates on either hemisphere
- **Video fragments** — timestamped clips linked to milestones
- **Now marker** — today's date on the timeline
- **Semantic zoom** — Ctrl + scroll wheel and slider (decadal → yearly → seasonal)

### Sharing & comments

- **One map per account** — sign up and get your own editable map
- **Public share links** — `/m/your-slug` for view-only access
- **Map-anchored comments** — viewers pin feedback to a date or milestone; you review comments on your dashboard
- **Export / import** — JSON backup and migration from older local installs

### Signal Hub & Map Intelligence (optional)

- **RSS feeds** — subscribe to sources; poll for new headlines
- **AI matching** — Claude reasons about whether a signal fits a narrative
- **Chat & deep analysis** — ask questions about your map; get suggested milestones

Requires **your own** Anthropic (and optionally Voyage) API keys — see [AI API keys](#ai-api-keys-bring-your-own) below.

### Privacy controls

- **Private by default** — only you edit your map until you set visibility to Public
- **Personal milestones & notes** — hidden from shared view when you use “Hide personal”
- **Narrative focus** — fade or hide non-selected narratives on shared maps

---

## Quick start (hosted)

1. Open [escalon-map.vercel.app](https://escalon-map.vercel.app) and sign in (Google or magic link).
2. Your map is created automatically.
3. Optional: **Settings** → add API keys for AI features.
4. Optional: **Settings** → set map to **Public** and copy the share link.

To self-host on Vercel + Supabase (free tier), see **[DEPLOY.md](DEPLOY.md)**.

---

## Local development

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)

### Setup

```bash
git clone https://github.com/aeonix11/escalon-map.git
cd escalon-map
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `DATABASE_URL` | Supabase pooled Postgres URI (port 6543) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local auth |
| `ANTHROPIC_API_KEY` | Optional — dev fallback only; prefer per-user keys in Settings |
| `VOYAGE_API_KEY` | Optional — embeddings / semantic search |

Apply the database schema (Supabase SQL editor or):

```bash
npm install
npm run db:push
```

Run migrations in order if you use SQL files: `drizzle/0000_init.sql`, then `drizzle/0001_comment_anchors.sql`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In Supabase **Authentication → URL configuration**, add:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

---

## AI API keys (bring your own)

Map Intelligence, signal matching, and deep analysis call **Anthropic** and optionally **Voyage** on your behalf. **You should use your own keys** so usage is billed to you, not the app operator.

### How it works today

| Environment | Where keys live |
|-------------|-----------------|
| **Local dev** | Settings page → saved in `data/settings.json` on your machine (not committed to git) |
| **Hosted (Vercel)** | Settings UI exists, but serverless cannot persist to disk — keys currently fall back to **deployment env vars** if set |

That means on the public deployment, if the operator sets `ANTHROPIC_API_KEY` in Vercel, **everyone’s AI requests could share that one key** until per-user storage is implemented.

### Planned direction: per-user keys in the database

The intended model:

1. Each user saves keys in **Settings** (already in the UI).
2. Keys are stored **encrypted** in Postgres (per-user row), not plaintext.
3. A server-only **encryption secret** in Vercel env decrypts keys only when that user runs an AI feature.
4. API routes never return full keys — only masked hints (`sk-a••••xyz`).
5. No AI calls without a key configured for the logged-in user.

**Is the database hackable?** Any server-stored secret can be exposed if both the DB and encryption key leak. Standard mitigation:

- Encrypt at rest (AES-256-GCM) with a master secret **outside** the database
- Row-level access: only the owning user’s keys are ever decrypted
- Never log keys; mask in API responses
- Optional: Supabase Vault or a dedicated secrets service for the master key

**Alternatives considered**

| Approach | Pros | Cons |
|----------|------|------|
| **Encrypted in DB** (recommended) | Works with server-side AI routes; keys sync across devices | Requires trusting the app host with encrypted blobs |
| **Browser-only storage** | Server never sees keys | CORS limits direct API calls; keys visible in devtools; harder for server-side features |
| **No hosted AI** | Zero key risk for operator | Users lose Intelligence features on the web app |

Until per-user encrypted storage ships, **do not put your personal Anthropic key in Vercel env vars** if others will use the same deployment.

---

## Settings

Open **Settings** from the app header (`/settings`).

- **Map name** and **public / private** visibility
- **Share link** when public
- **Export** map as JSON
- **Import** JSON (replaces your cloud map)
- **API keys** — Anthropic & Voyage
- **Narrative focus** — fade vs hide non-selected narratives on shared views
- **Display name** for comments

---

## Sharing workflow

### Share your map

1. Settings → **Sharing** → set visibility to **Public**
2. Copy the link (`https://…/m/your-slug`)
3. Send the link — viewers see a read-only timeline

### Comments from viewers

- Viewers must **log in** to post comments
- They can attach comments to the whole map, a **timeline point**, or a **milestone**
- You see all comments on your dashboard via the **Comments** panel (with count badge)
- Click a pinned comment to jump to that location on the map

### Export for backup

Settings → **Export** → download `.json`. Keep backups outside the repo.

---

## Project structure

```
src/
  app/           # Next.js routes (pages + API)
  components/    # Timeline, comments, settings, AI panels
  lib/           # DB schema, auth, map data, AI clients
  store/         # Client state (Zustand)
drizzle/         # SQL migrations
DEPLOY.md        # Vercel + Supabase deployment guide
```

**Stack:** Next.js 15, React 19, Supabase Auth, Postgres (Drizzle ORM), Vercel.

---

## Legacy local desktop install (Windows)

Older versions ran fully offline with SQLite in `data/`. The current default is **cloud + auth**. You can still use the Windows installer scripts for local-only experimentation, but sharing, comments, and multi-user features expect the hosted setup.

See git history / tags if you need the pure local-first workflow.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Auth redirect error | Check Supabase Site URL includes `https://` and redirect URLs match your domain |
| Map empty after login | Import your JSON export via Settings, or wait for seed data on first load |
| AI features disabled | Add your Anthropic key in Settings (per-user DB storage coming soon) |
| Comments not anchoring | Run `drizzle/0001_comment_anchors.sql` on your database |
| `DATABASE_URL is not set` | Add Supabase pooled connection string to env vars |

More deployment notes: **[DEPLOY.md](DEPLOY.md)**.

---

## License

Private project — check with the repository owner before redistributing.
