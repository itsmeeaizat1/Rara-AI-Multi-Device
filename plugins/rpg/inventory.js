// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "inventory",
  alias: ["inv", "tas", "backpack", "items"],
  category: "game",
  description: "Cek inventory RPG kamu",
  usage: ".inventory",
  example: ".inventory",
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

    const items = [
      { name: "Potion", qty: 3 },
      { name: "Sword", qty: 1 },
      { name: "Shield", qty: 1 },
    ];

    const text =
      claraWrap("Inventory", "🎒") +
      "\n\n" +
      claraWrap("ɪꜱɪ ᴛᴀꜱ", items.map((item) => `◦ ${item.name}: *${item.qty} pcs*`)) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "inventory");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("inventory", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
