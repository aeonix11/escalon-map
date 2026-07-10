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
| `API_KEY_ENCRYPTION_SECRET` | Random hex (`openssl rand -hex 32`) — required to save keys |
| `ANTHROPIC_API_KEY` | Optional local dev fallback only |
| `VOYAGE_API_KEY` | Optional local dev fallback only |

Apply the database schema (Supabase SQL editor or):

```bash
npm install
npm run db:push
```

Run migrations in order if you use SQL files: `drizzle/0000_init.sql`, `drizzle/0001_comment_anchors.sql`, `drizzle/0002_user_api_keys.sql`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In Supabase **Authentication → URL configuration**, add:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

---

## AI API keys (bring your own)

Map Intelligence, signal matching, and deep analysis call **Anthropic** and optionally **Voyage** on your behalf. **Each user saves their own keys** in Settings so usage is billed to them, not the app operator.

### How it works

| What | Where |
|------|--------|
| Your API keys (encrypted) | Supabase `profiles` table |
| Encryption master secret | `API_KEY_ENCRYPTION_SECRET` in Vercel env (operator sets once) |
| Vercel disk | Not used — read-only on serverless |

1. Open **Settings** and paste your Anthropic / Voyage keys.
2. Keys are encrypted (AES-256-GCM) before being written to Postgres.
3. When you run Map Intelligence, the server decrypts **your** keys in memory for that request only.
4. The API never returns full keys — only masked hints (`sk-a••••xyz`).

**Do not** set `ANTHROPIC_API_KEY` or `VOYAGE_API_KEY` in Vercel env on a shared deployment.

Local dev can still use `data/settings.json` or env var fallbacks if you have not saved keys to the database yet.

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
| AI features disabled | Add keys in Settings; run `0002_user_api_keys.sql`; set `API_KEY_ENCRYPTION_SECRET` on Vercel |
| Comments not anchoring | Run `drizzle/0001_comment_anchors.sql` on your database |
| `DATABASE_URL is not set` | Add Supabase pooled connection string to env vars |

More deployment notes: **[DEPLOY.md](DEPLOY.md)**.

---

## License

Private project — check with the repository owner before redistributing.
