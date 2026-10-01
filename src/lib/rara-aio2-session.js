// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-aio2-session.js — sesi URL hasil popup .aio2 (anti abuse receiver).
// Row id popup bawa `.aio2dl ext|mime|url` — receiver CUMA mau unduh URL
// yang emang diberikan popup di chat itu (register → TTL 20 menit).

const PENDING_TTL_MS = 20 * 60 * 1000;
const MAX_PER_CHAT = 40;
const store = new Map(); // chat → { urls: Set, ts }

function sweep() {
  const now = Date.now();
  for (const [chat, entry] of store.entries()) {
    if (now - entry.ts > PENDING_TTL_MS) store.delete(chat);
  }
}

export function registerChoice(chat, urls) {
  sweep();
  const key = String(chat || "");
  if (!key) return;
  let entry = store.get(key);
  if (!entry) {
    entry = { urls: new Set(), ts: Date.now() };
    store.set(key, entry);
  }
  entry.ts = Date.now();
  for (const u of urls || []) {
    if (typeof u === "string" && u.startsWith("http")) entry.urls.add(u);
  }
  // jaga ukuran: buang yang paling lama kalau kelebihan
  if (entry.urls.size > MAX_PER_CHAT) {
    const arr = [...entry.urls].slice(entry.urls.size - MAX_PER_CHAT);
    entry.urls = new Set(arr);
  }
}

export function isChoiceAllowed(chat, url) {
  sweep();
  return store.get(String(chat || ""))?.urls?.has(String(url || "")) === true;
}

export function _clearAio2SessionForTest() { store.clear(); }
