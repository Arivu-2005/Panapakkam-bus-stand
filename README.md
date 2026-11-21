# PanaRoute: Panapakkam Bus Timetable

Bilingual (Tamil / English) bus timetable for Panapakkam bus stand with a next-bus finder, destination search, an interactive 3D bus terminal and an installable offline app.

Times are **scheduled departures copied from the bus stand board. This is not live tracking.**

| Layer | Stack |
|---|---|
| Frontend | HTML5, CSS3 (custom properties, light and dark themes), vanilla JavaScript (no framework, no build step) |
| 3D | three.js r128 (loaded from cdnjs) |
| QR code | qrcode-generator 1.4.4 (loaded from cdnjs) |
| Fonts | Orbitron, Plus Jakarta Sans, Noto Sans Tamil (Google Fonts) |
| Offline / install | Web App Manifest + network-first Service Worker |
| Data | `data/timetable.js` (plain JavaScript file) and `data/panapakkam-board-full.pdf` |
| Backend / database | None. It is a static site. |

## Project structure

```
PanaRoute/
├── index.html                   Page markup + app logic (search, filters, pinning, i18n, dialogs)
├── style.css                    Design tokens, components, Omni Terminal layer, responsive rules
├── bus3d.js                     Interactive 3D bus terminal (three.js scene)
├── sw.js                        Service worker (network-first, offline fallback)
├── manifest.webmanifest         Install (PWA) settings
├── icon-192.png / icon-512.png  App icons
├── data/
│   ├── timetable.js             Timetable data. Edit this to change times.
│   └── panapakkam-board-full.pdf  Printable board (download button)
└── legacy/                      Old unused files kept for reference
```

## Prerequisites

- Any modern browser (Chrome, Edge, Firefox, Safari).
- Internet connection on first load (3D library, QR library and fonts come from CDNs).
- Optional for local testing: Python 3 (or any static file server).

Node.js, npm, Java and a database are **not** required.

## 1. Run locally

Quickest way: double-click `index.html`.

Recommended (needed for install / offline mode, which require `http://`):

```bash
cd PanaRoute
python3 -m http.server 8000
```

Open http://localhost:8000.

## 2. Edit the timetable

All times live in `data/timetable.js`, grouped by destination. Each row is:

```js
["HH:MM AM/PM", "Bus name (English)", "Bus name (Tamil, or empty '')"]
```

Add `true` as a 4th item to mark a row **Check board** (hard to read on the board):

```js
["08:40 PM", "Town bus 51A", "நகரப்பேருந்து 51A", true]
```

Rules:
- Never guess a missing time or bus number. Leave it out or mark it with `true`.
- Rows can be in any order. The app sorts them.
- Each route has an `id`, `name`, Tamil name, `bay` and `color`.

Current data: **13 destinations, 151 buses** (Vellore, Arcot, Kaveripakkam, Arakkonam, Thakkolam, Guruvarajapettai, Thiruthani, Kanchipuram, Chennai, Chengalpattu, Tambaram, Kalathur, Sholinghur).

## 3. Contact settings (optional)

In `index.html`, find this line and fill in your details. Empty values stay hidden.

```js
const CFG={phone:'',whatsapp:'',email:''};
```

## Features

- **Next bus** card with live countdown and the current Panapakkam time
- **Departing next** board and a full timetable by hour
- **Destination tabs** (all 13 routes with bus counts)
- **Search** by town, bus name, number or time, in Tamil or English (voice search where the browser supports it)
- **Filters:** morning, afternoon, evening, night, upcoming only, pinned only, 12/24-hour time
- **Day at a glance** hourly chart (tap an hour to filter)
- **Bus details** popup: pin, WhatsApp share, copy link, add reminder, notify me
- **Saved buses and routes** (stored on the device)
- **Export CSV**
- **Interactive 3D bus terminal** (tap a bus to pick its route, drag to turn)
- **Tamil / English** switch and **light / dark** theme
- **Install as an app** and offline timetable
- **QR code** to share the site and a **PDF** board download
- Keyboard shortcut: press `/` to open search

## Settings stored on the device

The app saves preferences in the browser's `localStorage`:

| Key | Purpose |
|---|---|
| `pkm-theme` | light or dark |
| `pkm-lang` | English or Tamil |
| `pkm-h12` | 12-hour or 24-hour time |
| `pkm-cache` | last loaded timetable (offline fallback) |

Share a route directly with a link such as `index.html#r=vellore` (use the route `id` from `data/timetable.js`).

## Deploy on GitHub Pages

1. Push the files to a GitHub repository (files at the root, not inside a sub-folder).
2. Go to **Settings, Pages**.
3. Choose branch `main` and folder `/ (root)`, then save.
4. Open `https://YOUR-USERNAME.github.io/REPO-NAME/`.

## Troubleshooting

- **"3D view is not available on this device":** the three.js library could not load. Check the internet connection and that WebGL is enabled. The timetable works without 3D.
- **QR code says it needs an internet connection:** the QR library loads from cdnjs. Connect once and reload.
- **Changes to the timetable do not show:** the service worker is network-first, so reload once. If it still shows old data, hard refresh (Ctrl+Shift+R) or clear site data.
- **Install button does not appear:** open the site over `http://localhost` or `https://`, not by double-clicking the file.
- **Tamil text looks wrong:** Noto Sans Tamil loads from Google Fonts. Connect to the internet once so it can load.
- **A row shows "Check board":** that row was hard to read on the physical board. Confirm the time at the bus stand.
