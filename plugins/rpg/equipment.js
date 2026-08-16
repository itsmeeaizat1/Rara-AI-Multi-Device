// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "equipment",
  alias: ["equip", "gear", "peralatan", "equipment"],
  category: "game",
  description: "Lihat dan pasang equipment RPG",
  usage: ".equipment",
  example: ".equipment",
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

    // Placeholder: ganti dengan data equipment RPG kamu
    const equipped = [
      { slot: "Weapon", name: "Iron Sword", atk: 15 },
      { slot: "Armor", name: "Leather Armor", def: 10 },
      { slot: "Accessory", name: "Ring of Power", bonus: "+5% EXP" },
    ];

    const inventory = [
      "Potion x3",
      "Sword x1",
      "Shield x1",
    ];

    const text =
      claraWrap("Equipment", "🛡️") +
      "\n\n" +
      claraWrap("Equipped", equipped.map((e) => `◦ ${e.slot}: *${e.name}* (ATK:${e.atk ?? 0} DEF:${e.def ?? 0} ${e.bonus ?? ""})`.trim())) +
      "\n\n" +
      claraWrap("Inventory", inventory.map((item) => `◦ ${item}`)) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "equipment");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("equipment", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
