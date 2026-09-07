// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Lamar pasangan untuk menikah (butuh min affection + dating days)

import { ensureRpg, getRpgData, removeGold } from "../../src/lib/nova-rpg-service.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import {
  getCintaData, marry,
  MARRIAGE_MIN_AFFECTION, MARRIAGE_MIN_DATING_DAYS, formatDurasi
} from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "nikahmatch",
  alias: ["nikahmatch", "rpgnikah"],
  category: "rpg couple",
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
        novaRpgBox("Nikah", `Belum punya pacar, mau nikah sama siapa?\nGunakan ${m.prefix}rpgcouple @tag dulu.`)
      );
    }

    if (cinta.married) {
      return m.reply(novaRpgBox("Nikah", `Kamu sudah menikah dengan *${cinta.spouseName}*`));
    }

    // Cek affection
    if ((cinta.affection || 0) < MARRIAGE_MIN_AFFECTION) {
      return m.reply(
        novaRpgBox("Nikah", `Affection belum cukup.\nButuh: *${MARRIAGE_MIN_AFFECTION}* | Punya: *${cinta.affection || 0}*\nKencan lebih banyak dengan ${m.prefix}rpgkencan`)
      );
    }

    // Cek durasi pacaran
    const datingMs = Date.now() - (cinta.datingDate || 0);
    const datingDays = Math.floor(datingMs / 86400000);
    if (datingDays < MARRIAGE_MIN_DATING_DAYS) {
      return m.reply(
        novaRpgBox("Nikah", `Belum cukup lama pacaran.\nButuh: *${MARRIAGE_MIN_DATING_DAYS} hari* | Sudah: *${datingDays} hari*`)
      );
    }

    // Cek gold
    if ((rpg.gold || 0) < MARRIAGE_COST) {
      return m.reply(
        novaRpgBox("Nikah", `Gold tidak cukup untuk biaya nikah.\nBiaya: *${MARRIAGE_COST} gold* | Punya: *${rpg.gold || 0} gold*`)
      );
    }

    // Simpan lamaran
    global.rpgNikahSessions[`${m.chat}_${m.sender}`] = {
      proposer: m.sender,
      target: cinta.spouse,
      chat: m.chat,
      timestamp: Date.now(),
    };

    await m.reply(novaGameBox({
      title: "rpg cinta", icon: "💍",
      flavor: "💍 *LAMARAN TERKIRIM!*",
      body: [
        `│ • 💍 @${m.sender.split("@")[0]} melamar @${cinta.spouse.split("@")[0]}`,
        `│ • 💑 Pasangan : ${cinta.spouseName}`,
        `│ • 💕 Affection : ${cinta.affection}`,
        "│ • Berlaku : 1 jam",
        "│ • Balas pesan ini: terima / tolak",
        `│ • Atau ${m.prefix}rpgterimanikah / ${m.prefix}rpgtolaknikah`,
      ].join("\n"),
      cta: gameCTA("nikahmatch"),
    }));
    await m.react("💍");
  } catch (e) {
    console.error("[rpgnikah] Error:", e.message);
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
      removeGold({ sender: proposer, pushName: "", chat: m.chat }, MARRIAGE_COST, sock);
      // Marry both
      marry({ sender: proposer, pushName: "" });
      marry(m);
      delete global.rpgNikahSessions[sessKey];
      await m.react("💍");
      await m.reply(novaGameBox({
        title: "rpg cinta", icon: "💍",
        flavor: "💍 *SELAMAT MENIKAH!*",
        body: [
          `│ • 💑 @${m.sender.split("@")[0]} & @${proposer.split("@")[0]}`,
          `│ • 💰 Biaya pernikahan : ${MARRIAGE_COST} gold`,
          "│ • 🤲 Semoga sakinah, mawaddah, warahmah",
          "│ • Marriage bonus aktif untuk RPG battle!",
        ].join("\n"),
        cta: gameCTA("nikahmatch"),
      }));
      return true;
    }

    if (text === "tolak") {
      delete global.rpgNikahSessions[sessKey];
      await m.react("💔");
      await m.reply(
        novaRpgBox("Nikah", `@${m.sender.split("@")[0]} menolak @${proposer.split("@")[0]}\nSabar ya, jodoh tidak kemana!`)
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