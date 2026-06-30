# Escalon Map

Personal dual-hemisphere prophetic/geopolitical timeline workspace for 32-inch desktop monitors (2026–2075).

## Setup

### Windows (PowerShell execution policy blocks scripts)

If `npm` or `.\setup.ps1` fails with *running scripts is disabled*, use **`npm.cmd`** or the batch setup file:

```cmd
cd C:\Users\Aenon\Documents\escalon-map
cmd /c setup.cmd
cmd /c npm.cmd run dev
```

In PowerShell, run the batch file with `cmd /c setup.cmd` (or `.\setup.cmd` only works if you use `cmd /c` — PowerShell does not run `.cmd` from the current folder without a path prefix).

Or in one line from **cmd.exe** (not PowerShell):

```cmd
cd /d C:\Users\Aenon\Documents\escalon-map && npm.cmd install && npm.cmd run dev
```

Optional — allow scripts for **this PowerShell session only** (does not change system policy):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

### macOS / Linux

```bash
cd ~/Documents/escalon-map
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | For AI features | Claude signal matching & Map Intelligence chat |
| `VOYAGE_API_KEY` | For semantic search | Voyage embeddings for fragment/signal matching |

The app runs without API keys — timeline, forms, and import/export work locally. AI features degrade gracefully.

## Features

- **Dual-hemisphere timeline** — prophetic above, earthly signals below
- **Semantic zoom** — decadal / yearly / seasonal density levels
- **Narrative spotlight** — highlight a thread with SVG bezier connectors
- **Fuzzy date gradients** — uncertain windows render as translucent bands
- **Video modal** — YouTube deep-links to exact timestamp seconds
- **Signal tray** — AI news matching via Voyage + Claude RAG pipeline
- **Map Intelligence** — chat with your entire timeline
- **Import/Export** — share maps as JSON files

## Database

Local SQLite file (`escalon.db`) managed by Drizzle ORM + **sql.js** (pure WASM — no Visual Studio / native build tools required on Windows).
