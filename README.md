# 📊 Team Abhinav — HR Analytics Dashboard

> A fully automated, modular HR Analytics Dashboard that pulls live data from a SharePoint-hosted Excel tracker, processes it through a Python pipeline, and serves it as a beautiful, interactive static web app via GitHub Pages.

[![Refresh Dashboard Data](https://github.com/anupamsingh88/Dashboard/actions/workflows/data_sync.yml/badge.svg)](https://github.com/anupamsingh88/Dashboard/actions/workflows/data_sync.yml)
[![GitHub Pages](https://img.shields.io/badge/Live%20Dashboard-GitHub%20Pages-blue?logo=github)](https://anupamsingh88.github.io/Dashboard)
![License](https://img.shields.io/github/license/anupamsingh88/Dashboard)

---

## 🌐 Live Demo

**[→ Open Dashboard](https://anupamsingh88.github.io/Dashboard)**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Full Data Flow](#full-data-flow)
- [Project Structure](#project-structure)
- [Modules & Components](#modules--components)
- [Data Pipeline (Python)](#data-pipeline-python)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Frontend Architecture](#frontend-architecture)
- [Configuration & Secrets](#configuration--secrets)
- [Local Development](#local-development)
- [Adding a New Month](#adding-a-new-month)
- [Troubleshooting](#troubleshooting)

---

## Overview

This dashboard is built for **Team Abhinav** (8AM–4PM Digital & Voice Operations shift) to provide real-time visibility into:

| Feature | Description |
|---|---|
| 📅 **Attendance Tracking** | Daily/monthly per-member status (Present, Absent, PL, UPL, Holiday, Week-Off) |
| ⚡ **Productivity Metrics** | Work-week scores and daily task counts per member |
| ⏱️ **Additional Hours (AH)** | Extra hours logged by each member per day/week |
| 🏆 **Leaderboard** | Top/bottom performers ranked by total production score |
| 🖥️ **GAMS Compliance** | GAMS system access status per member |
| 🗂️ **Queue Allocation** | P0/P1/P2 queue assignments per member |
| 📝 **Assessment Results** | Training assessment pass/fail data |
| 👤 **Member Profile** | Drill-down per-member page with full attendance calendar |
| 📆 **Multi-Month Support** | Switch between months — data for all months loaded at once |

---

## Architecture

This project follows a **3-Layer Architecture** that separates concerns for reliability:

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: DIRECTIVE                       │
│              directives/ — SOPs & intent docs               │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 2: ORCHESTRATION                     │
│    GitHub Actions (.github/workflows/data_sync.yml)         │
│    Schedules, triggers, and coordinates execution           │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 3: EXECUTION                        │
│        execution/sync_pipeline.py — deterministic           │
│        Python script that does the actual data work         │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND OUTPUT                         │
│     shared/data.js + shared/version.json → GitHub Pages     │
└─────────────────────────────────────────────────────────────┘
```

**Why this architecture?** LLMs are probabilistic — business logic must be deterministic. By pushing all data transformation into a tested Python script, errors don't compound across pipeline steps.

---

## Full Data Flow

Here is the complete, end-to-end data flow from the source Excel file to the browser:

```
📄 SharePoint Excel Tracker
        │
        │  (EXCEL_URL secret via GitHub Secrets)
        ▼
⚙️  execution/sync_pipeline.py
        │
        │  1. Downloads .xlsx from SharePoint
        │  2. Reads sheets: Attendance, Productivity,
        │     GAMS, Additional Hours, FTE Details,
        │     Queue Allocation, Assessment Results,
        │     Daily Log — for EACH month
        │  3. Transforms into unified JSON structure
        │  4. Writes:
        │     → shared/data.js     (window.PROJECT_DATA)
        │     → shared/version.json (timestamp metadata)
        ▼
🤖 GitHub Actions (data_sync.yml)
        │
        │  Triggers: every 30 minutes (cron) OR
        │            on push to main OR
        │            manual workflow_dispatch
        │  Commits the updated data.js back to the repo
        ▼
🌐 GitHub Pages (static hosting)
        │
        │  Serves index.html + all modules
        ▼
🖥️ Browser (app.js)
        │
        │  1. Loads all HTML partials in parallel (fetch)
        │  2. Reads window.PROJECT_DATA from data.js
        │  3. Initializes all module renderers
        │  4. Polls version.json every 10s — auto-reloads
        │     if a new data push is detected
        ▼
📊 Dashboard UI (Charts, Tables, Modal, Profiles)
```

---

## Project Structure

```
Bhino_Bhaiya/
│
├── index.html                  # App shell — loads all CSS/JS, defines containers
├── app.js                      # Master orchestrator — loads partials, switchMonth(), polling
│
├── shared/                     # Global data & utilities
│   ├── data.js                 # ⚡ AUTO-GENERATED — DO NOT EDIT MANUALLY
│   ├── version.json            # ⚡ AUTO-GENERATED — timestamp of last sync
│   ├── utils.js                # Shared state, chart helpers, CSV export, GAMS utils
│   ├── gams.js                 # GAMS section renderer
│   ├── base.css                # CSS reset & root variables
│   ├── shared.css              # Global design system tokens & utilities
│   └── data_flow.html          # "How data flows" visual section partial
│
├── sidebar/                    # Navigation sidebar module
│   ├── sidebar.html
│   ├── sidebar.js              # initSidebar(), scrollspy, month switcher
│   └── sidebar.css
│
├── header/                     # Top header/title bar module
│   └── header.html
│
├── overview/                   # KPI summary cards section
│   ├── overview.html
│   ├── overview.js             # updateKPIs(), renderDashboard()
│   └── overview.css
│
├── attendance/                 # Attendance charts & daily view
│   ├── attendance.html
│   ├── attendance.js           # initDailyChart(), initDonutChart(), initAttendanceFilter()
│   └── attendance.css
│
├── productivity/               # Weekly production charts
│   ├── productivity.html
│   ├── productivity.js         # initWeeklyProdChart(), initWeekGroupChart(), buildWeekTabs()
│   └── productivity.css
│
├── additional_hours/           # Additional hours tracking
│   ├── ah.html
│   ├── ah.js                   # renderAH()
│   └── ah.css (if exists)
│
├── members/                    # Full members table with sort/filter
│   ├── members.html
│   ├── members.js              # renderTable(), sort, filter by shift/batch
│   └── members.css
│
├── assessments/                # Assessment results section
│   ├── assessments.html
│   ├── assessments.js          # renderAssessments()
│   └── assessments.css
│
├── profile/                    # Individual member drill-down profile view
│   ├── profile.html
│   ├── profile.js              # showProfile(uid), attendance calendar
│   └── profile.css
│
├── modal/                      # Reusable modal popup (daily member list)
│   ├── modal.html
│   ├── modal.js                # showModal(), closeModal()
│   └── modal.css
│
├── queue/                      # Queue allocations section
│   ├── queue.html
│   ├── queue.js                # renderQueue()
│   └── queue.css (if exists)
│
├── execution/                  # Python data pipeline (Layer 3)
│   ├── sync_pipeline.py        # Main ETL script
│   ├── process_xlsx.py         # Helper xlsx utilities
│   ├── inspect_excel.py        # Debug/inspection script
│   ├── recalc.py               # Recalculation utilities
│   └── requirements.txt        # Python dependencies
│
├── .github/
│   └── workflows/
│       └── data_sync.yml       # GitHub Actions CI/CD pipeline
│
├── .env                        # Local secrets (NOT committed)
├── .gitignore                  # Ignores .env, .xlsx, .venv, __pycache__
├── GEMINI.md / AGENTS.md / CLAUDE.md  # AI agent instructions (3-layer architecture)
└── LICENSE
```

---

## Modules & Components

### `shared/data.js` — The Data Brain

This is the **auto-generated** JavaScript file that is the single source of truth for all dashboard data. It is produced by the Python pipeline and committed by GitHub Actions. **Never edit this file manually.**

It exports the following globals to `window`:

```javascript
window.FTE_DETAILS   // { [uid]: { name, batch, shift, zoho_id, gams_access, ... } }
window.PROJECT_DATA  // { "April": { ATT, PROD, GAMS, QUEUE, ASSESSMENTS, LEADERBOARD }, "May": {...} }
window.ATT           // Alias → PROJECT_DATA[latestMonth].ATT
window.PROD          // Alias → PROJECT_DATA[latestMonth].PROD
window.GAMS          // Alias → PROJECT_DATA[latestMonth].GAMS
window.QUEUE         // Alias → PROJECT_DATA[latestMonth].QUEUE
window.ASSESSMENTS   // Alias → PROJECT_DATA[latestMonth].ASSESSMENTS
window.LEADERBOARD   // Alias → PROJECT_DATA[latestMonth].LEADERBOARD
window.DAILY_PRESENT // { "2026-04-01": 20, "2026-04-02": 18, ... }
```

### `app.js` — The Master Orchestrator

On `DOMContentLoaded`, `app.js`:
1. **Fetches all HTML partials** in parallel using `Promise.all()` — each component is an independent file.
2. Calls `initApp()` — sets up the default month and renders the full dashboard.
3. Starts a **10-second polling loop** — reads `version.json` and reloads if the timestamp changes (i.e., new data was pushed).

The `switchMonth(month)` function is the core of multi-month support:
- Swaps all `window.*` globals to the selected month's data.
- Re-renders every chart and table component.
- Updates header subtitle and footer.

### `sidebar/sidebar.js` — Navigation & Month Switcher

- Renders navigation links to each section.
- Dynamically builds **month switcher buttons** from `Object.keys(PROJECT_DATA)`.
- Implements **Scrollspy** — highlights the active section as you scroll.

### `attendance/attendance.js` — Attendance Analytics

- **Daily Bar Chart** — shows how many members were present each day of the month.
- **Donut Chart** — overall month breakdown (Present / PL / Absent / etc).
- **Member Attendance Bar** — each member's individual attendance rate.
- **Clickable tiles** — clicking a date or status opens a modal listing specific members.

### `modal/modal.js` — Drill-Down Modal

A reusable modal component that shows a list of members matching a specific filter (e.g., "who was absent on April 10th?"). Called by multiple modules.

### `profile/profile.js` — Individual Member Profile

A drill-down view for a single member showing:
- Full attendance calendar heatmap for the month.
- Daily login/logout times.
- Weekly production scores.
- GAMS status, batch, shift info.

---

## Data Pipeline (Python)

**File:** `execution/sync_pipeline.py`

### What it does

1. **Downloads** the `.xlsx` attendance tracker from SharePoint (via `EXCEL_URL`).
2. **Iterates through every month** defined in the `MONTHS` list.
3. For each month, reads these Excel sheets:
   - `{Month} Attendance` → Per-member daily status + totals
   - `{Month} Productivity` → Daily task counts + weekly scores (WW1, WW2…)
   - `{Month} AH` → Additional hours per day
   - `GAMS ({Month})` → GAMS system access status
   - `FTE Details` → Master list of all members (global, not per-month)
   - `Running Queue Allocation` → P0/P1/P2 queue assignments
   - `Assessment Results` → Training results
   - `Daily Log` → Login/logout times
4. **Transforms** all data into a unified `PROJECT_DATA` JSON object.
5. **Writes** the output to `shared/data.js` (JavaScript globals) and `shared/version.json`.

### Key Functions

| Function | Purpose |
|---|---|
| `download_excel(url, path)` | Downloads the `.xlsx` from SharePoint with browser-like User-Agent |
| `find_sheet(xl, patterns)` | Finds a sheet by name, case-insensitive, with fallback patterns |
| `get_month_data(xl, month, df_daily_log)` | Extracts all data for a single month |
| `process_tracker(input, output_js, version_file)` | Main entry point — processes all months |
| `format_time(val)` | Normalizes time values (handles `8:00`, `8.00`, `8:00 AM`) |
| `safe_int(row, col)` | Safe integer conversion with NaN handling |

### Running Locally

```bash
# 1. Set up virtual environment
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r execution/requirements.txt

# 3. Configure secrets
# Create .env file:
echo EXCEL_URL=your_sharepoint_url_here > .env

# 4. Run the pipeline
python execution/sync_pipeline.py
```

The script checks if a local `.xlsx` file exists first. If found, it processes it directly (great for offline development). If not, it downloads from the `EXCEL_URL`.

---

## GitHub Actions CI/CD

**File:** `.github/workflows/data_sync.yml`

### Trigger Conditions

```yaml
on:
  push:
    branches: [main]          # Triggers on every push to main
  schedule:
    - cron: '*/30 * * * *'    # Runs every 30 minutes automatically
  workflow_dispatch:           # Can be triggered manually from GitHub UI
```

### Pipeline Steps

```
1. Checkout Repository         (actions/checkout@v4)
2. Set up Python 3.10          (actions/setup-python@v5)
3. Install Dependencies        (pip install -r execution/requirements.txt)
4. Run Data Sync               (python execution/sync_pipeline.py)
   └── Uses EXCEL_URL secret from GitHub Secrets
5. Commit & Push Changes
   └── git add shared/data.js shared/version.json
   └── Only commits if files actually changed (idempotent)
   └── Commit message: "chore: auto-update dashboard data [skip ci]"
   └── [skip ci] prevents infinite trigger loops
```

### Permissions

The workflow has `contents: write` permission so the GitHub Actions bot can commit directly back to the repository.

### Manual Trigger

From the dashboard itself, clicking **"Sync Data"** in the header opens the GitHub Actions page for manual dispatch. Alternatively, go to:

```
https://github.com/anupamsingh88/Dashboard/actions/workflows/data_sync.yml
```

---

## Frontend Architecture

### Component Loading Pattern

Every section of the dashboard is a **self-contained module** with its own HTML, CSS, and JS. `app.js` loads them all asynchronously:

```javascript
// All HTML partials loaded simultaneously
await Promise.all([
    loadHTML('sidebar/sidebar.html', 'sidebar-container'),
    loadHTML('attendance/attendance.html', 'attendance-container'),
    // ... all other modules
]);

// Then init — partials are guaranteed to be in DOM
initApp();
```

This pattern means:
- **No framework needed** — pure HTML/CSS/JS
- **Easy to add modules** — create a folder, add HTML/CSS/JS, register in `app.js`
- **Fast first paint** — all partials load in parallel

### Auto-Reload (Live Updates)

```javascript
// Poll version.json every 10 seconds
setInterval(async () => {
    const data = await fetch('shared/version.json').then(r => r.json());
    if (lastVersion && data.timestamp !== lastVersion) {
        window.location.reload(); // New data available — reload!
    }
    lastVersion = data.timestamp;
}, 10000);
```

When GitHub Actions pushes a new `version.json` (with a fresh timestamp), any open browser tab automatically reloads within 10 seconds.

### Design System

| Token | Value |
|---|---|
| Font | Inter, Outfit (Google Fonts) |
| Charts | Chart.js 4.4.1 |
| Color Palette | Purple `#534AB7` + Blue `#185FA5` accent |
| Style | Glassmorphism, dark/light CSS variables |
| Animations | CSS transitions + JS `animateCount()` for number roll-ups |

---

## Configuration & Secrets

### GitHub Secret: `EXCEL_URL`

The SharePoint download URL for the Excel tracker. Set this in:
```
GitHub Repo → Settings → Secrets and variables → Actions → New repository secret
Name: EXCEL_URL
Value: https://your-org.sharepoint.com/:x:/p/.../file.xlsx?download=1
```

The URL **must** include `?download=1` to force a direct file download rather than the SharePoint preview page. The pipeline adds this automatically if missing.

### Local `.env` File

```env
EXCEL_URL=https://your-sharepoint-url-here?download=1
```

The `.env` file is in `.gitignore` and is **never committed**. Locally, `python-dotenv` loads it automatically.

---

## Local Development

### Prerequisites

- Python 3.10+
- A modern web browser
- Git
- (Optional) VS Code with Live Server extension

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/anupamsingh88/Dashboard.git
cd Dashboard

# 2. Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate

# 3. Install Python dependencies
pip install -r execution/requirements.txt

# 4. Set up your .env
echo EXCEL_URL=<your-sharepoint-url> > .env

# 5. Run the data pipeline (generates shared/data.js)
python execution/sync_pipeline.py

# 6. Open index.html with Live Server (VS Code)
#    OR use a simple HTTP server:
python -m http.server 8080
# Then open: http://localhost:8080
```

> ⚠️ **Important:** The dashboard uses `fetch()` to load HTML partials, which requires an HTTP server. Opening `index.html` directly via `file://` will cause CORS errors. Always use a local server.

---

## Adding a New Month

When a new month's sheets are added to the Excel tracker:

1. **Excel side:** Ensure sheets follow the naming convention:
   - `{Month} Attendance` (e.g., `May Attendance`)
   - `{Month} Productivity` (e.g., `May Productivity`)
   - `{Month} AH` (e.g., `May AH`)
   - `GAMS (May)` or `GAMS (May Only)`

2. **Python side:** Add the month to the `MONTHS` list in `sync_pipeline.py`:
   ```python
   MONTHS = ["January", "February", "April", "May", ...]  # Add "May" etc.
   ```

3. **Run the pipeline** (or push to trigger GitHub Actions). The new month will automatically appear in the dashboard's month switcher.

No frontend code changes needed — the sidebar month buttons are generated dynamically from `Object.keys(PROJECT_DATA)`.

---

## Troubleshooting

### Dashboard shows no data / blank charts

- Check `shared/data.js` exists and is not empty.
- Open browser DevTools → Console — look for JS errors.
- Run the pipeline locally and check its output.

### GitHub Actions failing

- Check the Actions tab for logs.
- Verify `EXCEL_URL` secret is set correctly.
- The SharePoint URL may have expired — regenerate the shareable link.

### "Failed loading X" errors in console

- You are opening `index.html` via `file://` protocol. Use a local HTTP server instead.

### Data is stale / not updating

- Check GitHub Actions run history — did the workflow run succeed?
- Verify the Excel file at SharePoint was actually saved/published.
- Manually trigger the workflow via GitHub UI → Actions → "Refresh Dashboard Data" → "Run workflow".

### A month is missing from the sidebar

- Ensure the month name is in the `MONTHS` list in `sync_pipeline.py`.
- Verify the Excel sheet names match the expected pattern exactly.
- Check the pipeline logs for lines starting with `x Skipping {Month}`.

---

## License

This project is licensed under the terms in the [LICENSE](LICENSE) file.

---

<div align="center">
  <sub>Built with ❤️ for Team Abhinav · HR Analytics Dashboard v2 · Shift: 8AM–4PM</sub>
</div>
