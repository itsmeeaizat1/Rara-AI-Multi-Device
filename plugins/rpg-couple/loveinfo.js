// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Dashboard couple (stats, affection, war record, marriage bonus)

import { getRpgData } from "../../src/lib/rara-rpg-service.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import {
  getCintaData, getLovePower, getCouplePower, getMarriageBonus,
  formatDurasi
} from "../../src/lib/rara-rpg-cinta.js";

const pluginConfig = {
  name: "cintainfo",
  alias: ["cintainfo"],
  category: "rpg couple",
  description: "Dashboard hubungan RPG couple",
  usage: ".cintainfo atau .cintainfo @tag",
  example: ".cintainfo",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: true,
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

    const lines = [
      `Nama: ${name}`,
      `Level: ${rpg.level || 1}`,
    ];

    if (cinta.spouse) {
      lines.push("---", `Pasangan: ${cinta.spouseName}`);

      if (cinta.datingDate) {
        const pacarDurasi = now - cinta.datingDate;
        lines.push(`Pacaran: ${formatDurasi(pacarDurasi)}`);
      }

      if (cinta.married) {
        lines.push("Status: Menikah");
        if (cinta.marriedDate) {
          const nikahDurasi = now - cinta.marriedDate;
          lines.push(`Nikah: ${formatDurasi(nikahDurasi)}`);
        }
      } else {
        lines.push("Status: Belum menikah");
      }

      // Affection bar
      const aff = cinta.affection || 0;
      const affBar = Math.min(10, Math.floor(aff / 50));
      lines.push(`Affection: ${aff} [${"❤️".repeat(affBar)}${"🤍".repeat(10 - affBar)}]`);

      // Love power
      const myPower = getLovePower({ sender: targetJid, pushName: name });
      const couplePower = getCouplePower({ sender: targetJid, pushName: name });
      lines.push(`Love Power: ${myPower}`, `Couple Power: ${couplePower}`);

      // Marriage bonus
      const bonus = getMarriageBonus({ sender: targetJid, pushName: name });
      if (bonus) {
        lines.push("---", { sub: "Marriage Bonus" },
          `HP: +${bonus.hp}`,
          `ATK: +${bonus.atk}`,
          `DEF: +${bonus.def}`,
          `EXP: +${bonus.exp}%`,
          `Gold: +${bonus.gold}%`);
      }

      // War record
      const warWin = cinta.warWin || 0;
      const warLose = cinta.warLose || 0;
      const totalWar = warWin + warLose;
      const winRate = totalWar > 0 ? Math.floor((warWin / totalWar) * 100) : 0;
      lines.push("---", { sub: "Couple War Record" },
        `Menang: ${warWin}`,
        `Kalah: ${warLose}`,
        `Win Rate: ${winRate}%`);
    } else if (cinta.tembakTarget) {
      lines.push("---", "Status: Menunggu jawaban", `Target: ${cinta.tembakTarget.split("@")[0]}`);
    } else {
      lines.push("---", "Status: Jomblo", `Mulai dengan ${m.prefix}jadianmatch @tag`);
    }

    // Kencan stats
    if (cinta.totalKencan || cinta.breakupCount || cinta.divorceCount) {
      lines.push("---", { sub: "Statistik" });
      if (cinta.totalKencan) lines.push(`Total Kencan: ${cinta.totalKencan}x`);
      if (cinta.breakupCount) lines.push(`Total Putus: ${cinta.breakupCount}x`);
      if (cinta.divorceCount) lines.push(`Total Cerai: ${cinta.divorceCount}x`);
    }

    await m.reply(raraRpgBox("Cinta Info", lines));
    await m.react("💑");
  } catch (e) {
    console.error("[cintainfo] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
