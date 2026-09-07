import { getDatabase } from "../../src/lib/nova-database.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import { rpgSleep } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "bounty",
  alias: ["bounty", "bountyhunter", "buronan"],
  category: "rpg",
  description: "Sistem Bounty Hunter untuk memburu NPC buronan demi mendapatkan gold",
  usage: ".bounty [list|hunt <target_id>]",
  example: ".bounty hunt 1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const TARGETS = [
  {
    id: "1",
    name: "Goblin Pencuri",
    difficulty: "Easy",
    winChance: 85,
    energiCost: 10,
    minGold: 500,
    maxGold: 1000,
    desc: "Pencuri pasar desa.",
  },
  {
    id: "2",
    name: "Bandit Gurun",
    difficulty: "Medium",
    winChance: 70,
    energiCost: 20,
    minGold: 1200,
    maxGold: 2500,
    desc: "Perampok jalur perdagangan.",
  },
  {
    id: "3",
    name: "Naga Pembakar Desa",
    difficulty: "Hard",
    winChance: 50,
    energiCost: 35,
    minGold: 3000,
    maxGold: 6000,
    desc: "Monster perkasa di puncak gunung.",
  },
  {
    id: "4",
    name: "Demon Lord Malakor",
    difficulty: "Deadly",
    winChance: 30,
    energiCost: 50,
    minGold: 7500,
    maxGold: 15000,
    desc: "Raja iblis kegelapan abad ini.",
  },
];

async function handler(m, { sock }) {
  try {
    await m.react('🕒');
    const db = await getDatabase();
    const sender = m.sender;
    const subCmd = (m.args[0] || "").toLowerCase();

    // Get player RPG state
    let player = (await db.getPlayerData?.(sender, "bounty")) || {
      energi: 100,
      gold: 500,
      totalHunts: 0,
      successfulHunts: 0,
    };

    if (typeof player.energi !== "number") player.energi = 100;

    if (subCmd === "list" || !subCmd) {
      await m.react('🐣');
      return m.reply(novaRpgBox("bounty", [
        `Energi kamu : ${player.energi}`,
        "---",
        "Daftar buronan aktif :",
        ...TARGETS.flatMap((target) => [
          `${target.id} — ${target.name}`,
          `   Kesulitan : ${target.difficulty} (peluang ${target.winChance}%)`,
          `   Energi : ${target.energiCost}`,
          `   Imbalan : ${target.minGold} - ${target.maxGold} Gold`,
          `   ${target.desc}`,
        ]),
        "---",
        `📌 ${m.prefix}bounty hunt <id_target>`,
      ], "info"));
    }

    if (subCmd === "hunt" || subCmd === "buru") {
      const targetId = m.args[1];
      const target = TARGETS.find((t) => t.id === targetId || t.name.toLowerCase().includes((targetId || "").toLowerCase()));

      if (!target) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "bounty",
            `Target buronan tidak ditemukan!\n\nLihat daftar buronan dengan: ${m.prefix}bounty list`,
            "error"
          )
        );
      }

      if (player.energi < target.energiCost) {
        await m.react('❌');
        return m.reply(
          novaRpgBox(
            "bounty",
            `Energi kamu tidak cukup untuk memburu *${target.name}*!\n\nMembutuhkan: ${target.energiCost} Energi | Memiliki: ${player.energi} Energi`,
            "error"
          )
        );
      }

      // Deduct energi
      player.energi -= target.energiCost;
      player.totalHunts = (player.totalHunts || 0) + 1;

      // Roll chance
      const roll = Math.random() * 100;
      const isWin = roll <= target.winChance;

      if (isWin) {
        const rewardGold = Math.floor(
          target.minGold + Math.random() * (target.maxGold - target.minGold + 1)
        );
        player.gold = (player.gold || 0) + rewardGold;
        player.successfulHunts = (player.successfulHunts || 0) + 1;

        await db.setPlayerData?.(sender, "bounty", player);

        await m.react('🐣');
        return m.reply(novaGameBox({
          title: "bounty", icon: "🎯",
          flavor: "⚔️ *BURONAN TUMBANG!*",
          body: [
            `│ • Target : ${target.name}`,
            `│ • Kesulitan : ${target.difficulty}`,
            `│ • 💰 Imbalan : +${rewardGold} Gold`,
            `│ • ⚡ Sisa energi : ${player.energi}`,
          ].join("\n"),
          cta: gameCTA("bounty"),
        }));
      } else {
        await db.setPlayerData?.(sender, "bounty", player);

        await m.react('❌');
        return m.reply(novaGameBox({
          title: "bounty", icon: "🎯",
          flavor: "💥 *KAMU KALAH!*",
          body: [
            `│ • Target : ${target.name}`,
            "│ • 🩹 Buronan melarikan diri dan melukaimu",
            `│ • ⚡ Energi terpakai : -${target.energiCost}`,
            `│ • ⚡ Sisa energi : ${player.energi}`,
          ].join("\n"),
          cta: gameCTA("bounty"),
        }));
      }
    }

    await m.react('❌');
    return m.reply(
      novaRpgBox(
        "bounty",
        `Perintah tidak diketahui!\n\nGunakan:\n• ${m.prefix}bounty list\n• ${m.prefix}bounty hunt <id>`,
        "guide"
      )
    );
  } catch (err) {
    console.error("bounty error:", err);
    await m.react('❌');
    return m.reply(novaRpgBox("bounty", err.message || "Terjadi kesalahan pada sistem Bounty.", "error"));
  }
}

export { pluginConfig, pluginConfig as config, handler };
