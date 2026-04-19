# 🗑️ FILES TO DELETE — Farmer Market Guide

## Unwanted / Unused / Redundant Files
>
> Generated: March 5, 2026 | Safe to delete — project will still work perfectly.

---

## 🔴 CATEGORY 1: AI / Agent Communication Files (Completely Useless)

| # | File Path | Size | Reason |
|---|---|---|---|
| 1 | `communication.md` | 76 B | Just 2 lines — AI-to-AI note, zero value |

---

## 🔴 CATEGORY 2: Old Planning / Internal Notes (Already Done, Never Needed Again)

| # | File Path | Size | Reason |
|---|---|---|---|
| 2 | `plan.md` | 1.9 KB | Old task execution log from March 3, 2026. Work is done. |
| 3 | `FIX_GUIDE.md` | 11.6 KB | Fix instructions written during dev. Not needed in production. |
| 4 | `ALL_INFO.md` | 6.8 KB | Internal project summary — info is already in ppt.md and STARTUP_PITCH_ANSWERS.md |
| 5 | `all.md` | 101 KB | Giant dump file (101,367 bytes!). Likely an old code/data dump, not used. |
| 6 | `data.md` | 47.2 KB | Raw data reference file — already seeded into the app. Not runtime-needed. |
| 7 | `ppt.md` | 26.7 KB | Presentation notes — purpose is now served by STARTUP_PITCH_ANSWERS.md |

---

## 🔴 CATEGORY 3: Runtime Log File (Gets Huge, Should Not Be Committed)

| # | File Path | Size | Reason |
|---|---|---|---|
| 8 | `realtime_server.log` | 340 KB | Auto-generated runtime log. 340,927 bytes of logs. Safe to delete anytime — regenerates on next run. |
| 9 | `backend/realtime_server.log` | 5.5 KB | Duplicate log file inside backend folder. Same reason. |

---

## 🔴 CATEGORY 4: Empty File (Zero Content, Zero Use)

| # | File Path | Size | Reason |
|---|---|---|---|
| 10 | `events.json` | 2 B | Contains only `[]` — empty array. Not used at runtime. |

---

## 🔴 CATEGORY 5: Empty Directory (No Files Inside)

| # | Path | Reason |
|---|---|---|
| 11 | `logs/` (root) | Completely empty folder. No files inside. |

---

## 🔴 CATEGORY 6: Compiled Python Cache (Auto-Generated, Never Commit)

| # | File Path | Size | Reason |
|---|---|---|---|
| 12 | `scripts/__pycache__/realtime_server.cpython-312.pyc` | 9.3 KB | Old Python 3.12 compiled cache. Project uses 3.14 now. Delete safely. |
| 13 | `scripts/__pycache__/realtime_server.cpython-314.pyc` | 20.6 KB | Current compiled cache. Auto-regenerates on next run. Safe to delete. |
| 14 | `scripts/__pycache__/` (the folder itself) | — | The entire __pycache__ folder can be removed. |

---

## 🔴 CATEGORY 7: Backend Database Test Files (Dev Artifacts, Not Production Data)

| # | File Path | Size | Reason |
|---|---|---|---|
| 15 | `backend/alembic_check.db` | 184 KB | Test SQLite DB from Alembic migration checks. Not needed in production. |
| 16 | `backend/health.db` | 172 KB | Health check test database. Dev artifact. |
| 17 | `backend/perf.db` | 232 KB | Performance test database. Dev artifact. |
| 18 | `backend/.coverage` | 52 KB | Python test coverage binary file. Only needed while running tests. |

---

## 🔴 CATEGORY 8: Archive Folder (Confirmed Unused — Eligible for Deletion)

These were explicitly moved to `archive/` after being replaced. The archive README
itself says they're eligible for deletion after one validation cycle.

| # | File Path | Size | Reason |
|---|---|---|---|
| 19 | `archive/login-pages/buyer-login.html` | 6.3 KB | Replaced by `index.html`. No longer used. |
| 20 | `archive/login-pages/farmer-login.html` | 6.3 KB | Replaced by `index.html`. No longer used. |
| 21 | `archive/login-pages/middleman-login.html` | 6.3 KB | Replaced by `index.html`. No longer used. |
| 22 | `archive/unused-assets/` (whole folder) | — | Entire folder marked "unused". Contains unreferenced scripts/styles. |
| 23 | `archive/README.md` | 482 B | Only explains the archive policy. Once archive is deleted, this goes too. |
| 24 | `archive/` (whole folder) | — | Once items above are deleted, this entire folder can go. |

---

## 🟡 CATEGORY 9: Diagnostic / Test HTML Tools (Dev-Only, Not for Production)

These are useful during development but should not exist in a production/demo build.

| # | File Path | Size | Reason |
|---|---|---|---|
| 25 | `tools/diagnostics/debug-login.html` | 4.8 KB | Debug-only test page. Not user-facing. |
| 26 | `tools/diagnostics/test-connection.html` | 21.9 KB | Connection test page. Dev tool only. |
| 27 | `tools/diagnostics/test-hardening-v2-1.html` | 16.6 KB | Testing hardening scenarios. Dev only. |
| 28 | `tools/diagnostics/test-login.html` | 3.3 KB | Login test page. Dev only. |
| 29 | `tools/diagnostics/test-middleman.html` | 1.7 KB | Middleman flow test. Dev only. |
| 30 | `tools/diagnostics/test-offer-lifecycle.html` | 8.8 KB | Offer lifecycle tester. Dev only. |
| 31 | `tools/diagnostics/test-review-flow.html` | 14.7 KB | Review flow tester. Dev only. |
| 32 | `tools/diagnostics/verify-data-v21.html` | 2.6 KB | Data verification test. Dev only. |
| 33 | `tools/diagnostics/verify-offer-fix.html` | 7.3 KB | Offer fix verifier. Dev only. |
| 34 | `tools/diagnostics/diagnostic-complete.html` | 31.1 KB | Full diagnostic UI. Dev only. |
| 35 | `tools/diagnostics/README.md` | 521 B | Explains diagnostic tools. Not production. |

---

## 🟡 CATEGORY 10: Duplicate / Redundant Startup Scripts

The project has too many `.bat` files doing overlapping things. Keep only the best one.

| # | File Path | Size | Reason |
|---|---|---|---|
| 36 | `start_all_phases.bat` | 648 B | Old phased start script. Replaced by `start_server_and_dashboards.bat`. |
| 37 | `start_all_phases.sh` | 661 B | Linux shell version of above. You're on Windows. Not needed. |
| 38 | `start_dashboards.bat` | 524 B | Old script — only opens dashboards, not the server. Superseded. |
| 39 | `start_server_optimized.bat` | 3.7 KB | Another version of the start script. Only keep ONE. |

> ✅ __KEEP:__ `start_server_and_dashboards.bat` — This is the main, current one.

---

## 🟡 CATEGORY 11: Unused Next.js Platform (Separate Experiment, Not Connected)

| # | File Path | Size | Reason |
|---|---|---|---|
| 40 | `next-platform/` (entire folder) | ~200+ KB | An experimental Next.js version of the app. The real project uses HTML/JS, not Next.js. This folder has NO connection to the working dashboards. |

> ⚠️ Only delete if you are NOT planning to continue developing the Next.js version.

---

## 🟡 CATEGORY 12: Docs Folder (Internal Planning Notes)

| # | File Path | Size | Reason |
|---|---|---|---|
| 41 | `docs/7min-talk-track.md` | 1.3 KB | Talk script — replaced by STARTUP_PITCH_ANSWERS.md |
| 42 | `docs/qna-techspark.md` | 1.4 KB | Q&A prep for a specific event — can be archived or deleted |
| 43 | `docs/feature-inventory.md` | 1.7 KB | Dev-phase feature tracking. Already in ALL_INFO.md. |

---

## ✅ SUMMARY — QUICK REFERENCE

### 🔴 DEFINITELY DELETE (No risk, no value)

```
communication.md
plan.md
FIX_GUIDE.md
ALL_INFO.md
all.md
data.md
ppt.md
events.json
realtime_server.log (root)
backend/realtime_server.log
backend/alembic_check.db
backend/health.db
backend/perf.db
backend/.coverage
scripts/__pycache__/ (entire folder)
logs/ (empty folder)
archive/ (entire folder — all 3 login HTMLs + unused-assets + README)
```

### 🟡 DELETE IF NOT NEEDED (Use judgment)

```
start_all_phases.bat
start_all_phases.sh
start_dashboards.bat
start_server_optimized.bat
tools/diagnostics/ (entire folder — 10 HTML test files)
next-platform/ (entire folder — unused Next.js experiment)
docs/7min-talk-track.md
docs/qna-techspark.md
docs/feature-inventory.md
```

### ✅ KEEP EVERYTHING ELSE

```
index.html
farmer-dashboard.html
buyer-dashboard.html
middleman-dashboard.html
start_server_and_dashboards.bat
scripts/ (all JS and Python runtime files)
styles/ (all CSS files)
backend/ (app, tests, requirements.txt, etc.)
data/data.json
validation-script.js
diagnostic_tool.bat
.gitignore / .hintrc / .vscode
STARTUP_PITCH_ANSWERS.md (just created — keep!)
```

---

## 📊 SPACE SAVED IF ALL ARE DELETED

| Category | Approx Size Saved |
|---|---|
| Log files (2 files) | ~346 KB |
| Huge MD files (all.md + data.md) | ~148 KB |
| Backend DB test files (3 files) | ~588 KB |
| Archive folder | ~25 KB |
| Python cache | ~30 KB |
| Diagnostic HTML tools (10 files) | ~118 KB |
| Next.js platform folder | ~200+ KB |
| Other MD/BAT files | ~50 KB |
| __TOTAL ESTIMATED SAVINGS__ | __~1.5 MB__ |

---
*Prepared: March 5, 2026 | Safe to review and delete in order.*
