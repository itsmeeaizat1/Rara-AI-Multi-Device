// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rankv2",
  alias: ["pangkatv2", "levelrank"],
  category: "game",
  description: "Cek rank/level dan naik level",
  usage: ".rank",
  example: ".rank",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const userId = m.sender;
    const userName = m.pushName || "Player";

    const player = db?.getRpgPlayer?.(userId) || {
      name: userName,
      level: 1,
      exp: 0,
      maxExp: 100,
      rank: "E",
      nextRank: "D",
      gold: 0,
    };

    const text =
      claraWrap("Rank", [`  ┊  ➶ Nama: *${player.name || userName}*`,
        `  ┊  ➶ Level: *${player.level || 1}*`,
        `  ┊  ➶ Rank: *${player.rank || "E"}*`,
        `  ┊  ➶ Next Rank: *${player.nextRank || "D"}*`,
        `  ┊  ➶ Exp: *${player.exp || 0}/${player.maxExp || 100}*`,
        `  ┊  ➶ Gold: *${player.gold || 0}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "rank");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("rankv2", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
