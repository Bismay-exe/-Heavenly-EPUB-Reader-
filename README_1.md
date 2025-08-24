
# Heavenly EPUB Reader

A lightweight, browser-based EPUB reader with bookshelf, reading stats, themes, and full backup/restore of your library using IndexedDB and Web Workers.

## Features
- Upload EPUBs and store persistently in **IndexedDB**
- **Bookshelf** with progress %, Continue Reading, Remove/Clear All
- **Reader** with font size, line height, themes (light/dark/sepia)
- **Reading stats** panel (time, progress) and **Dashboard** page with weekly chart + streak
- **Export/Import** bookshelf metadata (JSON)
- **Backup all books to ZIP** + **Restore from ZIP** (with overwrite/skip), progress bar, **Pause/Resume/Cancel** — done via **Web Workers**

## Quick Start
1. Open `index.html` in a modern browser (Chrome/Edge/Firefox). If using file:// and Workers are blocked, run a tiny server:
   - Python: `python3 -m http.server 8000` then visit http://localhost:8000
2. Click **Choose File** to add `.epub` books.
3. Click a cover to read; use **Dashboard** for stats.

## Notes
- Uses CDNs for `epub.js`, `chart.js`, and `jszip`. Internet is required for those the first time.
- Backups are ZIP files of the stored EPUBs. Restores can **overwrite** or **skip** existing books.
