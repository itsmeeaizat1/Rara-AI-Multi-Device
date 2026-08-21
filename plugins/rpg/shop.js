// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "shop",
  alias: ["shop", "toko", "market", "beli", "store"],
  category: "economy",
  description: "Beli item di shop RPG",
  usage: ".shop",
  example: ".shop",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ITEMS = [
  { id: "potion", name: "Potion", price: 50 },
  { id: "sword", name: "Sword", price: 200 },
  { id: "shield", name: "Shield", price: 150 },
  { id: "armor", name: "Armor", price: 300 },
  { id: "ring", name: "Ring", price: 500 },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const player = getPlayer(m);
    const gold = player?.gold || 0;

    const lines = ITEMS.map((item, index) => {
      const num = index + 1;
      return `  ┊  ➶ ${num}. *${item.name}* — ${item.price} Gold`;
    });

    const text =
      claraWrap("Shop", [`  ┊  ➶ Saldo: *${gold} Gold*`,
        ...lines].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}buy <no> untuk membeli`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "shop");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("shop", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
