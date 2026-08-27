// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Kencan (Date Quest) — kasih affection + exp, burn energy + gold

import { getRpgData, useEnergy, addExp, addGold, removeGold, checkCooldown } from "../../src/lib/nova-rpg-service.js";
import {
  getCintaData, addAffection, getCouplePower,
  KENCAN_ACTIVITIES, KENCAN_COOLDOWN_HOURS, formatDurasi
} from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "kencanmatch",
  alias: ["kencanmatch"],
  category: "rpg",
  description: "Ajak pasangan kencan untuk tambah affection",
  usage: ".rpgkencan atau .rpgkencan pilih",
  example: ".rpgkencan",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = getRpgData(m);
    const cinta = getCintaData(m);

    if (!cinta.spouse) {
      return m.reply(
        `╭──「 *ʀᴘɢ ᴋᴇɴᴄᴀɴ* 」\n\n」` +
        `│ 💔 Kamu belum punya pasangan!\n` +
        `│ Gunakan \`${m.prefix}rpgcouple @tag\` dulu\n\n` +
        `╰──────────❀`
      );
    }

    // Cooldown check
    const cd = checkCooldown(m, "rpgkencan");
    if (cd) {
      return m.reply(
        `╭──「 *ʀᴘɢ ᴋᴇɴᴄᴀɴ* 」\n\n」` +
        `│ ⏳ Cooldown: *${formatDurasi(cd)}* lagi\n\n` +
        `╰──────────❀`
      );
    }

    const args = m.args || [];
    const pick = args[0] ? parseInt(args[0]) - 1 : null;

    if (pick === null || isNaN(pick) || pick < 0 || pick >= KENCAN_ACTIVITIES.length) {
      // Tampilkan menu kencan
      let msg = `╭──「 *ʀᴘɢ ᴋᴇɴᴄᴀɴ* 」\n\n」`;
      msg += `│ ❤️ Pasangan: *${cinta.spouseName || cinta.spouse.split("@")[0]}*\n`;
      msg += `│ 💕 Affection: *${cinta.affection || 0}*\n`;
      msg += `│ 💰 Gold: *${rpg.gold || 0}*\n`;
      msg += `│ ⚡ Energy: *${rpg.energy || 0}/${rpg.maxEnergy || 100}*\n\n`;
      msg += `  📋 *Pilih Aktivitas Kencan:*\n\n`;
      KENCAN_ACTIVITIES.forEach((a, i) => {
        msg += `│ ${i + 1}. ${a.emoji} ${a.name}\n`;
        msg += `│     💰 ${a.cost} gold | ⚡ ${a.energy} energy\n`;
        msg += `│     💕 +${a.affection} affection | ✨ +${a.exp} exp\n\n`;
      });
      msg += `  Ketik: \`${m.prefix}rpgkencan <nomor>\`\n\n`;
      msg += `╰──────────❀`;
      return m.reply(msg);
    }

    const activity = KENCAN_ACTIVITIES[pick];

    // Cek gold
    if ((rpg.gold || 0) < activity.cost) {
      return m.reply(
        `╭──「 *ʀᴘɢ ᴋᴇɴᴄᴀɴ* 」\n\n」` +
        `│ ❌ Gold tidak cukup!\n` +
        `│ Butuh: *${activity.cost} gold*\n` +
        `│ Punya: *${rpg.gold || 0} gold*\n\n` +
        `╰──────────❀`
      );
    }

    // Cek energy
    if (!useEnergy(m, activity.energy)) {
      return m.reply(
        `╭──「 *ʀᴘɢ ᴋᴇɴᴄᴀɴ* 」\n\n」` +
        `│ ❌ Energy tidak cukup!\n` +
        `│ Butuh: *${activity.energy} energy*\n\n` +
        `╰──────────❀`
      );
    }

    // Eksekusi kencan
    removeGold(m, activity.cost);
    addAffection(m, activity.affection);
    addExp(m, activity.exp);

    // Affection ke pasangan juga
    const partnerCinta = getCintaData({ sender: cinta.spouse, pushName: cinta.spouseName });
    addAffection({ sender: cinta.spouse, pushName: cinta.spouseName }, activity.affection);

    // Update lastKencan
    const myCinta = getCintaData(m);
    myCinta.lastKencan = Date.now();
    myCinta.totalKencan = (myCinta.totalKencan || 0) + 1;
    const myRpg = getRpgData(m);
    myRpg.cinta = myCinta;
    const db = (await import("../../src/lib/nova-database.js")).getDatabase();
    db.setUser(m.sender, myRpg);
    db.save();

    // Random event
    const events = [
      `Kencan berjalan lancar! ${activity.emoji}`,
      `Pasanganmu sangat senang! ${activity.emoji}`,
      `Momennya romantis banget! ${activity.emoji}`,
      `Acara ini bikin makin dekat! ${activity.emoji}`,
      `Kencan sukses, chemistry naik! ${activity.emoji}`,
    ];
    const event = events[Math.floor(Math.random() * events.length)];

    let msg = `╭──「 *ʀᴘɢ ᴋᴇɴᴄᴀɴ* 」\n\n」`;
    msg += `│ ${activity.emoji} Aktivitas: *${activity.name}*\n`;
    msg += `│ 💬 "${event}"\n`;
    msg += `│ ❤️ Bersama: *${cinta.spouseName || cinta.spouse.split("@")[0]}*\n\n`;
    msg += `  📊 *Hasil:*\n`;
    msg += `│ 💕 Affection: *+${activity.affection}* (Total: ${myCinta.affection})\n`;
    msg += `│ ✨ EXP: *+${activity.exp}*\n`;
    msg += `│ 💰 Gold: *-${activity.cost}*\n`;
    msg += `│ ⚡ Energy: *-${activity.energy}*\n\n`;
    msg += `╰──────────❀`;

    await m.reply(msg);
    await m.react(activity.emoji);
  } catch (e) {
    console.error("[rpgkencan] Error:", e.message);
    try { await m.react("❌"); } catch {}
  }
}

export { pluginConfig as config, handler };
