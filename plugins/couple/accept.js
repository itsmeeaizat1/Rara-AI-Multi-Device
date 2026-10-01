// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Sistem Pacaran — Terima tembakan

import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { raraGameBox, gameCTA } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "terima",
  alias: ["terima"],
  category: "couple",
  description: "Menerima tembakan dari seseorang",
  usage: ".terima @tag",
  example: ".terima @628xxx",
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
      return m.reply(raraWrap("terima", [
        `Terima tembakan seseorang.`,
        ``,
        `📌 Format: reply pesan tembakan + ${m.prefix}terima`,
        `Atau ${m.prefix}terima @tag`,
      ]));
    }

    if (shooterJid === m.sender) {
      return m.reply(raraWrap("terima", "Tidak bisa menerima diri sendiri! 😅"));
    }
    if (shooterJid === m.botNumber) {
      return m.reply(raraWrap("terima", "Bot tidak bisa pacaran! 🤖"));
    }

    let shooterData = db.getUser(shooterJid) || {};
    let myData = db.getUser(m.sender) || {};
    if (!shooterData.fun) shooterData.fun = {};
    if (!myData.fun) myData.fun = {};

    // Validasi: shooter harus sedang nembak saya
    if (shooterData.fun.tembakTarget !== m.sender && shooterData.fun.pasangan !== m.sender) {
      return m.reply(
        raraWrap("terima",
          `@${shooterJid.split("@")[0]} tidak sedang menembakmu`
        )
      );
    }

    // Cek sender udah punya pacar
    if (myData.fun.pasangan && myData.fun.pasangan !== shooterJid) {
      const myPartner = db.getUser(myData.fun.pasangan);
      if (myPartner?.fun?.pasangan === m.sender) {
        return m.reply(
          raraWrap("terima",
            `Kamu sudah punya pasangan: @${myData.fun.pasangan.split("@")[0]}\n` +
            `Putus dulu dengan \`${m.prefix}putus\``
          )
        );
      }
    }

    // Terima: set pasangan
    const now = Date.now();
    shooterData.fun.pasangan = m.sender;
    shooterData.fun.jadiPacar = now;
    delete shooterData.fun.tembakTarget;
    if (!shooterData.fun.terimaCount) shooterData.fun.terimaCount = 0;
    shooterData.fun.terimaCount++;

    myData.fun.pasangan = shooterJid;
    myData.fun.jadiPacar = now;
    if (!myData.fun.terimaCount) myData.fun.terimaCount = 0;
    myData.fun.terimaCount++;

    // Tracking history
    if (!shooterData.fun.pacaranHistory) shooterData.fun.pacaranHistory = [];
    shooterData.fun.pacaranHistory.push({
      partner: m.sender,
      action: "jadian",
      date: now,
    });
    if (!myData.fun.pacaranHistory) myData.fun.pacaranHistory = [];
    myData.fun.pacaranHistory.push({
      partner: shooterJid,
      action: "jadian",
      date: now,
    });

    db.setUser(shooterJid, shooterData);
    db.setUser(m.sender, myData);
    db.save();

    // Hapus session
    const sessionKey = `${m.chat}_${m.sender}`;
    if (global.jadianSessions?.[sessionKey]) delete global.jadianSessions[sessionKey];

    await m.reply(raraGameBox({
      title: "resmi jadian", icon: "💕",
      flavor: "💕 *CIE CIE, RESMI JADIAN!*",
      body: [
        `│ • 💑 @${m.sender.split("@")[0]} & @${shooterJid.split("@")[0]}`,
        "│ • 💍 Semoga langgeng dan bahagia!",
      ].join("\n"),
      cta: gameCTA("jadianSukses"),
    }));
    await m.react("💕");
  } catch (e) {
    console.error("[terima] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
