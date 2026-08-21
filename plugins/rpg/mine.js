// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "minev2",
  alias: ["gali", "galiv2", "tambangmine"],
  category: "economy",
  description: "Tambang resource untuk dapat gold dan exp",
  usage: ".mine",
  example: ".mine",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Placeholder: ganti dengan logic mining RPG kamu
    const rewards = [
      { name: "Batu", chance: 40, gold: 10, exp: 5 },
      { name: "Emas", chance: 20, gold: 50, exp: 15 },
      { name: "Beras", chance: 15, gold: 5, exp: 2 },
      { name: "Perak", chance: 15, gold: 30, exp: 10 },
      { name: "Intan", chance: 8, gold: 120, exp: 30 },
      { name: "Raksasa", chance: 2, gold: 300, exp: 60 },
    ];

    const roll = Math.random() * 100;
    let cumulative = 0;
    let reward = rewards[0];
    for (const r of rewards) {
      cumulative += r.chance;
      if (roll <= cumulative) {
        reward = r;
        break;
      }
    }

    const text =
      claraWrap("Mining", [`  ┊  ➶ Item: *${reward.name}*`,
        `  ┊  ➶ Gold: *+${reward.gold}*`,
        `  ┊  ➶ Exp: *+${reward.exp}*`,
        `  ┊  ➶ Luck: *${reward.chance}%*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}mine untuk tambang lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "mine");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("minev2", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
