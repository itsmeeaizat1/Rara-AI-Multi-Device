// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Pacaran — Tembak seseorang untuk diajak pacaran

import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { raraGameBox, gameCTA } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "pacaran",
  alias: ["pacaran", "jadian"],
  category: "couple",
  description: "Menembak seseorang untuk pacaran",
  usage: ".jadian @tag",
  example: ".jadian @628xxx",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

if (!global.jadianSessions) global.jadianSessions = {};

const SESSION_TIMEOUT = 3600000;

const romanticQuotes = [
  "Aku bukan pilot, tapi aku bisa buat hatimu terbang tinggi bersamaku 💕",
  "Kamu tau kenapa aku suka hujan? Karena hujan itu seperti kamu, sejuk di hati 🌧️",
  "Kamu adalah alasan kenapa aku senyum tanpa sebab 😊",
  "Kalau kamu bintang, aku mau jadi langit yang selalu nemenin kamu",
  "Aku gak butuh GPS, karena hatiku udah nunjuk ke arahmu 💘",
  "Boleh pinjam hatimu? Janji bakal dijaga selamanya 💖",
  "Kalau cinta itu adalah lagu, kamu adalah melodi terindahnya 🎵",
];

async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    const args = m.args || [];

    let targetJid = null;
    if (m.quoted) {
      targetJid = m.quoted.sender;
    } else if (m.mentionedJid?.[0]) {
      targetJid = m.mentionedJid[0];
    } else if (args[0]) {
      let num = args[0].replace(/[^0-9]/g, "");
      if (num.length > 5 && num.length < 20) targetJid = num + "@s.whatsapp.net";
    }

    if (!targetJid) {
      return m.reply(raraWrap("jadian", [
        `Nembak user lain biar jadian.`,
        ``,
        `📌 Format: ${m.prefix}jadian @tag`,
        `Atau reply pesan + ${m.prefix}jadian`,
      ]));
    }

    if (targetJid === m.sender) {
      return m.reply(raraWrap("jadian", "Tidak bisa menembak diri sendiri! 😅"));
    }
    if (targetJid === m.botNumber) {
      return m.reply(raraWrap("jadian", "Bot tidak bisa pacaran! 🤖"));
    }

    let senderData = db.getUser(m.sender) || {};
    let targetData = db.getUser(targetJid) || {};
    if (!senderData.fun) senderData.fun = {};
    if (!targetData.fun) targetData.fun = {};

    // Cek sender udah punya pacar
    if (senderData.fun.pasangan) {
      const partner = db.getUser(senderData.fun.pasangan);
      if (partner?.fun?.pasangan === m.sender) {
        return m.reply(
          raraWrap("jadian",
            `Sudah punya pasangan: @${senderData.fun.pasangan.split("@")[0]}\n` +
            `Putus dulu dengan \`${m.prefix}putus\``
          )
        );
      }
    }

    // Cek target udah punya pacar
    if (targetData.fun.pasangan && targetData.fun.pasangan !== m.sender) {
      const tPartner = db.getUser(targetData.fun.pasangan);
      if (tPartner?.fun?.pasangan === targetJid) {
        return m.reply(
          raraWrap("jadian",
            `💔 @${targetJid.split("@")[0]} sudah punya pasangan`
          )
        );
      }
    }

    // Cek apakah target juga udah nembak sender (auto-match)
    if (targetData.fun.tembakTarget === m.sender) {
      senderData.fun.pasangan = targetJid;
      targetData.fun.pasangan = m.sender;
      senderData.fun.jadiPacar = Date.now();
      targetData.fun.jadiPacar = Date.now();
      db.setUser(m.sender, senderData);
      db.setUser(targetJid, targetData);
      db.save();
      delete global.jadianSessions[`${m.chat}_${targetJid}`];
      await m.react("💕");
      return m.reply(raraGameBox({
        title: "resmi jadian", icon: "💕",
        flavor: "💕 *CIE CIE, RESMI JADIAN!*",
        body: [
          `│ • 💑 @${m.sender.split("@")[0]} & @${targetJid.split("@")[0]}`,
          "│ • 💍 Semoga langgeng dan bahagia!",
        ].join("\n"),
        cta: gameCTA("jadianSukses"),
      }));
    }

    // Simpan tembakan
    senderData.fun.tembakTarget = targetJid;
    if (!senderData.fun.tembakCount) senderData.fun.tembakCount = 0;
    senderData.fun.tembakCount++;
    db.setUser(m.sender, senderData);

    global.jadianSessions[`${m.chat}_${targetJid}`] = {
      shooter: m.sender,
      target: targetJid,
      chat: m.chat,
      timestamp: Date.now(),
    };

    const quote = romanticQuotes[Math.floor(Math.random() * romanticQuotes.length)];

    await m.reply(raraGameBox({
      title: "tembakan cinta", icon: "💘",
      flavor: "💘 *ADA YANG NEMBAK NIH!*",
      body: [
        `│ • 🏹 @${m.sender.split("@")[0]} nembak @${targetJid.split("@")[0]}`,
        `│ • 💬 "${quote}"`,
        "│ • ⏱️ Berlaku : 1 jam",
      ].join("\n"),
      cta: gameCTA("jadian"),
    }));
    await m.react("💘");
  } catch (e) {
    console.error("[pacaran] Error:", e.message);
  }
}

async function answerHandler(m, sock) {
  try {
    if (!m.body || m.isCommand) return false;
    const text = m.body.trim().toLowerCase();
    if (text !== "terima" && text !== "tolak") return false;
    if (!m.quoted) return false;

    const db = getDatabase();
    const sessions = Object.entries(global.jadianSessions || {}).filter(
      ([key, val]) => val.target === m.sender && val.chat === m.chat
    );
    if (sessions.length === 0) return false;

    const valid = sessions.find(([, s]) => Date.now() - s.timestamp < SESSION_TIMEOUT);
    if (!valid) return false;

    const [sessKey, sess] = valid;
    const shooter = sess.shooter;

    let shooterData = db.getUser(shooter) || {};
    let targetData = db.getUser(m.sender) || {};
    if (!shooterData.fun) shooterData.fun = {};
    if (!targetData.fun) targetData.fun = {};

    if (text === "terima") {
      shooterData.fun.pasangan = m.sender;
      targetData.fun.pasangan = shooter;
      shooterData.fun.jadiPacar = Date.now();
      targetData.fun.jadiPacar = Date.now();
      db.setUser(shooter, shooterData);
      db.setUser(m.sender, targetData);
      db.save();
      delete global.jadianSessions[sessKey];
      await m.react("💕");
      await m.reply(raraGameBox({
        title: "resmi jadian", icon: "💕",
        flavor: "💕 *CIE CIE, RESMI JADIAN!*",
        body: [
          `│ • 💑 @${m.sender.split("@")[0]} & @${shooter.split("@")[0]}`,
          "│ • 💍 Semoga langgeng dan bahagia!",
        ].join("\n"),
        cta: gameCTA("jadianSukses"),
      }));
      return true;
    }

    if (text === "tolak") {
      delete shooterData.fun.tembakTarget;
      delete targetData.fun.pasangan;
      db.setUser(shooter, shooterData);
      db.setUser(m.sender, targetData);
      db.save();
      delete global.jadianSessions[sessKey];
      await m.react("💔");
      await m.reply(raraGameBox({
        title: "ditolak", icon: "💔",
        flavor: "💔 *DITOLAK, SABAR YA...*",
        body: [
          `│ • 🏹 @${m.sender.split("@")[0]} menolak @${shooter.split("@")[0]}`,
          "│ • 💪 Sabar ya, masih banyak yang lain!",
        ].join("\n"),
        cta: gameCTA("jadianTolak"),
      }));
      return true;
    }
    return false;
  } catch (e) {
    console.error("[pacaran-answer] Error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, answerHandler };
