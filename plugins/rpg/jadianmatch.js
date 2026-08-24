// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Mulai berpacaran (dengan RPG stats)

import { ensureRpg, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { getCintaData, startDating, DATING_MIN_LEVEL, formatDurasi } from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "jadianmatch",
  alias: ["rpgjadian", "rpgpacaran"],
  category: "rpg",
  description: "Ajak seseorang berpacaran di RPG",
  usage: ".rpgcouple @tag",
  example: ".rpgcouple @628xxx",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

if (!global.rpgCintaSessions) global.rpgCintaSessions = {};
const SESSION_TIMEOUT = 3600000;

async function handler(m, { sock }) {
  try {
    ensureRpg(m, m.pushName || "Player");
    const rpg = getRpgData(m);
    const cinta = getCintaData(m);

    if (cinta.spouse) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
        `  ┊ ➶ ❤️ Kamu sudah berpacaran dengan *${cinta.spouseName}*\n` +
        `  ┊ ➶ 💕 Affection: *${cinta.affection || 0}*\n` +
        `  ┊ ➶ Putus? \`${m.prefix}rpgcerai\`\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    if ((rpg.level || 1) < DATING_MIN_LEVEL) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
        `  ┊ ➶ ❌ Level minimal *${DATING_MIN_LEVEL}* untuk berpacaran!\n` +
        `  ┊ ➶ Level kamu: *${rpg.level || 1}*\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    let targetJid = null;
    if (m.mentionedJid?.[0]) targetJid = m.mentionedJid[0];
    else if (m.quoted) targetJid = m.quoted.sender;
    else if (m.args?.[0]) {
      const num = m.args[0].replace(/[^0-9]/g, "");
      if (num.length > 5 && num.length < 20) targetJid = num + "@s.whatsapp.net";
    }

    if (!targetJid) {
      return m.reply(
        `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `  ┊ ➶ \`${m.prefix}rpgcouple @tag\`\n` +
        `  ┊ ➶ Reply pesan + \`${m.prefix}rpgcouple\`\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    if (targetJid === m.sender) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
        `  ┊ ➶ ❌ Tidak bisa pacaran dengan diri sendiri!\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    ensureRpg({ sender: targetJid, pushName: targetJid.split("@")[0] }, targetJid.split("@")[0]);
    const targetCinta = getCintaData({ sender: targetJid, pushName: targetJid.split("@")[0] });
    if (targetCinta.spouse) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
        `  ┊ ➶ 💔 @${targetJid.split("@")[0]} sudah punya pasangan!\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    const targetRpg = getRpgData({ sender: targetJid, pushName: targetJid.split("@")[0] });
    if ((targetRpg.level || 1) < DATING_MIN_LEVEL) {
      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
        `  ┊ ➶ ❌ Level @${targetJid.split("@")[0]} belum cukup!\n` +
        `  ┊ ➶ Butuh minimal level *${DATING_MIN_LEVEL}*\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    // Auto-match
    if (targetCinta.tembakTarget === m.sender) {
      const { getDatabase } = await import("../../src/lib/nova-database.js");
      const db = getDatabase();
      const targetName = db.getUser(targetJid)?.name || targetJid.split("@")[0];
      startDating(m, targetJid, targetName);
      startDating({ sender: targetJid, pushName: targetName }, m.sender, m.pushName || "Player");

      return m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
        `  ┊ ➶ 💕 *CIE CIE!*\n` +
        `  ┊ ➶ @${m.sender.split("@")[0]} dan @${targetJid.split("@")[0]} resmi jadian!\n` +
        `  ┊ ➶ ❤️ Affection awal: *50*\n` +
        `  ┊ ➶ 📅 Mulai kencan dengan \`${m.prefix}rpgkencan\`\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
    }

    // Simpan tembakan
    cinta.tembakTarget = targetJid;
    const { getDatabase } = await import("../../src/lib/nova-database.js");
    const db = getDatabase();
    rpg.cinta = cinta;
    db.setUser(m.sender, rpg);
    db.save();

    global.rpgCintaSessions[`${m.chat}_${targetJid}`] = {
      shooter: m.sender,
      target: targetJid,
      chat: m.chat,
      timestamp: Date.now(),
    };

    await m.reply(
      `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
      `  ┊ ➶ 🏹 @${m.sender.split("@")[0]} mengajak @${targetJid.split("@")[0]} berpacaran\n` +
      `  ┊ ➶ ⏱️ Berlaku *1 jam*\n\n` +
      `_Balas *terima* atau *tolak*_\n` +
      `Atau \`${m.prefix}rpgterima\` / \`${m.prefix}rpgtolak\`\n\n` +
      `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
    );
    await m.react("🏹");
  } catch (e) {
    console.error("[rpgcouple] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

async function answerHandler(m, sock) {
  try {
    if (!m.body || m.isCommand) return false;
    const text = m.body.trim().toLowerCase();
    if (text !== "terima" && text !== "tolak") return false;
    if (!m.quoted) return false;

    const sessions = Object.entries(global.rpgCintaSessions || {}).filter(
      ([key, val]) => val.target === m.sender && val.chat === m.chat
    );
    if (sessions.length === 0) return false;

    const valid = sessions.find(([, s]) => Date.now() - s.timestamp < SESSION_TIMEOUT);
    if (!valid) return false;

    const [sessKey, sess] = valid;
    const shooter = sess.shooter;

    const { getDatabase } = await import("../../src/lib/nova-database.js");
    const db = getDatabase();
    const shooterName = db.getUser(shooter)?.name || shooter.split("@")[0];
    const myName = m.pushName || m.sender.split("@")[0];

    if (text === "terima") {
      startDating({ sender: shooter, pushName: shooterName }, m.sender, myName);
      startDating(m, shooter, shooterName);
      delete global.rpgCintaSessions[sessKey];
      await m.react("💕");
      await m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
        `  ┊ ➶ 💕 *CIE CIE!*\n` +
        `  ┊ ➶ @${m.sender.split("@")[0]} dan @${shooter.split("@")[0]} resmi jadian!\n` +
        `  ┊ ➶ ❤️ Affection awal: *50*\n` +
        `  ┊ ➶ 📅 Mulai kencan dengan \`${m.prefix}rpgkencan\`\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
      return true;
    }

    if (text === "tolak") {
      const shooterCinta = getCintaData({ sender: shooter, pushName: shooterName });
      delete shooterCinta.tembakTarget;
      const shooterRpg = getRpgData({ sender: shooter, pushName: shooterName });
      shooterRpg.cinta = shooterCinta;
      db.setUser(shooter, shooterRpg);
      db.save();
      delete global.rpgCintaSessions[sessKey];
      await m.react("💔");
      await m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ *ʀᴘɢ ᴄᴏᴜᴘʟᴇ*\n\n` +
        `  ┊ ➶ 💔 @${m.sender.split("@")[0]} menolak @${shooter.split("@")[0]}\n` +
        `  ┊ ➶ Sabar ya, tingkatkan level dulu! 💪\n\n` +
        `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
      return true;
    }
    return false;
  } catch (e) {
    console.error("[rpgcouple-answer] Error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, answerHandler };
