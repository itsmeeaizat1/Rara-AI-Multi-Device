// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 CHAT HISTORY PERSISTEN (nova-chat-log.js) — konfirmasi owner 21 Sep
//   2026: histori chat TETAP KESIMPAN saat bot restart, hilang HANYA
//   kalau file database-nya (database/chathistory.json) dihapus.
// 🔹 Dipakai nova-ai-satuan-rich.js buat jejak histori — sebelumnya jejak
//   cuma dari memori koneksi Baileys (ilang tiap restart), sekarang
//   persisten di store database sendiri (file terpisah biar gak nimpa
//   data lain).
// 🔹 Yang dicatat: pesan MASUK dari user (teks + caption media + penanda
//   jenis media). Yang DIKECUALIKAN: pesan bot sendiri (fromMe), status/
//   broadcast, saluran (newsletter), command (awalan prefix) — biar jejak
//   bersih dari spam menu/fitur, dan body dikecap biar file gak bengkak.
// 🔹 Maks 120 pesan per chat (rotating) — grup ramai pun file tetap terkendali.
// ============================================================
import { getDatabase } from "./nova-database.js";

const MAX_PER_CHAT = 120;  // rotating window per chat
const MAX_BODY = 300;      // body/caption dikecap

// jenis pesan mentah WA → label pendek utk jejak
const KIND_MAP = {
  conversation: "teks",
  extendedTextMessage: "teks",
  imageMessage: "foto",
  stickerMessage: "sticker",
  videoMessage: "video",
  audioMessage: "suara",
  documentMessage: "dokumen",
  pollCreationMessage: "polling",
};

function bodyOf(message, type) {
  const mc = message[type] || {};
  return String(
    message.conversation ||
    mc.text ||
    mc.caption ||
    ""
  ).slice(0, MAX_BODY).trim();
}

function _store(db) {
  if (!db.data.chathistory) db.data.chathistory = {};
  return db.data.chathistory;
}

/**
 * Catat 1 pesan masuk ke histori persisten. Dapet msg MENTAH Baileys
 * (dari messages.upsert) — gak perlu serialize. Semua error senyap:
 * pencatatan gak boleh ganggu jalur pesan.
 */
export function recordChatMessage(msg, config) {
  try {
    const key = msg?.key;
    if (!key?.remoteJid) return false;
    const chat = key.remoteJid;
    if (key.fromMe) return false;                        // pesan bot gak dicatat
    if (chat.endsWith("@broadcast")) return false;       // status
    if (chat.endsWith("@newsletter")) return false;      // saluran
    if (!msg.message) return false;

    const metadataKeys = ["senderKeyDistributionMessage", "messageContextInfo"];
    const type =
      Object.keys(msg.message).find((k) => !metadataKeys.includes(k)) ||
      Object.keys(msg.message)[0];
    if (!type || type === "protocolMessage") return false;

    const body = bodyOf(msg.message, type);
    const kind = KIND_MAP[type] || "media";

    // command gak dicatat — jejak dibuat buat konteks obrolan manusia,
    // bukan spam .menu/.sticker dll
    const prefix = config?.command?.prefix || ".";
    if (body.startsWith(prefix)) return false;
    // teks kosong TANPA jenis media yang dikenal → gak ada yang bisa dibaca
    if (!body && kind === "teks") return false;

    const db = getDatabase();
    const store = _store(db);
    if (!store[chat]) store[chat] = [];
    const sender = String(key.participant || chat || "").split("@")[0];
    store[chat].push({
      s: sender,
      t: Number(msg.messageTimestamp) * 1000 || Date.now(),
      k: kind,
      b: body,
    });
    if (store[chat].length > MAX_PER_CHAT) {
      store[chat] = store[chat].slice(-MAX_PER_CHAT);
    }
    db.markDirty("chathistory");
    return true;
  } catch {
    return false;
  }
}

/**
 * Ambil jejak pesan terakhir di chat (urut LAMA → BARU).
 */
export function getChatHistory(chat, limit = 8) {
  try {
    const store = _store(getDatabase());
    const rows = store[chat] || [];
    return rows.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Render jejak jadi blok konteks buat prompt AI (max chars di-cap caller).
 */
export function renderChatHistory(chat, limit = 8, capChars = 900) {
  const rows = getChatHistory(chat, limit);
  if (!rows.length) return "";
  const lines = rows.map((r) => {
    const body = r.b ? r.b : "(" + r.k + ")";
    return (r.s ? r.s + ": " : "") + body;
  });
  let text = lines.join("\n");
  if (text.length > capChars) {
    // buang baris dari ATAS biar yang paling baru tetep ikut
    text = text.slice(text.length - capChars);
  }
  return "(Jejak pesan terakhir di chat ini, urut lama ke baru:\n" + text + ")";
}

/** Hapus jejak satu chat (atau semua kalau chat kosong). */
export function clearChatHistory(chat = null) {
  try {
    const db = getDatabase();
    const store = _store(db);
    if (chat) delete store[chat];
    else for (const k of Object.keys(store)) delete store[k];
    db.markDirty("chathistory");
    return true;
  } catch {
    return false;
  }
}
