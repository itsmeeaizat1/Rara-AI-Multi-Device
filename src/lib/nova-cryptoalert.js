// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-cryptoalert.js — Crypto Price Alert: pasang target harga crypto,
// bot notif OTOMATIS ke chat pas harga kena (fitur baru 9 Sep 2026, request
// owner "fitur yg blm prnh ada di bot" — .crypto lama cuma cek harga manual).
//
// .cryptoalert <coin> <diatas|dibawah> <harga> — pasang alarm (harga IDR)
// .cryptoalert list | stop <no> | now | info
// One-shot: alarm kepenuh → notif → auto hapus. Satu alarm satu kali.
// Harga IDR via CoinGecko simple/price (batch per-tick, hemat rate limit).
// Global flag .switch auto cryptoalert (OFF = monitor pause, alarm tetap ada).
// fetcher injectable (setPriceFetcher/setCoinResolver) buat E2E offline.

import axios from "axios";
import fs from "fs";
import { mergeAutoTargets } from "./nova-auto-target.js";
import path from "path";
import { logger } from "./nova-logger.js";

const STATE_FILE = path.join(process.cwd(), "src", "database", "auto", "cryptoalert.json");

const CG_BASE = "https://api.coingecko.com/api/v3";
let lastApiWarnMs = 0; // rate-limit log peringatan API (v24.2.4)
const TICK_MS = 60 * 1000; // cek tiap 1 menit
const MAX_ALERTS_PER_CHAT = 5;

// alias sama dengan plugins/utility/crypto.js (konsisten)
const COIN_ALIASES = {
  btc: "bitcoin", eth: "ethereum", sol: "solana", bnb: "binancecoin",
  xrp: "ripple", ada: "cardano", doge: "dogecoin", dot: "polkadot",
  matic: "matic-network", avax: "avalanche-2", link: "chainlink",
  uni: "uniswap", atom: "cosmos", ltc: "litecoin", trx: "tron",
  shib: "shiba-inu", pepe: "pepe", usdt: "tether", usdc: "usd-coin", dai: "dai",
};

let sock = null;
let monitorTimer = null;
let priceFetcher = null; // injectable: async (ids[]) => { [id]: { idr: number } }
let coinResolver = null; // injectable: async (query) => { id, name, symbol } | null

export function setPriceFetcher(fn) { priceFetcher = fn; }
export function setCoinResolver(fn) { coinResolver = fn; }
export function setSock(_sock) { sock = _sock; }

// ------------------------------ state ------------------------------

function defaultState() {
  return { enabled: true, alerts: [] };
}

let state = defaultState();

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = { ...defaultState(), ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
    }
  } catch (e) {
    logger?.warn?.("[cryptoalert] state load gagal: " + e.message);
    state = defaultState();
  }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    logger?.warn?.("[cryptoalert] state save gagal: " + e.message);
  }
}

function newId() {
  return "ca-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}

// ------------------------------ fetch ------------------------------

async function fetchPrices(ids) {
  if (priceFetcher) return priceFetcher(ids);
  const res = await axios.get(`${CG_BASE}/simple/price`, {
    params: { ids: ids.join(","), vs_currencies: "idr", include_24hr_change: true },
    timeout: 15000,
  });
  return res.data || {};
}

async function resolveCoin(query) {
  const q = String(query || "").toLowerCase().trim();
  const directId = COIN_ALIASES[q] || q;
  if (coinResolver) return coinResolver(directId);

  // cek id langsung via simple/price (coin valid → balik harga)
  const p = await fetchPrices([directId]);
  if (p[directId]?.idr != null) {
    return { id: directId, name: directId, symbol: directId.toUpperCase(), currentPrice: p[directId].idr };
  }

  // fallback: search CoinGecko
  try {
    const res = await axios.get(`${CG_BASE}/search`, {
      params: { query: q },
      timeout: 15000,
    });
    const c = res.data?.coins?.[0];
    if (!c) return null;
    const p2 = await fetchPrices([c.id]);
    return {
      id: c.id,
      name: c.name,
      symbol: String(c.symbol || c.id).toUpperCase(),
      currentPrice: p2[c.id]?.idr,
    };
  } catch {
    return null;
  }
}

// ------------------------------ API ------------------------------

export function parseTarget(raw) {
  if (raw == null) return NaN;
  let s = String(raw).toLowerCase().trim().replace(/rp/g, "").replace(/\s/g, "");
  let mult = 1;
  if (/jt$|juta$/.test(s)) { mult = 1e6; s = s.replace(/jt$|juta$/, ""); }
  else if (/m$|miliar$|milyar$/.test(s)) { mult = 1e9; s = s.replace(/m$|miliar$|milyar$/, ""); }
  s = s.replace(/\./g, "").replace(/,/g, ".");
  const v = Number(s) * mult;
  return Number.isFinite(v) && v > 0 ? v : NaN;
}

export function parseDirection(raw) {
  const s = String(raw || "").toLowerCase().trim();
  if (["diatas", "atas", "above", "naik", "up", ">", ">="].includes(s)) return "above";
  if (["dibawah", "bawah", "below", "turun", "down", "<", "<="].includes(s)) return "below";
  return null;
}

export function formatRp(n) {
  if (n == null) return "-";
  return "Rp " + Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export async function addAlert(chatId, coinQuery, directionRaw, targetRaw) {
  const direction = parseDirection(directionRaw);
  if (!direction) return { ok: false, error: "direction_invalid" };

  const target = parseTarget(targetRaw);
  if (!Number.isFinite(target) || target <= 0) return { ok: false, error: "target_invalid" };

  const mine = state.alerts.filter((a) => a.chatId === chatId);
  if (mine.length >= MAX_ALERTS_PER_CHAT) return { ok: false, error: "limit" };

  let coin, apiErr = null;
  try {
    coin = await resolveCoin(coinQuery);
  } catch (e) { apiErr = e; coin = null; }
  if (!coin || coin.currentPrice == null) {
    // FIX v24.2.4 — dulu SELALU dilaporkan "coin_not_found", padahal bisa jadi
    // CoinGecko lagi error/rate-limit (HTTP 429). Pesan yang menyesatkan bikin
    // user ngetik ulang nama coin terus. Sekarang dibedakan.
    if (apiErr) return { ok: false, error: "api_error", message: String(apiErr.message || apiErr).slice(0, 160) };
    return { ok: false, error: "coin_not_found" };
  }

  const alert = {
    id: newId(),
    chatId,
    coinId: coin.id,
    coinName: coin.name,
    symbol: coin.symbol,
    direction,
    target,
    startPrice: coin.currentPrice,
    lastPrice: coin.currentPrice,
    createdDate: new Date().toISOString(),
  };
  state.alerts.push(alert);
  saveState();
  syncMonitor();
  return { ok: true, alert };
}

export function listAlerts(chatId) {
  return state.alerts.filter((a) => a.chatId === chatId);
}

export function removeAlert(chatId, key) {
  const k = String(key || "").trim();
  const mine = state.alerts.filter((a) => a.chatId === chatId);
  if (/^\d+$/.test(k)) {
    const target = mine[Number(k) - 1];
    if (target) {
      const i = state.alerts.indexOf(target);
      if (i !== -1) {
        state.alerts.splice(i, 1);
        saveState(); syncMonitor();
        return { ok: true, alert: target };
      }
    }
  }
  const idx = state.alerts.findIndex(
    (a) => a.chatId === chatId && (a.id === k || a.coinId === k),
  );
  if (idx !== -1) {
    const [a] = state.alerts.splice(idx, 1);
    saveState(); syncMonitor();
    return { ok: true, alert: a };
  }
  return { ok: false, error: "not_found" };
}

export function getStatus() {
  return {
    enabled: state.enabled,
    total: state.alerts.length,
    running: !!monitorTimer,
  };
}

export function setEnabled(on) {
  state.enabled = !!on;
  saveState();
  syncMonitor();
}

// cek satu harga vs target
export function isTriggered(alert, price) {
  if (price == null) return false;
  return alert.direction === "above" ? price >= alert.target : price <= alert.target;
}

export async function runCheck({ force = false } = {}) {
  if (!state.alerts.length) return [];
  const ids = [...new Set(state.alerts.map((a) => a.coinId))];

  let prices;
  try {
    prices = await fetchPrices(ids);
  } catch (e) {
    // FIX v24.2.4 — dulu return [] diam-diam; log biar ketahuan kalau CoinGecko
    // rate-limit/down (maks 1x/menit biar log gak banjir).
    if (Date.now() - lastApiWarnMs > 60_000) {
      lastApiWarnMs = Date.now();
      console.warn("[cryptoalert] ⚠ gagal ambil harga CoinGecko — alarm ditahan (bukan false fire):", String(e?.message || e).slice(0, 140));
    }
    return []; // API down — jangan false fire, alarm tetap ada
  }

  const fired = [];
  for (const a of state.alerts) {
    const p = prices[a.coinId]?.idr;
    if (p == null) continue;
    a.lastPrice = p;
    if (isTriggered(a, p)) fired.push(a);
  }

  // one-shot: hapus yang kepenuh (kirim alert di caller — cegah dobel notif)
  if (fired.length) {
    const changes = {};
    fired.forEach((a) => { changes[a.id] = prices[a.coinId]?.idr_24h_change; });
    state.alerts = state.alerts.filter((a) => !fired.includes(a));
    saveState();
    syncMonitor();
    fired.forEach((a) => { a._change24h = changes[a.id]; });
  } else {
    saveState();
  }
  return fired;
}

async function sendAlert(a, change24h) {
  if (!sock) return;
  const chg = typeof change24h === "number" ? ` (${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}% 24 jam)` : "";
  const lines = [
    "🎯 *ᴄʀʏᴘᴛᴏ ᴀʟᴀʀᴍ* — ᴛᴀʀɢᴇᴛ ᴋᴇɴᴀ!",
    "",
    `🪙 *${a.coinName}* (${a.symbol})${chg}`,
    `💵 Harga sekarang: *${formatRp(a.lastPrice)}*`,
    `🎯 Target: ${a.direction === "above" ? "di atas" : "di bawah"} ${formatRp(a.target)}`,
    "",
    `📊 Waktu pasang: ${formatRp(a.startPrice)}`,
    "✅ Alarm satu kali pakai — otomatis terhapus",
  ];
  const text = lines.join("\n");
  // TARGET TERPUSAT (v24.2.0): chat pasang alarm TETAP dapat; target
  // terpusat (`.switch auto cryptoalert set`) ikut dikirim kalau diatur.
  let targets = [a.chatId];
  try { targets = await mergeAutoTargets(sock, "cryptoalert", [a.chatId]); } catch { /* pakai default */ }
  for (const jid of targets) sock.sendMessage(jid, { text }).catch(() => {});
}

export async function checkNow(chatId) {
  const before = listAlerts(chatId).length;
  const fired = await runCheck({ force: true });
  const mineFired = fired.filter((a) => a.chatId === chatId);
  // FIX v24.2.4 — dulu fire-and-forget (`forEach`), jadi command balas dulu
  // sebelum alert benar-benar terkirim (kelihatan seperti "gak ngirim").
  for (const a of mineFired) { try { await sendAlert(a); } catch { /* lanjut */ } }
  return { checked: before, fired: mineFired.length, alerts: mineFired };
}

// ------------------------------ monitor ------------------------------

export function syncMonitor() {
  const shouldRun = state.enabled && state.alerts.length > 0;
  if (shouldRun && !monitorTimer) {
    monitorTimer = setInterval(() => {
      runCheck().then((fired) => {
        fired.forEach((a) => sendAlert(a, a._change24h));
      }).catch(() => {});
    }, TICK_MS);
    if (typeof monitorTimer.unref === "function") monitorTimer.unref();
  } else if (!shouldRun && monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

export async function initCryptoAlert(_sock) {
  if (_sock) sock = _sock;
  loadState();
  syncMonitor();
  return true;
}

loadState();
