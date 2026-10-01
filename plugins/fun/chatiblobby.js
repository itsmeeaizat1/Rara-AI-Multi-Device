// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// chatiblobby.js — CHATIB LOBBY: ruang obrol anonim multi-user (inspirasi chatib.chat).
// Beda dari vibychat (1-on-1 random): semua member lobby saling ngobrol
// pakai NICKNAME — nomor WA gak pernah dibocorin.
// - .chatiblobby [nama]  (alias: chatib, lobbyanon, anonymouslobby)
//     masuk lobby — nama opsional, auto-nickname kalau gak dikasih
// - .chatibnick <nama>   ganti nickname (unik, gak bisa nabrak milik orang)
// - .chatiblist           daftar nickname yang online (nomor gak pernah muncul)
// - .chatibleave           keluar lobby
// ATURAN (revisi owner 24 Sep 2026): link BOLEH & di-broadcast normal.
// Member di-keluarkan otomatis kalau gak ada aktivitas selama 1 JAM.
// Media ditolak, flood guard. Engine: src/lib/rara-chatib-lobby.js.
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { joinLobby, setNick, listMembers, leaveLobby, relayLobbyMessage } from "../../src/lib/rara-chatib-lobby.js";

const pluginConfig = {
  name: "chatiblobby",
  alias: ["chatiblobby", "chatib", "lobbyanon", "anonymouslobby", "chatibnick", "chatiblist", "chatibleave", "leavechatib"],
  category: "fun",
  description: "Chatib Lobby — ruang obrol anonim multi-user pakai nickname",
  usage: ".chatiblobby [nama] · .chatibnick <nama> · .chatiblist · .chatibleave",
  example: ".chatiblobby KucingGalak",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// hook non-command: pesan teks biasa di DM di-broadcast ke lobby (handler.js)
export async function answerHandler(m, sock) {
  try {
    return await relayLobbyMessage(m, sock, getDatabase());
  } catch { return false; }
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const cmd = (m.command || "").toLowerCase();

  // layanan anonim cuma jalan di DM bot (privasi)
  if (m.isGroup || (m.chat || "").endsWith("@g.us")) {
    return m.reply(raraWrap("Chatib Lobby", "Chatib Lobby cuma bisa dipakai di DM bot ya — biar privat."));
  }

  if (cmd === "chatibnick") return setNick(m, sock, db);
  if (cmd === "chatiblist") return listMembers(m, db);
  if (["chatibleave", "leavechatib"].includes(cmd)) return leaveLobby(m, sock, db);
  return joinLobby(m, sock, db); // chatiblobby / chatib / lobbyanon / anonymouslobby
}

export { pluginConfig as config, handler };
