# Escalon Map

Personal dual-hemisphere prophetic/geopolitical timeline workspace. (2026–2075).

## Easiest way to start (Windows)

### First time only

**Double-click `Install Escalon Map.cmd`**

This downloads Node.js automatically (you do **not** need to install Node yourself), installs app dependencies, and creates a desktop shortcut called **Escalon Map**.

### Every time after that

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

The app works without API keys — timeline editing and map switching still work.

## Features

- **Dual-hemisphere timeline** — prophetic above, earthly signals below
- **Multiple maps** — keep your map and browse shared maps side by side
- **Semantic zoom** — decadal / yearly / seasonal density levels
- **Narrative spotlight** — highlight a thread with SVG bezier connectors
- **Signal tray** — AI news matching (with API keys)
- **Map Intelligence** — chat with a timeline (with API keys)
- **Import/Export** — share maps as JSON files without overwriting yours

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
| Port 3000 in use | Close other apps on port 3000, or run `npm run start -- -p 3001` |
| Fresh empty map | Delete `data/maps/my-map.db` and restart |
| Reset API keys | Edit or delete `data/settings.json` |
| App feels slow on first open | Run `build.cmd` once, then use `Open Escalon Map.bat` (production mode) |
| Shared map won't update | Re-export from the owner and re-import the new `.json` file |

## Before you share publicly

- **Rotate API keys** if `data/settings.json` was ever copied or zipped with the project
- Confirm `data/` is **not** in git: `git ls-files data` should return nothing
- Run `build.cmd` after updates so friends get a production build
- Export maps as `.json` only — personal milestones are excluded unless you check the box

## Database

Local SQLite (`data/maps/my-map.db`) via Drizzle ORM + **sql.js** (no native build tools required on Windows).

Legacy `escalon.db` in the project root is migrated automatically to `data/maps/my-map.db` on first run.
