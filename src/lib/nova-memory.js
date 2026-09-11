// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 MEMORY ENGINE — otak yang beneran inget user (request owner 12 Sep 2026)
// 🔹 Ekstraksi otomatis fakta user dari percakapan AI (.novaai) —
//   fire-and-forget, gak nge-block jawaban
// 🔹 Inject balik ke system prompt pas obrolan berikutnya —
//   bot inget nama, hobi, pekerjaan, cerita user antar sesi/command
// 🔹 Persist di db.setting("novaMemory") per user — selamat restart
// ============================================================

import { aiChainChat } from "./nova-ai-fallback.js";

const SETTING_KEY = "novaMemory";
const MAX_FACTS = 30; // cap per user — kalau lewat, buang yang paling lama
const MAX_EXTRACT_PER_TURN = 2; // maksimal fakta baru per percakapan

// ── util ────────────────────────────────────────────────────
function norm(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return norm(text).split(" ").filter((w) => w.length > 2);
}

// Kemiripan kata (Jaccard) — buat dedup fakta
function similarity(a, b) {
  const wa = new Set(words(a));
  const wb = new Set(words(b));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}

function isDuplicate(facts, newText) {
  const n = norm(newText);
  if (!n) return true;
  return facts.some((f) => {
    const fn = norm(f.text);
    if (!fn) return false;
    // persis / saling mengandung (fakta pendek) / Jaccard >= 0.5
    // (0.5 cukup nangkep parafase "pelihara kucing" vs "punya kucing" —
    //  buat fakta beda cuma beda 1-2 kata skor-nya jauh di bawah 0.5)
    return fn === n || fn.includes(n) || n.includes(fn) || similarity(fn, n) >= 0.5;
  });
}

// ── store ───────────────────────────────────────────────────
function getStore(db) {
  const all = db?.setting?.(SETTING_KEY) || {};
  return all;
}

function saveStore(db, all) {
  db?.setting?.(SETTING_KEY, all);
}

function ensureUser(db, sender) {
  const all = getStore(db);
  if (!all[sender] || typeof all[sender] !== "object") {
    all[sender] = { on: true, facts: [] };
  }
  if (!Array.isArray(all[sender].facts)) all[sender].facts = [];
  if (typeof all[sender].on !== "boolean") all[sender].on = true;
  return all;
}

// ── API inti ────────────────────────────────────────────────
export function listMemories(db, sender) {
  const all = ensureUser(db, sender);
  return all[sender].facts;
}

export function addMemory(db, sender, text, { source = "manual" } = {}) {
  const clean = String(text || "").trim();
  if (!clean || clean.length > 300) return false;
  const all = ensureUser(db, sender);
  const user = all[sender];
  if (isDuplicate(user.facts, clean)) return false;
  user.facts.push({ text: clean, source, ts: Date.now() });
  // cap — buang paling lama
  if (user.facts.length > MAX_FACTS) user.facts = user.facts.slice(-MAX_FACTS);
  saveStore(db, all);
  return true;
}

export function removeMemory(db, sender, idx) {
  const all = ensureUser(db, sender);
  const facts = all[sender].facts;
  const i = Number(idx) - 1; // user-facing 1-based
  if (!Number.isInteger(i) || i < 0 || i >= facts.length) return false;
  facts.splice(i, 1);
  saveStore(db, all);
  return true;
}

export function resetMemories(db, sender) {
  const all = ensureUser(db, sender);
  all[sender] = { on: all[sender].on, facts: [] };
  saveStore(db, all);
  return true;
}

export function isMemoryOn(db, sender) {
  const all = ensureUser(db, sender);
  return all[sender].on !== false;
}

export function toggleMemory(db, sender, on) {
  const all = ensureUser(db, sender);
  all[sender].on = !!on;
  saveStore(db, all);
  return all[sender].on;
}

// ── recall: cari fakta relevan buat inject ke prompt ─────────
export function relevantMemories(db, sender, query, limit = 5) {
  const facts = listMemories(db, sender);
  if (!facts.length) return [];
  const qw = new Set(words(query || ""));
  const scored = facts.map((f, i) => {
    const fw = words(f.text);
    let hits = 0;
    for (const w of fw) if (qw.has(w)) hits++;
    const overlap = qw.size ? hits / Math.max(fw.length, 1) : 0;
    const recency = 1 - (facts.length - i) / (facts.length + 1); // makin baru makin tinggi
    return { fact: f, score: overlap * 2 + recency * 0.3, idx: i };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.fact);
}

// Blok memori buat ditempel ke system prompt — kosong kalau off/tidak ada fakta
export function memoryBlock(db, sender, query) {
  try {
    if (!isMemoryOn(db, sender)) return "";
    const facts = listMemories(db, sender);
    if (!facts.length) return "";
    // relevan ke topik → prioritas; sisanya terbaru
    const rel = relevantMemories(db, sender, query, 4);
    const rest = facts.filter((f) => !rel.includes(f)).slice(-3);
    const picks = [...rel, ...rest].slice(0, 7);
    if (!picks.length) return "";
    const lines = picks.map((f) => `- ${f.text}`);
    return `\n\n== MEMORI TENTANG USER (yang kamu inget dari obrolan sebelumnya) ==\nGunakan fakta ini secara natural — jangan disembor, cukup pakai kalau relevan:\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

// ── ekstraksi otomatis (AI) — fire-and-forget ───────────────
// Dipanggil SETELAH jawaban AI terkirim; jangan await di jalur utama:
//   extractMemories(db, sender, userText, aiText).catch(() => {});
const EXTRACT_PROMPT = (userText, aiText) => `Tugas: ekstrak FAKTA DURABEL TENTANG USER dari percakapan WhatsApp ini (nama, hobi, pekerjaan, lokasi, keluarga, preferensi, rencana, kepemilikan, cerita penting).

USER: ${userText.slice(0, 600)}
ASISTEN: ${aiText.slice(0, 400)}

Aturan:
- Hanya fakta TENTANG USER yang berguna di masa depan (bukan pertanyaan sementara, bukan basa-basi, bukan perintah fitur).
- Tulis dalam bahasa Indonesia, ringkas satu kalimat, subjeknya "user".
- MAKSIMAL ${MAX_EXTRACT_PER_TURN} fakta. Kalau tidak ada fakta durabel, balas array kosong.
- Balas HANYA JSON array string, tanpa penjelasan.

Contoh output:
["suka kucing dan pelihara kucing bernama Lucas", "kerja shift malam di pabrik"]`;

export async function extractMemories(db, sender, userText, aiText) {
  try {
    if (!isMemoryOn(db, sender)) return 0;
    if (!userText || userText.length < 4) return 0;
    // TANPA sessionKey — one-shot, jangan nyemarin sesi obrolan user
    const raw = await aiChainChat(EXTRACT_PROMPT(userText, aiText));
    // parse JSON — toleran code fence / teks sekitar
    const m = String(raw || "").match(/\[[\s\S]*?\]/);
    if (!m) return 0;
    let facts;
    try {
      facts = JSON.parse(m[0]);
    } catch {
      return 0;
    }
    if (!Array.isArray(facts)) return 0;
    let added = 0;
    for (const f of facts.slice(0, MAX_EXTRACT_PER_TURN)) {
      if (typeof f === "string" && addMemory(db, sender, f, { source: "auto" })) added++;
    }
    return added;
  } catch {
    return 0; // best-effort — gagal ekstrak gak boleh ganggu apapun
  }
}
