# «اتزان | ETIZAN» v1.0.0 — source

Live: https://etizan.sites.tab.bot/  (site name `etizan`, Tab publish → Cloudflare Worker + static assets + D1 `DB`)

## Layout (no build step)
- site/index.html — shell; scripts: adhan.js (adhan-js, on-device prayer calc), data.js (114 surahs + ayah counts, adhkar from «زاد», 40 motivational lines, 40 cities), core.js (IndexedDB store + daily snapshots, dates/Hijri, Umm al-Qura prayer times, schedule engine with prayer-anchored times like `maghrib`, `fajr+40`, UI kit, SVG charts, router, notifications), views1.js (home, schedule day/week/month + drag, quick add, more), views2.js (prayer & Quran, phone, sleep, health), views3.js (work & study, habits & goals, learning, reports, settings, encrypted cloud backup, boot).
- site/_worker.js — serves assets; `/api/backup/<sha256 id>` GET/PUT/DELETE on D1. Client encrypts with AES-GCM (PBKDF2 from the 16-char recovery code); server stores ciphertext only.
- site/sw.js — offline shell cache. Bump `V` and the `?v=` strings in index.html + sw.js on each release (and VERSION in core.js).
- test/flow.py — Playwright flow (45 checks, 390×844 + 1280×800): `python3 test/flow.py https://etizan.sites.tab.bot OUTDIR`.

## Data
All personal data lives in the browser (IndexedDB key `state`, mirrored to localStorage), autosaved on every change, 7 daily snapshots (`snap-YYYY-MM-DD`). Export/import JSON in Settings. Optional encrypted cloud copy (auto once a day when enabled).

## Known limits
- Notifications fire while the app is open / recently backgrounded (no server push yet). iPhone needs the app added to Home Screen (iOS 16.4+).
- Screen Time can't be read by web apps — manual entry.
