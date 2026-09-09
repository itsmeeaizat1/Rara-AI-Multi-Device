// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-webwatch.js — Web Watcher: pantau URL, notif otomatis pas isinya berubah
// (fitur baru 9 Sep 2026, request owner "fitur yg blm prnh ada di bot" — urldiff
// yang lama cuma bandingin 2 URL manual sekali jalan, ini SCHEDULER kontinu)
//
// .webwatch <url> [menit] — pantau URL di chat ini (default 15 menit, 5-720)
// .webwatch list | stop <no/url> | now | info
// Notif: 🌐 WEB WATCHER — hash snapshot sha256 + ukuran + snippet baris berubah.
// Global flag via .switch auto webwatch (OFF = monitor pause, watch TETAP tersimpan).
//
// fetcher di-inject (setFetcher) biar E2E offline.

import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { logger } from "./nova-logger.js";

const STATE_FILE = path.join(process.cwd(), "src", "data", "webwatch.json");

const DEFAULT_INTERVAL_MENIT = 15;
export const MIN_INTERVAL = 5;
export const MAX_INTERVAL = 720;
const TICK_MS = 30 * 1000; // tick monitor tiap 30 dtk
const FETCH_TIMEOUT = 15000;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB
const SNIPPET_LINES = 3; // baris diff yang ditampilkan
const MAX_WATCHES_PER_CHAT = 5;

let sock = null;
let monitorTimer = null;
let fetcher = null; // injectable (test)

export function setFetcher(fn) { fetcher = fn; }
export function setSock(_sock) { sock = _sock; }

// ------------------------------ state ------------------------------

function defaultState() {
  return { enabled: true, watches: [] };
}

let state = defaultState();

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = { ...defaultState(), ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
    }
  } catch (e) {
    logger?.warn?.("[webwatch] state load gagal: " + e.message);
    state = defaultState();
  }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    logger?.warn?.("[webwatch] state save gagal: " + e.message);
  }
}

function newId() {
  return "ww-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}

// ------------------------------ fetch & diff ------------------------------

async function fetchPage(url) {
  if (fetcher) return fetcher(url);
  const res = await axios.get(url, {
    timeout: FETCH_TIMEOUT,
    maxContentLength: MAX_BODY_BYTES,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.7",
    },
    validateStatus: null,
  });
  const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "");
  return { status: res.status, body, contentType: String(res.headers?.["content-type"] || "") };
}

export function parseTitle(body) {
  const m = /<title[^>]*>([\s\S]{0,200}?)<\/title>/i.exec(body || "");
  if (!m) return "";
  return m[1].replace(/\s+/g, " ").trim().slice(0, 80);
}

export function hashBody(body) {
  return crypto.createHash("sha256").update(body || "").digest("hex");
}

function isTexty(contentType) {
  return /text\/|json|xml|javascript/i.test(contentType || "");
}

// cari baris pertama yang beda + snippet dari versi baru
export function diffSnippet(oldBody, newBody) {
  const oldLines = String(oldBody || "").split("\n");
  const newLines = String(newBody || "").split("\n");
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      const lines = newLines
        .slice(i, i + SNIPPET_LINES)
        .map((l) => l.trim().slice(0, 120))
        .filter(Boolean);
      return { line: i + 1, text: lines.join("\n") };
    }
  }
  return null;
}

// ------------------------------ API ------------------------------

export function isValidUrl(u) {
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch { return false; }
}

export async function addWatch(chatId, rawUrl, intervalMenit) {
  const url = String(rawUrl || "").trim();
  if (!isValidUrl(url)) return { ok: false, error: "url_invalid" };

  const existingMine = state.watches.filter((w) => w.chatId === chatId);
  if (existingMine.length >= MAX_WATCHES_PER_CHAT) return { ok: false, error: "limit" };

  const existingSame = existingMine.find((w) => w.url === url);
  if (existingSame) return { ok: false, error: "duplicate", watch: existingSame };

  let interval = Math.round(Number(intervalMenit) || DEFAULT_INTERVAL_MENIT);
  if (interval < MIN_INTERVAL) interval = MIN_INTERVAL;
  if (interval > MAX_INTERVAL) interval = MAX_INTERVAL;

  let snap;
  try {
    snap = await fetchPage(url);
  } catch (e) {
    return { ok: false, error: "unreachable" };
  }

  const body = isTexty(snap.contentType) ? snap.body : "";
  const watch = {
    id: newId(),
    chatId,
    url,
    intervalMenit: interval,
    title: parseTitle(body) || url,
    lastHash: hashBody(body || snap.body),
    lastSize: String(snap.body || "").length,
    lastStatus: snap.status,
    lastBody: String(body).slice(0, 100 * 1024),
    lastChecked: Date.now(),
    lastChanged: 0,
    createdDate: new Date().toISOString(),
  };
  state.watches.push(watch);
  saveState();
  syncMonitor();
  return { ok: true, watch };
}

export function removeWatch(chatId, key) {
  const k = String(key || "").trim();
  const mine = state.watches.filter((w) => w.chatId === chatId);

  // nomor urut dari .webwatch list
  if (/^\d+$/.test(k)) {
    const target = mine[Number(k) - 1];
    if (target) {
      const i = state.watches.indexOf(target);
      if (i !== -1) {
        state.watches.splice(i, 1);
        saveState(); syncMonitor();
        return { ok: true, watch: target };
      }
    }
  }

  const idx = state.watches.findIndex(
    (w) => w.chatId === chatId && (w.id === k || w.url === k),
  );
  if (idx !== -1) {
    const [w] = state.watches.splice(idx, 1);
    saveState(); syncMonitor();
    return { ok: true, watch: w };
  }
  return { ok: false, error: "not_found" };
}

export function listWatches(chatId) {
  return state.watches.filter((w) => w.chatId === chatId);
}

export function getStatus() {
  return {
    enabled: state.enabled,
    total: state.watches.length,
    running: !!monitorTimer,
    nextCheck: state.watches.length
      ? Math.min(...state.watches.map((w) => (w.lastChecked || 0) + w.intervalMenit * 60000))
      : 0,
  };
}

export function setEnabled(on) {
  state.enabled = !!on;
  saveState();
  syncMonitor();
}

export async function runCheck({ force = false } = {}) {
  const now = Date.now();
  const due = state.watches.filter(
    (w) => force || now >= (w.lastChecked || 0) + w.intervalMenit * 60000,
  );
  const alerts = [];
  for (const w of due) {
    const before = { size: w.lastSize, hash: w.lastHash };
    try {
      const snap = await fetchPage(w.url);
      w.lastChecked = now;
      w.lastStatus = snap.status;
      const body = isTexty(snap.contentType) ? snap.body : "";
      const hash = hashBody(body || snap.body);
      const size = String(snap.body || "").length;
      if (hash !== before.hash) {
        const snippet = isTexty(snap.contentType) ? diffSnippet(w.lastBody || "", body) : null;
        w.lastHash = hash;
        w.lastSize = size;
        w.lastChanged = now;
        w.title = parseTitle(body) || w.title;
        w.lastBody = String(body).slice(0, 100 * 1024);
        alerts.push({ watch: w, oldSize: before.size, newSize: size, snippet });
      }
    } catch (e) {
      // site unreachable — skip, jangan false alarm & jangan reset snapshot
    }
  }
  if (due.length) saveState();
  return alerts;
}

// ------------------------------ monitor ------------------------------

export function syncMonitor() {
  const shouldRun = state.enabled && state.watches.length > 0;
  if (shouldRun && !monitorTimer) {
    monitorTimer = setInterval(() => {
      runCheck().then((alerts) => {
        alerts.forEach((a) => sendAlert(a));
      }).catch(() => {});
    }, TICK_MS);
    if (typeof monitorTimer.unref === "function") monitorTimer.unref();
  } else if (!shouldRun && monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

function sendAlert({ watch, oldSize, newSize, snippet }) {
  if (!sock) return;
  const delta = newSize - oldSize;
  const deltaTxt = delta === 0 ? "" : (delta > 0 ? ` (+${delta.toLocaleString("id-ID")} char)` : ` (${delta.toLocaleString("id-ID")} char)`);
  const lines = [
    "🌐 *ᴡᴇʙ ᴡᴀᴛᴄʜᴇʀ* — ᴀʟᴇʀᴛ!",
    "",
    `📰 *${watch.title}*`,
    `🔗 ${watch.url}`,
    "",
    `📊 Ukuran: ${oldSize.toLocaleString("id-ID")} → ${newSize.toLocaleString("id-ID")} char${deltaTxt}`,
  ];
  if (snippet && snippet.text) {
    lines.push(`📝 Perubahan sekitar baris ${snippet.line}:`);
    lines.push("──────────────");
    lines.push(snippet.text.slice(0, 300));
    lines.push("──────────────");
  }
  lines.push("");
  lines.push(`⏱️ Dicek tiap ${watch.intervalMenit} menit`);
  sock.sendMessage(watch.chatId, { text: lines.join("\n") }).catch(() => {});
}

export async function checkNow(chatId) {
  const mine = state.watches.filter((w) => w.chatId === chatId);
  const alerts = await runCheck({ force: true });
  const myAlerts = alerts.filter((a) => a.watch.chatId === chatId);
  myAlerts.forEach((a) => sendAlert(a));
  return { checked: mine.length, changed: myAlerts.length, alerts: myAlerts };
}

export async function initWebWatch(_sock) {
  if (_sock) sock = _sock;
  loadState();
  syncMonitor();
  return true;
}

// load awal buat lib-only usage
loadState();
