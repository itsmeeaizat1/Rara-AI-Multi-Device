// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Nikah — Terima lamaran

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "terimanikah",
  alias: ["terimanikah"],
  category: "fun",
  description: "Menerima lamaran nikah",
  usage: ".terimanikah @tag",
  example: ".terimanikah @628xxx",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const db = getDatabase();

    let proposerJid = null;
    if (m.quoted) proposerJid = m.quoted.sender;
    else if (m.mentionedJid?.[0]) proposerJid = m.mentionedJid[0];

    // Fallback: cari session nikah aktif
    if (!proposerJid) {
      const sessions = global.nikahSessions || {};
      const mySession = Object.entries(sessions).find(
        ([key, val]) => val.target === m.sender && val.chat === m.chat
      );
      if (mySession) proposerJid = mySession[1].proposer;
    }

    if (!proposerJid) {
      return m.reply(
        `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `  ┊ ➶ Reply pesan lamaran + \`${m.prefix}terimanikah\`\n` +
        `  ┊ ➶ Atau \`${m.prefix}terimanikah @tag\`\n\n` +
        `╰──────────❀`
      );
    }

    let propData = db.getUser(proposerJid) || {};
    let myData = db.getUser(m.sender) || {};
    if (!propData.fun) propData.fun = {};
    if (!myData.fun) myData.fun = {};

    // Validasi: harus masih berpacaran
    if (propData.fun.pasangan !== m.sender || myData.fun.pasangan !== proposerJid) {
      return m.reply(
        claraWrap("terimanikah", "Kalian tidak sedang berpacaran! 💔")
      );
    }

    // Validasi: belum nikah
    if (propData.fun.nikah || myData.fun.nikah) {
      return m.reply(
        claraWrap("terimanikah", "Salah satu sudah menikah! 💍")
      );
    }

    const now = Date.now();

    // Set nikah
    propData.fun.nikah = m.sender;
    propData.fun.nikahDate = now;
    myData.fun.nikah = proposerJid;
    myData.fun.nikahDate = now;

    // Tracking history
    if (!propData.fun.pacaranHistory) propData.fun.pacaranHistory = [];
    propData.fun.pacaranHistory.push({
      partner: m.sender, action: "nikah", date: now,
    });
    if (!myData.fun.pacaranHistory) myData.fun.pacaranHistory = [];
    myData.fun.pacaranHistory.push({
      partner: proposerJid, action: "nikah", date: now,
    });

    db.setUser(proposerJid, propData);
    db.setUser(m.sender, myData);
    db.save();

    // Hapus session
    const sessionKey = `${m.chat}_${m.sender}`;
    if (global.nikahSessions?.[sessionKey]) delete global.nikahSessions[sessionKey];

    await m.reply(
      claraWrap("SELAMAT MENIKAH 💍",
        `@${m.sender.split("@")[0]} dan @${proposerJid.split("@")[0]} resmi menikah!\n` +
        `Semoga sakinah, mawaddah, warahmah 🤲`
      )
    );
    await m.react("💍");
  } catch (e) {
    console.error("[terimanikah] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

export { pluginConfig as config, handler };
