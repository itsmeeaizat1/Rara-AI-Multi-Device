// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Mulai berpacaran (dengan RPG stats)

import { ensureRpg, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { claraWrap, novaBox, novaGuide } from "../../src/lib/nova-menu-style.js";
import { getCintaData, startDating, DATING_MIN_LEVEL, formatDurasi } from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "jadianmatch",
  alias: ["jadianmatch", "rpgcouple"],
  category: "rpg couple",
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
      return m.reply(claraWrap("RPG Cinta", [
        `Eh udah punya pacar nih! Sama ${cinta.spouseName}`,
        `Affection: ${cinta.affection || 0}`,
        `Putus? ${m.prefix}putusmatch`,
      ]));
    }

    if ((rpg.level || 1) < DATING_MIN_LEVEL) {
      return m.reply(claraWrap("RPG Cinta", [
        `Levelmu belum cukup nih!`,
        `Butuh minimal: ${DATING_MIN_LEVEL}`,
        `Level kamu: ${rpg.level || 1}`,
      ], "error"));
    }

    let targetJid = null;
    if (m.mentionedJid?.[0]) targetJid = m.mentionedJid[0];
    else if (m.quoted) targetJid = m.quoted.sender;
    else if (m.args?.[0]) {
      const num = m.args[0].replace(/[^0-9]/g, "");
      if (num.length > 5 && num.length < 20) targetJid = num + "@s.whatsapp.net";
    }

    if (!targetJid) {
      return m.reply(novaGuide("rpgcouple", "Mau jadian? Tag orangnya atau reply pesannya ya!", `${m.prefix}rpgcouple @tag`, "Atau reply pesannya + .rpgcouple"));
    }

    if (targetJid === m.sender) {
      return m.reply(claraWrap("RPG Cinta", "Tidak bisa pacaran dengan diri sendiri!", "error"));
    }

    ensureRpg({ sender: targetJid, pushName: targetJid.split("@")[0] }, targetJid.split("@")[0]);
    const targetCinta = getCintaData({ sender: targetJid, pushName: targetJid.split("@")[0] });
    if (targetCinta.spouse) {
      return m.reply(claraWrap("RPG Cinta", `@${targetJid.split("@")[0]} sudah punya pasangan!`, "warn"));
    }

    const targetRpg = getRpgData({ sender: targetJid, pushName: targetJid.split("@")[0] });
    if ((targetRpg.level || 1) < DATING_MIN_LEVEL) {
      return m.reply(claraWrap("RPG Cinta", [
        `Level @${targetJid.split("@")[0]} belum cukup!`,
        `Butuh minimal level ${DATING_MIN_LEVEL}`,
      ], "error"));
    }

    // Auto-match
    if (targetCinta.tembakTarget === m.sender) {
      const { getDatabase } = await import("../../src/lib/nova-database.js");
      const db = getDatabase();
      const targetName = db.getUser(targetJid)?.name || targetJid.split("@")[0];
      startDating(m, targetJid, targetName);
      startDating({ sender: targetJid, pushName: targetName }, m.sender, m.pushName || "Player");

      return m.reply(novaBox("RPG Cinta", [
        `💕 Cie cie! @${m.sender.split("@")[0]} dan @${targetJid.split("@")[0]} resmi jadian!`,
        `Affection awal: 50`,
        "---",
        `Mulai kencan dengan ${m.prefix}rpgkencan`,
      ]));
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

    await m.reply(novaBox("RPG Cinta", [
      `🏹 @${m.sender.split("@")[0]} mengajak @${targetJid.split("@")[0]} berpacaran`,
      `Berlaku: 1 jam`,
      "---",
      "Balas terima atau tolak",
      `Atau ${m.prefix}rpgterima / ${m.prefix}rpgtolak`,
    ]));
    await m.react("🏹");
  } catch (e) {
    console.error("[rpgcouple] Error:", e.message);
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
      await m.reply(novaBox("RPG Cinta", [
        `💕 Cie cie! @${m.sender.split("@")[0]} dan @${shooter.split("@")[0]} resmi jadian!`,
        `Affection awal: 50`,
        "---",
        `Mulai kencan dengan ${m.prefix}rpgkencan`,
      ]));
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
      await m.reply(claraWrap("RPG Cinta", [
        `💔 @${m.sender.split("@")[0]} menolak @${shooter.split("@")[0]}`,
        "Sabar ya, tingkatkan level dulu!",
      ], "warn"));
      return true;
    }
    return false;
  } catch (e) {
    console.error("[rpgcouple-answer] Error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, answerHandler };
