// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Lamar pasangan untuk menikah (butuh min affection + dating days)

import { ensureRpg, getRpgData, removeGold } from "../../src/lib/nova-rpg-service.js";
import {
  getCintaData, marry,
  MARRIAGE_MIN_AFFECTION, MARRIAGE_MIN_DATING_DAYS, formatDurasi
} from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "nikahmatch",
  alias: ["nikahmatch", "rpglamar", "rpgmarry"],
  category: "rpg",
  description: "Lamar pasangan RPG untuk menikah",
  usage: ".rpgnikah",
  example: ".rpgnikah",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

if (!global.rpgNikahSessions) global.rpgNikahSessions = {};
const SESSION_TIMEOUT = 3600000;
const MARRIAGE_COST = 500;

async function handler(m, { sock }) {
  try {
    ensureRpg(m, m.pushName || "Player");
    const rpg = getRpgData(m);
    const cinta = getCintaData(m);

    if (!cinta.spouse) {
      return m.reply(
        `╭──「 *ʀᴘɢ ɴɪᴋᴀʜ*\n\n」` +
        `  ┊ ➶ ❌ Kamu belum berpacaran!\n` +
        `  ┊ ➶ Gunakan \`${m.prefix}rpgcouple @tag\` dulu\n\n` +
        `╰──────────❀`
      );
    }

    if (cinta.married) {
      return m.reply(
        `╭──「 *ʀᴘɢ ɴɪᴋᴀʜ*\n\n」` +
        `  ┊ ➶ 💍 Kamu sudah menikah dengan *${cinta.spouseName}*\n\n` +
        `╰──────────❀`
      );
    }

    // Cek affection
    if ((cinta.affection || 0) < MARRIAGE_MIN_AFFECTION) {
      return m.reply(
        `╭──「 *ʀᴘɢ ɴɪᴋᴀʜ*\n\n」` +
        `  ┊ ➶ ❌ Affection belum cukup!\n` +
        `  ┊ ➶ Butuh: *${MARRIAGE_MIN_AFFECTION}* affection\n` +
        `  ┊ ➶ Punya: *${cinta.affection || 0}* affection\n` +
        `  ┊ ➶ Kencan lebih banyak dengan \`${m.prefix}rpgkencan\`\n\n` +
        `╰──────────❀`
      );
    }

    // Cek durasi pacaran
    const datingMs = Date.now() - (cinta.datingDate || 0);
    const datingDays = Math.floor(datingMs / 86400000);
    if (datingDays < MARRIAGE_MIN_DATING_DAYS) {
      return m.reply(
        `╭──「 *ʀᴘɢ ɴɪᴋᴀʜ*\n\n」` +
        `  ┊ ➶ ❌ Belum cukup lama pacaran!\n` +
        `  ┊ ➶ Butuh minimal *${MARRIAGE_MIN_DATING_DAYS} hari*\n` +
        `  ┊ ➶ Sudah: *${datingDays} hari*\n\n` +
        `╰──────────❀`
      );
    }

    // Cek gold
    if ((rpg.gold || 0) < MARRIAGE_COST) {
      return m.reply(
        `╭──「 *ʀᴘɢ ɴɪᴋᴀʜ*\n\n」` +
        `  ┊ ➶ ❌ Gold tidak cukup untuk biaya nikah!\n` +
        `  ┊ ➶ Biaya: *${MARRIAGE_COST} gold*\n` +
        `  ┊ ➶ Punya: *${rpg.gold || 0} gold*\n\n` +
        `╰──────────❀`
      );
    }

    // Simpan lamaran
    global.rpgNikahSessions[`${m.chat}_${m.sender}`] = {
      proposer: m.sender,
      target: cinta.spouse,
      chat: m.chat,
      timestamp: Date.now(),
    };

    await m.reply(
      `╭──「 *ʀᴘɢ ʟᴀᴍᴀʀᴀɴ*\n\n」` +
      `  ┊ ➶ 💍 @${m.sender.split("@")[0]} melamar @${cinta.spouse.split("@")[0]}\n` +
      `  ┊ ➶ ❤️ Pasangan: *${cinta.spouseName}*\n` +
      `  ┊ ➶ 💕 Affection: *${cinta.affection}*\n` +
      `  ┊ ➶ ⏱️ Berlaku *1 jam*\n\n` +
      `_Balas *terima* atau *tolak*_\n` +
      `Atau \`${m.prefix}rpgterimanikah\` / \`${m.prefix}rpgtolaknikah\`\n\n` +
      `╰──────────❀`
    );
    await m.react("💍");
  } catch (e) {
    console.error("[rpgnikah] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

async function answerHandler(m, sock) {
  try {
    if (!m.body || m.isCommand) return false;
    const text = m.body.trim().toLowerCase();
    if (text !== "terima" && text !== "tolak") return false;
    if (!m.quoted) return false;

    const sessions = Object.entries(global.rpgNikahSessions || {}).filter(
      ([key, val]) => val.target === m.sender && val.chat === m.chat
    );
    if (sessions.length === 0) return false;

    const valid = sessions.find(([, s]) => Date.now() - s.timestamp < SESSION_TIMEOUT);
    if (!valid) return false;

    const [sessKey, sess] = valid;
    const proposer = sess.proposer;

    if (text === "terima") {
      // Deduct gold
      removeGold({ sender: proposer, pushName: "" }, MARRIAGE_COST);
      // Marry both
      marry({ sender: proposer, pushName: "" });
      marry(m);
      delete global.rpgNikahSessions[sessKey];
      await m.react("💍");
      await m.reply(
        `╭──「 *sᴇʟᴀᴍᴀᴛ ᴍᴇɴɪᴋᴀʜ 💍*\n\n」` +
        `  ┊ ➶ 💒 @${m.sender.split("@")[0]} dan @${proposer.split("@")[0]} resmi menikah!\n` +
        `  ┊ ➶ 💰 Biaya: *${MARRIAGE_COST} gold*\n` +
        `  ┊ ➶ 💕 Semoga sakinah, mawaddah, warahmah 🤲\n` +
        `  ┊ ➶ ⚡ Marriage bonus aktif untuk RPG battle!\n\n` +
        `╰──────────❀`
      );
      return true;
    }

    if (text === "tolak") {
      delete global.rpgNikahSessions[sessKey];
      await m.react("💔");
      await m.reply(
        `╭──「 *ʟᴀᴍᴀʀᴀɴ ᴅɪᴛᴏʟᴀᴋ 💔*\n\n」` +
        `  ┊ ➶ 💔 @${m.sender.split("@")[0]} menolak @${proposer.split("@")[0]}\n` +
        `  ┊ ➶ Sabar ya, jodoh tidak kemana! 🤲\n\n` +
        `╰──────────❀`
      );
      return true;
    }
    return false;
  } catch (e) {
    console.error("[rpgnikah-answer] Error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, answerHandler };
