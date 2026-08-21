// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { addGold, getPlayer, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "gacha",
  alias: ["gacha", "gacharpg", "roll"],
  category: "game",
  description: "Tarik gacha untuk dapat item langka",
  usage: ".gacha",
  example: ".gacha",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3600,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const pool = [
      { name: "Common Sword", rarity: "Common", chance: 60 },
      { name: "Silver Shield", rarity: "Rare", chance: 30 },
      { name: "Dragon Blade", rarity: "Epic", chance: 9 },
      { name: "Crown of God", rarity: "Legendary", chance: 1 },
    ];

    const roll = Math.random() * 100;
    let cumulative = 0;
    let item = pool[0];
    for (const p of pool) {
      cumulative += p.chance;
      if (roll <= cumulative) {
        item = p;
        break;
      }
    }

    const player = getPlayer(m);
    const inventory = player?.inventory || {};
    const currentCount = inventory[item.name] || 0;

    savePlayer(m, {
      inventory: {
        ...inventory,
        [item.name]: currentCount + 1,
      },
    });

    const text =
      claraWrap("Gacha", [`  ┊  ➶ Item: *${item.name}*`,
        `  ┊  ➶ Rarity: *${item.rarity}*`,
        `  ┊  ➶ Chance: *${item.chance}%*`,
        `  ┊  ➶ Jumlah: *${currentCount + 1}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}gacha untuk coba lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await sendReplyWithNav(sock, m, text, "gacha");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("gacha", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
