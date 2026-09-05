// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Pacaran — Tolak tembakan

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tolak",
  alias: ["tolak"],
  category: "fun",
  description: "Menolak tembakan dari seseorang",
  usage: ".tolak @tag",
  example: ".tolak @628xxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const db = getDatabase();

    let shooterJid = null;
    if (m.quoted) {
      shooterJid = m.quoted.sender;
    } else if (m.mentionedJid?.[0]) {
      shooterJid = m.mentionedJid[0];
    }

    // Fallback: cari session aktif
    if (!shooterJid) {
      const sessions = global.jadianSessions || {};
      const mySession = Object.entries(sessions).find(
        ([key, val]) => val.target === m.sender && val.chat === m.chat
      );
      if (mySession) shooterJid = mySession[1].shooter;
    }

    if (!shooterJid) {
      return m.reply(claraWrap("tolak", [
        `Tolak tembakan seseorang dengan halus.`,
        ``,
        `📌 Format: reply pesan tembakan + ${m.prefix}tolak`,
        `Atau ${m.prefix}tolak @tag`,
      ]));
    }

    let shooterData = db.getUser(shooterJid) || {};
    let myData = db.getUser(m.sender) || {};
    if (!shooterData.fun) shooterData.fun = {};
    if (!myData.fun) myData.fun = {};

    // Tracking history: tolak
    const now = Date.now();
    if (!shooterData.fun.pacaranHistory) shooterData.fun.pacaranHistory = [];
    shooterData.fun.pacaranHistory.push({
      partner: m.sender,
      action: "ditolak",
      date: now,
    });
    if (!myData.fun.pacaranHistory) myData.fun.pacaranHistory = [];
    myData.fun.pacaranHistory.push({
      partner: shooterJid,
      action: "menolak",
      date: now,
    });

    // Clear tembakan
    delete shooterData.fun.tembakTarget;
    if (!shooterData.fun.tolakCount) shooterData.fun.tolakCount = 0;
    shooterData.fun.tolakCount++;

    db.setUser(shooterJid, shooterData);
    db.setUser(m.sender, myData);
    db.save();

    // Hapus session
    const sessionKey = `${m.chat}_${m.sender}`;
    if (global.jadianSessions?.[sessionKey]) delete global.jadianSessions[sessionKey];

    await m.reply(
      claraWrap("YANG SABAR 💔",
        `@${m.sender.split("@")[0]} menolak @${shooterJid.split("@")[0]}\n` +
        `Sabar ya, masih banyak yang lain! 😢`
      )
    );
    await m.react("💔");
  } catch (e) {
    console.error("[tolak] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
