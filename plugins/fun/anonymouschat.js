// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// anonymouschat.js — CHAT ANONIM ANTAR MEMBER BOT (DM only).
// Dua user di-pair acak, pesan diteruskan anonim tanpa nunjukin nomor.
// - .anonymouschat  (alias: chatanon, chatrandom, anonchat, temanchat)
//     masuk daftar tunggu → otomatis di-cocokin begitu ada partner
// - .skipanon       putus sesi sekarang, langsung cari partner baru
// - .stopanon       keluar sesi / daftar tunggu
// GUARD (request owner): link → sesi ditutup OTOMATIS + DM owner.
// Engine: src/lib/nova-anonchat.js (relay via answerHandler di handler.js).
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { startChat, skipChat, stopChat, relayMessage } from "../../src/lib/nova-anonchat.js";

const pluginConfig = {
  name: "anonymouschat",
  alias: ["anonymouschat", "chatanon", "chatrandom", "anonchat", "temanchat", "skipanon", "stopanon"],
  category: "fun",
  description: "Chat anonim sama member bot lain — pesan diteruskan tanpa nunjukin nomor",
  usage: ".anonymouschat · .skipanon · .stopanon",
  example: ".anonymouschat",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// hook non-command: pesan teks biasa di DM diteruskan ke partner (handler.js)
export async function answerHandler(m, sock) {
  try {
    return await relayMessage(m, sock, getDatabase());
  } catch { return false; }
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const cmd = (m.command || "").toLowerCase();

  // fitur ini cuma jalan di DM (privasi: pesan anonim gak boleh nongol di grup)
  if (m.isGroup || (m.chat || "").endsWith("@g.us")) {
    return m.reply(claraWrap("Chat Anonim", "Chat anonim cuma bisa dipakai di DM bot ya — chat pribadi bot biar privat."));
  }

  if (cmd === "skipanon") return skipChat(m, sock, db);
  if (cmd === "stopanon") return stopChat(m, sock, db);
  return startChat(m, sock, db);
}

export { pluginConfig as config, handler };
