// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Dashboard couple (stats, affection, war record, marriage bonus)

import { getRpgData } from "../../src/lib/nova-rpg-service.js";
import {
  getCintaData, getLovePower, getCouplePower, getMarriageBonus,
  formatDurasi
} from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "cintainfo",
  alias: ["cintainfo"],
  category: "rpg cinta",
  description: "Dashboard hubungan RPG couple",
  usage: ".cintainfo atau .cintainfo @tag",
  example: ".cintainfo",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    let targetJid = m.sender;
    if (m.mentionedJid?.[0]) targetJid = m.mentionedJid[0];
    else if (m.quoted) targetJid = m.quoted.sender;

    const rpg = getRpgData({ sender: targetJid, pushName: targetJid.split("@")[0] });
    const cinta = getCintaData({ sender: targetJid, pushName: targetJid.split("@")[0] });
    const name = rpg.name || targetJid.split("@")[0];
    const now = Date.now();

    let msg = `╭─「 *ᴄɪɴᴛᴀ ɪɴғᴏ* 」\n`;
    msg += `│ 👤 Nama: *${name}*\n`;
    msg += `│ ⭐ Level: *${rpg.level || 1}*\n`;

    if (cinta.spouse) {
      msg += `│ ❤️ Pasangan: *${cinta.spouseName}*\n`;

      if (cinta.datingDate) {
        const pacarDurasi = now - cinta.datingDate;
        msg += `│ 💕 Pacaran: *${formatDurasi(pacarDurasi)}*\n`;
      }

      if (cinta.married) {
        msg += `│ 💍 Status: *Menikah*\n`;
        if (cinta.marriedDate) {
          const nikahDurasi = now - cinta.marriedDate;
          msg += `│ 📅 Nikah: *${formatDurasi(nikahDurasi)}*\n`;
        }
      } else {
        msg += `│ 💍 Status: *Belum menikah*\n`;
      }

      // Affection bar
      const aff = cinta.affection || 0;
      const affBar = Math.min(10, Math.floor(aff / 50));
      msg += `│ 💕 Affection: *${aff}* [${"❤️".repeat(affBar)}${"🤍".repeat(10 - affBar)}]\n`;

      // Love power
      const myPower = getLovePower({ sender: targetJid, pushName: name });
      const couplePower = getCouplePower({ sender: targetJid, pushName: name });
      msg += `│ ⚔️ Love Power: *${myPower}*\n`;
      msg += `│ 💪 Couple Power: *${couplePower}*\n`;

      // Marriage bonus
      const bonus = getMarriageBonus({ sender: targetJid, pushName: name });
      if (bonus) {
        msg += `\n  🎁 *Marriage Bonus:*\n`;
        msg += `│ ❤️ HP: *+${bonus.hp}*\n`;
        msg += `│ ⚔️ ATK: *+${bonus.atk}*\n`;
        msg += `│ 🛡️ DEF: *+${bonus.def}*\n`;
        msg += `│ ✨ EXP: *+${bonus.exp}%*\n`;
        msg += `│ 💰 Gold: *+${bonus.gold}%*\n`;
      }

      // War record
      const warWin = cinta.warWin || 0;
      const warLose = cinta.warLose || 0;
      const totalWar = warWin + warLose;
      const winRate = totalWar > 0 ? Math.floor((warWin / totalWar) * 100) : 0;
      msg += `\n  ⚔️ *Couple War Record:*\n`;
      msg += `│ 🏆 Menang: *${warWin}*\n`;
      msg += `│ 💥 Kalah: *${warLose}*\n`;
      msg += `│ 📊 Win Rate: *${winRate}%*\n`;
    } else if (cinta.tembakTarget) {
      msg += `│ 🏹 Status: *Menunggu jawaban*\n`;
      msg += `│ 🎯 Target: *${cinta.tembakTarget.split("@")[0]}*\n`;
    } else {
      msg += `│ 💔 Status: *Jomblo*\n`;
      msg += `│ 💡 Mulai dengan \`${m.prefix}jadianmatch @tag\`\n`;
    }

    // Kencan stats
    if (cinta.totalKencan || cinta.breakupCount || cinta.divorceCount) {
      msg += `\n  📊 *Statistik:*\n`;
      if (cinta.totalKencan) msg += `│ 💕 Total Kencan: *${cinta.totalKencan}x*\n`;
      if (cinta.breakupCount) msg += `│ 💔 Total Putus: *${cinta.breakupCount}x*\n`;
      if (cinta.divorceCount) msg += `│ 💔 Total Cerai: *${cinta.divorceCount}x*\n`;
    }

    msg += `\n╰──────────`;

    await m.reply(msg);
    await m.react("💑");
  } catch (e) {
    console.error("[cintainfo] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
