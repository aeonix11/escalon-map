# Escalon Map

A local-first timeline workspace for mapping **prophetic insight** and **real-world signals** on one canvas — from 2012 through 2075.

Escalon Map is built for people who track long-range narratives: dreams, prophecies, geopolitical events, market cycles, and how they might line up over time. Instead of scattered notes and spreadsheets, you get a single **dual-hemisphere timeline** where vision sits above the axis and earthly confirmation sits below it.

Everything runs on **your computer**. Your map, notes, and API keys stay in a local `data/` folder — nothing is uploaded to a cloud server unless you choose to export and share a file.

---

## What you use it for

- **Build your timeline** — place milestones on prophetic or earthly tracks, grouped by colored narratives (wealth transfer, geopolitics, health crises, etc.)
- **Connect evidence** — attach video clip fragments and notes to dates; link milestones to source material
- **Watch for convergence** — zoom from decade view down to seasonal detail; spotlight one narrative to see how its thread weaves through time
- **Monitor the news** — pull RSS feeds into a Signal Hub inbox and match headlines to your narratives (with an Anthropic API key)
- **Ask questions of your map** — Map Intelligence chat and deep analysis can summarize patterns and suggest new milestone ideas on the timeline (optional AI features)
- **Compare with others** — import a friend's exported map as a **read-only** view without merging it into yours

---

## Features

### Timeline

- **Dual hemispheres** — prophetic (upper) and earthly (lower) on one scrollable canvas
- **Narratives** — color-coded story threads; click to spotlight and dim everything else
- **Milestones** — fixed or fuzzy date ranges; optional personal (private) milestones you can hide from the view
- **AI-suggested milestones** — from deep analysis, shown as dashed boxes until you accept or dismiss them
- **Notes** — pin notes to dates on either hemisphere
- **Video fragments** — timestamped clips from sources (e.g. YouTube), linked to milestones
- **Now marker** — today's date on the timeline; app opens centered on the present
- **Semantic zoom** — scroll wheel (Ctrl + scroll) and slider from decadal → yearly → seasonal density

### Signal Hub

- **RSS feeds** — subscribe to news sources; background polling on Windows (optional scheduler)
- **Inbox** — incoming signals with accept / dismiss / match-to-narrative workflow
- **AI matching** — Claude can reason about whether a headline fits a narrative (requires API key)

### Map Intelligence

- **Chat** — ask questions about your map ("what years converge?", "gaps in my narratives?")
- **Deep analysis** — full research report plus suggested milestones placed on the timeline (requires API key; My Map only)

### Maps & sharing

- **My Map** — your editable master timeline (`data/maps/my-map.db`)
- **Shared maps** — import someone else's `.json` export as a separate, view-only snapshot
- **Export** — download your map as JSON; personal items excluded by default
- **Settings** — switch maps, manage API keys, add/remove shared maps

### Privacy & local data

- **No account required** — works offline for editing after install
- **Local SQLite database** — no native build tools needed on Windows (uses sql.js)
- **API keys stored locally** in `data/settings.json` (never committed to git)

---

## Getting started

### Easiest way (Windows)

#### First time only

**Double-click `Install Escalon Map.cmd`**

This downloads Node.js automatically (you do **not** need to install Node yourself), installs app dependencies, and creates a desktop shortcut called **Escalon Map**.

#### Every time after that

**Double-click `Open Escalon Map.bat`** or the **Escalon Map** shortcut on your desktop.

Keep the black window open while you use the app. Close it to stop.

> If you open `Open Escalon Map.bat` without installing first, it will run the installer for you automatically.

## Prerequisites

- Windows 10/11 with internet (for first-time install only)
- **Node.js is NOT required** — the installer bundles it in `tools/node/`

Mac/Linux users still need [Node.js 20+](https://nodejs.org/) installed manually.

## Manual setup

| Platform | First time | Start app |
|---|---|---|
| **Windows** | `cmd /c setup.cmd` | Double-click `Open Escalon Map.bat` or `cmd /c start.cmd` |
| **macOS / Linux** | `chmod +x setup.sh && ./setup.sh` | `./start.sh` |

Open [http://localhost:3000](http://localhost:3000).

## Settings page

Click **Settings** in the app (or go to `/settings`).

### Switch between maps

- **My Map** — your editable timeline
- **Shared maps** — view-only copies of other people's exports; your map is never changed

Use the dropdown **“Which map are you viewing?”** to switch.

### Share a map

1. Settings → **Export my map** → download the `.json` file
2. Send the file to someone else
3. They use Settings → **Add someone else's map** to upload it

No more merging imports into your own timeline.

### Sharing with friends

**What to send:** the app folder (or a GitHub link) plus an exported `.json` map file.

**Never send your `data/` folder** — it contains your private timeline database and API keys.

**Recipient steps:**
1. Run `Install Escalon Map.cmd` (Windows)
2. Open the app → Settings → **Add someone else's map**
3. Select the `.json` file you sent them

Their own map stays separate. Yours is view-only on their machine.

### API keys (optional)

Enter keys in Settings. They are saved locally in `data/settings.json`.

| Key | Used for |
|---|---|
| Anthropic | Map Intelligence chat & signal matching |
| Voyage | Semantic search (optional — not fully working yet) |

The app works without API keys — timeline editing, notes, fragments, and map switching all work offline after install.

---

## Optional: background RSS polling (Windows)
```cmd
cmd /c setup-scheduler.cmd
```

## Troubleshooting

| Problem | Fix |
|---|---|
| "Node.js not installed" | Run **`Install Escalon Map.cmd`** first |
| Install download fails | Check internet; run installer again |
| `npm` blocked in PowerShell | Use the `.cmd` / `.bat` files instead |
| `build.cmd` not found in PowerShell | Run `.\build.cmd` (the `.\` prefix is required) |
| Port 3000 in use | Close other Escalon Map windows, or run `npm run start -- -p 3001` |
| Fresh empty map | Delete `data/maps/my-map.db` and restart |
| Reset API keys | Edit or delete `data/settings.json` |
| App feels slow on first open | Run `.\build.cmd` once, then use `Open Escalon Map.bat` (production mode) |
| `Cannot find module './NNN.js'` | Close the app, run `.\build.cmd`, then open again (stale build cache) |
| Black window opens and closes | Use **Open Escalon Map.bat** directly; run `.\build.cmd` first if needed |
| Shared map won't update | Re-export from the owner and re-import the new `.json` file |

## Before you share publicly

- **Rotate API keys** if `data/settings.json` was ever copied or zipped with the project
- Confirm `data/` is **not** in git: `git ls-files data` should return nothing
- Run `.\build.cmd` after updates so friends get a production build
- Export maps as `.json` only — personal milestones are excluded unless you check the box

## Database

Local SQLite (`data/maps/my-map.db`) via Drizzle ORM + **sql.js** (no native build tools required on Windows).

Legacy `escalon.db` in the project root is migrated automatically to `data/maps/my-map.db` on first run.
