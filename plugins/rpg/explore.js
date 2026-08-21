// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "explore",
  alias: ["explore", "eksplor", "travel", "jelajah", "eksplorasi"],
  category: "game",
  description: "Jelajahi dunia dan dapat hadiah",
  usage: ".explore",
  example: ".explore",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 300,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Placeholder: ganti dengan logic explore RPG kamu
    const outcomes = [
      { text: "Kamu menemukan chest!", gold: 200, exp: 50 },
      { text: "Kamu bertemu monster!", gold: -50, exp: 20 },
      { text: "Kamu menemukan artifact langka!", gold: 500, exp: 100 },
      { text: "Kamu tersesat di hutan...", gold: 0, exp: 10 },
      { text: "Kamu bertemu pemandu!", gold: 100, exp: 30 },
    ];

    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    const text =
      claraWrap("Explore", [`  ┊  ➶ Hasil: *${outcome.text}*`,
        `  ┊  ➶ Gold: *${outcome.gold >= 0 ? "+" : ""}${outcome.gold}*`,
        `  ┊  ➶ Exp: *+${outcome.exp}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}explore untuk jelajahi lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "explore");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("explore", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
