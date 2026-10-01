// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// src/lib/rara-dashboard.js — MINI DASHBOARD OWNER (WEB) — fitur "bot masa depan" no.5
//
// Dashboard web ringan buat owner: stat system + bot + user + aktivitas + kesehatan
// fitur dalam satu halaman, auto-refresh tiap 5 detik. Server HTTP murni Node
// (TANPA dependensi baru — pola sama kayak rara-web-server.js, TAPI beda dua
// hal penting: (1) TOKEN AUTH wajib — data owner jangan publik; (2) port sendiri,
// gak nyampur sama Rara Live 8080 biar dashboard bisa dimatiin sendiri).
//
// Route (semua butuh token, kecuali root tanpa token → halaman minta token):
//   GET /?token=<t>          → halaman dashboard (HTML statis + fetch /api/stats)
//   GET /api/stats?token=<t> → JSON stat lengkap
//   GET /api/pulse?token=<t> → JSON kecil (heartbeat murah buat polling)
//
// Config persist di db.setting("dashboard") = { token, port, enabled } —
// token dibuat otomatis pas pertama kali (crypto random), gak pernah dikommit.
// Urutan aman (skill 5.2): validasi config DULU baru bind server; port sibuk →
// warning console, bot TIDAK crash (pola rara-web-server).
//
// Keamanan:
// - token dibanding timingSafeEqual lewat sha256 (length-safe, anti timing leak)
// - HTML statis murni — semua data masuk via textContent (anti-XSS), gak ada
//   CDN/asset eksternal (jalan di VPS tanpa internet pun tetap hidup)
// - header: X-Content-Type-Options + CSP ketat + no-cache buat data
//
// Plugin: plugins/owner/dashboard.js (.dashboard — owner-only)
// Scheduler: index.js schedulerInits "Dashboard"

import http from "node:http";
import os from "node:os";
import crypto from "node:crypto";
import { getDatabase } from "./rara-database.js";
import { getBootDoctorStatus } from "./rara-boot-doctor.js";
import { config } from "../../config.js";
import { logger } from "./rara-logger.js";

let _server = null;
let _sock = null;
const SETTING_KEY = "dashboard";
const DEFAULT_PORT = 8081;

// ── config persist ──────────────────────────────────────────────────────────
function ensureDashboardConfig() {
  const db = getDatabase();
  let cfg = db.setting(SETTING_KEY);
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) cfg = {};
  let dirty = false;
  if (typeof cfg.token !== "string" || !/^[a-f0-9]{32,64}$/.test(cfg.token)) {
    cfg.token = crypto.randomBytes(24).toString("hex");
    dirty = true;
  }
  if (!Number.isInteger(cfg.port) || cfg.port < 1 || cfg.port > 65535) {
    cfg.port = Number(process.env.NOVA_DASH_PORT) || DEFAULT_PORT;
    dirty = true;
  }
  if (typeof cfg.enabled !== "boolean") {
    cfg.enabled = true;
    dirty = true;
  }
  if (dirty) db.setting(SETTING_KEY, cfg);
  return cfg;
}

// ── token auth (timing-safe via sha256) ────────────────────────────────────
function sha256(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest();
}

function tokenOk(provided, real) {
  if (!provided || typeof provided !== "string") return false;
  const a = sha256(provided);
  const b = sha256(real);
  return crypto.timingSafeEqual(a, b);
}

function extractToken(req, url) {
  // urutan: header bearer → basic → query token
  const auth = req.headers.authorization || "";
  if (/^Bearer /i.test(auth)) return auth.replace(/^Bearer /i, "").trim();
  if (/^Basic /i.test(auth)) {
    try {
      const dec = Buffer.from(auth.slice(6), "base64").toString("utf8");
      const i = dec.indexOf(":");
      return i >= 0 ? dec.slice(i + 1) : dec;
    } catch { return ""; }
  }
  return url.searchParams.get("token") || "";
}

// ── stat builder ───────────────────────────────────────────────────────────
// Semua pembacaan db defensif: struktur rusak/missing → 0 / "-", gak throw
// (dashboard jangan pernah bikin bot crash).
function buildDashboardStats() {
  const db = getDatabase();
  const cfg = ensureDashboardConfig();

  // system
  const totalGb = os.totalmem() / 1024 ** 3;
  const freeGb = os.freemem() / 1024 ** 3;
  const usedGb = totalGb - freeGb;
  const cores = os.cpus().length || 1;
  const load1 = os.loadavg()[0] || 0;
  const mem = process.memoryUsage();

  // db counts — defensif semua
  const safeKeys = (o) => (o && typeof o === "object") ? Object.keys(o).length : 0;
  const d = db.data || {};
  const users = safeKeys(d.users);
  const groups = safeKeys(d.groups);
  const premium = Array.isArray(d.premium) ? d.premium.length : safeKeys(d.premium);
  const sewaGroups = (d.sewa && typeof d.sewa.groups === "object") ? safeKeys(d.sewa.groups) : 0;
  const chatHistory = safeKeys(d.chathistory);

  // stat counter (pola incrementStat: messagesSent/messagesReceived/dll)
  const st = (d.stats && typeof d.stats === "object") ? d.stats : {};
  const stat = (k) => (typeof st[k] === "number" ? st[k] : 0);

  // boot doctor (hasil cek terakhir yang disimpan di settings — gak nge-probe
  // ulang tiap refresh, murah; owner jalanin .bootdoctor buat cek baru)
  let boot = { ok: null, summary: "-", lastRun: null };
  try {
    const st = getBootDoctorStatus();
    const sum = typeof st.lastSummary === "string" ? st.lastSummary : "";
    boot = {
      ok: st.lastRun ? (sum === "semua sehat" || !sum) : null,
      summary: sum || "-",
      lastRun: st.lastRun || null,
    };
  } catch { /* boot doctor state rusak → default jujur */ }

  return {
    ok: true,
    time: Date.now(),
    bot: {
      name: config.bot?.name || "Rara AI",
      version: config.bot?.version || "-",
      waStatus: _sock?.user?.id ? "tersambung" : "belum tersambung",
      waJid: _sock?.user?.id || "-",
      platform: `${os.type()} ${os.release()} • ${cores} core`,
      node: process.version,
    },
    system: {
      uptimeSec: Math.floor(process.uptime()),
      ramPct: totalGb > 0 ? Math.min(100, Math.round((usedGb / totalGb) * 100)) : 0,
      ramUsedGb: Number(usedGb.toFixed(1)),
      ramTotalGb: Number(totalGb.toFixed(1)),
      loadPct: Math.min(100, Math.round((load1 / cores) * 100)),
      heapMb: Number((mem.heapUsed / 1024 ** 2).toFixed(1)),
      rssMb: Number((mem.rss / 1024 ** 2).toFixed(1)),
    },
    users: { users, groups, premium, sewaGroups, chatHistory },
    activity: {
      messagesSent: stat("messagesSent"),
      messagesReceived: stat("messagesReceived"),
      scheduledSent: stat("scheduledMessagesSent"),
      dailyResets: stat("dailyResets"),
    },
    health: boot,
    dashboard: { port: cfg.port, enabled: cfg.enabled },
  };
}

// ── halaman HTML (statis, data via fetch + textContent → anti-XSS) ─────────
const DASH_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Rara Owner Dashboard</title>
<style>
  :root { --bg:#0b0f14; --card:#121821; --line:#1e2836; --txt:#dbe4ef; --dim:#7d8ba0; --acc:#4da3ff; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--txt); font:15px/1.5 ui-monospace,Menlo,Consolas,monospace; padding:16px; }
  h1 { font-size:17px; letter-spacing:.5px; margin-bottom:2px; }
  .sub { color:var(--dim); font-size:12px; margin-bottom:14px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:10px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
  .card h2 { font-size:12px; color:var(--dim); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  .row { display:flex; justify-content:space-between; gap:8px; padding:2px 0; font-size:13px; }
  .row b { font-weight:600; color:var(--txt); text-align:right; word-break:break-all; }
  .bar { height:6px; background:var(--line); border-radius:3px; margin-top:6px; overflow:hidden; }
  .bar i { display:block; height:100%; background:var(--acc); border-radius:3px; }
  .warn { color:#ffb454; }
  .err  { color:#ff6b6b; }
  .ok   { color:#5dd39e; }
  #gate { max-width:380px; margin:15vh auto; text-align:center; }
  #gate input { width:100%; padding:10px; border-radius:8px; border:1px solid var(--line); background:var(--card); color:var(--txt); font:inherit; }
  #gate button { margin-top:10px; padding:10px 22px; border:0; border-radius:8px; background:var(--acc); color:#06121f; font:inherit; font-weight:700; cursor:pointer; }
  #err { color:#ff6b6b; font-size:12px; margin-top:8px; min-height:1em; }
</style>
</head>
<body>
<div id="gate" hidden>
  <h1>Rara Owner Dashboard</h1>
  <p class="sub">masukkan token (lihat: .dashboard token di DM bot)</p>
  <input id="tok" type="password" placeholder="token" autocomplete="off">
  <button id="go">masuk</button>
  <div id="err"></div>
</div>
<div id="app" hidden>
  <h1>Rara Owner Dashboard</h1>
  <div class="sub" id="stamp"></div>
  <div class="grid">
    <div class="card"><h2>System</h2>
      <div class="row"><span>uptime</span><b id="s-uptime">-</b></div>
      <div class="row"><span>ram</span><b id="s-ram">-</b></div>
      <div class="bar"><i id="s-rambar" style="width:0"></i></div>
      <div class="row"><span>load</span><b id="s-load">-</b></div>
      <div class="row"><span>heap / rss</span><b id="s-heap">-</b></div>
    </div>
    <div class="card"><h2>Bot</h2>
      <div class="row"><span>nama</span><b id="b-name">-</b></div>
      <div class="row"><span>versi</span><b id="b-ver">-</b></div>
      <div class="row"><span>wa</span><b id="b-wa">-</b></div>
      <div class="row"><span>nomor</span><b id="b-jid">-</b></div>
      <div class="row"><span>node</span><b id="b-node">-</b></div>
      <div class="row"><span>platform</span><b id="b-plat">-</b></div>
    </div>
    <div class="card"><h2>User &amp; Grup</h2>
      <div class="row"><span>user terdaftar</span><b id="u-users">-</b></div>
      <div class="row"><span>grup</span><b id="u-groups">-</b></div>
      <div class="row"><span>premium</span><b id="u-prem">-</b></div>
      <div class="row"><span>grup sewa</span><b id="u-sewa">-</b></div>
      <div class="row"><span>chat histori</span><b id="u-chat">-</b></div>
    </div>
    <div class="card"><h2>Aktivitas</h2>
      <div class="row"><span>pesan terkirim</span><b id="a-sent">-</b></div>
      <div class="row"><span>pesan masuk</span><b id="a-recv">-</b></div>
      <div class="row"><span>pesan terjadwal</span><b id="a-sched">-</b></div>
      <div class="row"><span>reset harian</span><b id="a-reset">-</b></div>
    </div>
    <div class="card"><h2>Kesehatan Fitur</h2>
      <div class="row"><span>status</span><b id="h-ok">-</b></div>
      <div class="row"><span>cek terakhir</span><b id="h-run">-</b></div>
      <div class="row"><span>ringkasan</span><b id="h-sum">-</b></div>
    </div>
  </div>
</div>
<script>
(function () {
  var tok = new URLSearchParams(location.search).get("token") || "";
  if (!tok) {
    try { tok = localStorage.getItem("raraDashTok") || ""; } catch (e) {}
  }
  var gate = document.getElementById("gate");
  var app = document.getElementById("app");
  function showGate() { gate.hidden = false; app.hidden = true; }
  function set(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  function fmtUptime(s) {
    s = Math.max(0, Math.floor(s));
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return (d ? d + "h " : "") + h + "j " + m + "m";
  }
  function fmtNum(n) { try { return Number(n).toLocaleString("id-ID"); } catch (e) { return String(n); } }
  function fmtTime(ms) {
    try { return new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"; }
    catch (e) { return "-"; }
  }
  function render(s) {
    set("s-uptime", fmtUptime(s.system.uptimeSec));
    set("s-ram", s.system.ramUsedGb + " / " + s.system.ramTotalGb + " GB (" + s.system.ramPct + "%)");
    document.getElementById("s-rambar").style.width = Math.min(100, s.system.ramPct) + "%";
    set("s-load", s.system.loadPct + "%");
    set("s-heap", s.system.heapMb + " / " + s.system.rssMb + " MB");
    set("b-name", s.bot.name); set("b-ver", s.bot.version);
    set("b-wa", s.bot.waStatus); set("b-jid", s.bot.waJid);
    set("b-node", s.bot.node); set("b-plat", s.bot.platform);
    set("u-users", fmtNum(s.users.users)); set("u-groups", fmtNum(s.users.groups));
    set("u-prem", fmtNum(s.users.premium)); set("u-sewa", fmtNum(s.users.sewaGroups));
    set("u-chat", fmtNum(s.users.chatHistory));
    set("a-sent", fmtNum(s.activity.messagesSent)); set("a-recv", fmtNum(s.activity.messagesReceived));
    set("a-sched", fmtNum(s.activity.scheduledSent)); set("a-reset", fmtNum(s.activity.dailyResets));
    var h = s.health || {};
    var hEl = document.getElementById("h-ok");
    if (hEl) {
      hEl.textContent = h.ok === null ? "belum ada cek" : (h.ok ? "sehat" : "ada masalah");
      hEl.className = h.ok === null ? "" : (h.ok ? "ok" : "err");
    }
    set("h-run", h.lastRun ? fmtTime(h.lastRun) : "-");
    set("h-sum", String(h.summary == null ? "-" : h.summary).slice(0, 120));
    set("stamp", "data live — diperbarui otomatis tiap 5 detik • " + fmtTime(s.time));
  }
  function load() {
    if (!tok) { showGate(); return Promise.resolve(); }
    return fetch("/api/stats?token=" + encodeURIComponent(tok), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (s) {
        gate.hidden = true; app.hidden = false;
        try { localStorage.setItem("raraDashTok", tok); } catch (e) {}
        render(s);
      })
      .catch(function (e) {
        showGate();
        var el = document.getElementById("err");
        if (el) el.textContent = "token salah / server restart — coba lagi (" + e.message + ")";
      });
  }
  document.getElementById("go").addEventListener("click", function () {
    var v = document.getElementById("tok").value.trim();
    if (v) { tok = v; load(); }
  });
  document.getElementById("tok").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("go").click();
  });
  load();
  setInterval(load, 5000);
})();
</script>
</body>
</html>`;

function gatePage() {
  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<title>Rara Owner Dashboard</title>
<style>body{background:#0b0f14;color:#dbe4ef;font:15px ui-monospace,monospace;display:grid;place-items:center;height:100vh;margin:0}p{opacity:.7}</style>
</head><body><div><h2>Rara Owner Dashboard</h2><p>token wajib — buka <code>/?token=...</code> (lihat: .dashboard token di DM bot)</p></div></body></html>`;
}

// ── server ─────────────────────────────────────────────────────────────────
function handleReq(req, res) {
  const cfg = ensureDashboardConfig();
  const url = new URL(req.url, "http://localhost");
  const tok = extractToken(req, url);

  if (!tokenOk(tok, cfg.token)) {
    res.writeHead(401, { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
    res.end(gatePage());
    return;
  }

  const secure = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    "Referrer-Policy": "no-referrer",
  };

  if (req.method !== "GET") {
    res.writeHead(405, { ...secure, "Content-Type": "text/plain; charset=utf-8" });
    res.end("method not allowed");
    return;
  }

  if (url.pathname === "/api/stats") {
    try {
      const stats = buildDashboardStats();
      res.writeHead(200, { ...secure, "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(stats));
    } catch (e) {
      res.writeHead(500, { ...secure, "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "gagal bangun stat: " + (e?.message || e) }));
    }
    return;
  }

  if (url.pathname === "/api/pulse") {
    res.writeHead(200, { ...secure, "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, time: Date.now() }));
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { ...secure, "Content-Type": "text/html; charset=utf-8" });
    res.end(DASH_HTML);
    return;
  }

  res.writeHead(404, { ...secure, "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
}

/**
 * Start dashboard server. Idempotent: kalau udah jalan, return server yang sama.
 * Kalau config enabled=false → gak start (return null) — owner nyalain via
 * .dashboard on. Port sibuk → warning, bot gak crash (resolve null).
 */
async function initDashboardServer(sock) {
  if (sock) _sock = sock;
  if (_server && _server.listening) return _server;
  const cfg = ensureDashboardConfig();
  if (!cfg.enabled) {
    logger.info?.("dashboard", "dimatikan owner — pakai .dashboard on buat nyalain");
    return null;
  }
  if (_server) { try { _server.close(); } catch { /* sudah mati */ } _server = null; }
  _server = http.createServer(handleReq);
  return new Promise((resolve) => {
    const s = _server;
    s.once("error", (e) => {
      logger.error?.("dashboard", `gak bisa bind port ${cfg.port}: ${e.message} — dashboard dilewati, bot tetap jalan`);
      _server = null;
      resolve(null);
    });
    s.listen(cfg.port, "0.0.0.0", () => {
      logger.success?.("dashboard", `dashboard owner aktif di port ${cfg.port} — buka http://<ip-vps>:${cfg.port}/?token=<token>`);
      resolve(s);
    });
  });
}

function stopDashboardServer() {
  return new Promise((resolve) => {
    if (!_server) return resolve(true);
    const s = _server;
    _server = null;
    let done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      s.close(() => fin(true));
      // matiin koneksi idle biar close gak nunggu keep-alive
      s.closeAllConnections?.();
    } catch (e) {
      fin(false);
    }
    // safety: maksimal 3 detik nunggu close (skill 5.5: async harus terminate)
    setTimeout(() => fin(true), 3000);
  });
}

function getDashboardStatus() {
  const cfg = ensureDashboardConfig();
  return {
    ...cfg,
    running: Boolean(_server && _server.listening),
  };
}

function regenDashboardToken() {
  const db = getDatabase();
  const cfg = ensureDashboardConfig();
  cfg.token = crypto.randomBytes(24).toString("hex");
  db.setting(SETTING_KEY, cfg);
  return cfg.token;
}

/** validasi dulu (skill 5.2), baru simpan + restart server */
async function setDashboardPort(port) {
  const p = Number(port);
  if (!Number.isInteger(p) || p < 1 || p > 65535) {
    return { ok: false, msg: "port harus angka 1-65535" };
  }
  const db = getDatabase();
  const cfg = ensureDashboardConfig();
  cfg.port = p;
  db.setting(SETTING_KEY, cfg);
  if (cfg.enabled) {
    await stopDashboardServer();
    await initDashboardServer();
  }
  return { ok: true, msg: "port diganti ke " + p };
}

async function setDashboardEnabled(on) {
  const db = getDatabase();
  const cfg = ensureDashboardConfig();
  cfg.enabled = Boolean(on);
  db.setting(SETTING_KEY, cfg);
  if (!on) {
    await stopDashboardServer();
    return { ok: true, msg: "dimatikan" };
  }
  const s = await initDashboardServer();
  return { ok: Boolean(s), msg: s ? "dinyalakan di port " + cfg.port : "gagal start (port sibuk?)" };
}

// seam e2e — jangan dipakai di production
function _getDashboardServerForTest() { return _server; }
function _setDashboardSockForTest(s) { _sock = s; }
async function _resetDashboardForTest() {
  await stopDashboardServer();
  const db = getDatabase();
  db.setting(SETTING_KEY, undefined);
}

export {
  initDashboardServer,
  stopDashboardServer,
  getDashboardStatus,
  regenDashboardToken,
  setDashboardPort,
  setDashboardEnabled,
  buildDashboardStats,
  ensureDashboardConfig,
  _getDashboardServerForTest,
  _setDashboardSockForTest,
  _resetDashboardForTest,
};
