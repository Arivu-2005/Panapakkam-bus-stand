/* Bus3D v5.3: Panapakkam Bus Stand terminal (Three.js r128)  ONE FILE, no add-on needed.
   v5.3 = MOBILE FIX of v5.2. All v4 / v5 APIs are unchanged.

   NEW in v5.3 (mobile):
     - Layout now follows the STAGE size (data-b3d-bp / data-b3d-short), not the browser window,
       so small embeds on a big page also get the compact mobile layout.
     - Phones (xs/sm): ticker + volume slider hidden, small buttons, compact pills, compact banner,
       details card becomes a short bottom sheet.
     - Short stages (height < 460, e.g. landscape phones): details card is a narrow left column.
     - Camera shifts the selected bus away from the details card (up in portrait, right in landscape).
     - Shorter hint texts.

   API:
     Bus3D.onProgress = (p 0..1, label, taskName) => {}   set BEFORE init
     Bus3D.init(stage, routes, onPick) -> boolean
        route: { id, bay, no, dest, bus, time, via?, fare? }     time like "06:30" or "6:30 AM"
     Bus3D.setSign(routeId, dest, bus, time, extra?)       extra = { via, fare }
     Bus3D.focus(routeId) / setMode('day'|'night') / setStatus(routeId,'idle'|'next'|'soon')
     Bus3D.view('overview'|'front'|'side'|'top') / setAuto(bool) / isAuto() / onAuto
     Bus3D.refresh() / arrive(id) / depart(id) / setInfoPanel(bool) / onDeselect / dispose()
     Bus3D.setWeather('clear'|'rain') / getWeather() / onWeather
     Bus3D.setLabels(bool) / setAmbient(bool) / setQuality('auto'|'low'|'medium'|'high')
     Bus3D.setSound(bool) / honk(id) / setLive(bool) / next() / prev() / screenshot(name?)
     Bus3D.breakpoint() / onBreakpoint
     Bus3D.setPA(text, 'idle'|'speak'|'urgent', label?)   drives the 3D LED board on the canopy
     Bus3D.pulse(routeId, bool)                           glowing bay ring + doors open
     Bus3D.Voice.config({ lang:'both'|'en'|'ta', voice:true, volume:1, rate:0.95,
                          boardMin:10, finalMin:2, remindMin:5, boardRemind:3, returnSec:12,
                          auto:true, sim:false, speed:30, autoEnv:false, announceArrivals:false,
                          camera:true, speakHidden:false, persist:true })
     Bus3D.Voice.announce(id, 'next'|'boarding'|'final'|'departed'|'info'|'arrived')
     Bus3D.Voice.announceNext() / tour() / speak(en, ta) / stop()
     Bus3D.Voice.setVoice(b) / setLang(l) / setAuto(b) / setSim(on, speed) / setEnv(b)
     Bus3D.Voice.onAnnounce = item => {}
   Keys on stage: arrows rotate, +/- zoom, 1-4 views, N/P or ]/[ next/prev bus, W rain, H horn,
                  V voice on/off, A announce next bus, Esc reset.
   Touch: drag rotate, pinch zoom, double-tap reset. Mouse: drag, Ctrl/Cmd + wheel. Mac Safari: trackpad pinch. */
(function () {
  "use strict";
  const FONT = "'Noto Sans Tamil','Space Grotesk','DM Sans',sans-serif";
  const STATION_EN = "PANAPAKKAM BUS STAND";
  const STATION_TA = "\u0baa\u0ba9\u0baa\u0bcd\u0baa\u0bbe\u0b95\u0bcd\u0b95\u0bae\u0bcd \u0baa\u0bc7\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 \u0ba8\u0bbf\u0bb2\u0bc8\u0baf\u0bae\u0bcd";
  const LOOK = {
    night: { amb: 0.32, key: 0.55, fill: 0.55, gold: 0.4, env: 0.5, exp: 1.0 },
    day:   { amb: 0.55, key: 1.15, fill: 0.35, gold: 0.15, env: 0.95, exp: 1.05 }
  };
  const PMAX = 1.2;
  const TY = 1.8; // camera look-at height (raised slightly so the canopy PA board is not cropped)
  const STATUS_TXT = { idle: "Scheduled", next: "Next to depart", soon: "Boarding now" };
  // stage-width breakpoints (mirrors the CSS): xs <480, sm <768, md <1025, lg <1440, xl <1920, xxl >=1920
  const BPS = [["xs", 480], ["sm", 768], ["md", 1025], ["lg", 1440], ["xl", 1920]];
  const bpOf = w => { for (let i = 0; i < BPS.length; i++) if (w < BPS[i][1]) return BPS[i][0]; return "xxl"; };
  const S = n => "calc(" + n + "px*var(--b3d-s,1))";   // scaled px (scales with the breakpoint token)
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = x => x * x * (3 - 2 * x);
  const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  function fit(x, t, maxW, size, wt) {
    let s = size;
    do { x.font = wt + " " + s + "px " + FONT; s -= 4; } while (x.measureText(t).width > maxW && s > 18);
  }
  function rr(x, a, b, w, h, r) {
    x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  }
  const B = { buses: {}, setPA: function () {}, onBreakpoint: null };

  /* ---------- real progress ---------- */
  const TASKS = { renderer: 1, scene: 1, textures: 1, buses: 3, env: 2, fonts: 2, frame: 1 };
  const doneT = {}, TOTAL = Object.keys(TASKS).reduce((a, k) => a + TASKS[k], 0);
  const report = (name, label) => {
    if (doneT[name]) return; doneT[name] = 1;
    let d = 0; for (const k in doneT) d += TASKS[k];
    if (B.onProgress) { try { B.onProgress(d / TOTAL, label, name); } catch (e) {} }
  };

  let need = () => {}, paint = () => {}, board = () => {}, stationCv = null, stationTex = null, RND = null;
  let texs = [];
  const TX = c => {
    const t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    if (RND) t.anisotropy = Math.min(8, RND.capabilities.getMaxAnisotropy());
    texs.push(t); return t;
  };
  const lblText = b => (b.no ? b.no : "Bay " + b.bay) + (b.info && b.info.time ? " \u00b7 " + b.info.time : "");

  /* ---------- side route board (decal on both sides of the coach) ---------- */
  function drawDecal(b) {
    const x = b.dctx, i = b.info || {};
    x.clearRect(0, 0, 1024, 256);
    rr(x, 6, 6, 1012, 244, 36); x.fillStyle = "rgba(250,244,226,0.97)"; x.fill();
    x.lineWidth = 8; x.strokeStyle = "#8f0b11"; x.stroke();
    rr(x, 6, 6, 300, 244, 36); x.fillStyle = "#8f0b11"; x.fill(); x.fillRect(250, 6, 56, 244);
    x.fillStyle = "#ffe08a"; x.textAlign = "center"; x.textBaseline = "middle";
    const no = String(b.no || b.bay || "");
    fit(x, no, 240, 150, "800"); x.fillText(no, 156, 134);
    x.fillStyle = "#14171f"; x.textAlign = "left";
    const t1 = (i.bus || "PANAPAKKAM").toUpperCase();
    fit(x, t1, 670, 84, "800"); x.fillText(t1, 330, 94);
    const t2 = (i.dest ? "\u2192 " + i.dest.toUpperCase() : "") + (i.time ? "   " + i.time : "");
    x.fillStyle = "#8f0b11"; fit(x, t2, 670, 62, "700"); x.fillText(t2, 330, 178);
    b.dtex.needsUpdate = true;
  }

  /* ---------- live destination board ---------- */
  B.setSign = (id, dest, bus, time, extra) => {
    const b = B.buses[id]; if (!b) return;
    const x = b.ctx;
    const town = String(dest || "").split("\u2192").pop().trim();
    const busTitle = String(bus || town || "PANAPAKKAM").toUpperCase();
    const destRoute = town.toUpperCase();
    b.info = { dest: town, bus: bus || town, time: time || "" };
    if (extra) b.extra = Object.assign(b.extra || {}, extra);
    x.fillStyle = "#020305"; x.fillRect(0, 0, 1024, 256);
    x.fillStyle = "rgba(251,191,36,0.06)";
    for (let py = 8; py < 248; py += 12) for (let px = 8; px < 1016; px += 12) x.fillRect(px, py, 4, 4);
    x.strokeStyle = "rgba(251,191,36,0.85)"; x.lineWidth = 8; x.strokeRect(8, 8, 1008, 240);
    x.fillStyle = "#ffb703"; x.textAlign = "center"; x.textBaseline = "middle";
    x.shadowColor = "#f59e0b"; x.shadowBlur = 14;
    fit(x, busTitle, 940, 118, "800"); x.fillText(busTitle, 512, 92);
    x.shadowBlur = 6; x.fillStyle = "#ffffff";
    const subText = (destRoute ? destRoute + "   \u2022   " : "") + (time || "");
    fit(x, subText, 940, 56, "700"); x.fillText(subText, 512, 194);
    x.shadowBlur = 0;
    b.tex.needsUpdate = true;
    drawDecal(b);
    if (b.lbl) b.lbl.textContent = lblText(b);
    board(); paint(); need();
  };

  /* ---------- station board (English + Tamil) ---------- */
  B.drawStation = () => {
    if (!stationCv) return;
    const x = stationCv.getContext("2d");
    const g = x.createLinearGradient(0, 0, 1280, 0);
    g.addColorStop(0, "#0a0c12"); g.addColorStop(0.5, "#181d2a"); g.addColorStop(1, "#0a0c12");
    x.fillStyle = g; x.fillRect(0, 0, 1280, 160);
    x.strokeStyle = "#fbbf24"; x.lineWidth = 4; x.strokeRect(4, 4, 1272, 152);
    x.strokeStyle = "rgba(251,191,36,0.35)"; x.lineWidth = 1.5; x.strokeRect(14, 14, 1252, 132);
    x.fillStyle = "#fbbf24";
    [[30, 80], [1250, 80]].forEach(p => { x.beginPath(); x.arc(p[0], p[1], 6, 0, 6.283); x.fill(); });
    x.textAlign = "center"; x.textBaseline = "middle";
    x.shadowColor = "#f59e0b"; x.shadowBlur = 12;
    fit(x, STATION_EN, 1100, 72, "800"); x.fillText(STATION_EN, 640, 52);
    x.fillStyle = "#f6f7fb"; x.shadowBlur = 4;
    fit(x, STATION_TA, 1100, 50, "600"); x.fillText(STATION_TA, 640, 118);
    x.shadowBlur = 0;
    stationTex.needsUpdate = true; need();
  };

  /* ---------- details card + labels styles (fully responsive) ---------- */
  function injectCSS() {
    if (document.getElementById("b3d-style")) return;
    const s = document.createElement("style"); s.id = "b3d-style";
    const eL = "max(var(--b3d-edge),env(safe-area-inset-left,0px))";
    const eR = "max(var(--b3d-edge),env(safe-area-inset-right,0px))";
    const eB = "max(var(--b3d-edge),env(safe-area-inset-bottom,0px))";
    const PH = ".b3d-stage[data-b3d-bp=xs],.b3d-stage[data-b3d-bp=sm]";            // phone-sized stage
    const ph = sel => PH.split(",").map(p => p + " " + sel).join(",");               // helper: phone + descendant
    s.textContent = [
      /* design tokens (the rules below only change these) */
      ":root{--b3d-s:1;--b3d-edge:16px;--b3d-panel-w:330px;--bva-btn:40px;--bva-touch:0px;--bva-max:1600px;--bva-banner-w:740px;--bva-vol-w:80px;--bva-line:17px;--bva-tick-h:28px;--bva-ico:52px}",
      ".b3d-stage:focus-visible{outline:2px solid #fbbf24;outline-offset:-2px}",
      ".b3d-auto-h{width:100%;aspect-ratio:16/10;min-height:320px;max-height:100vh;max-height:100dvh}",
      /* details card */
      ".b3d-panel{position:absolute;left:" + eL + ";bottom:" + eB + ";z-index:6;width:min(var(--b3d-panel-w),calc(100% - 2*var(--b3d-edge)));max-height:calc(100% - 2*var(--b3d-edge));overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:" + S(16) + " " + S(16) + " " + S(14) + ";border-radius:" + S(16) + ";font-family:" + FONT + ";color:#f6f7fb;background:rgba(12,15,23,.9);border:1px solid rgba(251,191,36,.3);box-shadow:0 18px 40px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:b3dIn .28s cubic-bezier(.2,.8,.2,1)}",
      ".b3d-panel[hidden]{display:none}",
      ".b3d-panel.b3d-day{color:#14171f;background:rgba(255,255,255,.93);border-color:rgba(180,110,0,.35);box-shadow:0 18px 40px rgba(20,23,31,.22)}",
      ".b3d-top{display:flex;align-items:center;gap:" + S(8) + ";margin-bottom:" + S(8) + ";padding-right:" + S(40) + "}",
      ".b3d-chip{font-size:" + S(12) + ";font-weight:800;letter-spacing:.06em;padding:" + S(3) + " " + S(8) + ";border-radius:" + S(6) + ";background:#fbbf24;color:#1d1100}",
      ".b3d-chip:empty{display:none}",
      ".b3d-pill{font-size:" + S(12) + ";font-weight:700;padding:" + S(3) + " " + S(10) + ";border-radius:999px;border:1px solid rgba(251,191,36,.55);color:#fbbf24}",
      ".b3d-day .b3d-pill{color:#8a5200;border-color:rgba(138,82,0,.5)}",
      ".b3d-pill.soon{background:#fbbf24;color:#1d1100;border-color:#fbbf24}",
      ".b3d-title{margin:0 0 " + S(12) + ";font-size:" + S(20) + ";line-height:1.25;font-weight:800;letter-spacing:.01em;overflow-wrap:anywhere}",
      ".b3d-grid{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:" + S(10) + " " + S(14) + "}",
      ".b3d-grid>div{min-width:0}.b3d-wide{grid-column:1/-1}",
      ".b3d-grid dt{font-size:" + S(11) + ";font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.6}",
      ".b3d-grid dd{margin:" + S(2) + " 0 0;font-size:" + S(16) + ";font-weight:700;overflow-wrap:anywhere}",
      ".b3d-x{position:absolute;top:" + S(10) + ";right:" + S(10) + ";width:" + S(36) + ";height:" + S(36) + ";border:0;border-radius:" + S(10) + ";background:rgba(127,127,127,.18);color:inherit;font-size:" + S(20) + ";line-height:1;cursor:pointer;touch-action:manipulation}",
      ".b3d-x:focus-visible{outline:2px solid #fbbf24;outline-offset:2px}",
      ".b3d-nav{display:flex;gap:" + S(8) + ";margin-top:" + S(12) + "}",
      ".b3d-nav button{flex:1;min-height:" + S(42) + ";border-radius:" + S(10) + ";border:1px solid rgba(251,191,36,.45);background:transparent;color:inherit;font:700 " + S(14) + " " + FONT + ";cursor:pointer;touch-action:manipulation}",
      ".b3d-nav button:focus-visible{outline:2px solid #fbbf24;outline-offset:2px}",
      /* floating labels */
      ".b3d-labels{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none}",
      ".b3d-lbl{position:absolute;left:0;top:0;padding:" + S(2) + " " + S(9) + ";border-radius:999px;font:800 " + S(12) + "/1.5 " + FONT + ";white-space:nowrap;color:#fbbf24;background:rgba(12,15,23,.82);border:1px solid rgba(251,191,36,.5);will-change:transform}",
      ".b3d-lbl.sel{background:#fbbf24;color:#1d1100}",
      ".b3d-day-l .b3d-lbl{background:rgba(255,255,255,.92);color:#8a5200;border-color:rgba(138,82,0,.5)}.b3d-day-l .b3d-lbl.sel{background:#b45309;color:#fff}",
      "@keyframes b3dIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",

      /* ===== RESPONSIVE: window-based only for large screens + auto height ===== */
      "@media (max-width:480px){.b3d-auto-h{aspect-ratio:3/4;min-height:380px;max-height:80vh;max-height:80dvh}}",
      "@media (min-width:481px) and (max-width:768px){.b3d-auto-h{aspect-ratio:4/5;min-height:420px;max-height:85vh;max-height:85dvh}}",
      "@media (min-width:769px) and (max-width:1024px){:root{--b3d-edge:18px;--b3d-panel-w:360px;--bva-banner-w:700px;--bva-btn:42px;--bva-vol-w:84px}.b3d-auto-h{aspect-ratio:4/3;min-height:460px}}",
      "@media (min-width:1025px) and (max-width:1439px){:root{--b3d-edge:20px;--b3d-panel-w:340px}.b3d-auto-h{aspect-ratio:16/10;min-height:480px}}",
      "@media (min-width:1440px){:root{--b3d-s:1.12;--b3d-edge:24px;--b3d-panel-w:380px;--bva-btn:44px;--bva-banner-w:820px;--bva-line:19px;--bva-vol-w:96px;--bva-max:1700px;--bva-tick-h:32px;--bva-ico:58px}.b3d-auto-h{aspect-ratio:16/9;min-height:560px}}",
      "@media (min-width:1920px){:root{--b3d-s:1.3;--b3d-edge:32px;--b3d-panel-w:440px;--bva-btn:50px;--bva-banner-w:960px;--bva-line:22px;--bva-vol-w:112px;--bva-max:1900px;--bva-tick-h:36px;--bva-ico:66px}.b3d-auto-h{aspect-ratio:21/9;min-height:640px}}",
      "@media (min-width:2560px){:root{--b3d-s:1.6;--b3d-edge:40px;--b3d-panel-w:540px;--bva-btn:60px;--bva-banner-w:1180px;--bva-line:27px;--bva-vol-w:140px;--bva-max:2300px;--bva-tick-h:44px;--bva-ico:80px}}",
      "@media (min-width:3440px){:root{--b3d-s:1.95;--b3d-edge:56px;--b3d-panel-w:660px;--bva-btn:72px;--bva-banner-w:1400px;--bva-line:33px;--bva-vol-w:170px;--bva-max:2900px;--bva-tick-h:52px;--bva-ico:96px}}",

      /* ===== STAGE-DRIVEN MOBILE (follows the real stage size, set by the ResizeObserver) ===== */
      PH + "{--b3d-s:.88;--b3d-edge:8px;--bva-btn:34px;--bva-vol-w:56px;--bva-line:14px;--bva-ico:32px;--bva-banner-w:100%;--bva-max:100%}",
      ".b3d-stage[data-b3d-bp=xs]{--b3d-s:.84;--bva-btn:32px}",
      ".b3d-stage[data-b3d-short]{--b3d-s:.86;--bva-btn:30px;--bva-ico:28px;--bva-line:13px;--b3d-edge:8px}",
      /* details card on phones = compact bottom sheet */
      ph(".b3d-panel") + "{left:" + eL + ";right:" + eR + ";width:auto;max-height:40%;padding:" + S(10) + " " + S(12) + " " + S(10) + ";border-radius:" + S(14) + "}",
      ph(".b3d-top") + "{margin-bottom:" + S(4) + ";padding-right:" + S(44) + "}",
      ph(".b3d-title") + "{font-size:" + S(17) + ";margin-bottom:" + S(6) + "}",
      ph(".b3d-grid") + "{grid-template-columns:repeat(3,minmax(0,1fr));gap:" + S(6) + " " + S(10) + "}",
      ph(".b3d-grid dt") + "{font-size:" + S(10) + "}",
      ph(".b3d-grid dd") + "{font-size:" + S(14) + ";margin-top:1px}",
      ph(".b3d-nav") + "{margin-top:" + S(8) + ";gap:" + S(6) + "}",
      ph(".b3d-nav button") + "{min-height:34px;font-size:" + S(13) + "}",
      ph(".b3d-x") + "{top:" + S(6) + ";right:" + S(6) + "}",
      /* short stage (landscape phone / short embed) = narrow card on the left */
      ".b3d-stage[data-b3d-short] .b3d-panel{right:auto;left:" + eL + ";width:min(250px,42%);max-height:62%;padding:" + S(8) + " " + S(10) + "}",
      ".b3d-stage[data-b3d-short] .b3d-top{margin-bottom:" + S(2) + "}",
      ".b3d-stage[data-b3d-short] .b3d-title{font-size:" + S(15) + ";margin-bottom:" + S(4) + "}",
      ".b3d-stage[data-b3d-short] .b3d-grid{grid-template-columns:1fr 1fr;gap:" + S(4) + " " + S(8) + "}",
      ".b3d-stage[data-b3d-short] .b3d-grid dd{font-size:" + S(13) + "}",
      ".b3d-stage[data-b3d-short] .b3d-nav{margin-top:" + S(6) + "}",
      ".b3d-stage[data-b3d-short] .b3d-nav button{min-height:30px}",
      ".b3d-stage[data-b3d-bp=xs] .b3d-lbl,.b3d-stage[data-b3d-short] .b3d-lbl{font-size:10px;padding:1px 6px}",
      /* touch devices: comfortable tap targets */
      "@media (pointer:coarse){:root{--bva-touch:34px}.b3d-x{width:max(38px," + S(36) + ");height:max(38px," + S(36) + ")}}",
      /* hover only where hover exists (no sticky hover on touch) */
      "@media (hover:hover){.b3d-x:hover{background:rgba(127,127,127,.32)}.b3d-nav button:hover{background:rgba(251,191,36,.18)}}",
      "@media (prefers-reduced-motion:reduce){.b3d-panel{animation:none}}",
      "@media (forced-colors:active){.b3d-panel,.b3d-lbl{border:1px solid CanvasText;background:Canvas;color:CanvasText;forced-color-adjust:none}}",
      "@media print{.b3d-panel,.b3d-labels{display:none!important}}"
    ].join("");
    document.head.appendChild(s);
  }

  /* ---------- geometry helpers ---------- */
  const tmpO = new THREE.Object3D();
  function mergeGeos(parts) {
    const P = [], N = [], U = [], v = new THREE.Vector3(), nm = new THREE.Matrix3();
    parts.forEach(o => {
      const g = o.g.index ? o.g.toNonIndexed() : o.g;
      nm.getNormalMatrix(o.m);
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.m); P.push(v.x, v.y, v.z);
        if (n) { v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z); } else N.push(0, 1, 0);
        if (u) U.push(u.getX(i), u.getY(i)); else U.push(0, 0);
      }
      if (g !== o.g) g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    out.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
    return out;
  }
  function Builder(owner) {
    const map = new Map();
    const api = {
      geo(g, m, x, y, z, rx, ry, rz) {
        tmpO.position.set(x || 0, y || 0, z || 0); tmpO.rotation.set(rx || 0, ry || 0, rz || 0); tmpO.scale.set(1, 1, 1);
        tmpO.updateMatrix();
        let a = map.get(m); if (!a) map.set(m, a = []);
        a.push({ g, m: tmpO.matrix.clone() }); return api;
      },
      box(w, h, l, m, x, y, z, rx, ry, rz) { return api.geo(new THREE.BoxGeometry(w, h, l), m, x, y, z, rx, ry, rz); },
      cyl(rt, rb, h, seg, m, x, y, z, rx, ry, rz) { return api.geo(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, rx, ry, rz); },
      build() {
        const out = [];
        map.forEach((parts, m) => {
          const geo = mergeGeos(parts); owner.push(geo); out.push({ geo, mat: m });
          parts.forEach(p => p.g.dispose());
        });
        return out;
      }
    };
    return api;
  }
  const matKey = (c, o) => c + JSON.stringify(o || "", (k, v) => (v && v.isTexture ? "tex:" + v.uuid : v));

  B.init = (stage, routes, onPick) => {
    if (!window.THREE || !stage || !routes) return false;
    if (B._live && B.dispose) B.dispose();           // re-init safety: never leak a previous scene
    Object.keys(doneT).forEach(k => { delete doneT[k]; });
    B.buses = {};
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) { return false; }
    RND = renderer; texs = [];
    report("renderer", "Starting graphics");

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = matchMedia("(pointer: coarse)").matches;
    const isMobile = coarse || matchMedia("(max-width: 768px)").matches;
    const dpr = window.devicePixelRatio || 1;
    const basePR = isMobile ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
    // pixel budget: keeps 4K / ultra-wide stages smooth (never render more than MAXPIX pixels)
    const MAXPIX = isMobile ? 2.6e6 : 7e6;
    let qm = 1, qAuto = true, capPR = 1e9;
    const applyPR = () => renderer.setPixelRatio(Math.min(basePR * qm, capPR));
    applyPR();
    renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const cvs = renderer.domElement;
    cvs.style.display = "block"; cvs.style.width = "100%"; cvs.style.height = "100%";
    cvs.setAttribute("role", "img");
    cvs.setAttribute("aria-label", "3D view of Panapakkam Bus Stand with bus bays");
    stage.insertBefore(cvs, stage.firstChild);
    if (!stage.hasAttribute("tabindex")) stage.tabIndex = 0;
    stage.style.touchAction = "pan-y";
    stage.style.userSelect = "none";
    stage.style.webkitUserSelect = "none";
    stage.style.webkitTouchCallout = "none";
    if (getComputedStyle(stage).position === "static") stage.style.position = "relative";
    injectCSS();
    stage.classList.add("b3d-stage");
    // set the size attributes immediately so the very first paint already has the mobile layout
    {
      const r0 = stage.getBoundingClientRect();
      if (r0.width) stage.setAttribute("data-b3d-bp", bpOf(r0.width));
      if (r0.height && r0.height < 460) stage.setAttribute("data-b3d-short", "");
    }
    // host gave the stage no height? use the responsive aspect-ratio fallback
    if (stage.getBoundingClientRect().height < 40) stage.classList.add("b3d-auto-h");

    const off = [], tos = [];
    let clockT = 0, liveT = 0;
    const add = (t, ty, fn, o) => { t.addEventListener(ty, fn, o); off.push(() => t.removeEventListener(ty, fn, o)); };
    const GEO = [], MATS = [];
    const own = g => { GEO.push(g); return g; };

    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 250);
    scene.fog = new THREE.Fog(0x0a1220, 45, 140);
    const amb = new THREE.AmbientLight(0xffffff, 0.4); scene.add(amb);
    const key = new THREE.DirectionalLight(0xfff7ed, 1); key.position.set(15, 22, 16); scene.add(key);
    const fill = new THREE.DirectionalLight(0x60a5fa, 0.5); fill.position.set(-16, 12, -14); scene.add(fill);
    const gold = new THREE.DirectionalLight(0xf59e0b, 0.3); gold.position.set(0, -6, 4); scene.add(gold);
    report("scene", "Building terminal");

    const cache = {};
    const M = (c, o) => {
      const k = "s" + matKey(c, o);
      return cache[k] || (cache[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.3, metalness: 0.25 }, o)));
    };
    const PM = (c, o) => {
      const k = "p" + matKey(c, o);
      return cache[k] || (cache[k] = new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.3, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.06 }, o)));
    };
    // every flat board gets its material tracked, so dispose() frees it
    const plane = (w, h, map) => {
      const m = new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, toneMapped: false, fog: false });
      MATS.push(m);
      return new THREE.Mesh(own(new THREE.PlaneGeometry(w, h)), m);
    };

    const ids = routes.map(r => r.id);
    let mode = "night", weather = "clear";

    /* ---------- sky dome + ground (blends into the horizon) ---------- */
    const skyCv = cv(512, 512), skyTex = TX(skyCv);
    const sky = new THREE.Mesh(own(new THREE.SphereGeometry(160, 24, 16)), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    MATS.push(sky.material); sky.renderOrder = -10; scene.add(sky);
    const ground = new THREE.Mesh(own(new THREE.CircleGeometry(150, 40)), new THREE.MeshBasicMaterial({ color: 0x0a1120, fog: false, toneMapped: false }));
    MATS.push(ground.material); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.22; scene.add(ground);
    function drawSky(night, wet) {
      const x = skyCv.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 512);
      if (night) {
        if (wet) { g.addColorStop(0, "#05080f"); g.addColorStop(0.4, "#0c1422"); g.addColorStop(0.5, "#16202f"); g.addColorStop(1, "#0a1120"); }
        else { g.addColorStop(0, "#02040a"); g.addColorStop(0.35, "#071022"); g.addColorStop(0.5, "#16233f"); g.addColorStop(1, "#0a1120"); }
      } else {
        if (wet) { g.addColorStop(0, "#7f8b98"); g.addColorStop(0.4, "#a5b0bb"); g.addColorStop(0.5, "#c3ccd4"); g.addColorStop(1, "#6d777f"); }
        else { g.addColorStop(0, "#5d8fe0"); g.addColorStop(0.4, "#a9cdf5"); g.addColorStop(0.5, "#fff2dc"); g.addColorStop(1, "#7f8a8f"); }
      }
      x.fillStyle = g; x.fillRect(0, 0, 512, 512);
      if (night && !wet) {
        for (let i = 0; i < 260; i++) {
          x.fillStyle = "rgba(255,255,255," + (0.25 + Math.random() * 0.7) + ")";
          const s = Math.random() < 0.1 ? 2 : 1; x.fillRect(Math.random() * 512, Math.random() * 230, s, s);
        }
        const mg = x.createRadialGradient(380, 90, 2, 380, 90, 46);
        mg.addColorStop(0, "rgba(255,248,225,1)"); mg.addColorStop(0.18, "rgba(255,248,225,0.95)"); mg.addColorStop(0.2, "rgba(190,205,255,0.25)"); mg.addColorStop(1, "rgba(190,205,255,0)");
        x.fillStyle = mg; x.fillRect(300, 10, 160, 160);
      } else if (!night && !wet) {
        const sg2 = x.createRadialGradient(150, 120, 4, 150, 120, 90);
        sg2.addColorStop(0, "rgba(255,255,235,1)"); sg2.addColorStop(0.15, "rgba(255,244,200,0.9)"); sg2.addColorStop(1, "rgba(255,230,160,0)");
        x.fillStyle = sg2; x.fillRect(40, 10, 220, 220);
      }
      skyTex.needsUpdate = true;
    }

    /* ---------- image-based lighting ---------- */
    const pm = new THREE.PMREMGenerator(renderer);
    let envRT = null;
    function envScene(m) {
      const s = new THREE.Scene(), c = cv(8, 256), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
      if (m === "night") { g.addColorStop(0, "#04070f"); g.addColorStop(0.5, "#0d1a33"); g.addColorStop(0.52, "#05080f"); g.addColorStop(1, "#020305"); }
      else { g.addColorStop(0, "#9ec3ff"); g.addColorStop(0.45, "#fff2dc"); g.addColorStop(0.5, "#6b6f73"); g.addColorStop(1, "#2a2d30"); }
      x.fillStyle = g; x.fillRect(0, 0, 8, 256);
      const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      const sph = new THREE.SphereGeometry(40, 24, 16), sm = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide });
      s.add(new THREE.Mesh(sph, sm));
      const pw = m === "night" ? 1.4 : 3.2, pg = new THREE.PlaneGeometry(14, 5), junk = [t, sph, sm, pg];
      [[-12, 16, 8], [14, 14, -6], [0, 18, 14]].forEach(p => {
        const mt = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); mt.color.setRGB(pw, pw, pw); junk.push(mt);
        const q = new THREE.Mesh(pg, mt); q.position.set(p[0], p[1], p[2]); q.lookAt(0, 0, 0); s.add(q);
      });
      s.userData.junk = junk;
      return s;
    }
    function setEnv() {
      let es = null;
      try {
        es = envScene(mode);
        const rt = pm.fromScene(es, 0.02);
        if (envRT) envRT.dispose();
        envRT = rt; scene.environment = rt.texture;
        report("env", "Lighting");
      } catch (e) { scene.environment = null; report("env", "Lighting (basic)"); }
      if (es) es.userData.junk.forEach(o => o.dispose());
    }

    /* ---------- shared textures ---------- */
    const shadowCv = cv(256, 512), sctx = shadowCv.getContext("2d");
    const sg = sctx.createRadialGradient(128, 256, 40, 128, 256, 160);
    sg.addColorStop(0, "rgba(0,0,0,0.75)"); sg.addColorStop(0.6, "rgba(0,0,0,0.35)"); sg.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = sg; sctx.fillRect(0, 0, 256, 512);
    const shadowTex = TX(shadowCv);

    const bc = cv(128, 256), bx = bc.getContext("2d"), bg = bx.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, "rgba(255,236,190,0.9)"); bg.addColorStop(1, "rgba(255,236,190,0)");
    bx.fillStyle = bg; bx.fillRect(0, 0, 128, 256);
    bx.globalCompositeOperation = "destination-in";
    const hg = bx.createLinearGradient(0, 0, 128, 0);
    hg.addColorStop(0, "rgba(0,0,0,0)"); hg.addColorStop(0.5, "rgba(0,0,0,1)"); hg.addColorStop(1, "rgba(0,0,0,0)");
    bx.fillStyle = hg; bx.fillRect(0, 0, 128, 256);
    const beamTex = TX(bc);

    const poolCv = cv(128, 128), px0 = poolCv.getContext("2d"), pg0 = px0.createRadialGradient(64, 64, 2, 64, 64, 64);
    pg0.addColorStop(0, "rgba(255,226,160,0.9)"); pg0.addColorStop(0.5, "rgba(255,200,110,0.3)"); pg0.addColorStop(1, "rgba(255,200,110,0)");
    px0.fillStyle = pg0; px0.fillRect(0, 0, 128, 128);
    const poolTex = TX(poolCv);

    const N = routes.length, SP = 3.8, W = Math.max(22, N * SP + 4);

    const asc = cv(512, 512), ax = asc.getContext("2d");
    ax.fillStyle = "#1b1e24"; ax.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 12000; i++) {
      const v = 20 + Math.random() * 46 | 0;
      ax.fillStyle = "rgba(" + v + "," + v + "," + (v + 4) + "," + (0.25 + Math.random() * 0.5) + ")";
      ax.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const asTex = TX(asc); asTex.wrapS = asTex.wrapT = THREE.RepeatWrapping; asTex.repeat.set(W / 5, 4);

    const pvc = cv(256, 256), pvx = pvc.getContext("2d");
    pvx.fillStyle = "#2a2f3b"; pvx.fillRect(0, 0, 256, 256);
    pvx.strokeStyle = "rgba(0,0,0,0.45)"; pvx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) { pvx.beginPath(); pvx.moveTo(i, 0); pvx.lineTo(i, 256); pvx.moveTo(0, i); pvx.lineTo(256, i); pvx.stroke(); }
    const pvTex = TX(pvc); pvTex.wrapS = pvTex.wrapT = THREE.RepeatWrapping; pvTex.repeat.set(W / 2.2, 1.3);
    report("textures", "Preparing textures");

    /* ---------- materials ---------- */
    const asphalt = M(0xffffff, { map: asTex, roughness: 0.62, metalness: 0.05 });
    const paver = M(0xffffff, { map: pvTex, roughness: 0.55, metalness: 0.1 });
    const dark = M(0x10131a, { roughness: 0.35, metalness: 0.4 });
    const pillarM = M(0x242a38, { metalness: 0.6, roughness: 0.25 });
    const amberTrim = M(0xf59e0b, { emissive: 0xf59e0b, emissiveIntensity: 1.3 });
    const white = M(0xffffff, { roughness: 0.35 });
    const yellowLine = M(0xf2b705, { roughness: 0.4 });
    const stripM = M(0xfff1c9, { emissive: 0xffe6a8, emissiveIntensity: 1.2, roughness: 0.4 });
    const boardM = M(0xfff1c9, { emissive: 0xffe0a0, emissiveIntensity: 0.6, roughness: 0.5 });
    const streetM = M(0xfff4d6, { emissive: 0xffe2a0, emissiveIntensity: 2.2, roughness: 0.4 });
    const wallM = M(0x121620, { roughness: 0.6 });
    const benchM = M(0x3a2a1a, { roughness: 0.7, metalness: 0.05 });
    const lampM = M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.1 });
    const amberStatic = M(0xffb020, { emissive: 0xff9a00, emissiveIntensity: 1.4 });
    const trunkM = M(0x4a3320, { roughness: 0.9, metalness: 0 });
    const leafM = M(0x1f5a2e, { roughness: 0.85, metalness: 0 });

    /* ---------- terminal ---------- */
    const T = Builder(GEO);
    T.geo(new THREE.PlaneGeometry(W + 10, 24), asphalt, 0, 0.001, 1.2, -Math.PI / 2);
    T.box(W + 10, 0.2, 24, M(0x07080b, { roughness: 0.8 }), 0, -0.101, 1.2);
    T.box(W, 0.45, 2.8, paver, 0, 0.225, -5.6);
    T.box(W, 0.02, 0.35, yellowLine, 0, 0.46, -4.35);
    T.box(W, 0.05, 0.1, amberTrim, 0, 0.47, -4.18);
    T.box(W + 0.6, 0.25, 4.4, dark, 0, 4.25, -5.2);
    T.box(W + 0.6, 0.08, 0.08, amberTrim, 0, 4.12, -3.0);
    T.box(W + 0.6, 0.12, 0.12, pillarM, 0, 4.42, -3.0);
    T.box(W, 0.05, 0.14, stripM, 0, 4.1, -3.9);
    T.box(W, 0.05, 0.14, stripM, 0, 4.1, -6.3);
    T.box(W, 3.6, 0.15, wallM, 0, 2.25, -7.3);
    T.box(W, 0.1, 0.2, pillarM, 0, 0.5, -7.2);
    const np = Math.floor((W / 2 - 1) / 3.4);
    for (let i = -np; i <= np; i++) {
      T.box(0.24, 4.0, 0.24, pillarM, i * 3.4, 2.1, -4.8);
      T.box(0.4, 0.12, 0.4, amberTrim, i * 3.4, 0.5, -4.8);
    }
    for (let i = -np; i < np; i++) {
      const cx = (i + 0.5) * 3.4;
      T.box(1.8, 0.07, 0.5, benchM, cx, 0.82, -6.3);
      T.box(1.8, 0.4, 0.05, benchM, cx, 1.1, -6.55);
      [-0.75, 0.75].forEach(o => T.box(0.06, 0.37, 0.4, pillarM, cx + o, 0.63, -6.3));
      T.box(1.5, 0.95, 0.04, boardM, cx, 2.5, -7.2);
      T.box(1.6, 0.06, 0.06, pillarM, cx, 3.0, -7.18);
      T.box(1.6, 0.06, 0.06, pillarM, cx, 2.0, -7.18);
    }
    [-1, 1].forEach(s => T.cyl(0.22, 0.22, 0.7, 12, pillarM, s * (W / 2 - 1.4), 0.8, -6.6));
    for (let i = 0; i <= N; i++) T.box(0.12, 0.02, 8.4, white, (i - N / 2) * SP, 0.016, 0.4);
    for (let i = 0; i < N; i++) T.box(2.6, 0.02, 0.12, yellowLine, (i - (N - 1) / 2) * SP, 0.017, 4.3);
    for (let x = -W / 2 + 1; x < W / 2; x += 2.4) T.box(1.2, 0.02, 0.14, white, x, 0.016, 9.2);
    // trees at both ends of the road
    [-1, 1].forEach(s => {
      const tx = s * (W / 2 + 2.8);
      T.cyl(0.18, 0.24, 2.2, 8, trunkM, tx, 1.1, -3.5);
      T.geo(new THREE.ConeGeometry(1.35, 2.4, 10), leafM, tx, 3.1, -3.5);
      T.geo(new THREE.ConeGeometry(1.0, 2.0, 10), leafM, tx, 4.4, -3.5);
      T.geo(new THREE.ConeGeometry(0.65, 1.5, 10), leafM, tx, 5.5, -3.5);
    });
    // streetlights
    const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    MATS.push(poolMat);
    const poolGeo = own(new THREE.PlaneGeometry(8, 8));
    [-1, 1].forEach(s => {
      const px = s * (W / 2 - 0.6);
      T.cyl(0.06, 0.09, 5.4, 10, pillarM, px, 2.7, 1.6);
      T.box(1.3, 0.07, 0.07, pillarM, px - s * 0.6, 5.4, 1.6);
      T.box(0.55, 0.08, 0.24, streetM, px - s * 1.2, 5.3, 1.6);
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.rotation.x = -Math.PI / 2; pool.position.set(px - s * 1.2, 0.03, 1.6); scene.add(pool);
    });
    // station name board frame + hangers
    T.box(8.9, 1.22, 0.1, dark, 0, 3.55, -3.0);
    [-3.9, 3.9].forEach(x => T.box(0.05, 0.55, 0.05, pillarM, x, 4.05, -3.0));
    // departures board stand (platform, left end)
    const DBX = -(W / 2 - 2.6);
    T.box(2.0, 1.62, 0.08, dark, DBX, 1.75, -4.58);
    [-0.8, 0.8].forEach(o => T.cyl(0.05, 0.05, 0.55, 8, pillarM, DBX + o, 0.72, -4.58));
    // PA LED board frame on top of the canopy
    T.box(11.8, 1.36, 0.1, dark, 0, 5.2, -3.06);
    [-5.2, 5.2].forEach(x => T.box(0.08, 0.4, 0.08, pillarM, x, 4.55, -3.06));
    T.build().forEach(p => scene.add(new THREE.Mesh(p.geo, p.mat)));

    stationCv = cv(1280, 160); stationTex = TX(stationCv);
    const sSign = plane(8.6, 1.08, stationTex); sSign.position.set(0, 3.55, -2.93); scene.add(sSign);

    /* ---------- PA announcement LED board (canopy roof, scrolls while speaking) ---------- */
    const PA_W = 1536, PA_H = 160, PA_FONT = s => "800 " + s + "px " + FONT;
    const paCv = cv(PA_W, PA_H), paTex = TX(paCv), paBg = cv(PA_W, PA_H);
    (function () {
      const x = paBg.getContext("2d");
      x.fillStyle = "#030406"; x.fillRect(0, 0, PA_W, PA_H);
      x.fillStyle = "rgba(251,191,36,0.07)";
      for (let py = 8; py < PA_H - 4; py += 10) for (let px = 8; px < PA_W - 4; px += 10) x.fillRect(px, py, 4, 4);
    })();
    let paText = "WELCOME TO PANAPAKKAM BUS STAND", paMode = "idle", paLabel = "INFO", paOff = 0, paW = 0, paSize = 74;
    const paMeasure = () => {
      const x = paCv.getContext("2d"); let s = 74;
      x.font = PA_FONT(s); paW = x.measureText(paText).width;
      if (paMode === "idle" || reduce) while (paW > 1090 && s > 30) { s -= 4; x.font = PA_FONT(s); paW = x.measureText(paText).width; }
      paSize = s;
    };
    const paDraw = t => {
      const x = paCv.getContext("2d"), hot = paMode === "urgent" ? "#ff5a4d" : "#ffb703";
      x.shadowBlur = 0; x.drawImage(paBg, 0, 0);
      x.strokeStyle = hot; x.lineWidth = 6; x.strokeRect(4, 4, PA_W - 8, PA_H - 8);
      rr(x, 18, 18, 230, PA_H - 36, 16); x.fillStyle = hot; x.fill();
      x.fillStyle = "#1d1100"; x.textAlign = "center"; x.textBaseline = "middle";
      fit(x, paLabel, 200, 54, "800"); x.fillText(paLabel, 133, PA_H / 2 + 2);
      x.save(); x.beginPath(); x.rect(268, 12, 1110, PA_H - 24); x.clip();
      x.font = PA_FONT(paSize); x.fillStyle = "#ffe9a8"; x.shadowColor = hot; x.shadowBlur = 14; x.textBaseline = "middle";
      if (paMode === "idle" || reduce) { x.textAlign = "center"; x.fillText(paText, 823, PA_H / 2 + 3); }
      else {
        x.textAlign = "left"; let px = 1378 - paOff;
        if (px + paW < 268) { paOff = 0; px = 1378; }
        x.fillText(paText, px, PA_H / 2 + 3);
      }
      x.restore(); x.shadowBlur = 0;
      for (let i = 0; i < 6; i++) {
        const h = paMode === "idle" || reduce ? 10 : 22 + (Math.sin(t * 0.012 + i * 1.3) * 0.5 + 0.5) * 70;
        x.fillStyle = hot; x.fillRect(1398 + i * 20, PA_H / 2 - h / 2, 12, h);
      }
      paTex.needsUpdate = true;
    };
    const paPlane = plane(11.5, 1.2, paTex); paPlane.position.set(0, 5.2, -3.0); scene.add(paPlane);
    B.setPA = (text, m, label) => {
      paText = String(text || ""); paMode = m === "speak" || m === "urgent" ? m : "idle";
      paLabel = label || (paMode === "idle" ? "NEXT" : "PA"); paOff = 0;
      paMeasure(); paDraw(performance.now()); need();
    };
    paMeasure(); paDraw(0);

    /* ---------- departures board ---------- */
    const dbCv = cv(640, 512), dbTex = TX(dbCv);
    const dbPlane = plane(1.9, 1.52, dbTex); dbPlane.position.set(DBX, 1.75, -4.53); scene.add(dbPlane);
    const clock = () => { try { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); } catch (e) { return ""; } };
    board = () => {
      const x = dbCv.getContext("2d");
      x.fillStyle = "#05070c"; x.fillRect(0, 0, 640, 512);
      x.strokeStyle = "#fbbf24"; x.lineWidth = 6; x.strokeRect(4, 4, 632, 504);
      x.fillStyle = "#fbbf24"; x.font = "800 34px " + FONT; x.textBaseline = "middle";
      x.textAlign = "left"; x.fillText("DEPARTURES", 24, 40);
      x.textAlign = "right"; x.fillText(clock(), 616, 40);
      x.fillRect(16, 68, 608, 3);
      ids.slice(0, 6).forEach((id, i) => {
        const b = B.buses[id]; if (!b) return;
        const y = 108 + i * 64, inf = b.info || {};
        x.fillStyle = b.status === "soon" ? "#22c55e" : b.status === "next" ? "#fbbf24" : "#64748b";
        x.beginPath(); x.arc(30, y, 9, 0, 6.283); x.fill();
        x.fillStyle = "#ffb703"; x.textAlign = "left"; x.font = "800 30px " + FONT; x.fillText(String(b.no || "B" + b.bay), 56, y);
        const d = (inf.dest || "").toUpperCase();
        x.fillStyle = "#f6f7fb"; fit(x, d, 290, 28, "700"); x.fillText(d, 170, y);
        x.fillStyle = "#ffffff"; x.textAlign = "right"; x.font = "800 30px " + FONT; x.fillText(inf.time || "--:--", 616, y);
      });
      dbTex.needsUpdate = true; need();
    };

    /* ---------- passengers on the platform ---------- */
    const SK = [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69], CL = [0x2563eb, 0xdc2626, 0x16a34a, 0xf59e0b, 0x7c3aed, 0xe5e7eb, 0x0ea5e9, 0xdb2777], PN = [0x1f2937, 0x374151, 0x1e3a5f];
    const pBody = own(new THREE.CylinderGeometry(0.17, 0.2, 0.66, 8)), pHead = own(new THREE.SphereGeometry(0.13, 10, 8)), pLeg = own(new THREE.BoxGeometry(0.12, 0.78, 0.14).translate(0, -0.39, 0));
    const people = [], walkLim = W / 2 - 1.8;
    function person(x, z, i, dir) {
      const o = { roughness: 0.8, metalness: 0 };
      const sk = M(SK[i % 4], o), sh = M(CL[i % 8], o), pn = M(PN[i % 3], o);
      const g = new THREE.Group();
      const body = new THREE.Mesh(pBody, sh); body.position.y = 1.11; g.add(body);
      const head = new THREE.Mesh(pHead, sk); head.position.y = 1.59; g.add(head);
      const l = new THREE.Mesh(pLeg, pn), r = new THREE.Mesh(pLeg, pn);
      l.position.set(-0.07, 0.78, 0); r.position.set(0.07, 0.78, 0); g.add(l); g.add(r);
      g.position.set(x, 0.45, z);
      g.rotation.y = dir ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() - 0.5) * 0.8;
      scene.add(g);
      people.push({ g, l, r, dir, spd: 0.5 + Math.random() * 0.4, ph: Math.random() * 6.28 });
    }
    const nStand = isMobile ? 5 : 9, nWalk = isMobile ? 2 : 4, span = W - 6;
    for (let i = 0; i < nStand; i++) person(-W / 2 + 3 + (i + Math.random() * 0.6) * (span / nStand), -5.9 + Math.random() * 0.6, i, 0);
    for (let i = 0; i < nWalk; i++) person((Math.random() - 0.5) * (W - 6), i % 2 ? -5.3 : -5.65, i + 3, i % 2 ? 1 : -1);
    let ambient = !reduce;
    const updatePeople = (dt, t) => {
      people.forEach(p => {
        if (p.dir) {
          p.g.position.x += p.dir * p.spd * dt;
          if (Math.abs(p.g.position.x) > walkLim) { p.dir *= -1; p.g.position.x = clamp(p.g.position.x, -walkLim, walkLim); p.g.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
          p.ph += dt * p.spd * 7; const sw = Math.sin(p.ph) * 0.5; p.l.rotation.x = sw; p.r.rotation.x = -sw;
          p.g.position.y = 0.45 + Math.abs(Math.sin(p.ph)) * 0.02;
        } else p.g.rotation.z = Math.sin(t * 0.0012 + p.ph) * 0.015;
      });
    };

    /* ---------- rain ---------- */
    const RN = isMobile ? 380 : 750, drops = new Float32Array(RN * 3), rainPos = new Float32Array(RN * 6);
    for (let i = 0; i < RN; i++) { drops[i * 3] = (Math.random() - 0.5) * 72; drops[i * 3 + 1] = Math.random() * 16; drops[i * 3 + 2] = (Math.random() - 0.5) * 46 + 2; }
    const rainGeo = own(new THREE.BufferGeometry());
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.4, fog: false }));
    MATS.push(rain.material); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
    const updateRain = dt => {
      for (let i = 0; i < RN; i++) {
        let x = drops[i * 3] - 2.5 * dt, y = drops[i * 3 + 1] - 24 * dt;
        if (y < 0) { y = 14 + Math.random() * 4; x = (Math.random() - 0.5) * 72; drops[i * 3 + 2] = (Math.random() - 0.5) * 46 + 2; }
        drops[i * 3] = x; drops[i * 3 + 1] = y; const z = drops[i * 3 + 2], k = i * 6;
        rainPos[k] = x; rainPos[k + 1] = y; rainPos[k + 2] = z; rainPos[k + 3] = x + 0.04; rainPos[k + 4] = y + 0.55; rainPos[k + 5] = z;
      }
      rainGeo.attributes.position.needsUpdate = true;
    };
    updateRain(0);

    /* ---------- coach template ---------- */
    const BV = 0.14, AR = 0.64;
    function extrude(fn, width) {
      const s = new THREE.Shape(); fn(s);
      const depth = width - 2 * BV;
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelOffset: -BV, bevelSegments: 4, curveSegments: 12 });
      g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);
      return g;
    }
    const lowerShape = s => {
      s.moveTo(-3.25, 0.5); s.quadraticCurveTo(-3.25, 0.35, -3.1, 0.35);
      s.lineTo(-1.95 - AR, 0.35); s.absarc(-1.95, 0.35, AR, Math.PI, 0, true);
      s.lineTo(1.95 - AR, 0.35); s.absarc(1.95, 0.35, AR, Math.PI, 0, true);
      s.lineTo(3.12, 0.35); s.quadraticCurveTo(3.32, 0.35, 3.32, 0.6);
      s.lineTo(3.32, 1.05); s.quadraticCurveTo(3.32, 1.45, 3.0, 1.45);
      s.lineTo(-3.05, 1.45); s.quadraticCurveTo(-3.25, 1.45, -3.25, 1.25);
      s.lineTo(-3.25, 0.5);
    };
    const roofShape = s => {
      s.moveTo(-3.2, 2.45); s.lineTo(3.3, 2.45); s.lineTo(3.3, 2.78); s.quadraticCurveTo(3.3, 3.0, 3.05, 3.0);
      s.lineTo(-3.0, 3.0); s.quadraticCurveTo(-3.2, 3.0, -3.2, 2.8); s.lineTo(-3.2, 2.45);
    };

    const red = PM(0xd6141c, { roughness: 0.3, metalness: 0.25 });
    const redDk = PM(0x9d0e14, { roughness: 0.35, metalness: 0.25, clearcoat: 0.6 });
    const blk = M(0x07090c, { roughness: 0.45, metalness: 0.35 });
    const archM = M(0x050607, { roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    const gry = M(0x3a404a, { roughness: 0.6, metalness: 0.1 });
    const lgry = M(0xdfe4ea, { roughness: 0.4, metalness: 0.2 });
    const chrome = M(0xe2e8f0, { metalness: 0.95, roughness: 0.08 });
    const glass = M(0x0a141f, { roughness: 0.05, metalness: 0.85, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const wGlass = M(0x0b1622, { roughness: 0.04, metalness: 0.85, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
    const doorGlass = M(0x0b1622, { roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.78 });
    const yellow = M(0xf2c230, { roughness: 0.4 });
    const cream = M(0xf8f1dd, { roughness: 0.4, metalness: 0.1 });
    const seatM = M(0x1e3a6e, { roughness: 0.7, metalness: 0.05 });
    const floorM = M(0x2b2f37, { roughness: 0.8, metalness: 0 });
    const skinA = M(0xc68642, { roughness: 0.8, metalness: 0 }), skinB = M(0xe0ac69, { roughness: 0.8, metalness: 0 }), skinC = M(0x8d5524, { roughness: 0.8, metalness: 0 });
    const shirtA = M(0x2563eb, { roughness: 0.8, metalness: 0 }), shirtB = M(0xe5e7eb, { roughness: 0.8, metalness: 0 }), shirtC = M(0x16a34a, { roughness: 0.8, metalness: 0 }), shirtD = M(0xf59e0b, { roughness: 0.8, metalness: 0 });
    const uniform = M(0x6b7280, { roughness: 0.8, metalness: 0 });

    function wheelTemplate(side) {
      const b = Builder(GEO), R = Math.PI / 2;
      const tire = M(0x131518, { roughness: 0.92, metalness: 0 }), sw = M(0x1b1e22, { roughness: 0.8, metalness: 0 });
      const rim = M(0xcbd5e1, { metalness: 0.9, roughness: 0.25 }), dish = M(0x7f8896, { metalness: 0.8, roughness: 0.4 });
      b.cyl(0.48, 0.48, 0.36, 32, tire, 0, 0, 0, 0, 0, R);
      b.cyl(0.41, 0.41, 0.375, 32, sw, 0, 0, 0, 0, 0, R);
      b.cyl(0.33, 0.33, 0.04, 28, rim, side * 0.19, 0, 0, 0, 0, R);
      b.cyl(0.27, 0.27, 0.045, 28, dish, side * 0.195, 0, 0, 0, 0, R);
      b.cyl(0.12, 0.12, 0.07, 16, rim, side * 0.215, 0, 0, 0, 0, R);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2;
        b.cyl(0.025, 0.025, 0.05, 6, chrome, side * 0.22, Math.sin(a) * 0.19, Math.cos(a) * 0.19, 0, 0, R);
      }
      return b.build();
    }
    const WT = { "1": wheelTemplate(1), "-1": wheelTemplate(-1) };

    const C = Builder(GEO);
    C.geo(extrude(lowerShape, 2.4), red);
    C.geo(extrude(roofShape, 2.4), red);
    C.box(2.2, 0.25, 6.0, blk, 0, 0.42, 0);
    [-1, 1].forEach(s => {
      C.box(0.07, 0.07, 6.0, blk, s * 0.88, 0.48, 0);
      [-1.95, 1.95].forEach(z => {
        C.cyl(0.05, 0.05, 2.2, 10, blk, 0, 0.48, z, 0, 0, Math.PI / 2);
        C.geo(new THREE.CircleGeometry(AR + 0.02, 24, 0, Math.PI), archM, s * 1.215, 0.35, z, 0, s * Math.PI / 2, 0);
        C.geo(new THREE.TorusGeometry(AR + 0.04, 0.03, 6, 26, Math.PI), blk, s * 1.222, 0.35, z, 0, s * Math.PI / 2, 0);   // fender flare
      });
      // livery: cream + gold waist stripes
      C.box(0.01, 0.07, 5.9, cream, s * 1.2255, 1.4, 0);
      C.box(0.01, 0.03, 5.9, yellow, s * 1.2255, 1.3, 0);
    });
    C.box(2.2, 0.05, 6.05, floorM, 0, 1.47, 0);
    [-1, 1].forEach(s => {
      C.box(0.05, 0.07, 6.0, blk, s * 1.2, 2.41, -0.15);
      C.box(0.05, 0.08, 6.0, blk, s * 1.2, 1.5, -0.15);
      for (let i = 0; i < 8; i++) C.box(0.06, 0.95, 0.09, blk, s * 1.2, 1.96, -3.0 + i * 0.84);
      C.box(0.03, 0.88, 6.0, glass, s * 1.19, 1.96, -0.15);
      C.box(0.1, 0.98, 0.12, blk, s * 1.15, 1.96, 2.92, 0, s * 0.35, 0);
      // mirrors
      C.box(0.34, 0.06, 0.06, blk, s * 1.37, 2.32, 3.08);
      C.box(0.15, 0.82, 0.3, blk, s * 1.55, 1.95, 3.08);
      C.box(0.02, 0.7, 0.24, gry, s * 1.47, 1.95, 3.08);
      // headlight housings, DRL, fog lamp, rear reflector
      C.box(0.8, 0.3, 0.1, blk, s * 0.85, 0.8, 3.31);
      C.cyl(0.07, 0.07, 0.07, 16, lampM, s * 0.62, 0.78, 3.375, Math.PI / 2, 0, 0);
      C.box(0.5, 0.04, 0.04, lampM, s * 0.85, 0.99, 3.36);
      C.cyl(0.08, 0.08, 0.06, 16, chrome, s * 0.98, 0.46, 3.34, Math.PI / 2, 0, 0);
      C.cyl(0.06, 0.06, 0.2, 14, chrome, s * 0.7, 0.3, -3.3, Math.PI / 2, 0, 0);
      [-2.9, 0.6, 2.95].forEach(z => C.box(0.03, 0.06, 0.12, amberStatic, s * 1.21, 1.05, z));
      C.box(0.03, 0.5, 0.5, blk, s * 1.205, 1.05, -2.9);
    });
    // doors (curb side +x)
    [[2.45, 0.8], [-0.75, 0.8]].forEach(d => {
      C.box(0.03, 1.9, d[1] + 0.1, blk, 1.21, 1.5, d[0]);
      C.box(0.12, 0.05, d[1], gry, 1.25, 0.6, d[0]);
      C.cyl(0.02, 0.02, 1.2, 8, chrome, 1.12, 1.9, d[0] + d[1] / 2 + 0.06);        // door handrails
      C.cyl(0.02, 0.02, 1.2, 8, chrome, 1.12, 1.9, d[0] - d[1] / 2 - 0.06);
    });
    // windshield
    C.geo(new THREE.CylinderGeometry(1, 1, 1.0, 28, 1, true, -1.15, 2.3).scale(1.2, 1, 0.3), wGlass, 0, 1.95, 2.98);
    C.box(0.05, 1.0, 0.05, blk, 0.0, 1.95, 3.28);
    C.box(2.2, 0.34, 0.08, blk, 0, 1.27, 3.2);
    C.box(1.2, 0.14, 0.04, blk, 0, 0.62, 3.35);
    C.box(0.5, 0.13, 0.03, redDk, 0, 0.45, 3.35);
    C.box(2.0, 0.03, 0.04, redDk, 0, 0.9, 3.34);
    C.box(2.3, 0.14, 0.14, blk, 0, 0.38, 3.3);                         // front bumper
    // roof
    C.box(2.1, 0.5, 0.08, blk, 0, 2.62, 3.29);
    [-0.95, 0.0, 0.3, 0.6, 0.95].forEach(x => C.box(0.16, 0.07, 0.06, amberStatic, x, 2.89, 3.31));
    C.box(1.3, 0.16, 2.3, lgry, 0, 3.08, -0.9);                       // A/C pod
    C.box(1.1, 0.03, 1.9, gry, 0, 3.17, -0.9);
    [-1.4, -0.4].forEach(z => {                                      // A/C fans
      C.cyl(0.4, 0.4, 0.03, 24, lgry, 0, 3.2, z);
      C.cyl(0.33, 0.33, 0.035, 24, blk, 0, 3.205, z);
      C.box(0.62, 0.02, 0.04, gry, 0, 3.225, z);
      C.box(0.04, 0.02, 0.62, gry, 0, 3.225, z);
    });
    [[0.4, 1.4], [-0.4, 1.4], [0, 2.0]].forEach(p => {              // roof vents
      C.cyl(0.13, 0.15, 0.07, 14, lgry, p[0], 3.03, p[1]);
      C.cyl(0.07, 0.07, 0.08, 10, blk, p[0], 3.07, p[1]);
    });
    C.cyl(0.012, 0.012, 0.55, 6, blk, 0.85, 3.28, -2.7);             // antenna
    C.geo(new THREE.SphereGeometry(0.03, 8, 6), blk, 0.85, 3.56, -2.7);
    // rear
    C.box(2.1, 0.85, 0.03, glass, 0, 1.97, -3.18);
    for (let i = 0; i < 5; i++) C.box(1.2, 0.03, 0.03, blk, 0, 0.62 + i * 0.1, -3.27);
    C.box(0.9, 0.18, 0.04, redDk, 0, 1.2, -3.27);
    C.box(0.55, 0.14, 0.03, white, 0, 0.45, -3.3);                    // rear number plate
    // interior seats, poles
    const seatsL = [-2.6, -1.9, -1.2, -0.5, 0.2, 0.9, 1.6], seatsR = [-2.6, -1.9, 0.2, 0.9, 1.6];
    [-1, 1].forEach(s => {
      (s < 0 ? seatsL : seatsR).forEach(z => {
        C.box(0.5, 0.1, 0.46, seatM, s * 0.8, 1.72, z);
        C.box(0.5, 0.55, 0.08, seatM, s * 0.8, 2.02, z - 0.24);
        C.box(0.3, 0.2, 0.4, gry, s * 0.8, 1.6, z);
      });
      C.cyl(0.02, 0.02, 5.6, 8, yellow, s * 0.45, 2.38, -0.2, Math.PI / 2, 0, 0);
      C.box(0.1, 0.02, 5.0, lampM, s * 0.58, 2.43, -0.2);
    });
    [-2.2, -1.0, 0.6, 1.9].forEach(z => [-1, 1].forEach(s => C.cyl(0.025, 0.025, 0.95, 8, yellow, s * 0.36, 1.95, z)));
    // passengers + driver
    const headGeo = new THREE.SphereGeometry(0.11, 8, 6);
    [[-1, -2.6, skinA, shirtA], [-1, -1.2, skinB, shirtB], [-1, 0.2, skinC, shirtD], [-1, 1.6, skinA, shirtC],
     [1, -1.9, skinB, shirtD], [1, 0.9, skinC, shirtA]].forEach(p => {
      const x = p[0] * 0.8, z = p[1] - 0.08;
      C.box(0.34, 0.5, 0.22, p[3], x, 1.99, z);
      C.geo(headGeo.clone(), p[2], x, 2.33, z);
    });
    C.box(0.5, 0.7, 0.5, gry, -0.5, 1.85, 2.3);                       // driver seat
    C.box(0.36, 0.5, 0.24, uniform, -0.5, 2.0, 2.2);
    C.geo(headGeo.clone(), skinC, -0.5, 2.33, 2.2);
    C.geo(new THREE.TorusGeometry(0.17, 0.02, 8, 18), blk, -0.5, 1.85, 2.72, -0.9, 0, 0);
    C.box(2.0, 0.28, 0.3, gry, 0, 1.64, 2.88);
    headGeo.dispose();
    const COACH = C.build();

    /* ---------- dynamic coach parts ---------- */
    const proxyGeo = own(new THREE.BoxGeometry(2.6, 3.1, 6.8)), proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    MATS.push(proxyMat);
    const lampGeo = own(new THREE.CylinderGeometry(0.105, 0.105, 0.07, 18));
    const indGeo = own(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16));
    const tailGeo = own(new THREE.BoxGeometry(0.2, 0.7, 0.05));
    const revGeo = own(new THREE.BoxGeometry(0.16, 0.08, 0.04));
    const leafGlassGeo = own(new THREE.BoxGeometry(0.04, 1.25, 0.38)), leafKickGeo = own(new THREE.BoxGeometry(0.045, 0.6, 0.38));
    const shadowGeo = own(new THREE.PlaneGeometry(3.4, 7.2));
    const wiperGeo = own(new THREE.BoxGeometry(1.0, 0.03, 0.02).translate(0.5, 0, 0));
    const decalGeoR = own(new THREE.PlaneGeometry(1.3, 0.325)), decalGeoL = own(new THREE.PlaneGeometry(2.2, 0.55)), rearGeo = own(new THREE.PlaneGeometry(1.5, 0.375));
    const WHEEL_POS = [[-1.08, 1.95], [1.08, 1.95], [-1.08, -1.95], [1.08, -1.95]];
    const DOORS = [2.45, -0.75];

    function makeBus() {
      const g = new THREE.Group();
      const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.2 });
      const amberM = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff8a00, emissiveIntensity: 0.12, roughness: 0.3 });
      const tailM = new THREE.MeshStandardMaterial({ color: 0xff1235, emissive: 0xd90429, emissiveIntensity: 0.4, roughness: 0.3 });
      const revM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.3 });
      MATS.push(hlMat, amberM, tailM, revM);
      const mk = (geo, mat, x, y, z, rx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m); return m; };

      const sh = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, toneMapped: false }));
      MATS.push(sh.material);
      sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.015, 0.1); g.add(sh);

      COACH.forEach(p => g.add(new THREE.Mesh(p.geo, p.mat)));

      [-1, 1].forEach(s => {
        mk(lampGeo, hlMat, s * 0.85, 0.8, 3.375, Math.PI / 2);
        mk(indGeo, amberM, s * 1.08, 0.8, 3.375, Math.PI / 2);
        mk(tailGeo, tailM, s * 1.05, 0.9, -3.28);
        mk(revGeo, revM, s * 0.7, 0.62, -3.28);
        mk(indGeo, amberM, s * 1.08, 0.62, -3.28, Math.PI / 2);
      });

      const wheels = [];
      WHEEL_POS.forEach(p => {
        const w = new THREE.Group(); w.position.set(p[0], 0.48, p[1]);
        WT[p[0] > 0 ? "1" : "-1"].forEach(q => w.add(new THREE.Mesh(q.geo, q.mat)));
        g.add(w); wheels.push(w);
      });

      const leaves = DOORS.map(zc => [-1, 1].map(o => {
        const l = new THREE.Group(); l.userData.z0 = zc + o * 0.19;
        l.position.set(1.24, 1.5, l.userData.z0);
        const a = new THREE.Mesh(leafGlassGeo, doorGlass); a.position.y = 0.3; l.add(a);
        const k = new THREE.Mesh(leafKickGeo, blk); k.position.y = -0.63; l.add(k);
        g.add(l); return l;
      }));

      const wipers = [-0.95, 0.05].map(px => {
        const w = new THREE.Mesh(wiperGeo, blk); w.position.set(px, 1.58, 3.285); w.rotation.z = 0.03; g.add(w); return w;
      });

      const c = cv(1024, 256), tex = TX(c);
      const sign = plane(1.84, 0.46, tex); sign.position.set(0, 2.62, 3.335); g.add(sign);

      const dc = cv(1024, 256), dtex = TX(dc);
      const decalMat = new THREE.MeshBasicMaterial({ map: dtex, transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      MATS.push(decalMat);
      const dR = new THREE.Mesh(decalGeoR, decalMat); dR.position.set(1.216, 0.95, 0.5); dR.rotation.y = Math.PI / 2; g.add(dR);
      const dL = new THREE.Mesh(decalGeoL, decalMat); dL.position.set(-1.216, 0.95, 0); dL.rotation.y = -Math.PI / 2; g.add(dL);
      const dB = new THREE.Mesh(rearGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })); MATS.push(dB.material);
      dB.position.set(0, 2.62, -3.215); dB.rotation.y = Math.PI; g.add(dB);

      const px = new THREE.Mesh(proxyGeo, proxyMat); px.position.y = 1.55; px.visible = false; g.add(px);
      return { g, px, ctx: c.getContext("2d"), tex, dctx: dc.getContext("2d"), dtex, decalMat, hlMat, amberM, tailM, revM, wheels, leaves, wipers };
    }

    const drawBay = b => {
      const x = b.lx, s = b.status;
      x.fillStyle = s === "soon" ? "#fbbf24" : "#0c0f17"; x.fillRect(0, 0, 256, 96);
      x.strokeStyle = s === "idle" ? "rgba(251,191,36,0.45)" : "#fbbf24"; x.lineWidth = 4; x.strokeRect(3, 3, 250, 90);
      x.fillStyle = s === "soon" ? "#1d1100" : "#fbbf24"; x.font = "800 50px " + FONT;
      x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(b.bayText, 128, 48);
      b.lt.needsUpdate = true; need();
    };

    /* ---------- floating labels ---------- */
    const labels = document.createElement("div"); labels.className = "b3d-labels"; labels.setAttribute("aria-hidden", "true");
    stage.appendChild(labels);
    let labelsOn = true;

    routes.forEach((r, i) => {
      const x = (i - (N - 1) / 2) * SP;
      const b = makeBus();
      b.g.userData.id = r.id; b.px.userData.id = r.id;
      b.g.position.x = x; b.x = x; b.status = "idle"; b.info = null;
      b.extra = { via: r.via || "", fare: r.fare || "" };
      b.z = reduce ? 0 : 28; b.spin = 0; b.v = 0; b.door = 0; b.brake = 0; b.brakeT = 0; b.honkT = 0; b.reversing = false;
      b.ann = false; b.annOn = false;
      b.state = reduce ? "parked" : "arriving"; b.delay = 0.2 + i * 0.4;
      b.g.position.z = b.z; b.g.visible = reduce;
      scene.add(b.g);

      b.hl = new THREE.Mesh(own(new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.38, toneMapped: false }));
      MATS.push(b.hl.material);
      b.hl.scale.set(3.3, 8.4, 1); b.hl.rotation.x = -Math.PI / 2; b.hl.position.set(x, 0.02, 0.4); b.hl.visible = false;
      scene.add(b.hl);

      b.beam = new THREE.Mesh(own(new THREE.PlaneGeometry(2.8, 4.6)), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      MATS.push(b.beam.material);
      b.beam.rotation.x = -Math.PI / 2; b.beam.position.set(x, 0.04, 5.6); scene.add(b.beam);

      const lc = cv(256, 96); b.lx = lc.getContext("2d"); b.bayText = "BAY " + (r.bay || (i + 1));
      b.bay = String(r.bay || (i + 1)); b.no = r.no || r.number || r.code || "";
      b.lt = TX(lc); drawBay(b);
      const lab = plane(1.95, 0.74, b.lt); lab.rotation.x = -Math.PI / 2; lab.position.set(x, 0.03, 4.9); scene.add(lab);

      b.lbl = document.createElement("div"); b.lbl.className = "b3d-lbl"; b.lbl.textContent = lblText(b); b.lblShown = true;
      labels.appendChild(b.lbl);
      drawDecal(b);
      B.buses[r.id] = b;
      // draw the destination board straight from the route data (the host may still call setSign later)
      if (r.dest || r.bus || r.time) B.setSign(r.id, r.dest, r.bus, r.time, { via: r.via || "", fare: r.fare || "" });
    });
    board();
    report("buses", "Parking buses");

    /* ---------- details card ---------- */
    let panel = null, panelOn = true, sel = null;
    const pq = k => panel.querySelector('[data-k="' + k + '"]');
    const pw = k => panel.querySelector('[data-w="' + k + '"]');
    function buildPanel() {
      panel = document.createElement("aside");
      panel.className = "b3d-panel vc"; panel.hidden = true; panel.setAttribute("aria-live", "polite");
      panel.innerHTML =
        '<button class="b3d-x" type="button" aria-label="Close details">\u00d7</button>' +
        '<div class="b3d-top"><span class="b3d-chip" data-k="no"></span><span class="b3d-pill" data-k="st"></span></div>' +
        '<h3 class="b3d-title" data-k="title"></h3>' +
        '<dl class="b3d-grid"><div class="b3d-wide"><dt>Destination</dt><dd data-k="dest"></dd></div>' +
        '<div><dt>Bay</dt><dd data-k="bay"></dd></div><div><dt>Departs</dt><dd data-k="time"></dd></div>' +
        '<div class="b3d-wide" data-w="via" hidden><dt>Via</dt><dd data-k="via"></dd></div>' +
        '<div data-w="fare" hidden><dt>Fare</dt><dd data-k="fare"></dd></div></dl>' +
        '<div class="b3d-nav"><button type="button" data-a="prev" aria-label="Previous bus">\u2039 Prev</button>' +
        '<button type="button" data-a="next" aria-label="Next bus">Next \u203a</button>' +
        '<button type="button" data-a="honk" aria-label="Sound horn">\ud83d\udd0a</button></div>';
      panel.querySelector(".b3d-x").addEventListener("click", () => deselect());
      panel.addEventListener("click", e => {
        const a = e.target.closest && e.target.closest("[data-a]"); if (!a) return;
        if (a.dataset.a === "prev") cycle(-1); else if (a.dataset.a === "next") cycle(1); else B.honk(sel);
      });
      stage.appendChild(panel);
    }
    paint = () => {
      for (const k in B.buses) { const b = B.buses[k]; if (b.lbl) b.lbl.classList.toggle("sel", k === sel); }
      if (!panel) return;
      const b = sel && B.buses[sel];
      if (!b || !panelOn) { panel.hidden = true; return; }
      const i = b.info || {}, ex = b.extra || {};
      pq("no").textContent = b.no ? String(b.no) : "";
      pq("st").textContent = STATUS_TXT[b.status]; pq("st").className = "b3d-pill " + b.status;
      pq("title").textContent = i.bus || "Panapakkam";
      pq("dest").textContent = i.dest || "\u2014";
      pq("bay").textContent = b.bay;
      pq("time").textContent = i.time || "\u2014";
      pw("via").hidden = !ex.via; pq("via").textContent = ex.via || "";
      pw("fare").hidden = !ex.fare; pq("fare").textContent = ex.fare || "";
      panel.hidden = false;
    };
    B.setInfoPanel = on => { panelOn = !!on; paint(); updateOffset(); need(); };
    const cycle = d => {
      if (!ids.length) return;
      const i = sel ? ids.indexOf(sel) : -1;
      const id = i < 0 ? (d > 0 ? ids[0] : ids[ids.length - 1]) : ids[(i + d + ids.length) % ids.length];
      if (onPick) onPick(id); else B.focus(id);
    };
    B.next = () => cycle(1); B.prev = () => cycle(-1);

    /* ---------- look ---------- */
    const lightsFor = (b, t) => {
      const night = mode === "night";
      const blink = b.status === "soon" || b.state === "leaving" || b.honkT > 0;
      b.amberM.emissiveIntensity = blink && (reduce || Math.floor(t / 420) % 2 === 0) ? 2.6 : 0.12;
      b.tailM.emissiveIntensity = (night ? 0.4 : 0.22) + (b.brake || b.status === "soon" ? 2 : 0);
      b.revM.emissiveIntensity = b.reversing ? 2.2 : 0;
    };
    const applyLights = () => {
      const night = mode === "night", hlI = night ? { idle: 0.9, next: 2.4, soon: 3.2 } : { idle: 0.5, next: 1.2, soon: 1.8 };
      const bo = night ? { idle: 0.18, next: 0.5, soon: 0.7 } : { idle: 0, next: 0.08, soon: 0.18 };
      const t = performance.now();
      for (const k in B.buses) { const b = B.buses[k]; b.hlMat.emissiveIntensity = hlI[b.status]; b.beam.material.opacity = bo[b.status]; lightsFor(b, t); }
      need();
    };
    const applyLook = () => {
      const L = LOOK[mode], night = mode === "night", wet = weather === "rain";
      amb.intensity = L.amb * (wet ? 1.15 : 1); key.intensity = L.key * (wet ? 0.55 : 1); fill.intensity = L.fill; gold.intensity = L.gold;
      renderer.toneMappingExposure = L.exp * (wet && !night ? 0.9 : 1);
      for (const k in cache) cache[k].envMapIntensity = L.env * (wet ? 0.8 : 1);
      lampM.emissiveIntensity = night ? 1.2 : 0.45;
      stripM.emissiveIntensity = night ? 1.3 : 0.5;
      boardM.emissiveIntensity = night ? 0.7 : 0.25;
      streetM.emissiveIntensity = night ? 2.4 : 0.4;
      amberStatic.emissiveIntensity = night ? 1.5 : 0.8;
      poolMat.opacity = night ? (wet ? 0.85 : 0.6) : 0;
      asphalt.roughness = wet ? 0.2 : 0.62; asphalt.metalness = wet ? 0.35 : 0.05; paver.roughness = wet ? 0.22 : 0.55;
      scene.fog.color.setHex(night ? (wet ? 0x0b1422 : 0x0a1220) : (wet ? 0x9aa7b5 : 0xcfe2f5));
      scene.fog.near = wet ? 22 : night ? 45 : 60; scene.fog.far = wet ? 90 : night ? 140 : 170;
      ground.material.color.setHex(night ? 0x0a1120 : (wet ? 0x6d777f : 0x7f8a8f));
      drawSky(night, wet);
      rain.visible = wet; rain.material.opacity = night ? 0.5 : 0.35;
      for (const k in B.buses) B.buses[k].decalMat.color.setHex(night ? 0xa4a9b8 : 0xffffff);
      if (panel) panel.classList.toggle("b3d-day", !night);
      stage.classList.toggle("b3d-day-l", !night);
    };
    const applyMode = () => { applyLook(); setEnv(); applyLights(); };
    B.setMode = m => { m = m === "day" ? "day" : "night"; if (m !== mode || !envRT) { mode = m; applyMode(); } };
    B.setWeather = w => {
      const r = w === "rain" ? "rain" : "clear"; if (r === weather) return;
      weather = r; if (r === "rain") updateRain(0);
      applyLook(); applyLights(); need();
      if (B.onWeather) B.onWeather(r);
    };
    B.getWeather = () => weather;
    B.setStatus = (id, s) => {
      const b = B.buses[id]; if (!b || b.status === s) return;
      b.status = s; drawBay(b); applyLights(); board(); paint();
    };
    B.refresh = () => { B.drawStation(); for (const k in B.buses) { drawBay(B.buses[k]); drawDecal(B.buses[k]); } paMeasure(); paDraw(performance.now()); board(); };
    B.setLabels = on => { labelsOn = !!on; labels.style.display = labelsOn ? "" : "none"; need(); };
    B.setAmbient = on => { ambient = !!on && !reduce; need(); };
    B.setQuality = q => { qAuto = q === "auto"; qm = { low: 0.6, medium: 0.85, high: 1 }[q] || 1; applyPR(); need(); };
    B.pulse = (id, on) => { const b = B.buses[id]; if (!b) return; b.ann = !!on; need(); };

    /* ---------- horn + simulation ---------- */
    let actx = null, soundOn = true;
    B.setSound = on => { soundOn = !!on; };
    B.honk = id => {
      const b = B.buses[id || sel || ids[0]]; if (!b) return;
      b.honkT = 0.6; need();
      if (!soundOn) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === "suspended") actx.resume();
        const t0 = actx.currentTime, g = actx.createGain();
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
        g.connect(actx.destination);
        [349, 440].forEach(f => { const o = actx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(g); o.start(t0); o.stop(t0 + 0.6); });
      } catch (e) {}
    };
    B.arrive = id => { const b = B.buses[id]; if (!b) return; b.state = "arriving"; b.z = reduce ? 0 : 28; b.delay = 0; b.door = 0; b.v = 0; b.g.visible = reduce; placeDoors(b); if (reduce) b.state = "parked"; need(); };
    B.depart = id => {
      const b = B.buses[id]; if (!b || b.state !== "parked") return;
      if (reduce) { b.state = "gone"; b.g.visible = false; } else { b.state = "leaving"; b.v = 0; B.honk(id); }
      need();
    };
    B.setLive = on => {
      clearInterval(liveT); liveT = 0;
      if (!on || reduce) return;
      liveT = setInterval(() => {
        if (document.hidden || !inView) return;
        const c = ids.filter(id => { const b = B.buses[id]; return b && b.state === "parked" && id !== sel; });
        if (c.length < 2) return;
        const id = c[Math.random() * c.length | 0];
        B.depart(id); tos.push(setTimeout(() => B.arrive(id), 9000));
      }, 14000);
    };

    /* ---------- animation ---------- */
    function placeDoors(b) {
      const o = smooth(clamp(b.door, 0, 1));
      b.leaves.forEach(p => {
        p[0].position.z = p[0].userData.z0 - 0.3 * o; p[1].position.z = p[1].userData.z0 + 0.3 * o;
        p[0].position.x = p[1].position.x = 1.24 + 0.14 * o;
      });
    }
    function animate(dt, t) {
      let moving = false, soft = false;
      const wet = weather === "rain";
      for (const k in B.buses) {
        const b = B.buses[k];
        b.reversing = false;
        if (b.state === "arriving") {
          moving = true;
          if (b.delay > 0) { b.delay -= dt; b.g.visible = false; }
          else {
            b.g.visible = true;
            const dist = b.z, v = Math.min(7.5, Math.max(0.4, dist * 1.15)), dz = Math.min(dist, v * dt);
            b.z -= dz; b.spin -= dz / 0.48; b.reversing = true; b.brakeT = dist < 8 ? 0.2 : 0;
            if (b.z <= 0.001) { b.z = 0; b.state = "parked"; b.brakeT = 0.9; b.reversing = false; }
          }
        } else if (b.state === "leaving") {
          moving = true;
          if (b.door <= 0.02) {
            b.v = Math.min(9, b.v + 2.6 * dt);
            const dz = b.v * dt; b.z += dz; b.spin += dz / 0.48;
            if (b.z > 34) { b.state = "gone"; b.g.visible = false; b.v = 0; }
          }
        }
        if (b.brakeT > 0) b.brakeT -= dt;
        if (b.honkT > 0) { b.honkT -= dt; moving = true; }
        b.brake = b.brakeT > 0 ? 1 : 0;
        const want = (b.state === "parked" && (sel === k || b.status !== "idle" || b.ann)) ? 1 : 0, d = want - b.door;
        if (d) {
          const stp = dt * 1.1;
          // snap exactly onto the target (avoids float drift that kept the render loop alive forever)
          if (reduce || Math.abs(d) <= stp) b.door = want; else b.door += Math.sign(d) * stp;
          placeDoors(b); if (b.door !== want) moving = true;
        }
        b.wheels.forEach(w => { w.rotation.x = b.spin; });
        const wa = wet ? (0.5 + 0.5 * Math.sin(t * 0.006)) * 0.95 : 0.03;
        b.wipers.forEach(w => { w.rotation.z = wa; });
        const jit = b.state === "parked" && b.status === "soon" && !reduce ? Math.sin(t * 0.06) * 0.004 : 0;
        b.g.position.z = b.z; b.g.position.y = jit;
        if (b.ann) {
          const pz = Math.sin(t * 0.009);
          b.hl.visible = true; b.hl.material.opacity = 0.3 + 0.2 * pz; b.hl.scale.set(3.3 + 0.25 * pz, 8.4 + 0.4 * pz, 1); b.annOn = true;
          if (!reduce) soft = true;
        } else if (b.annOn) {
          b.annOn = false; b.hl.material.opacity = 0.38; b.hl.scale.set(3.3, 8.4, 1); b.hl.visible = sel === k;
        }
        if (!reduce && (b.status === "soon" || b.state === "leaving" || jit || wet)) soft = true;
        lightsFor(b, t);
      }
      if (!reduce) {
        if (wet) { updateRain(dt); soft = true; }
        if (ambient) { updatePeople(dt, t); soft = true; }
        if (paMode !== "idle") { paOff += dt * 230; paDraw(t); soft = true; }
      }
      return { moving, soft };
    }

    /* ---------- camera ---------- */
    // vx / vy = view offset (fraction of the stage) that slides the scene away from the details card on phones
    const st = { yaw: 0.32, pitch: 0.28, r: 21, tx: 0, vx: 0, vy: 0 }, goal = Object.assign({}, st);
    let raf = 0, drag = false, first = true, auto = !reduce, lastI = -1e9, lastR = 0, lastT = performance.now(), vis = true, inView = true, dead = false;
    let prevHard = false, slow = 0, nFrames = 0, bp = "", short = false, vo = false;
    // framing adapts to the stage aspect ratio: portrait phones pull back, ultra-wide screens stay tight
    const ovOne = () => Math.min(34, Math.max(16, 25 / cam.aspect));
    const ov = () => N > 4 ? Math.max(ovOne(), (W / 2 + 2) / (Math.tan(16 * Math.PI / 180) * cam.aspect)) : ovOne();
    const clampR = r => Math.min(Math.max(40, ov()), Math.max(7, r));
    const frameR = () => { goal.r = sel ? ovOne() * 0.65 : ov(); };
    // phone portrait: card is a bottom sheet -> move the scene up. Short landscape: card is on the left -> move the scene right.
    function updateOffset() {
      const phone = bp === "xs" || bp === "sm", on = !!sel && panelOn && (phone || short);
      goal.vy = on && !short ? 0.15 : 0;
      goal.vx = on && short ? -0.16 : 0;
    }
    const setAuto = on => { auto = on && !reduce; lastI = auto ? -1e9 : performance.now(); if (B.onAuto) B.onAuto(auto); need(); };
    const touch = () => { lastI = performance.now(); if (auto) setAuto(false); };
    B.breakpoint = () => bp;

    const proj = new THREE.Vector3();
    const placeLabels = () => {
      if (!labelsOn) return;
      const w = stage.clientWidth, h = stage.clientHeight;
      for (const k in B.buses) {
        const b = B.buses[k];
        proj.set(b.x, 3.9, b.z).project(cam);
        const show = b.g.visible && proj.z < 1 && Math.abs(proj.x) < 1.15 && Math.abs(proj.y) < 1.15;
        if (show !== b.lblShown) { b.lblShown = show; b.lbl.style.display = show ? "" : "none"; }
        if (show) b.lbl.style.transform = "translate3d(" + ((proj.x * 0.5 + 0.5) * w).toFixed(1) + "px," + ((-proj.y * 0.5 + 0.5) * h).toFixed(1) + "px,0) translate(-50%,-100%)";
      }
    };
    const placeCam = () => {
      cam.position.set(st.tx + st.r * Math.sin(st.yaw) * Math.cos(st.pitch), TY + st.r * Math.sin(st.pitch), st.r * Math.cos(st.yaw) * Math.cos(st.pitch));
      cam.lookAt(st.tx, TY, 0);
      if (Math.abs(st.vx) > 0.001 || Math.abs(st.vy) > 0.001) {
        const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
        cam.setViewOffset(w, h, st.vx * w, st.vy * h, w, h); vo = true;
      } else if (vo) { cam.clearViewOffset(); vo = false; }
    };
    const renderFrame = () => { placeCam(); renderer.render(scene, cam); placeLabels(); };

    const step = () => {
      raf = 0; if (dead) return;
      const t = performance.now(), dt = clamp((t - lastT) / 1000, 0, 0.05), raw = t - lastT; lastT = t;
      let hard = drag, soft = false;
      const idle = auto && !drag && t - lastI > 3500;
      if (idle) { goal.yaw = 0.32 + 0.3 * Math.sin(t / 3800); soft = true; }
      const kk = 1 - Math.exp(-dt * 9);
      for (const k in st) {
        const d = goal[k] - st[k];
        if (Math.abs(d) > 0.002) { st[k] = reduce ? goal[k] : st[k] + d * kk; if (!idle) hard = true; } else st[k] = goal[k];
      }
      const a = animate(dt, t);
      if (a.moving) hard = true;
      if (a.soft) soft = true;
      if (!hard && t - lastR < 32) { if (vis) raf = requestAnimationFrame(step); return; }
      lastR = t;
      // adaptive quality: step the pixel ratio down on slow devices
      if (qAuto && hard && prevHard && raw < 250 && ++nFrames > 60) {
        if (raw > 36) slow++; else if (slow > 0) slow -= 0.5;
        if (slow > 40 && qm > 0.56) { qm = Math.max(0.55, qm - 0.15); slow = 0; applyPR(); }
      }
      prevHard = hard;
      renderFrame();
      if (first) {
        first = false; stage.classList.add("ready");
        const loader = stage.querySelector(".stage-loading"); if (loader) loader.style.display = "none";
        report("frame", "Ready");
      }
      if ((hard || soft) && vis) raf = requestAnimationFrame(step);
    };
    need = () => { if (!raf && vis && !dead) { lastT = performance.now(); raf = requestAnimationFrame(step); } };

    function deselect() {
      sel = null; goal.tx = 0; goal.yaw = 0.32;
      for (const k in B.buses) B.buses[k].hl.visible = !!B.buses[k].ann;
      frameR(); updateOffset(); paint(); need();
      if (B.onDeselect) B.onDeselect();
    }
    B.focus = id => {
      sel = id; const b = B.buses[id];
      for (const k in B.buses) B.buses[k].hl.visible = B.buses[k] === b || !!B.buses[k].ann;
      if (b) goal.tx = b.x;
      frameR(); updateOffset(); paint(); need();
    };
    B.setAuto = setAuto; B.isAuto = () => auto;
    B.view = v => {
      setAuto(false);
      const P = { overview: [0.32, 0.28], front: [0, 0.1], side: [1.45, 0.12], top: [0, 1.12] }, p = P[v] || P.overview;
      goal.yaw = p[0]; goal.pitch = p[1];
      if (v === "overview" || !P[v]) { sel = null; goal.tx = 0; for (const k in B.buses) B.buses[k].hl.visible = !!B.buses[k].ann; goal.r = ov(); updateOffset(); paint(); }
      else goal.r = ovOne() * (v === "top" ? 0.85 : 0.6);
      need();
    };
    B.screenshot = name => {
      try {
        renderFrame();
        const url = renderer.domElement.toDataURL("image/png");
        if (name !== false) {
          const a = document.createElement("a"); a.href = url; a.download = (name || "panapakkam-bus-stand") + ".png";
          document.body.appendChild(a); a.click(); a.remove();
        }
        return url;
      } catch (e) { return null; }
    };

    const ro = new ResizeObserver(() => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      // pixel budget for very large stages (4K / ultra-wide), then resize
      capPR = Math.max(0.5, Math.sqrt(MAXPIX / (w * h)));
      applyPR();
      renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      // size attributes drive the mobile layout (CSS follows the stage, not the browser window)
      const nb = bpOf(w), ns = h < 460;
      if (ns !== short) { short = ns; if (ns) stage.setAttribute("data-b3d-short", ""); else stage.removeAttribute("data-b3d-short"); }
      if (nb !== bp) {
        bp = nb; stage.setAttribute("data-b3d-bp", nb);
        if (typeof B.onBreakpoint === "function") { try { B.onBreakpoint(nb); } catch (e) {} }
      }
      updateOffset();
      frameR(); st.r = goal.r; st.vx = goal.vx; st.vy = goal.vy;
      need();
    });
    ro.observe(stage);
    // rotating a phone / tablet: re-frame once the browser has settled the new size
    add(window, "orientationchange", () => { tos.push(setTimeout(() => { if (dead) return; updateOffset(); frameR(); st.r = goal.r; need(); }, 250)); });

    const setVis = () => { vis = !document.hidden && inView; if (vis) need(); };
    let io = null;
    if ("IntersectionObserver" in window) { io = new IntersectionObserver(es => { inView = es[0].isIntersecting; setVis(); }); io.observe(stage); }
    add(document, "visibilitychange", setVis);
    clockT = setInterval(() => { if (vis) board(); }, 20000);

    /* ---------- input: mouse, touch (drag + pinch), keyboard ---------- */
    const ray = new THREE.Raycaster(), v = new THREE.Vector2(), pts = new Map();
    let sx = 0, sy = 0, moved = 0, pinch = false, pd = 0, lastHover = 0, lastTap = 0, gs = 1;
    // raycast only the invisible per-bus proxy boxes (cheap), never the full merged coach meshes
    const hit = e => {
      const r = renderer.domElement.getBoundingClientRect();
      v.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v, cam);
      const list = [];
      for (const k in B.buses) { const b = B.buses[k]; if (b.g.visible) list.push(b.px); }
      const h = ray.intersectObjects(list, false)[0];
      return h ? h.object.userData.id : null;
    };
    const pick = e => { const id = hit(e); if (id && onPick) onPick(id); };
    const onUI = e => e.target.closest && e.target.closest(".vc");
    const pdist = () => { const a = Array.from(pts.values()); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; };

    add(stage, "pointerdown", e => {
      if (onUI(e)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      touch();
      if (pts.size > 1) { drag = false; pinch = true; pd = pdist(); return; }
      pinch = false; drag = true; sx = e.clientX; sy = e.clientY; moved = 0;
    });
    add(stage, "pointermove", e => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch) {
        if (pts.size >= 2) { const nd = pdist(); goal.r = clampR(goal.r * pd / nd); pd = nd; touch(); need(); }
        return;
      }
      if (!drag) {
        if (e.pointerType === "mouse" && !onUI(e)) {
          const t = performance.now();
          if (t - lastHover > 80) { lastHover = t; stage.style.cursor = hit(e) ? "pointer" : ""; }
        }
        return;
      }
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = e.clientX; sy = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      goal.yaw = st.yaw += dx * 0.007;
      if (e.pointerType === "mouse") goal.pitch = st.pitch = Math.min(PMAX, Math.max(0.08, st.pitch + dy * 0.005));
      need();
    });
    add(stage, "pointerup", e => {
      pts.delete(e.pointerId);
      if (pts.size === 0) pinch = false;
      if (!drag) return;
      drag = false;
      if (moved < 6) {
        const now = performance.now();
        if (e.pointerType !== "mouse" && now - lastTap < 300) { lastTap = 0; deselect(); return; }
        lastTap = now; pick(e);
      }
    });
    add(stage, "pointercancel", e => { pts.delete(e.pointerId); if (pts.size === 0) pinch = false; drag = false; });
    add(stage, "dblclick", e => { if (onUI(e)) return; deselect(); });
    add(stage, "wheel", e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); touch();
      goal.r = clampR(goal.r * Math.exp(e.deltaY * 0.0015)); need();
    }, { passive: false });
    add(stage, "gesturestart", e => { e.preventDefault(); gs = 1; });
    add(stage, "gesturechange", e => {
      e.preventDefault();
      if (pts.size) return;
      goal.r = clampR(goal.r * gs / e.scale); gs = e.scale; touch(); need();
    });
    add(stage, "keydown", e => {
      if (onUI(e)) return;
      const views = { "1": "overview", "2": "front", "3": "side", "4": "top" };
      if (views[e.key]) { e.preventDefault(); B.view(views[e.key]); return; }
      if (e.key === "Escape") { deselect(); return; }
      if (e.key === "]" || e.key === "n" || e.key === "N") { e.preventDefault(); cycle(1); return; }
      if (e.key === "[" || e.key === "p" || e.key === "P") { e.preventDefault(); cycle(-1); return; }
      if (e.key === "w" || e.key === "W") { B.setWeather(weather === "rain" ? "clear" : "rain"); return; }
      if (e.key === "h" || e.key === "H") { B.honk(sel || ids[0]); return; }
      const m = { ArrowLeft: ["yaw", -0.2], ArrowRight: ["yaw", 0.2], ArrowUp: ["pitch", 0.08], ArrowDown: ["pitch", -0.08], "+": ["r", -2], "=": ["r", -2], "-": ["r", 2] }[e.key];
      if (!m) return;
      e.preventDefault(); touch();
      goal[m[0]] += m[1];
      goal.pitch = Math.min(PMAX, Math.max(0.08, goal.pitch));
      goal.r = clampR(goal.r);
      need();
    });

    /* ---------- WebGL context loss ---------- */
    add(renderer.domElement, "webglcontextlost", e => { e.preventDefault(); if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    add(renderer.domElement, "webglcontextrestored", () => { texs.forEach(t => (t.needsUpdate = true)); applyLook(); setEnv(); applyLights(); need(); });

    /* ---------- cleanup ---------- */
    B.dispose = () => {
      dead = true; B._live = false; if (raf) cancelAnimationFrame(raf); raf = 0;
      clearInterval(clockT); clearInterval(liveT); tos.forEach(clearTimeout);
      off.forEach(f => f()); ro.disconnect(); if (io) io.disconnect();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      GEO.forEach(g => g.dispose());
      MATS.forEach(m => m.dispose());
      for (const k in cache) cache[k].dispose();
      for (const k in B.buses) B.buses[k].g.traverse(o => { if (o.material && o.material.dispose) o.material.dispose(); });
      texs.forEach(t => t.dispose()); texs = [];
      if (envRT) envRT.dispose(); pm.dispose();
      if (panel) panel.remove();
      labels.remove();
      try { if (actx) actx.close(); } catch (e) {}
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      stage.classList.remove("b3d-stage", "b3d-auto-h", "b3d-day-l");
      stage.removeAttribute("data-b3d-bp");
      stage.removeAttribute("data-b3d-short");
      stage.style.cursor = "";
      B.buses = {}; paint = () => {}; need = () => {}; board = () => {};
      stationCv = null; stationTex = null; RND = null;
      B.setPA = function () {};
    };

    buildPanel();
    B.drawStation();
    B.setMode(document.documentElement.dataset.theme === "light" ? "day" : "night");
    if (document.fonts && document.fonts.load) {
      document.fonts.load("600 20px 'Noto Sans Tamil'", "\u0baa\u0ba9\u0baa\u0bcd\u0baa\u0bbe\u0b95\u0bcd\u0b95\u0bae\u0bcd")
        .then(() => { if (!dead) { B.refresh(); } report("fonts", "Tamil fonts loaded"); })
        .catch(() => report("fonts", "Using fallback fonts"));
      tos.push(setTimeout(() => report("fonts", "Using fallback fonts"), 5000));   // never let the loader stall on a slow font
    } else report("fonts", "Fonts ready");
    B._live = true;
    return true;
  };

  window.Bus3D = B;
})();

/* =====================================================================================
   Bus3D Voice & Automation (built in): auto-speak English + Tamil announcer, chime,
   karaoke highlight, PA LED board, automation from departure times, demo clock,
   auto day/night + rain. Runs inside the same file, so there is no load-order problem.
   ===================================================================================== */
(function () {
  "use strict";
  const B = window.Bus3D;
  if (!B || B.Voice) return;

  const FONT = "'Noto Sans Tamil','Space Grotesk','DM Sans',sans-serif";
  const S = n => "calc(" + n + "px*var(--b3d-s,1))";   // scaled px (follows the breakpoint token set by Bus3D)
  const cfg = {
    lang: "both", voice: true, volume: 1, rate: 0.95,
    boardMin: 10, finalMin: 2, remindMin: 5, boardRemind: 3, returnSec: 12,
    auto: true, sim: false, speed: 30, autoEnv: false,
    announceArrivals: false, camera: true, speakHidden: false, persist: true,
    tamilTry: true,      // still try to speak Tamil (lang ta-IN) even when no Tamil voice was detected
    tamilVoice: ""       // optional exact voice name, e.g. "Microsoft Valluvar Online (Natural) - Tamil (India)"
  };
  // "sim" is deliberately NOT persisted: a leftover demo clock would silently fake real departure times on the next visit
  const SAVED = ["voice", "lang", "volume", "auto", "speed", "autoEnv"];
  try {
    const s = JSON.parse(localStorage.getItem("bva-v1") || "null");
    if (s) SAVED.forEach(k => { if (s[k] !== undefined) cfg[k] = s[k]; });
  } catch (e) {}
  const save = () => {
    if (!cfg.persist) return;
    try { const o = {}; SAVED.forEach(k => { o[k] = cfg[k]; }); localStorage.setItem("bva-v1", JSON.stringify(o)); } catch (e) {}
  };

  const V = { onAnnounce: null };
  let A = null;
  const pad = n => String(n).padStart(2, "0");

  function parseTime(s) {
    const m = /(\d{1,2})[:.](\d{2})\s*([ap]\.?m\.?)?/i.exec(s || "");
    if (!m) return null;
    let h = +m[1]; const mi = +m[2], ap = m[3] && m[3][0].toLowerCase();
    if (ap === "p" && h < 12) h += 12;
    if (ap === "a" && h === 12) h = 0;
    return h > 23 || mi > 59 ? null : h * 60 + mi;
  }
  const spokenTime = t => { const h = Math.floor(t / 60) % 24, m = t % 60; return (h % 12 || 12) + ":" + pad(m) + " " + (h >= 12 ? "PM" : "AM"); };
  const tamilTime = t => { const h = Math.floor(t / 60) % 24, m = t % 60; return (h % 12 || 12) + ":" + pad(m); };

  /* ---------- HUD styles (fully responsive; tokens come from Bus3D's :root block / stage attributes) ---------- */
  function injectCSS() {
    if (document.getElementById("bva-style")) return;
    const s = document.createElement("style"); s.id = "bva-style";
    const BTN = "max(var(--bva-btn,40px),var(--bva-touch,0px))";
    const PH = ".b3d-stage[data-b3d-bp=xs],.b3d-stage[data-b3d-bp=sm]";
    const ph = sel => PH.split(",").map(p => p + " " + sel).join(",");
    s.textContent = [
      ".bva-root{position:absolute;left:50%;transform:translateX(-50%);top:var(--b3d-edge,12px);z-index:5;width:min(calc(100% - 2*max(var(--b3d-edge,12px),env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))),var(--bva-max,1600px));box-sizing:border-box;display:flex;flex-direction:column;gap:" + S(8) + ";pointer-events:none;font-family:" + FONT + ";color:#f6f7fb}",
      ".bva-row{display:flex;flex-wrap:wrap;gap:" + S(8) + ";align-items:center}",
      ".bva-pill{pointer-events:auto;padding:" + S(5) + " " + S(12) + ";border-radius:999px;font:800 " + S(13) + "/1.4 " + FONT + ";background:rgba(12,15,23,.85);border:1px solid rgba(251,191,36,.45);color:#fbbf24;font-variant-numeric:tabular-nums;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}",
      ".bva-tick{pointer-events:auto;flex:1 1 100%;overflow:hidden;height:var(--bva-tick-h,28px);border-radius:" + S(10) + ";background:rgba(12,15,23,.78);border:1px solid rgba(251,191,36,.3)}",
      ".bva-track{display:flex;width:max-content;animation:bvaTick 30s linear infinite;will-change:transform}",
      ".bva-track span{padding:0 " + S(28) + ";white-space:nowrap;font:700 " + S(13) + "/calc(var(--bva-tick-h,28px) - 2px) " + FONT + ";color:#f6f7fb}",
      ".bva-ctl{justify-content:flex-end}",
      ".bva-b{pointer-events:auto;min-width:" + BTN + ";height:" + BTN + ";padding:0 " + S(12) + ";border-radius:" + S(12) + ";border:1px solid rgba(251,191,36,.45);background:rgba(12,15,23,.85);color:#fbbf24;font:800 " + S(13) + " " + FONT + ";cursor:pointer;touch-action:manipulation}",
      ".bva-b[aria-pressed=true]{background:#fbbf24;color:#1d1100}",
      ".bva-b:focus-visible,.bva-vol input:focus-visible{outline:2px solid #fbbf24;outline-offset:2px}",
      ".bva-vol{pointer-events:auto;display:flex;align-items:center;height:" + BTN + ";padding:0 " + S(10) + ";border-radius:" + S(12) + ";border:1px solid rgba(251,191,36,.45);background:rgba(12,15,23,.85)}",
      ".bva-vol input{width:var(--bva-vol-w,80px);accent-color:#fbbf24}",
      ".bva-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}",
      ".bva-hint{pointer-events:auto;font:800 " + S(12) + " " + FONT + ";padding:" + S(6) + " " + S(10) + ";border-radius:" + S(8) + ";background:#fbbf24;color:#1d1100;animation:bvaBlink 1.4s ease-in-out infinite}",
      ".bva-hint[hidden],.bva-banner[hidden]{display:none}",
      ".bva-banner{align-self:center;max-width:min(var(--bva-banner-w,740px),100%);box-sizing:border-box;display:flex;gap:" + S(14) + ";align-items:center;padding:" + S(12) + " " + S(18) + ";border-radius:" + S(18) + ";background:rgba(12,15,23,.94);border:2px solid #fbbf24;box-shadow:0 18px 40px rgba(0,0,0,.5);animation:bvaIn .35s cubic-bezier(.2,.8,.2,1)}",
      ".bva-body{min-width:0}",
      ".bva-banner[data-type=final]{border-color:#ef4444}.bva-banner[data-type=boarding]{border-color:#22c55e}.bva-banner[data-type=weather]{border-color:#60a5fa}",
      ".bva-ico{flex:none;width:var(--bva-ico,52px);height:var(--bva-ico,52px);display:grid;place-items:center;font-size:calc(var(--bva-ico,52px)*.54);border-radius:50%;background:rgba(251,191,36,.15)}",
      ".bva-speaking .bva-ico{animation:bvaRing 1.3s ease-out infinite}",
      ".bva-tag{display:flex;align-items:center;gap:" + S(8) + ";margin-bottom:" + S(4) + ";font:800 " + S(12) + " " + FONT + ";letter-spacing:.08em;text-transform:uppercase;color:#fbbf24}",
      ".bva-chip{background:#fbbf24;color:#1d1100;border-radius:" + S(6) + ";padding:" + S(1) + " " + S(8) + "}.bva-chip:empty{display:none}",
      ".bva-eq{display:inline-flex;gap:2px;align-items:flex-end;height:" + S(14) + ";opacity:0;transition:opacity .2s}.bva-speaking .bva-eq{opacity:1}",
      ".bva-eq i{width:" + S(3) + ";height:100%;background:#fbbf24;border-radius:2px;transform-origin:bottom;animation:bvaEq .8s ease-in-out infinite}",
      ".bva-eq i:nth-child(2){animation-delay:-.6s}.bva-eq i:nth-child(3){animation-delay:-.3s}.bva-eq i:nth-child(4){animation-delay:-.5s}.bva-eq i:nth-child(5){animation-delay:-.15s}",
      ".bva-line{font:700 var(--bva-line,17px)/1.45 " + FONT + ";overflow-wrap:anywhere}.bva-line span{opacity:.55;transition:opacity .15s,color .15s}.bva-line span.done{opacity:.9}.bva-line span.on{opacity:1;color:#fbbf24}",
      ".b3d-lbl.bva-pulse{background:#22c55e;color:#04210e;border-color:#22c55e;animation:bvaPulseG 1.2s ease-in-out infinite}",
      ".b3d-lbl.bva-final{background:#ef4444;color:#fff;border-color:#ef4444;animation:bvaPulseR .7s ease-in-out infinite}",
      ".b3d-day-l .bva-pill,.b3d-day-l .bva-b,.b3d-day-l .bva-vol,.b3d-day-l .bva-tick{background:rgba(255,255,255,.92);color:#8a5200;border-color:rgba(138,82,0,.5)}",
      ".b3d-day-l .bva-b[aria-pressed=true]{background:#b45309;color:#fff}.b3d-day-l .bva-track span{color:#14171f}",
      ".b3d-day-l .bva-banner{background:rgba(255,255,255,.96);color:#14171f}.b3d-day-l .bva-tag,.b3d-day-l .bva-line span.on{color:#8a5200}",
      "@keyframes bvaTick{to{transform:translateX(-50%)}}",
      "@keyframes bvaIn{from{opacity:0;transform:translateY(-12px) scale(.97)}to{opacity:1;transform:none}}",
      "@keyframes bvaRing{0%{box-shadow:0 0 0 0 rgba(251,191,36,.6)}100%{box-shadow:0 0 0 16px rgba(251,191,36,0)}}",
      "@keyframes bvaEq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}",
      "@keyframes bvaBlink{50%{opacity:.55}}",
      "@keyframes bvaPulseG{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.75)}50%{box-shadow:0 0 0 9px rgba(34,197,94,0)}}",
      "@keyframes bvaPulseR{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.85)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}",

      /* ===== STAGE-DRIVEN MOBILE HUD (follows the real stage size) ===== */
      /* phones: tiny one-line pills, NO ticker, NO volume slider, small centred buttons */
      ph(".bva-ctl") + "{justify-content:center;gap:5px}",
      ph(".bva-row") + "{gap:5px;flex-wrap:nowrap}",
      ph(".bva-row.bva-ctl") + "{flex-wrap:wrap}",
      ph(".bva-root") + "{gap:5px}",
      ph(".bva-tick") + "{display:none}",
      ph(".bva-vol") + "{display:none}",
      ph(".bva-pill") + "{flex:0 1 auto;min-width:0;font-size:11px;padding:3px 9px}",
      ph(".bva-b") + "{padding:0 8px;border-radius:10px;font-size:12px;min-width:var(--bva-btn,34px)}",
      ph(".bva-hint") + "{flex:1 1 100%;text-align:center;font-size:11px;padding:4px 8px}",
      ph(".bva-banner") + "{padding:8px 10px;gap:8px;border-radius:14px;border-width:2px}",
      ph(".bva-tag") + "{margin-bottom:2px;font-size:10px}",
      ph(".bva-ico") + "{display:none}",
      ".b3d-stage[data-b3d-bp=xs] .bva-line{font-size:13px;line-height:1.35}",
      /* short stage (landscape phone / short embed) */
      ".b3d-stage[data-b3d-short] .bva-tick,.b3d-stage[data-b3d-short] .bva-vol{display:none}",
      ".b3d-stage[data-b3d-short] .bva-root{gap:4px}",
      ".b3d-stage[data-b3d-short] .bva-row{gap:4px;flex-wrap:nowrap}",
      ".b3d-stage[data-b3d-short] .bva-row.bva-ctl{flex-wrap:wrap}",
      ".b3d-stage[data-b3d-short] .bva-pill{font-size:11px;padding:3px 9px;flex:0 1 auto;min-width:0}",
      ".b3d-stage[data-b3d-short] .bva-b{padding:0 8px;border-radius:9px;font-size:12px}",
      ".b3d-stage[data-b3d-short] .bva-hint{font-size:11px;padding:3px 8px}",
      ".b3d-stage[data-b3d-short] .bva-banner{align-self:flex-end;max-width:min(var(--bva-banner-w,740px),62%);padding:6px 10px;gap:8px}",
      ".b3d-stage[data-b3d-short] .bva-ico{display:none}",
      ".b3d-stage[data-b3d-short] .bva-tag{margin-bottom:1px;font-size:10px}",
      /* tablets */
      "@media (min-width:769px) and (max-width:1024px){.bva-banner{padding:" + S(12) + " " + S(16) + "}}",
      /* large screens: more air between HUD items */
      "@media (min-width:1920px){.bva-row{gap:12px}.bva-root{gap:12px}}",
      "@media (min-width:2560px){.bva-row{gap:16px}.bva-root{gap:16px}.bva-banner{border-width:3px}}",
      "@media (hover:hover){.bva-b:hover{background:rgba(251,191,36,.2)}.bva-b[aria-pressed=true]:hover{background:#fbbf24}}",
      "@media (prefers-reduced-motion:reduce){.bva-root *,.b3d-lbl{animation:none!important}}",
      "@media (forced-colors:active){.bva-pill,.bva-b,.bva-vol,.bva-tick,.bva-banner{border:1px solid CanvasText;background:Canvas;color:CanvasText;forced-color-adjust:none}}",
      "@media print{.bva-root{display:none!important}}"
    ].join("");
    document.head.appendChild(s);
  }

  function attach(stage, routes, onPick) {
    if (A) A.detach();
    injectCSS();
    const ids = routes.map(r => r.id), R = {}, S = {};
    routes.forEach(r => { R[r.id] = r; S[r.id] = { stage: 0, lastDiff: null }; });
    const T = new Set(), off = [];
    // tracked timeout: removes itself from the set when it fires (no unbounded growth), all cleared on detach
    const later = (fn, ms) => { const id = setTimeout(() => { T.delete(id); fn(); }, ms); T.add(id); return id; };
    const on = (t, ty, fn, o) => { t.addEventListener(ty, fn, o); off.push(() => t.removeEventListener(ty, fn, o)); };
    const wait = ms => new Promise(r => { later(r, ms); });
    const canSpeak = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
    let dead = false, armed = false, unlocked = false, actx = null, speaking = false, gen = 0, curDone = null, curU = null;
    const Q = [];
    let nextId = null, simStart = 0, simT0 = performance.now(), busyUntil = 0, byUs = false, synth = false;
    let backT = 0, hideT = 0, tickT = 0, lastL = [], lastMode = null, rainT = 0, hudClock = "", hudNext = "", hudTick = "", idleStr = "", lastIdle = null;

    /* ----- DOM ----- */
    const root = document.createElement("div"); root.className = "bva-root";
    root.innerHTML =
      '<div class="bva-row"><div class="bva-pill vc" data-k="clock"></div><div class="bva-pill vc" data-k="next"></div>' +
      '<div class="bva-tick vc"><div class="bva-track" data-k="track"></div></div></div>' +
      '<div class="bva-row bva-ctl">' +
      '<span class="bva-hint vc" data-k="hint" hidden>Tap anywhere to enable voice</span>' +
      '<button class="bva-b vc" type="button" data-a="voice" aria-pressed="true" aria-label="Voice announcements (V)">\ud83d\udd0a</button>' +
      '<button class="bva-b vc" type="button" data-a="lang" aria-label="Announcement language"></button>' +
      '<button class="bva-b vc" type="button" data-a="auto" aria-pressed="true" aria-label="Automation">AUTO</button>' +
      '<button class="bva-b vc" type="button" data-a="sim" aria-pressed="false" aria-label="Demo clock">DEMO</button>' +
      '<button class="bva-b vc" type="button" data-a="env" aria-pressed="false" aria-label="Auto day, night and rain">\ud83c\udf26</button>' +
      '<button class="bva-b vc" type="button" data-a="now" aria-label="Announce next bus (A)">\ud83d\udce2</button>' +
      '<button class="bva-b vc" type="button" data-a="tour" aria-label="Announce all buses">\ud83c\udfac</button>' +
      '<label class="bva-vol vc"><span class="bva-sr">Volume</span><input type="range" min="0" max="1" step="0.05" data-k="vol"></label></div>' +
      '<div class="bva-banner" role="status" hidden><div class="bva-ico" data-k="ico" aria-hidden="true"></div><div class="bva-body">' +
      '<div class="bva-tag"><span class="bva-chip" data-k="chip"></span><span data-k="label"></span><span class="bva-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></div>' +
      '<div class="bva-line" data-k="line"></div></div></div>';
    stage.appendChild(root);
    const q = k => root.querySelector('[data-k="' + k + '"]');
    const banner = root.querySelector(".bva-banner"), btn = a => root.querySelector('[data-a="' + a + '"]');
    const LANGS = { en: "EN", ta: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd", both: "EN+\u0ba4\u0bae\u0bbf\u0bb4\u0bcd" };
    const pressed = (a, v) => btn(a).setAttribute("aria-pressed", v ? "true" : "false");
    function refreshUI() {
      btn("voice").textContent = cfg.voice ? "\ud83d\udd0a" : "\ud83d\udd07"; pressed("voice", cfg.voice);
      btn("lang").textContent = LANGS[cfg.lang] || "EN";
      pressed("auto", cfg.auto); pressed("sim", cfg.sim); pressed("env", cfg.autoEnv);
      btn("sim").textContent = cfg.sim ? "DEMO \u00d7" + cfg.speed : "DEMO";
      q("vol").value = cfg.volume;
      const noTa = canSpeak && voices.length > 0 && cfg.lang !== "en" && !pickTa();
      q("hint").textContent = !unlocked ? "Tap to enable voice" : "No Tamil voice on this device";
      q("hint").hidden = !(cfg.voice && canSpeak && (!unlocked || noTa));
    }
    const paIdle = () => { if (B.setPA) B.setPA(idleStr || "WELCOME TO PANAPAKKAM BUS STAND", "idle", idleStr ? "NEXT" : "INFO"); };

    /* ----- voices ----- */
    let voices = [];
    const loadV = () => { try { voices = speechSynthesis.getVoices() || []; } catch (e) {} };
    if (canSpeak) loadV();
    const norm = v => String(v.lang || "").toLowerCase().replace(/_/g, "-");
    const pick = prefs => {
      if (!voices.length) loadV();
      for (let i = 0; i < prefs.length; i++) {
        const p = prefs[i];
        const v = voices.find(x => norm(x) === p) || voices.find(x => norm(x).indexOf(p) === 0);
        if (v) return v;
      }
      return null;
    };
    // Tamil voice: match by language (ta, ta-IN, ta_LK...) OR by name (Tamil / \u0ba4\u0bae\u0bbf\u0bb4\u0bcd); prefer natural/online/Google voices
    const pickTa = () => {
      if (!voices.length) loadV();
      const list = voices.filter(x => /^ta([-_]|$)/i.test(x.lang || "") || /tamil|\u0ba4\u0bae\u0bbf\u0bb4\u0bcd/i.test(x.name || ""));
      if (!list.length) return null;
      if (cfg.tamilVoice) { const m = list.find(x => x.name === cfg.tamilVoice); if (m) return m; }
      return list.find(x => /natural|online|google/i.test(x.name || "")) || list.find(x => norm(x) === "ta-in") || list[0];
    };
    const pickEn = () => {
      if (!voices.length) loadV();
      const en = voices.filter(x => /^en([-_]|$)/i.test(x.lang || ""));
      return en.find(x => norm(x) === "en-in" && /natural|online|google/i.test(x.name || "")) || pick(["en-in", "en-gb", "en-us", "en"]);
    };
    // voices load late in Chrome/Edge/Safari: listen for the event and re-check a few times
    if (canSpeak) {
      const reload = () => { loadV(); refreshUI(); };
      on(speechSynthesis, "voiceschanged", reload);
      later(reload, 800); later(reload, 2500); later(reload, 6000);
    }
    function unlock() {
      if (unlocked) return; unlocked = true;
      try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { actx = actx || new AC(); if (actx.state === "suspended") actx.resume(); } } catch (e) {}
      try { if (canSpeak) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {}
      refreshUI();
    }
    function chime() {
      return new Promise(res => {
        if (!cfg.voice || !unlocked || !actx || cfg.volume <= 0) return res();
        try {
          if (actx.state === "suspended") actx.resume();
          const t0 = actx.currentTime;
          [[880, 0], [659, 0.42]].forEach(n => {
            const o = actx.createOscillator(), e = actx.createGain(), t = t0 + n[1];
            o.type = "sine"; o.frequency.value = n[0]; o.connect(e); e.connect(actx.destination);
            e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.22 * cfg.volume, t + 0.03); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
            o.start(t); o.stop(t + 0.45);
          });
        } catch (e) { return res(); }
        later(res, 900);
      });
    }

    /* ----- speaking one line with karaoke highlight ----- */
    function renderLine(text, lang) {
      const el = q("line"); el.textContent = ""; el.lang = lang;
      const words = [];
      String(text).replace(/\S+/g, (w, i) => { const s = document.createElement("span"); s.textContent = w + " "; el.appendChild(s); words.push({ i: i, s: s }); return w; });
      return words;
    }
    const mark = (words, k) => words.forEach((w, j) => { w.s.classList.toggle("done", j < k); w.s.classList.toggle("on", j === k); });
    function speakLine(text, lang) {
      return new Promise(res => {
        const words = renderLine(text, lang), ta = lang === "ta"; let fin = false, iv = 0, to = 0;
        const done = () => { if (fin) return; fin = true; clearInterval(iv); clearTimeout(to); if (curDone === done) curDone = null; mark(words, words.length); res(); };
        curDone = done;
        const v = canSpeak ? (ta ? pickTa() : pickEn()) : null;
        // Tamil: use a real Tamil voice when found; otherwise (tamilTry) still ask the browser for lang ta-IN
        const live = cfg.voice && unlocked && canSpeak && cfg.volume > 0 && (cfg.speakHidden || !document.hidden) && !(ta && !v && !cfg.tamilTry);
        if (!live) {
          const ms = Math.max(2200, text.length * 60); let k = 0;
          iv = setInterval(() => mark(words, k++), ms / Math.max(1, words.length)); to = setTimeout(done, ms); return;
        }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = ta ? "ta-IN" : "en-IN";
        if (v) { u.voice = v; u.lang = v.lang; }
        u.volume = cfg.volume; u.rate = ta ? 0.9 : cfg.rate; u.pitch = 1;
        u.onboundary = e => {
          if (e.name && e.name !== "word") return;
          let k = 0; for (let j = 0; j < words.length; j++) if (words[j].i <= e.charIndex) k = j;
          mark(words, k);
        };
        u.onend = done; u.onerror = done;
        curU = u;                                             // keep a reference: Chrome can garbage-collect it before onend fires
        to = setTimeout(done, text.length * 130 + 6000);      // Chrome sometimes never fires onend
        try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { done(); }
      });
    }

    /* ----- message composer (English + Tamil) ----- */
    function info(id) {
      const b = B.buses[id], r = R[id] || {}, i = (b && b.info) || {}, ex = (b && b.extra) || {};
      const time = i.time || r.time || "", dest = String(i.dest || r.dest || "").split("\u2192").pop().trim();
      return { no: (b && b.no) || r.no || "", bus: i.bus || r.bus || "", dest: dest, via: ex.via || r.via || "", bay: (b && b.bay) || r.bay || "", time: time, t: parseTime(time) };
    }
    function compose(type, id, mins) {
      const d = info(id), tt = d.t == null ? d.time : spokenTime(d.t), tta = d.t == null ? d.time : tamilTime(d.t);
      const noE = d.no ? "Bus number " + d.no : "The bus", noT = d.no ? "\u0baa\u0bc7\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 \u0b8e\u0ba3\u0bcd " + d.no : "\u0baa\u0bc7\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1";
      const toE = d.dest ? " to " + d.dest : "", viaE = d.via ? ", via " + d.via : "";
      const toT = (d.via ? d.via + " \u0bb5\u0bb4\u0bbf\u0baf\u0bbe\u0b95 " : "") + (d.dest ? d.dest + " \u0b9a\u0bc6\u0bb2\u0bcd\u0bb2\u0bc1\u0bae\u0bcd " : "");
      const mE = mins <= 1 ? "one minute" : mins + " minutes", mT = mins <= 1 ? "\u0b92\u0bb0\u0bc1 \u0ba8\u0bbf\u0bae\u0bbf\u0b9f\u0ba4\u0bcd\u0ba4\u0bbf\u0bb2\u0bcd" : mins + " \u0ba8\u0bbf\u0bae\u0bbf\u0b9f\u0b99\u0bcd\u0b95\u0bb3\u0bbf\u0bb2\u0bcd";
      const bayT = d.bay + "-\u0b86\u0bae\u0bcd \u0ba8\u0b9f\u0bc8\u0bae\u0bc7\u0b9f\u0bc8";
      const att = "\u0b95\u0bb5\u0ba9\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd. ";
      const O = {
        next: { ico: "\ud83d\udce2", label: "Next bus",
          en: "Attention please. The next bus is " + noE + toE + viaE + ", departing at " + tt + " from bay " + d.bay + ".",
          ta: att + "\u0b85\u0b9f\u0bc1\u0ba4\u0bcd\u0ba4 \u0baa\u0bc7\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1: " + toT + noT + ", " + tta + " \u0bae\u0ba3\u0bbf\u0b95\u0bcd\u0b95\u0bc1 " + bayT + "\u0baf\u0bbf\u0bb2\u0bbf\u0bb0\u0bc1\u0ba8\u0bcd\u0ba4\u0bc1 \u0baa\u0bc1\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0bae\u0bcd." },
        boarding: { ico: "\ud83d\ude8c", label: "Now boarding",
          en: "Attention please. " + noE + toE + viaE + ", is now boarding at bay " + d.bay + ". It departs in " + mE + ". Passengers, please board.",
          ta: att + toT + noT + " " + bayT + "\u0baf\u0bbf\u0bb2\u0bcd \u0b8f\u0bb1\u0ba4\u0bcd \u0ba4\u0baf\u0bbe\u0bb0\u0bbe\u0b95 \u0b89\u0bb3\u0bcd\u0bb3\u0ba4\u0bc1. \u0b87\u0ba4\u0bc1 " + mT + " \u0baa\u0bc1\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0bae\u0bcd. \u0baa\u0baf\u0ba3\u0bbf\u0b95\u0bb3\u0bcd \u0b8f\u0bb1\u0bb5\u0bc1\u0bae\u0bcd." },
        final: { ico: "\u26a0\ufe0f", label: "Final call", urgent: true,
          en: "Final call. " + noE + toE + " departs from bay " + d.bay + " in " + mE + ". Please board now.",
          ta: "\u0b87\u0bb1\u0bc1\u0ba4\u0bbf \u0b85\u0bb4\u0bc8\u0baa\u0bcd\u0baa\u0bc1. " + toT + noT + " " + mT + " \u0baa\u0bc1\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0bae\u0bcd. \u0b89\u0b9f\u0ba9\u0bc7 \u0b8f\u0bb1\u0bb5\u0bc1\u0bae\u0bcd." },
        departed: { ico: "\ud83d\udc4b", label: "Departed", urgent: true,
          en: noE + toE + " has departed. Thank you for travelling with us.",
          ta: toT + noT + " \u0baa\u0bc1\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1. \u0baa\u0baf\u0ba3\u0bae\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bae\u0bc8\u0b95\u0bcd\u0b95\u0bc1 \u0ba8\u0ba9\u0bcd\u0bb1\u0bbf." },
        info: { ico: "\u2139\ufe0f", label: "Departure info",
          en: noE + toE + ", bay " + d.bay + ", departs at " + tt + ".",
          ta: toT + noT + ", " + bayT + ", " + tta + " \u0bae\u0ba3\u0bbf\u0b95\u0bcd\u0b95\u0bc1 \u0baa\u0bc1\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0bae\u0bcd." },
        arrived: { ico: "\ud83d\ude8d", label: "Arrived",
          en: noE + toE + " has arrived at bay " + d.bay + ".",
          ta: toT + noT + " " + bayT + "\u0b95\u0bcd\u0b95\u0bc1 \u0bb5\u0ba8\u0bcd\u0ba4\u0bc1\u0bb3\u0bcd\u0bb3\u0ba4\u0bc1." }
      };
      return Object.assign({ type: type, id: id, chip: d.no }, O[type] || O.info);
    }

    /* ----- queue, camera, PA board ----- */
    function camTo(id) {
      if (!cfg.camera || Date.now() < busyUntil) return;
      byUs = true; if (onPick) onPick(id); else B.focus(id);
    }
    function back() {
      if (!byUs || Date.now() < busyUntil || speaking || Q.length) return;
      byUs = false; synth = true;
      stage.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      synth = false;
    }
    function run(it) {
      const b = it.id && B.buses[it.id], myGen = gen;
      banner.hidden = false; banner.dataset.type = it.type;
      q("ico").textContent = it.ico || "\ud83d\udce2"; q("label").textContent = it.label || ""; q("chip").textContent = it.chip || "";
      if (typeof V.onAnnounce === "function") { try { V.onAnnounce(it); } catch (e) {} }
      if (b) { camTo(it.id); if (B.pulse) B.pulse(it.id, true); }
      const mode = it.urgent ? "urgent" : "speak", plabel = it.chip ? it.chip : it.label;
      return chime().then(() => {
        if (dead || myGen !== gen) return;
        root.classList.add("bva-speaking");
        const lines = [];
        if (cfg.lang !== "ta") lines.push([it.en, "en"]);
        if (cfg.lang !== "en") lines.push([it.ta, "ta"]);
        return lines.reduce((p, l) => p.then(() => {
          if (dead || myGen !== gen) return;               // stop() bumps gen, so a cancelled item never speaks its next line
          if (B.setPA) B.setPA(l[0], mode, plabel);
          return speakLine(l[0], l[1]).then(() => wait(250));
        }), Promise.resolve());
      });
    }
    function pump() {
      if (speaking || dead || !Q.length) return;
      speaking = true; clearTimeout(backT); clearTimeout(hideT);
      const it = Q.shift();
      let p; try { p = run(it); } catch (e) { p = Promise.resolve(); }
      p.catch(() => {}).then(() => {
        speaking = false; root.classList.remove("bva-speaking");
        if (it.id && B.pulse) B.pulse(it.id, false);
        if (dead) return;
        if (Q.length) { pump(); return; }
        paIdle();
        hideT = later(() => { if (!speaking && !Q.length) banner.hidden = true; }, 2200);
        backT = later(back, 3800);
      });
    }
    function say(it) {
      if (dead || !it || (document.hidden && !cfg.speakHidden)) return;
      if (Q.some(x => x.type === it.type && x.id === it.id && x.en === it.en)) return;
      if (it.urgent) Q.unshift(it); else Q.push(it);
      while (Q.length > 5) { const i = Q.findIndex(x => !x.urgent); Q.splice(i < 0 ? 0 : i, 1); }
      pump();
    }

    /* ----- clock + automation ----- */
    function nowMin() {
      if (cfg.sim) return (simStart + (performance.now() - simT0) / 60000 * cfg.speed) % 1440;
      const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60000;
    }
    function cancelSpeech() {
      gen++; Q.length = 0;
      try { if (canSpeak) speechSynthesis.cancel(); } catch (e) {}
      if (curDone) curDone();
    }
    function resetAll() {
      cancelSpeech();
      ids.forEach(id => {
        S[id] = { stage: 0, lastDiff: null };
        const b = B.buses[id]; if (!b) return;
        if (b.lbl) b.lbl.classList.remove("bva-pulse", "bva-final");
        B.setStatus(id, "idle");
        if (b.state === "gone" || b.state === "leaving") B.arrive(id);
      });
      nextId = null;
    }
    function startSim() {
      simT0 = performance.now();
      const d = new Date(), n = d.getHours() * 60 + d.getMinutes(); let best = null;
      ids.forEach(id => { const t = info(id).t; if (t == null) return; const df = ((t - n) % 1440 + 1440) % 1440; if (best === null || df < best) best = df; });
      simStart = (((n + (best === null ? 0 : best) - 12) % 1440) + 1440) % 1440;
      resetAll();
    }
    function leave(id) {
      const b = B.buses[id];
      say(compose("departed", id, 0));
      // only schedule the "return" if the bus really drove off (a bus still arriving must not be teleported back)
      if (b && b.state === "parked") {
        B.depart(id);
        later(() => {
          if (dead) return; B.arrive(id);
          if (cfg.announceArrivals) later(() => say(compose("arrived", id, 0)), 9000);
        }, cfg.returnSec * 1000);
      }
    }
    function hud(now, L) {
      const sec = Math.floor(now * 60) % 86400, hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60;
      const ct = "\ud83d\udd52 " + pad(hh) + ":" + pad(mm) + ":" + pad(ss) + (cfg.sim ? "  \u00b7  DEMO \u00d7" + cfg.speed : "");
      if (ct !== hudClock) { hudClock = ct; q("clock").textContent = ct; }
      const up = L.filter(x => S[x.id].stage < 3), n = up[0]; let nt = "NEXT: \u2014", is = "";
      if (n) {
        const m = Math.floor(n.diff), s = Math.floor((n.diff - m) * 60);
        const cd = n.diff >= 60 ? Math.floor(n.diff / 60) + "h " + pad(Math.floor(n.diff % 60)) + "m" : pad(Math.max(0, m)) + ":" + pad(Math.max(0, s));
        nt = "NEXT " + (n.d.no || "Bay " + n.d.bay) + " \u2192 " + n.d.dest + "  \u00b7  " + cd;
        is = (n.d.no ? n.d.no + "  " : "") + String(n.d.dest || n.d.bus).toUpperCase() + "  " + n.d.time;
      }
      if (nt !== hudNext) { hudNext = nt; q("next").textContent = nt; }
      idleStr = is;
      if (is !== lastIdle) { lastIdle = is; if (!speaking && !Q.length) paIdle(); }
      const txt = up.filter(x => x.diff < 720).slice(0, 8).map(x => (x.d.no ? x.d.no + " " : "") + (x.d.dest || x.d.bus) + " " + x.d.time + " \u00b7 Bay " + x.d.bay).join("   \u2726   ") || "No departures soon";
      if (txt !== hudTick) {
        hudTick = txt; const tr = q("track"); tr.textContent = "";
        for (let i = 0; i < 2; i++) { const s = document.createElement("span"); s.textContent = txt; if (i) s.setAttribute("aria-hidden", "true"); tr.appendChild(s); }
        tr.style.animationDuration = Math.max(18, txt.length * 0.22) + "s";
      }
    }
    function envAuto(now) {
      if (!cfg.autoEnv) return;
      const h = now / 60, m = h >= 6 && h < 18 ? "day" : "night";
      if (m !== lastMode) { lastMode = m; B.setMode(m); }
      if (!rainT && B.getWeather() === "clear" && Math.random() < 0.002) {
        B.setWeather("rain");
        say({ type: "weather", ico: "\ud83c\udf27", label: "Weather", chip: "",
          en: "Attention please. Light rain has started. Passengers, kindly wait inside the shelter.",
          ta: "\u0b95\u0bb5\u0ba9\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd. \u0bae\u0bb4\u0bc8 \u0baa\u0bc6\u0baf\u0bcd\u0baf\u0ba4\u0bcd \u0ba4\u0bca\u0b9f\u0b99\u0bcd\u0b95\u0bbf\u0baf\u0bc1\u0bb3\u0bcd\u0bb3\u0ba4\u0bc1. \u0baa\u0baf\u0ba3\u0bbf\u0b95\u0bb3\u0bcd \u0ba8\u0bbf\u0bb4\u0bb1\u0bcd\u0b95\u0bc1\u0b9f\u0bc8\u0baf\u0bbf\u0bb2\u0bcd \u0b95\u0bbe\u0ba4\u0bcd\u0ba4\u0bbf\u0bb0\u0bc1\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd." });
        rainT = later(() => { rainT = 0; if (!dead) B.setWeather("clear"); }, 45000 + Math.random() * 60000);
      }
    }
    function tick() {
      if (dead) return;
      const now = nowMin(), L = [];
      ids.forEach(id => {
        const d = info(id); if (d.t == null) return;
        L.push({ id: id, d: d, diff: (((d.t - now + 1) % 1440) + 1440) % 1440 - 1 });
      });
      L.sort((a, b) => a.diff - b.diff); lastL = L;
      hud(now, L);
      if (!armed) return;
      envAuto(now);
      if (!cfg.auto) return;
      L.forEach(x => { const s = S[x.id]; if (s.stage >= 3 && x.diff > 30) { s.stage = 0; s.lastDiff = null; } });
      const cand = L.filter(x => S[x.id].stage < 3), nx = cand.length ? cand[0].id : null;
      L.forEach(x => {
        const s = S[x.id], b = B.buses[x.id]; let st = "idle";
        if (s.stage < 3) st = x.diff <= cfg.boardMin ? "soon" : x.id === nx ? "next" : "idle";
        B.setStatus(x.id, st);
        if (b && b.lbl) { b.lbl.classList.toggle("bva-pulse", s.stage === 1); b.lbl.classList.toggle("bva-final", s.stage === 2); }
      });
      L.forEach(x => {
        const s = S[x.id]; if (s.stage >= 3) return;
        const tgt = x.diff <= 0 ? 3 : x.diff <= cfg.finalMin ? 2 : x.diff <= cfg.boardMin ? 1 : 0, mins = Math.max(1, Math.ceil(x.diff));
        if (tgt > s.stage) {
          s.stage = tgt; s.lastDiff = x.diff;
          if (tgt === 3) leave(x.id); else say(compose(tgt === 2 ? "final" : "boarding", x.id, mins));
        } else if (s.stage === 1 && s.lastDiff !== null && s.lastDiff - x.diff >= cfg.boardRemind) {
          s.lastDiff = x.diff; say(compose("boarding", x.id, mins));
        } else if (s.stage === 0 && x.id === nx && (nx !== nextId || (s.lastDiff !== null && s.lastDiff - x.diff >= cfg.remindMin))) {
          s.lastDiff = x.diff; say(compose("next", x.id, mins));
        }
      });
      nextId = nx;
    }

    /* ----- controls ----- */
    function announceNext() {
      const n = lastL.find(x => S[x.id].stage < 3); if (!n) return;
      say(compose(S[n.id].stage >= 1 ? "boarding" : "next", n.id, Math.max(1, Math.ceil(n.diff))));
    }
    function tour() { lastL.filter(x => S[x.id].stage < 3).slice(0, 6).forEach(x => say(compose("info", x.id, 0))); }
    function setVoice(on) {
      cfg.voice = !!on; if (cfg.voice) unlock(); else { try { if (canSpeak) speechSynthesis.cancel(); } catch (e) {} }
      save(); refreshUI();
    }
    function setAuto(on) {
      cfg.auto = !!on; if (cfg.auto && B.setLive) B.setLive(false);
      if (cfg.auto) nextId = null; save(); refreshUI();
    }
    function setSim(on, speed) {
      cfg.sim = !!on; if (speed) cfg.speed = speed;
      if (cfg.sim) startSim(); else resetAll();
      save(); refreshUI();
    }
    function setEnv(on) { cfg.autoEnv = !!on; lastMode = null; save(); refreshUI(); }
    function setLang(l) { cfg.lang = LANGS[l] ? l : "both"; save(); refreshUI(); }

    on(root, "click", e => {
      const a = e.target.closest && e.target.closest("[data-a]"); if (!a) return;
      unlock();
      switch (a.dataset.a) {
        case "voice": setVoice(!cfg.voice); break;
        case "lang": setLang(cfg.lang === "both" ? "en" : cfg.lang === "en" ? "ta" : "both"); break;
        case "auto": setAuto(!cfg.auto); break;
        case "sim": { const n = !cfg.sim ? 30 : cfg.speed === 30 ? 60 : cfg.speed === 60 ? 120 : 0; if (n) setSim(true, n); else setSim(false); break; }
        case "env": setEnv(!cfg.autoEnv); break;
        case "now": announceNext(); break;
        case "tour": tour(); break;
      }
    });
    on(q("vol"), "input", e => { cfg.volume = +e.target.value; save(); });

    const markBusy = () => { if (!synth) busyUntil = Date.now() + 8000; };
    on(stage, "pointerdown", () => { if (cfg.voice) unlock(); markBusy(); }, true);
    on(stage, "wheel", markBusy, { passive: true, capture: true });
    on(stage, "keydown", e => {
      if (e.target.closest && e.target.closest(".vc")) return;
      if (!synth) { markBusy(); if (cfg.voice) unlock(); }
      if (e.key === "v" || e.key === "V") setVoice(!cfg.voice);
      else if (e.key === "a" || e.key === "A") announceNext();
    }, true);

    function detach() {
      dead = true; clearInterval(tickT);
      T.forEach(clearTimeout); T.clear(); off.forEach(f => f());
      try { if (canSpeak) speechSynthesis.cancel(); } catch (e) {}
      try { if (actx) actx.close(); } catch (e) {}
      root.remove(); A = null;
    }
    A = {
      detach: detach, say: say, compose: compose, announceNext: announceNext, tour: tour, setVoice: setVoice, setAuto: setAuto,
      setSim: setSim, setEnv: setEnv, setLang: setLang, refresh: refreshUI,
      stop: () => { cancelSpeech(); banner.hidden = true; root.classList.remove("bva-speaking"); paIdle(); },
      status: () => { loadV(); const t = pickTa(), e = pickEn(); return { tamil: t ? t.name + " (" + t.lang + ")" : null, english: e ? e.name + " (" + e.lang + ")" : null, total: voices.length, lang: cfg.lang }; },
      voices: () => { loadV(); return voices.map(x => x.name + " | " + x.lang); }
    };

    const od = B.dispose;
    B.dispose = function () { detach(); B.dispose = od; if (od) return od.apply(B, arguments); };

    refreshUI();
    if (cfg.auto && B.setLive) B.setLive(false);
    if (cfg.sim) startSim();
    tickT = setInterval(tick, 500);
    later(() => { armed = true; tick(); }, 3500);   // let the buses roll in first
  }

  /* ---------- public API ---------- */
  const oInit = B.init;
  B.init = function (stage, routes, onPick) {
    const ok = oInit.apply(B, arguments);
    if (ok) attach(stage, routes, onPick);
    return ok;
  };
  V.config = o => { Object.assign(cfg, o || {}); save(); if (A) A.refresh(); return cfg; };
  V.announce = (id, type) => { if (A) A.say(A.compose(type || "info", id, 1)); };
  V.announceNext = () => A && A.announceNext();
  V.tour = () => A && A.tour();
  V.speak = (en, ta) => { if (A) A.say({ type: "custom", ico: "\ud83d\udce2", label: "Announcement", chip: "", en: en || "", ta: ta || en || "" }); };
  V.setVoice = on => A && A.setVoice(on);
  V.setLang = l => A && A.setLang(l);
  V.setAuto = on => A && A.setAuto(on);
  V.setSim = (on, speed) => A && A.setSim(on, speed);
  V.setEnv = on => A && A.setEnv(on);
  V.stop = () => A && A.stop();
  V.status = () => A && A.status();          // { tamil, english, total, lang }  -> tamil is null if no Tamil voice is installed
  V.voices = () => A && A.voices();          // list every voice the browser offers
  V.testTamil = () => { if (A) { V.setLang("both"); A.say({ type: "custom", ico: "\ud83d\udce2", label: "Test", chip: "", en: "This is a Tamil and English voice test.", ta: "\u0b87\u0ba4\u0bc1 \u0ba4\u0bae\u0bbf\u0bb4\u0bcd \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd \u0b86\u0b99\u0bcd\u0b95\u0bbf\u0bb2 \u0b95\u0bc1\u0bb0\u0bb2\u0bcd \u0b9a\u0bcb\u0ba4\u0ba9\u0bc8." }); } };
  B.Voice = V;
})();
