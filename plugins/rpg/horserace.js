import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { animHorserace } from "../../src/lib/nova-rpg-anim.js";

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
      await m.react('🐣');
      return m.reply(novaRpgBox("horserace", [
        `Gold kamu : ${wallet.gold}`,
        "---",
        "Daftar kuda pertandingan :",
        ...HORSES.flatMap((horse) => [
          `#${horse.id} ${horse.name}`,
          `   Odds : ${horse.odds}x (${horse.tag})`,
        ]),
        "---",
        `📌 ${m.prefix}horserace bet <nomor_kuda> <jumlah_gold>`,
      ], "info"));
    }

    if (subCmd === "bet" || subCmd === "pasang") {
      const horseNum = parseInt(m.args[1], 10);
      const betAmount = parseInt(m.args[2], 10);

      if (isNaN(horseNum) || isNaN(betAmount) || betAmount <= 0) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
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
          novaRpgBox(
            "horserace",
            `Nomor kuda tidak valid! Pilih nomor 1 sampai 5.\n\nCek list: ${m.prefix}horserace list`,
            "error"
          )
        );
      }

      if (wallet.gold < betAmount) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "horserace",
            `Gold kamu tidak cukup untuk bertaruh ${betAmount} Gold!\n\nGold Kamu: ${wallet.gold} Gold`,
            "error"
          )
        );
      }

      // Deduct bet
      wallet.gold -= betAmount;

      // Animasi balapan
      await animHorserace(m, sock, selectedHorse.name);

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

      if (isWon) {
        await m.react('🐣');
      } else {
        await m.react('❌');
      }

      return m.reply(novaGameBox({
        title: "horserace", icon: "🏁",
        flavor: isWon ? "🎉 *KUDA KAMU JUARA!*" : "💀 *KUDA KAMU KALAH!*",
        body: [
          "Papan lintasan :",
          ...raceResults.map((h, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
            const track = "▰".repeat(h.progress) + "🐎" + "▱".repeat(10 - h.progress);
            return `${medal} #${h.id} ${h.name.padEnd(14)} [${track}]`;
          }),
          "",
          `│ • Pemenang : #${winner.id} ${winner.name}`,
          `│ • Pilihanmu : #${selectedHorse.id} ${selectedHorse.name}`,
          isWon ? `│ • 💰 Hadiah : +${winReward} Gold (${selectedHorse.odds}x)` : `│ • 💸 Taruhan hangus : -${betAmount} Gold`,
          `│ • 💰 Total gold : ${wallet.gold} Gold`,
        ].join("\n"),
        cta: gameCTA("horserace"),
      }));
    }

    await m.react('❌');
    return m.reply(
      novaRpgBox(
        "horserace",
        `Perintah tidak valid!\n\nGunakan:\n• ${m.prefix}horserace list\n• ${m.prefix}horserace bet <nomor_kuda> <jumlah_gold>`,
        "guide"
      )
    );
  } catch (err) {
    console.error("horserace error:", err);
    await m.react('❌');
    return m.reply(novaRpgBox("horserace", err.message || "Terjadi kesalahan pada Balap Kuda.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
