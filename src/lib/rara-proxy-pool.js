// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════
// rara-proxy-pool.js — Proxy pool OTOMATIS buat yt-dlp (feat .play)
//
// REQUEST OWNER 6 Okt 2026: "biar fitur play gak kelimit krna keblock IP dr
// youtubenya, bisa ga tiap mau run kepasang proxy random kyk https, socks4,
// socks5 otomatis tanpa hrs ngambil cookies yg ribet diakalin" + "ngandelin
// pakai https://github.com/sheng1111/Proxy-Hunter biar gak hrs ganti-ganti
// cookies tiap keblokir".
//
// Skema PORT dari Proxy-Hunter (sheng1111/Proxy-Hunter, MIT):
//   1. Sumber proxy gratis 15+ — dipakai yang berbasis teks/JSON (stabil):
//      proxyscrape v4 (alive-labeled, via scraper rara sendiri) + raw GitHub
//      TheSpeedX & monosans (http/socks4/socks5) + proxyscrape v2 plain.
//   2. Validasi SOCKET-LEVEL ala Proxy-Hunter (bukan cuma TCP connect):
//      - http  : kirim GET absolut-URI lewat proxy → harus balas HTTP/2xx/3xx
//      - socks4: handshake CONNECT (VN 4, CD 0x01) → balasan CD 0x5A (granted)
//      - socks5: greeting no-auth (05 01 00) + CONNECT → REP 0x00 (succeeded)
//   3. Blacklist cerdas: proxy gagal dipindah ke daftar dead (TTL 3 jam),
//      yang sukses disegarkan (TTL 20 menit) — rotasi LRU biar gak nyandera
//      satu IP yang ujungnya keblokir YouTube juga.
//
// SATU PINTU: rara-ytdlp.js manggil acquireAutoProxy() tiap mau run,
// reportProxyResult() setelah tau hasilnya. Manual proxy (env NOVA_YTDLP_PROXY
// / data/yt-proxy.txt / .ytproxy) TETAP prioritas #1 — pool cuma jalan kalau
// manual gak dipasang. Pool TIDAK PERNAH throw (best-effort; gagal → null →
// yt-dlp jalan langsung kayak biasa).
import fs from "fs";
import path from "path";
import net from "node:net";
import dns from "node:dns";

// ── konstanta ─────────────────────────────────────────────────────────────
const STATE_FILE = path.join(process.cwd(), "data", "yt-proxy-pool.json");
const TOGGLE_FILE = path.join(process.cwd(), "data", "yt-auto-proxy.txt");
const OK_TTL_MS = 20 * 60 * 1000;      // proxy terbukti hidup dianggap segar 20 mnt
const DEAD_TTL_MS = 3 * 60 * 60 * 1000; // proxy mati diblacklist 3 jam
const LIST_CACHE_MS = 10 * 60 * 1000;  // daftar kandidat di-fetch ulang tiap 10 mnt
const TCP_TIMEOUT_MS = 3500;
const BATCH_CONCURRENCY = 30;          // tes paralel ala Proxy-Hunter (50 → 30 hemat)
const MIN_POOL = 2;                    // cari minimal 2 hidup biar rotasi mulus
const MAX_OK = 12;                     // simpan maksimal 12 proxy hidup
const DEFAULT_DEADLINE_MS = 20000;     // budget max acquire per run .play

// target validasi ala Proxy-Hunter TEST_URLS — gstatic 204 ringan & stabil,
// plus kalau proxy bisa nyampe Google infra, peluang lolos ke YouTube lebih bagus.
const TEST_HOST = "www.gstatic.com";
const TEST_PORT = 80;
const FALLBACK_TEST_IP = "142.250.194.99"; // kalau DNS gagal (env restriktif)

// sumber raw ala Proxy-Hunter PROXY_SOURCES (yang teks/JSON aja — HTML scrape
// seperti spys.one/hidemy.name sengaja gak di-port: rapuh & pelit hasil)
const RAW_SOURCES = [
  { url: "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt", proto: "http" },
  { url: "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt", proto: "socks4" },
  { url: "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt", proto: "socks5" },
  { url: "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt", proto: "http" },
  { url: "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt", proto: "socks4" },
  { url: "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt", proto: "socks5" },
  { url: "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt", proto: "http" },
];

// tiebreaker protokol saat LRU sama-t (http diseganin — socks butuh PySocks
// terpasang di python yt-dlp; kalo socks gagal nanti di-blacklist otomatis
// oleh reportProxyResult dan pool geser ke yang lain)
const PROTO_PRIO = { http: 0, https: 0, socks5: 1, socks4: 2 };

// ── seams e2e ─────────────────────────────────────────────────────────────
let _fetchForTest = undefined;   // function(url) → Promise<string>
let _netForTest = undefined;     // { connect(opts) → socket-like }
let _stateFileForTest = undefined; // override path state file
let _v4ForTest = undefined;      // function() → Promise<array> (proxyscrape v4)
export function _setPoolFetchForTest(fn) { _fetchForTest = fn; }
export function _setPoolNetForTest(n) { _netForTest = n; }
export function _setPoolStateFileForTest(p) { _stateFileForTest = p; }
export function _setPoolV4ForTest(fn) { _v4ForTest = fn; }

const _fetchText = async (url, timeoutMs = 8000) => {
  if (typeof _fetchForTest === "function") return _fetchForTest(url);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36" } });
    if (!res.ok) return "";
    return await res.text();
  } catch { return ""; } finally { clearTimeout(t); }
};

// ── toggle on/off (default ON) ──────────────────────────────────────────────
export function isAutoProxyOn() {
  try {
    if (process.env.RARA_YT_AUTO_PROXY === "0") return false;
    const f = _stateFileForTest ? TOGGLE_FILE : TOGGLE_FILE;
    if (fs.existsSync(f)) {
      const v = fs.readFileSync(f, "utf8").trim();
      if (v === "0" || /^off$/i.test(v)) return false;
    }
  } catch {}
  return true;
}

export function setAutoProxyOn(on) {
  try {
    fs.mkdirSync(path.dirname(TOGGLE_FILE), { recursive: true });
    fs.writeFileSync(TOGGLE_FILE, on ? "1" : "0");
    return true;
  } catch { return false; }
}

// ── state pool (persist) ────────────────────────────────────────────────────
let _stateCache = null;
function _statePath() { return _stateFileForTest || STATE_FILE; }
function loadState() {
  if (_stateCache) return _stateCache;
  try {
    _stateCache = JSON.parse(fs.readFileSync(_statePath(), "utf8"));
  } catch { _stateCache = null; }
  _stateCache = _stateCache && typeof _stateCache === "object" ? _stateCache : {};
  _stateCache.ok = Array.isArray(_stateCache.ok) ? _stateCache.ok : [];
  _stateCache.dead = Array.isArray(_stateCache.dead) ? _stateCache.dead : [];
  return _stateCache;
}
function saveState(st) {
  try { fs.mkdirSync(path.dirname(_statePath()), { recursive: true }); fs.writeFileSync(_statePath(), JSON.stringify(st)); } catch {}
}

function pruneState(st, now = Date.now()) {
  st.ok = (st.ok || []).filter((e) => e && e.u && now - (e.t || 0) < OK_TTL_MS);
  st.dead = (st.dead || []).filter((e) => e && e.u && now - (e.t || 0) < DEAD_TTL_MS);
}

// ── kandidat: fetch semua sumber ────────────────────────────────────────────
const _listCache = { at: 0, urls: [] };

async function fetchCandidates({ useCache = true } = {}) {
  const now = Date.now();
  if (useCache && _listCache.urls.length && now - _listCache.at < LIST_CACHE_MS) return _listCache.urls;

  const urls = new Set();
  const deadNow = new Set((loadState().dead || []).map((e) => e.u));

  // 1. ProxyScrape v4 alive-labeled (sumber terkuat — udah dicek service-nya;
  //    lewat scraper rara sendiri biar satu gaya cache/error)
  try {
    const alive = typeof _v4ForTest === "function"
      ? await _v4ForTest()
      : (await import("../scraper/proxyscrape.js")).fetchProxies({ protocol: "http,socks4,socks5" });
    for (const p of alive) {
      if (p && p.addr) {
        const u = /:\/\//.test(p.addr) ? p.addr : "http://" + p.addr;
        if (!deadNow.has(u)) urls.add(u);
      }
    }
  } catch {}

  // 2. raw GitHub lists (TheSpeedX/monosans/clarketm — ala Proxy-Hunter)
  const raws = await Promise.all(RAW_SOURCES.map(async (s) => {
    const txt = await _fetchText(s.url);
    const out = [];
    for (const line of txt.split("\n")) {
      const m = line.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{2,5})$/);
      if (m) out.push(s.proto + "://" + m[1] + ":" + m[2]);
    }
    return out;
  }));
  for (const list of raws) for (const u of list) if (!deadNow.has(u)) urls.add(u);

  _listCache.at = now;
  _listCache.urls = [...urls];
  return _listCache.urls;
}

// ── validasi socket-level (port Proxy-Hunter _check_proxy_socket) ──────────
let _testIp = null;
async function resolveTestIp() {
  if (_testIp) return _testIp;
  try { _testIp = (await dns.promises.lookup(TEST_HOST)).address; } catch { _testIp = FALLBACK_TEST_IP; }
  return _testIp;
}

function parseProxyUrl(u) {
  try {
    const m = String(u).match(/^(https?|socks[45]):\/\/([^\/:]+):(\d{2,5})$/i);
    if (m) return { proto: m[1].toLowerCase(), host: m[2], port: +m[3] };
    const b = String(u).match(/^([^\/:]+):(\d{2,5})$/);
    if (b) return { proto: "http", host: b[1], port: +b[2] };
  } catch {}
  return null;
}

/**
 * Validasi SATU proxy — socket-level per protokol (ala Proxy-Hunter):
 * http = GET lewat proxy harus balas HTTP 2xx/3xx; socks4 = CONNECT harus
 * di-grant (CD 0x5A); socks5 = greeting+CONNECT harus REP 0x00.
 * @returns {Promise<number|null>} latency ms kalau valid, null kalau mati
 */
export async function validateProxy(u) {
  const p = parseProxyUrl(u);
  if (!p) return null;
  const netLib = _netForTest || net;
  if (typeof netLib.connect !== "function") return null;
  const t0 = Date.now();
  return await new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; try { sock.destroy(); } catch {} resolve(v); } };
    let sock;
    try { sock = netLib.connect({ host: p.host, port: p.port, timeout: TCP_TIMEOUT_MS }); }
    catch { return resolve(null); }
    if (!sock || typeof sock.write !== "function") return resolve(null);
    let buf = Buffer.alloc(0);
    const fail = () => done(null);
    sock.on("connect", async () => {
      try {
        if (p.proto === "http" || p.proto === "https") {
          sock.write(
            `GET http://${TEST_HOST}/generate_204 HTTP/1.1\r\nHost: ${TEST_HOST}\r\n` +
            `User-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`
          );
        } else if (p.proto === "socks4") {
          const ip = await resolveTestIp();
          const portBuf = Buffer.from([(TEST_PORT >> 8) & 0xff, TEST_PORT & 0xff]);
          const ipBuf = Buffer.from(ip.split(".").map((x) => +x & 0xff));
          sock.write(Buffer.concat([Buffer.from([0x04, 0x01]), portBuf, ipBuf, Buffer.from([0x00])]));
        } else {
          // socks5: greeting no-auth
          sock.write(Buffer.from([0x05, 0x01, 0x00]));
        }
      } catch { fail(); }
    });
    sock.on("data", async (d) => {
      buf = Buffer.concat([buf, d]);
      try {
        if (p.proto === "http" || p.proto === "https") {
          if (buf.length >= 4 && /^HTTP\/\d/.test(buf.toString("latin1").slice(0, 8))) {
            const m = buf.toString("latin1").match(/^HTTP\/[\d.]+\s+(\d{3})/);
            if (m && +m[1] >= 200 && +m[1] < 400) done(Date.now() - t0);
            else fail();
          }
        } else if (p.proto === "socks4") {
          if (buf.length >= 2) {
            if (buf[0] === 0x00 && buf[1] === 0x5a) done(Date.now() - t0);
            else fail();
          }
        } else {
          // socks5 dua tahap
          if (buf.length >= 2 && buf[0] === 0x05) {
            if (buf[1] === 0xff) return fail(); // gak ada metode no-auth
            if (buf[1] === 0x00 && !sock._raraConnected) {
              sock._raraConnected = true;
              const ip = await resolveTestIp();
              const portBuf = Buffer.from([(TEST_PORT >> 8) & 0xff, TEST_PORT & 0xff]);
              const ipBuf = Buffer.from(ip.split(".").map((x) => +x & 0xff));
              sock.write(Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x01]), ipBuf, portBuf]));
            } else if (buf[1] === 0x00 && sock._raraConnected) {
              done(Date.now() - t0);
            } else if (buf[1] !== 0x00) fail();
          } else fail();
        }
      } catch { fail(); }
    });
    sock.on("error", fail);
    sock.on("timeout", fail);
    sock.on("close", () => { if (!settled) done(null); });
    // jaga-jaga: total budget per proxy 6 detik
    setTimeout(fail, 6000);
  });
}

// ── validasi batch sampai ketemu / deadline ────────────────────────────────
async function validateBatch(list, { deadlineMs, minFound }) {
  const t0 = Date.now();
  const found = [];
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length && found.length < minFound; i += BATCH_CONCURRENCY) {
    if (Date.now() - t0 > deadlineMs) break;
    const slice = shuffled.slice(i, i + BATCH_CONCURRENCY);
    const results = await Promise.all(slice.map(async (u) => {
      const ms = await validateProxy(u);
      return ms === null ? null : { u, ms };
    }));
    for (const r of results) if (r) found.push(r);
  }
  return found;
}

// ── API UTAMA ──────────────────────────────────────────────────────────────

/**
 * Ambil proxy hidup buat dipakai run ini (rotasi LRU — proxy paling lama gak
 * dipakai dikasih duluan, biar beban tersebar & gak cepet keblokir YouTube).
 * TIDAK PERNAH throw — gagal total → null (yt-dlp jalan langsung).
 * @param {object} [opts] - { deadlineMs }
 * @returns {Promise<string|null>} URL proxy (http://|socks4://|socks5://)
 */
export async function acquireAutoProxy(opts = {}) {
  try {
    if (!isAutoProxyOn()) return null;
    const deadlineMs = Number(opts.deadlineMs) > 0 ? Number(opts.deadlineMs) : DEFAULT_DEADLINE_MS;
    const now = Date.now();
    const st = loadState();
    pruneState(st, now);

    if (st.ok.length) {
      // rotasi LRU MURNI: proxy yang paling lama gak dipakai keluar duluan —
      // tiap run ganti IP (inti request owner). Protokol cuma tiebreaker
      // buat kandidat baru yang t-nya sama (http diseganin duluan).
      st.ok.sort((a, b) => (a.t || 0) - (b.t || 0) || (PROTO_PRIO[a.u.split("://")[0]] ?? 9) - (PROTO_PRIO[b.u.split("://")[0]] ?? 9));
      saveState(st);
      return st.ok[0].u;
    }

    // pool kosong → cari kandidat baru
    const candidates = await fetchCandidates();
    const deadNow = new Set(st.dead.map((e) => e.u));
    const fresh = candidates.filter((u) => !deadNow.has(u));
    if (!fresh.length) return null;

    const found = await validateBatch(fresh, { deadlineMs, minFound: MIN_POOL });
    for (const f of found) st.ok.push({ u: f.u, t: now, ms: f.ms });
    // jaga ukuran state
    st.ok.sort((a, b) => (a.t || 0) - (b.t || 0) || (PROTO_PRIO[a.u.split("://")[0]] ?? 9) - (PROTO_PRIO[b.u.split("://")[0]] ?? 9));
    st.ok = st.ok.slice(0, MAX_OK);
    saveState(st);
    return st.ok.length ? st.ok[0].u : null;
  } catch (e) {
    try { console.error("[rara-proxy-pool] acquireAutoProxy error:", e && e.message); } catch {}
    return null;
  }
}

/**
 * Lapor hasil pemakaian proxy — sukses → segarkan TTL (dipercaya 20 mnt lagi),
 * gagal → blacklist 3 jam biar gak diambil lagi.
 * @param {string} u - URL proxy yang barusan dipakai
 * @param {boolean} ok - true kalau yt-dlp sukses lewat proxy ini
 */
export function reportProxyResult(u, ok) {
  try {
    if (!u) return;
    const now = Date.now();
    const st = loadState();
    pruneState(st, now);
    if (ok) {
      const e = st.ok.find((x) => x.u === u);
      if (e) e.t = now;
      else if (st.ok.length < MAX_OK) st.ok.push({ u, t: now, ms: 0 });
    } else {
      st.ok = st.ok.filter((x) => x.u !== u);
      if (!st.dead.some((x) => x.u === u)) st.dead.push({ u, t: now });
      if (st.dead.length > 500) st.dead = st.dead.slice(-500);
    }
    saveState(st);
  } catch {}
}

/**
 * Statistik pool buat .ytproxy status.
 */
export function getAutoProxyStats() {
  try {
    const now = Date.now();
    const st = loadState();
    pruneState(st, now);
    const byProto = {};
    for (const e of st.ok) {
      const p = e.u.split("://")[0];
      byProto[p] = (byProto[p] || 0) + 1;
    }
    return {
      on: isAutoProxyOn(),
      ok: st.ok.map((e) => e.u),
      okCount: st.ok.length,
      deadCount: st.dead.length,
      byProto,
    };
  } catch {
    return { on: isAutoProxyOn(), ok: [], okCount: 0, deadCount: 0, byProto: {} };
  }
}

/** reset pool (buat .ytproxy auto reset / testing) */
export function resetAutoProxyPool() {
  try {
    _stateCache = null;
    _listCache.at = 0; _listCache.urls = [];
    fs.rmSync(_statePath(), { force: true });
    return true;
  } catch { return false; }
}
