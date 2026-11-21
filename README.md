# PanaRoute (Panapakkam Bus), Omni Terminal redesign

Panapakkam bus timings, routes and destination finder, in Tamil and English.

## Run
Open `index.html` in a browser, or serve the folder (`python3 -m http.server`).
The 3D terminal (three.js) and QR code load from cdnjs, so they need an internet connection once.

## Files
- `index.html`: markup and app logic (all element IDs unchanged)
- `style.css`: design tokens, re-themed components, Omni layer (light and dark)
- `bus3d.js`: 3D bus terminal
- `data/timetable.js`: timetable data (edit rows here); `data/panapakkam-board-full.pdf`
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`: install and offline support
- `legacy/`: old unused `script.js`, `i18n.js` and `style.old.css`

Times are scheduled times from the bus stand board, not live tracking.
