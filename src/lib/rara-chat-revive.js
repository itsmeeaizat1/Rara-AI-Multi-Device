// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════════════════════════════
// CHAT REVIVE — fitur grup #7 "deteksi dead chat + revive" (30 Sep 2026)
// Grup yang sepi lebih dari N jam → bot lempar 1 pertanyaan seru / fakta
// unik yang dibikin AI nyambung topik terakhir grup. BUKAN template.
//
// Desain (disetujui owner 30 Sep 2026):
//   • Scheduler tick tiap 10 menit, per-grup yang fiturnya ON.
//   • Sepi = pesan MANUSIA terakhir > threshold jam (default 6, 1-24).
//   • Anti-spam: 1 revive per window threshold + max 3 per hari per grup
//     (hari ikut WIB, bukan UTC — pola briefing).
//   • AI gagal → skip senyap, GAK ada fallback template (jujur).
//   • Aktivitas dicatat noteChatActivity() dari handler.js — pesan manusia
//     semua platform (WA + bridge TG) lewat situ.
//   • Cuplikan obrolan dibaca dari rara-chat-log.js (hanya pesan manusia,
//     bot & command gak pernah dicatat di sana).
// ═══════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { getChatHistory } from "./rara-chat-log.js";
import { aiChainChat } from "./rara-ai-fallback.js";

// ── STATE ──
// Struktur: { groups: { "<jid>": { on, thresholdHours, lastHumanAt,
//   lastReviveAt, today, todayCount } } }
// Default file kosong → fresh pairing = fitur mati semua grup (jujur).
let STATE_FILE = path.join(process.cwd(), "src", "database", "auto", "chatrevive.json");
let _state = null;

const DEFAULT_THRESHOLD_HOURS = 6;
const MAX_PER_DAY = 3;
const TZ_SHIFT_MS = 7 * 60 * 60 * 1000; // WIB = UTC+7 (pola rara-briefing)

// Seam jam — tes e2e bisa maju/mundur waktu
let _now = () => Date.now();

// Seam AI — default ke aiChainChat (rotasi key engine utama)
let _ai = null;
const defaultAi = async (prompt) => {
  try {
    const out = await aiChainChat(prompt);
    return typeof out === "string" ? out : String(out?.text ?? out ?? "");
  } catch {
    return "";
  }
};

// ── helpers state ──
function loadState() {
  if (_state) return _state;
  try {
    _state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    _state = {};
  }
  if (!_state || typeof _state !== "object" || Array.isArray(_state)) _state = {};
  if (!_state.groups || typeof _state.groups !== "object") _state.groups = {};
  return _state;
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(_state, null, 2));
  } catch {}
}

function groupEntry(jid) {
  const st = loadState();
  if (!st.groups[jid]) {
    st.groups[jid] = {
      on: false,
      thresholdHours: DEFAULT_THRESHOLD_HOURS,
      lastHumanAt: 0,
      lastReviveAt: 0,
      today: "",
      todayCount: 0,
    };
  }
  return st.groups[jid];
}

// Hari WIB dari timestamp — buat reset counter harian
function wibDay(ts) {
  return new Date(ts + TZ_SHIFT_MS).toISOString().slice(0, 10);
}

// ── API publik (dipakai plugin + handler) ──

/**
 * Catat aktivitas MANUSIA di sebuah chat (dipanggil dari handler.js tiap
 * pesan non-bot). Ini penanda "grup masih hidup" — sekaligus reset logika
 * sepi. Jid TG bridge (tg_*) pun masuk sini.
 */
export function noteChatActivity(jid, ts) {
  if (!jid || typeof jid !== "string") return false;
  if (jid.endsWith("@s.whatsapp.net")) return false; // DM gak relevan
  if (!jid.endsWith("@g.us") && !jid.startsWith("tg_")) return false;
  const g = groupEntry(jid);
  g.lastHumanAt = Number(ts) || _now();
  saveState();
  return true;
}

export function enableChatRevive(jid) {
  const g = groupEntry(jid);
  g.on = true;
  saveState();
  return { ok: true, thresholdHours: g.thresholdHours };
}

export function disableChatRevive(jid) {
  const g = groupEntry(jid);
  g.on = false;
  saveState();
  return { ok: true };
}

export function setChatReviveThreshold(jid, hours) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h < 1 || h > 24 || Math.floor(h) !== h) {
    return { ok: false, msg: "jam harus angka bulat 1-24" };
  }
  const g = groupEntry(jid);
  g.thresholdHours = h;
  saveState();
  return { ok: true, thresholdHours: h };
}

export function getChatReviveStatus(jid) {
  const st = loadState();
  const g = st.groups[jid] || {
    on: false,
    thresholdHours: DEFAULT_THRESHOLD_HOURS,
    lastHumanAt: 0,
    lastReviveAt: 0,
    today: "",
    todayCount: 0,
  };
  const now = _now();
  const sepiMs = g.on && g.lastHumanAt ? now - g.lastHumanAt : 0;
  return {
    on: g.on === true,
    thresholdHours: g.thresholdHours || DEFAULT_THRESHOLD_HOURS,
    lastHumanAt: g.lastHumanAt || 0,
    lastReviveAt: g.lastReviveAt || 0,
    todayCount: g.todayCount || 0,
    sepiJam: sepiMs ? Math.floor(sepiMs / 3600000) : null,
  };
}

// ── generator AI ──
function buildPrompt(jid, thresholdHours) {
  const rows = getChatHistory(jid, 25);
  let historyBlock = "";
  if (rows.length) {
    const lines = rows.map((r) => {
      const isi = r.k && r.k !== "teks" ? `[${r.k}] ${r.b || ""}`.trim() : r.b || "";
      return `- ${r.s || "seseorang"}: ${isi}`.trim();
    });
    historyBlock = `Cuplikan pesan terakhir grup ini (terbaru di bawah):\n${lines.join("\n")}\n\n`;
  } else {
    historyBlock = "Grup ini gak punya riwayat pesan yang bisa dibaca — bikin pertanyaan umum yang cocok buat grup obrolan santai.\n\n";
  }
  return (
    historyBlock +
    `Grup ini udah sepi sekitar ${thresholdHours} jam. Tugasmu: bikin SATU pesan pembuka buat menyalakan lagi obrolannya — ` +
    `pertanyaan seru ATAU fakta unik yang nyambung sama topik terakhir grup (kalau cuplikan di atas gak nyambung apa pun, pilih topik ringan universal: makanan, film, cerita lucu harian). ` +
    `Aturan: maksimal 2 kalimat, bahasa Indonesia santai (bukan formal kaku, bukan juga gaul paksa), maksimal 1 emoji, ` +
    `JANGAN pakai bullet/daftar/heading, JANGAN sebut bahwa kamu AI/bot, JANGAN ngajak pakai command/menu bot. ` +
    `Balas LANGSUNG isi pesannya doang tanpa pembuka/penutup apa pun.`
  );
}

/**
 * Bersihin output AI: ambil baris non-kosong pertama, buang marker
 * markdown, cap 400 char. Hasil kosong → null (skip senyap, jujur).
 */
function cleanReviveText(raw) {
  if (!raw) return null;
  const first = String(raw)
    .split("\n")
    .map((l) => l.trim().replace(/^[>*#-]+\s*/, "").replace(/\*+/g, "").replace(/`+/g, "").trim())
    .find((l) => l.length > 0);
  if (!first) return null;
  return first.slice(0, 400);
}

async function generateReviveMessage(jid, thresholdHours) {
  const ai = _ai || defaultAi;
  const raw = await ai(buildPrompt(jid, thresholdHours));
  return cleanReviveText(raw);
}

// ── core tick ──
async function reviveOnce(sock, jid, g, { force = false } = {}) {
  const now = _now();
  const thresholdMs = (g.thresholdHours || DEFAULT_THRESHOLD_HOURS) * 3600000;

  if (!force) {
    // 1. harus tahu pesan manusia terakhir — gak nebak (jujur)
    if (!g.lastHumanAt) return { sent: false, why: "belum ada aktivitas tercatat" };
    // 2. grup harus beneran sepi
    if (now - g.lastHumanAt < thresholdMs) return { sent: false, why: "belum sepi" };
    // 3. 1 revive per window threshold — gak tembak berkali-kali di grup sepi kronis
    if (g.lastReviveAt && now - g.lastReviveAt < thresholdMs) return { sent: false, why: "baru aja revive" };
    // 4. max 3 per hari WIB
    const day = wibDay(now);
    if (g.today !== day) { g.today = day; g.todayCount = 0; }
    if ((g.todayCount || 0) >= MAX_PER_DAY) return { sent: false, why: "kuota harian habis" };
  }

  const text = await generateReviveMessage(jid, g.thresholdHours || DEFAULT_THRESHOLD_HOURS);
  if (!text) return { sent: false, why: "AI gak balas" };

  await sock.sendMessage(jid, { text });
  g.lastReviveAt = now;
  if (!force) {
    const day = wibDay(now);
    if (g.today !== day) g.today = day;
    g.todayCount = (g.todayCount || 0) + 1;
  }
  saveState();
  return { sent: true, text };
}

/**
 * Tick scheduler: cek semua grup yang ON. Per-grup di-guard try/catch —
 * satu grup error gak boleh nunjuk grup lain.
 */
export async function runChatReviveTick(sock) {
  const st = loadState();
  const jids = Object.keys(st.groups).filter((j) => st.groups[j].on === true);
  const result = { checked: jids.length, revived: 0, skipped: [] };
  for (const jid of jids) {
    try {
      const r = await reviveOnce(sock, jid, st.groups[jid], {});
      if (r.sent) result.revived++;
      else if (r.why) result.skipped.push(`${jid}: ${r.why}`);
    } catch {
      result.skipped.push(`${jid}: error`);
    }
  }
  return result;
}

/**
 * Tes manual (.chatrevive tes): paksa generate + kirim SEKARANG walau grup
 * belum sepi — biar admin bisa lihat rasanya. Tetap catat lastReviveAt biar
 * tick gak dobel-kirim tepat setelah tes.
 */
export async function testChatRevive(sock, jid) {
  const g = groupEntry(jid);
  return reviveOnce(sock, jid, g, { force: true });
}

// ── scheduler init (dipasang di index.js schedulerInits) ──
export function initChatReviveScheduler(sock) {
  const TICK_MS = Number(process.env.CHATREVIVE_TICK_MS) || 10 * 60 * 1000;
  setTimeout(async () => {
    try { await runChatReviveTick(sock); } catch {}
  }, 60 * 1000).unref?.();
  const timer = setInterval(async () => {
    try { await runChatReviveTick(sock); } catch {}
  }, TICK_MS);
  timer.unref?.();
  return timer;
}

// ── seams khusus e2e ──
export function _setChatReviveFileForTest(p) {
  STATE_FILE = p;
  _state = null;
}
export function _setChatReviveNowForTest(fn) {
  _now = fn || (() => Date.now());
}
export function _setChatReviveAiForTest(fn) {
  _ai = fn;
}
export function _resetChatReviveForTest() {
  _state = null;
  _ai = null;
  _now = () => Date.now();
  try { fs.rmSync(STATE_FILE, { force: true }); } catch {}
}
export function _chatReviveStateForTest() {
  return loadState();
}
