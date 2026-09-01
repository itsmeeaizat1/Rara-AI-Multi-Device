// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Pacaran — Putus hubungan

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "putus",
  alias: ["putus"],
  category: "fun",
  description: "Memutuskan hubungan dengan pasangan",
  usage: ".putus",
  example: ".putus",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    let myData = db.getUser(m.sender) || {};
    if (!myData.fun) myData.fun = {};

    if (!myData.fun.pasangan) {
      return m.reply(
        claraWrap("putus",
          "Kamu tidak memiliki pasangan untuk diputuskan! 💔"
        )
      );
    }

    const partnerJid = myData.fun.pasangan;
    let partnerData = db.getUser(partnerJid) || {};
    if (!partnerData.fun) partnerData.fun = {};

    // Konfirmasi: pastikan pasangan ini masih mutual
    if (partnerData.fun.pasangan !== m.sender) {
      // Sudah tidak mutual, tinggal clear
      delete myData.fun.pasangan;
      delete myData.fun.jadiPacar;
      db.setUser(m.sender, myData);
      db.save();
      return m.reply(
        claraWrap("putus",
          "Hubungan sudah tidak aktif. Data pasangan dihapus. 🧹"
        )
      );
    }

    const now = Date.now();
    const jadiPacarTime = myData.fun.jadiPacar || now;
    const durasiHari = Math.floor((now - jadiPacarTime) / 86400000);

    // Tracking history: putus
    if (!myData.fun.pacaranHistory) myData.fun.pacaranHistory = [];
    myData.fun.pacaranHistory.push({
      partner: partnerJid,
      action: "putus",
      date: now,
      durasiHari: durasiHari,
    });
    if (!partnerData.fun.pacaranHistory) partnerData.fun.pacaranHistory = [];
    partnerData.fun.pacaranHistory.push({
      partner: m.sender,
      action: "putus",
      date: now,
      durasiHari: durasiHari,
    });

    // Clear pasangan
    delete myData.fun.pasangan;
    delete myData.fun.jadiPacar;
    if (!myData.fun.putusCount) myData.fun.putusCount = 0;
    myData.fun.putusCount++;

    delete partnerData.fun.pasangan;
    delete partnerData.fun.jadiPacar;
    if (!partnerData.fun.putusCount) partnerData.fun.putusCount = 0;
    partnerData.fun.putusCount++;

    // Clear nikah kalau ada
    if (myData.fun.nikah === partnerJid) {
      delete myData.fun.nikah;
      delete myData.fun.nikahDate;
    }
    if (partnerData.fun.nikah === m.sender) {
      delete partnerData.fun.nikah;
      delete partnerData.fun.nikahDate;
    }

    db.setUser(m.sender, myData);
    db.setUser(partnerJid, partnerData);
    db.save();

    let msg = `💔 *ᴘᴜᴛᴜs*\n\n`;
    msg += `│ @${m.sender.split("@")[0]} putus dengan @${partnerJid.split("@")[0]}\n`;
    if (durasiHari > 0) {
      msg += `│ Durasi pacaran: *${durasiHari} hari*\n`;
    }
    msg += `\n  _Semoga kamu lebih bahagia kedepannya_ 🙏\n\n`;
    msg += `╰────  •  ────`;

    await m.reply(msg);
    await m.react("💔");
  } catch (e) {
    console.error("[putus] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
