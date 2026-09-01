// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Nikah — Cerai

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cerainikah",
  alias: ["cerainikah"],
  category: "fun",
  description: "Menceraikan pasangan",
  usage: ".cerainikah",
  example: ".cerainikah",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    let myData = db.getUser(m.sender) || {};
    if (!myData.fun) myData.fun = {};

    if (!myData.fun.nikah) {
      return m.reply(
        claraWrap("cerainikah", "Kamu tidak sedang menikah! 💔")
      );
    }

    const partnerJid = myData.fun.nikah;
    let partnerData = db.getUser(partnerJid) || {};
    if (!partnerData.fun) partnerData.fun = {};

    const now = Date.now();
    const nikahDate = myData.fun.nikahDate || now;
    const durasiNikah = Math.floor((now - nikahDate) / 86400000);

    // Tracking history
    if (!myData.fun.pacaranHistory) myData.fun.pacaranHistory = [];
    myData.fun.pacaranHistory.push({
      partner: partnerJid, action: "cerai", date: now, durasiHari: durasiNikah,
    });
    if (!partnerData.fun.pacaranHistory) partnerData.fun.pacaranHistory = [];
    partnerData.fun.pacaranHistory.push({
      partner: m.sender, action: "cerai", date: now, durasiHari: durasiNikah,
    });

    // Clear nikah (tapi tetap pacaran)
    delete myData.fun.nikah;
    delete myData.fun.nikahDate;
    if (!myData.fun.ceraiCount) myData.fun.ceraiCount = 0;
    myData.fun.ceraiCount++;

    delete partnerData.fun.nikah;
    delete partnerData.fun.nikahDate;
    if (!partnerData.fun.ceraiCount) partnerData.fun.ceraiCount = 0;
    partnerData.fun.ceraiCount++;

    db.setUser(m.sender, myData);
    db.setUser(partnerJid, partnerData);
    db.save();

    let msg = `💔 *ᴄᴇʀᴀɪ*\n\n`;
    msg += `@${m.sender.split("@")[0]} cerai dengan @${partnerJid.split("@")[0]}\n`;
    if (durasiNikah > 0) {
      msg += `Durasi nikah: *${durasiNikah} hari*\n`;
    }
    msg += `\n  _Tetap berpacaran, tapi tidak lagi menikah_ 💔\n\n`;
    
    await m.reply(msg);
    await m.react("💔");
  } catch (e) {
    console.error("[cerainikah] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
