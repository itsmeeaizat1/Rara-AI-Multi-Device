// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Nikah — Tolak lamaran

import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { raraGameBox, gameCTA } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "tolaknikah",
  alias: ["tolaknikah"],
  category: "couple",
  description: "Menolak lamaran nikah",
  usage: ".tolaknikah @tag",
  example: ".tolaknikah @628xxx",
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
      return m.reply(raraWrap("tolaknikah", [
        `Tolak lamaran seseorang dengan halus.`,
        ``,
        `📌 Format: reply pesan lamaran + ${m.prefix}tolaknikah`,
        `Atau ${m.prefix}tolaknikah @tag`,
      ]));
    }

    let propData = db.getUser(proposerJid) || {};
    let myData = db.getUser(m.sender) || {};
    if (!propData.fun) propData.fun = {};
    if (!myData.fun) myData.fun = {};

    const now = Date.now();

    // Tracking history: lamaran ditolak
    if (!propData.fun.pacaranHistory) propData.fun.pacaranHistory = [];
    propData.fun.pacaranHistory.push({
      partner: m.sender, action: "lamaran ditolak", date: now,
    });
    if (!myData.fun.pacaranHistory) myData.fun.pacaranHistory = [];
    myData.fun.pacaranHistory.push({
      partner: proposerJid, action: "menolak lamaran", date: now,
    });

    db.setUser(proposerJid, propData);
    db.setUser(m.sender, myData);
    db.save();

    // Hapus session
    const sessionKey = `${m.chat}_${m.sender}`;
    if (global.nikahSessions?.[sessionKey]) delete global.nikahSessions[sessionKey];

    await m.reply(raraGameBox({
      title: "lamaran ditolak", icon: "💔",
      flavor: "💔 *LAMARAN DITOLAK...*",
      body: [
        `│ • 🏹 @${m.sender.split("@")[0]} menolak lamaran @${proposerJid.split("@")[0]}`,
        "│ • 🤲 Sabar ya, jodoh tidak kemana!",
      ].join("\n"),
      cta: gameCTA("tolaknikah"),
    }));
    await m.react("💔");
  } catch (e) {
    console.error("[tolaknikah] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
