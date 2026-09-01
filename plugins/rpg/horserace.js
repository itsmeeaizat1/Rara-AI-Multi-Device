import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "horserace",
  alias: ["horserace", "balapkuda", "kuda"],
  category: "rpg",
  description: "Taruhan balap kuda RPG dengan visualisasi kemajuan lomba",
  usage: ".horserace [list|bet <nomor_kuda> <jumlah_taruhan>]",
  example: ".horserace bet 1 500",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const HORSES = [
  { id: 1, name: "Thunder Bolt", odds: 2.0, tag: "Favorit Utama" },
  { id: 2, name: "Shadow Runner", odds: 3.5, tag: "Kecepatan Stabil" },
  { id: 3, name: "Red Comet", odds: 5.0, tag: "Kuda Hitam" },
  { id: 4, name: "Golden Blade", odds: 8.0, tag: "Risiko Tinggi" },
  { id: 5, name: "Phantom Wind", odds: 12.0, tag: "Legendaris" },
];

async function handler(m, { sock }) {
  try {
    await m.react('🕒');
    const db = await getDatabase();
    const sender = m.sender;
    const subCmd = (m.args[0] || "").toLowerCase();

    // Load player wallet
    let wallet = (await db.getPlayerData?.(sender, "horserace")) || { gold: 2000 };
    if (typeof wallet.gold !== "number") wallet.gold = 2000;

    if (subCmd === "list" || !subCmd) {
      let msg = `╭─「 *HORSE RACING ARENA* 」\n`;
      msg += `│ 💰 Gold Kamu: *${wallet.gold}*\n│\n`;
      msg += `│ Daftar Kuda Pertandingan:\n│\n`;

      HORSES.forEach((horse) => {
        msg += `│ 🐎 *#${horse.id} ${horse.name}*\n`;
        msg += `│   • Odds: *${horse.odds}x* (${horse.tag})\n│\n`;
      });

      msg += `│ Perintah Taruhan:\n`;
      msg += `│ ${m.prefix}horserace bet <Nomor_Kuda> <Jumlah_Gold>\n`;
      msg += `╰──────────`;

      await m.react('🐣');
      return m.reply(msg);
    }

    if (subCmd === "bet" || subCmd === "pasang") {
      const horseNum = parseInt(m.args[1], 10);
      const betAmount = parseInt(m.args[2], 10);

      if (isNaN(horseNum) || isNaN(betAmount) || betAmount <= 0) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "horserace",
            `Format taruhan tidak valid!\n\nContoh: ${m.prefix}horserace bet 1 500`,
            "error"
          )
        );
      }

      const selectedHorse = HORSES.find((h) => h.id === horseNum);
      if (!selectedHorse) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "horserace",
            `Nomor kuda tidak valid! Pilih nomor 1 sampai 5.\n\nCek list: ${m.prefix}horserace list`,
            "error"
          )
        );
      }

      if (wallet.gold < betAmount) {
        await m.react('❌');
        return m.reply(
          claraWrap(
            "horserace",
            `Gold kamu tidak cukup untuk bertaruh ${betAmount} Gold!\n\nGold Kamu: ${wallet.gold} Gold`,
            "error"
          )
        );
      }

      // Deduct bet
      wallet.gold -= betAmount;

      // Simulate race with weighted rolls
      const raceResults = HORSES.map((h) => {
        const baseSpeed = 100 / h.odds;
        const randomBoost = Math.random() * 50;
        return {
          ...h,
          score: baseSpeed + randomBoost,
          progress: Math.floor(Math.random() * 3) + 7,
        };
      });

      // Sort by score descending
      raceResults.sort((a, b) => b.score - a.score);
      const winner = raceResults[0];

      const isWon = winner.id === selectedHorse.id;
      const winReward = Math.floor(betAmount * selectedHorse.odds);

      if (isWon) {
        wallet.gold += winReward;
      }

      await db.setPlayerData?.(sender, "horserace", wallet);

      let msg = `╭─「 *HORSE RACE RESULT* 」\n`;
      msg += `│ 🏁 Balapan Kuda Selesai!\n`;
      msg += `│  \n`;
      msg += `│ Papan Lintasan Balap:\n`;

      raceResults.forEach((h, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
        const track = "═".repeat(h.progress) + "🐎" + "═".repeat(10 - h.progress);
        msg += `│ ${medal} #${h.id} ${h.name.padEnd(14)} [🏁${track}]\n`;
      });

      msg += `│  \n`;
      msg += `│ 🏆 *Pemenang:* #${winner.id} ${winner.name}\n`;
      msg += `│ 🎯 *Pilihanmu:* #${selectedHorse.id} ${selectedHorse.name}\n`;

      if (isWon) {
        msg += `│ 🎉 *MENANG!* Kamu mendapatkan *+${winReward} Gold* (${selectedHorse.odds}x)\n`;
      } else {
        msg += `│ 💀 *KALAH!* Taruhan sebesar ${betAmount} Gold hangus.\n`;
      }

      msg += `│ 💰 Total Gold Sekarang: *${wallet.gold} Gold*\n`;
      msg += `╰──────────`;

      if (isWon) {
        await m.react('🐣');
      } else {
        await m.react('❌');
      }

      return m.reply(msg);
    }

    await m.react('❌');
    return m.reply(
      claraWrap(
        "horserace",
        `Perintah tidak valid!\n\nGunakan:\n• ${m.prefix}horserace list\n• ${m.prefix}horserace bet <nomor_kuda> <jumlah_gold>`,
        "guide"
      )
    );
  } catch (err) {
    console.error("horserace error:", err);
    await m.react('❌');
    return m.reply(claraWrap("horserace", err.message || "Terjadi kesalahan pada Balap Kuda.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
