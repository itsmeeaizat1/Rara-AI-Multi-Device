// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Sistem Nikah — Lamar pasangan untuk menikah

import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "nikah",
  alias: ["nikah"],
  category: "fun",
  description: "Melamar pasangan untuk menikah",
  usage: ".nikah @tag",
  example: ".nikah @628xxx",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

if (!global.nikahSessions) global.nikahSessions = {};

const SESSION_TIMEOUT = 3600000;

async function handler(m, { sock }) {
  try {
    const db = getDatabase();
    const args = m.args || [];

    let targetJid = null;
    if (m.mentionedJid?.[0]) targetJid = m.mentionedJid[0];
    else if (m.quoted) targetJid = m.quoted.sender;
    else if (args[0]) {
      let num = args[0].replace(/[^0-9]/g, "");
      if (num.length > 5 && num.length < 20) targetJid = num + "@s.whatsapp.net";
    }

    if (!targetJid) {
      return m.reply(claraWrap("nikah", [
        `Nikah sama user lain di grup.`,
        ``,
        `📌 Format: ${m.prefix}nikah @tag`,
        `Atau reply pesan pasangan + ${m.prefix}nikah`,
      ]));
    }

    if (targetJid === m.sender) {
      return m.reply(claraWrap("nikah", "Tidak bisa menikah dengan diri sendiri! 😅"));
    }
    if (targetJid === m.botNumber) {
      return m.reply(claraWrap("nikah", "Bot tidak bisa menikah! 🤖"));
    }

    let myData = db.getUser(m.sender) || {};
    let targetData = db.getUser(targetJid) || {};
    if (!myData.fun) myData.fun = {};
    if (!targetData.fun) targetData.fun = {};

    // Harus punya pasangan dulu
    if (!myData.fun.pasangan || myData.fun.pasangan !== targetJid) {
      return m.reply(
        claraWrap("nikah",
          `Kamu harus pacaran dengan @${targetJid.split("@")[0]} dulu!\n` +
          `Gunakan \`${m.prefix}jadian @tag\` untuk menembak`
        )
      );
    }

    // Cek pasangan mutual
    if (targetData.fun.pasangan !== m.sender) {
      return m.reply(
        claraWrap("nikah", "Hubungan kalian tidak mutual! 💔")
      );
    }

    // Cek udah nikah
    if (myData.fun.nikah) {
      return m.reply(
        claraWrap("nikah",
          `Kamu sudah menikah dengan @${myData.fun.nikah.split("@")[0]} 💍`
        )
      );
    }
    if (targetData.fun.nikah) {
      return m.reply(
        claraWrap("nikah", `@${targetJid.split("@")[0]} sudah menikah! 💍`)
      );
    }

    // Cek durasi pacaran minimal 1 hari
    if (myData.fun.jadiPacar) {
      const durasi = Date.now() - myData.fun.jadiPacar;
      if (durasi < 86400000) {
        const sisa = Math.ceil((86400000 - durasi) / 3600000);
        return m.reply(
          claraWrap("nikah",
            `Baru pacaran ${Math.floor(durasi / 3600000)} jam!\n` +
            `Minimal pacaran 1 hari dulu (${sisa} jam lagi) 💕`
          )
        );
      }
    }

    // Cek lamaran existing
    if (global.nikahSessions[`${m.chat}_${targetJid}`]) {
      return m.reply(
        claraWrap("nikah", "Kamu sudah melamar @${targetJid.split('@')[0]}! Tunggu jawaban.")
      );
    }

    // Simpan lamaran
    global.nikahSessions[`${m.chat}_${targetJid}`] = {
      proposer: m.sender,
      target: targetJid,
      chat: m.chat,
      timestamp: Date.now(),
    };

    // Tracking: lamar count
    if (!myData.fun.lamarCount) myData.fun.lamarCount = 0;
    myData.fun.lamarCount++;
    db.setUser(m.sender, myData);
    db.save();

    await m.reply(
      `💍 *ᴀᴅᴀ ʏᴀɴɢ ᴍᴇʟᴀᴍᴀʀ ɴɪʜʜ*\n\n` +
      `💒 @${m.sender.split("@")[0]} melamar @${targetJid.split("@")[0]}\n` +
      `⏱️ Berlaku *1 jam*\n\n` +
      `_Balas pesan ini dengan *terima* atau *tolak*_\n` +
      `Atau gunakan \`${m.prefix}terimanikah\` / \`${m.prefix}tolaknikah\`\n\n` +
      ""
    );
    await m.react("💍");
  } catch (e) {
    console.error("[nikah] Error:", e.message);
  }
}

async function answerHandler(m, sock) {
  try {
    if (!m.body || m.isCommand) return false;
    const text = m.body.trim().toLowerCase();
    if (text !== "terima" && text !== "tolak") return false;
    if (!m.quoted) return false;

    const db = getDatabase();
    const sessions = Object.entries(global.nikahSessions || {}).filter(
      ([key, val]) => val.target === m.sender && val.chat === m.chat
    );
    if (sessions.length === 0) return false;

    const valid = sessions.find(([, s]) => Date.now() - s.timestamp < SESSION_TIMEOUT);
    if (!valid) return false;

    const [sessKey, sess] = valid;
    const proposer = sess.proposer;

    let propData = db.getUser(proposer) || {};
    let myData = db.getUser(m.sender) || {};
    if (!propData.fun) propData.fun = {};
    if (!myData.fun) myData.fun = {};

    const now = Date.now();

    if (text === "terima") {
      // Set nikah
      propData.fun.nikah = m.sender;
      propData.fun.nikahDate = now;
      myData.fun.nikah = proposer;
      myData.fun.nikahDate = now;

      // Tracking history
      if (!propData.fun.pacaranHistory) propData.fun.pacaranHistory = [];
      propData.fun.pacaranHistory.push({
        partner: m.sender, action: "nikah", date: now,
      });
      if (!myData.fun.pacaranHistory) myData.fun.pacaranHistory = [];
      myData.fun.pacaranHistory.push({
        partner: proposer, action: "nikah", date: now,
      });

      db.setUser(proposer, propData);
      db.setUser(m.sender, myData);
      db.save();
      delete global.nikahSessions[sessKey];
      await m.react("💍");
      await m.reply(
        claraWrap("SELAMAT MENIKAH 💍",
          `@${m.sender.split("@")[0]} dan @${proposer.split("@")[0]} resmi menikah!\n` +
          `Semoga sakinah, mawaddah, warahmah 🤲`
        )
      );
      return true;
    }

    if (text === "tolak") {
      // Tracking history
      if (!propData.fun.pacaranHistory) propData.fun.pacaranHistory = [];
      propData.fun.pacaranHistory.push({
        partner: m.sender, action: "lamaran ditolak", date: now,
      });
      if (!myData.fun.pacaranHistory) myData.fun.pacaranHistory = [];
      myData.fun.pacaranHistory.push({
        partner: proposer, action: "menolak lamaran", date: now,
      });

      db.setUser(proposer, propData);
      db.setUser(m.sender, myData);
      db.save();
      delete global.nikahSessions[sessKey];
      await m.react("💔");
      await m.reply(
        claraWrap("LAMARAN DITOLAK 💔",
          `@${m.sender.split("@")[0]} menolak lamaran @${proposer.split("@")[0]}\n` +
          `Sabar ya, jodoh tidak kemana! 🤲`
        )
      );
      return true;
    }
    return false;
  } catch (e) {
    console.error("[nikah-answer] Error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, answerHandler };
