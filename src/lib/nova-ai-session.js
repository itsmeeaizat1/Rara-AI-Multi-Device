// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-ai-session.js — SESSION PERCAKAPAN AI TERPADU (satu sistem buat semua fitur AI)
//
// Keluarga session (key = "<family>:<sender>"):
//   satuan:<sender>   → fitur AI satuan (.llamav2, .deepseek, .qwen3, .blackboxv2, dll)
//   provider:<sender> → fitur multi-provider (.openai, .grok, .claude, .gemini, dll)
//   agent:<sender>    → .novaai + .autonovaai (aichat) — SATU memori bersama,
//                       jadi obrolan di .novaai diterusin di autoflow aichat & sebaliknya
//
// - Persist di src/data/ai-sessions.json → inget percakapan walau bot restart
// - Idle 30 menit → sesi kedaluwarsa otomatis (mulai baru)
// - Max 24 pesan (12 giliran user+AI) — cukup buat konteks nyambung

import fs from "node:fs";

const DB = "./src/database/ai/ai-sessions.json";
const MAX_HISTORY = 24;
const TTL_MS = 30 * 60 * 1000; // 30 menit

let _cache = null;
let _dirty = false;

function load() {
  if (_cache) return _cache;
  try { _cache = JSON.parse(fs.readFileSync(DB, "utf8")); } catch { _cache = {}; }
  return _cache;
}

function save() {
  try {
    fs.mkdirSync("./src/data", { recursive: true });
    fs.writeFileSync(DB, JSON.stringify(_cache || {}, null, 2));
    _dirty = false;
  } catch (e) {
    console.log("[ai-session] gagal simpan:", e.message);
  }
}

function scheduleSave() {
  if (!_dirty) {
    _dirty = true;
    setTimeout(save, 1500); // debounce biar gak spam I/O
  }
}

function pruneExpired(db) {
  const now = Date.now();
  let changed = false;
  for (const k of Object.keys(db)) {
    const arr = db[k];
    if (!Array.isArray(arr) || !arr.length) { delete db[k]; changed = true; continue; }
    const last = arr[arr.length - 1];
    if (last?.ts && now - last.ts > TTL_MS) { delete db[k]; changed = true; }
  }
  return changed;
}

/** Riwayat sesi → [{role:"user"|"assistant", content, ts}] */
export function getSession(key) {
  const db = load();
  if (pruneExpired(db)) scheduleSave();
  return Array.isArray(db[key]) ? db[key] : [];
}

/** Tambah giliran (user+AI sekaligus, atau sendiri-sendiri via role) */
export function appendTurn(key, userText, aiText) {
  const db = load();
  if (!Array.isArray(db[key])) db[key] = [];
  const arr = db[key];
  if (userText) arr.push({ role: "user", content: String(userText).slice(0, 800), ts: Date.now() });
  if (aiText) arr.push({ role: "assistant", content: String(aiText).slice(0, 800), ts: Date.now() });
  if (arr.length > MAX_HISTORY) db[key] = arr.slice(-MAX_HISTORY);
  scheduleSave();
  return db[key];
}

/** Hapus 1 sesi */
export function clearSession(key) {
  const db = load();
  if (db[key]) {
    delete db[key];
    scheduleSave();
    return true;
  }
  return false;
}

/** Hapus semua sesi yang key-nya diawali prefix (mis. "agent:628xxx") */
export function clearSessionPrefix(prefix) {
  const db = load();
  let n = 0;
  for (const k of Object.keys(db)) {
    if (k.startsWith(prefix)) { delete db[k]; n++; }
  }
  if (n) scheduleSave();
  return n;
}

/**
 * Lipat riwayat jadi BLOK TEKS buat API berbasis 1 param teks (Haidar/Ikyy/Xemoz GET).
 * @param {string} key
 * @param {Object} opts { userName } — nama user buat label riwayat
 * @returns {string} "" kalau gak ada riwayat
 */
export function foldHistory(key, { userName = "User" } = {}) {
  const hist = getSession(key);
  if (!hist.length) return "";
  const lines = hist.map((h) => (h.role === "user" ? `${userName}: ` : "Kamu: ") + h.content);
  return `Riwayat obrolanmu dengan ${userName} sebelumnya (terbaru di bawah — pakai sebagai konteks, jangan ulangi jawaban yang sama):\n${lines.join("\n")}\n\n`;
}

/**
 * Riwayat sesi → format messages array buat API OpenAI-style (callAI)
 * @returns {Array<{role:string,content:string}>}
 */
export function toMessages(key) {
  return getSession(key).map((h) => ({ role: h.role, content: h.content }));
}
