// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "buy",
  alias: ["buyv2", "beliv2", "beliitem"],
  category: "economy",
  description: "Beli item dari shop",
  usage: ".buy <item>",
  example: ".buy Potion",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const ITEMS = {
  potion: { name: "Potion", price: 50 },
  sword: { name: "Sword", price: 200 },
  shield: { name: "Shield", price: 150 },
  armor: { name: "Armor", price: 300 },
  ring: { name: "Ring", price: 500 },
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = (m.text || "").trim().toLowerCase();
    const itemKey = input.split(/[ \n]+/)[0];

    if (!itemKey) {
      const text =
        claraWrap("Cara Pakai", [`◦ Penggunaan: *${prefix}buy <item>*`,
          `◦ Contoh: *${prefix}buy Potion*`,
          `◦ Shop: *${prefix}shop*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "buy");
      return { handled: true };
    }

    const item = ITEMS[itemKey];
    if (!item) {
      const text =
        claraWrap("Gagal", ["◦ Status: *Item tidak ditemukan*",
          `◦ Daftar: ${Object.keys(ITEMS).join(", ")}`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}shop untuk melihat daftar`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "buy");
      return { handled: true };
    }

    const player = getPlayer(m);
    const gold = player?.gold || 0;

    if (gold < item.price) {
      const text =
        claraWrap("Gagal", [`◦ Item: *${item.name}*`,
          `◦ Harga: *${item.price} Gold*`,
          `◦ Saldo: *${gold} Gold*`,
          "◦ Status: *Gold tidak cukup*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}daily untuk klaim gold harian`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "buy");
      return { handled: true };
    }

    const inventory = player?.inventory || {};
    const currentCount = inventory[item.name] || 0;

    addGold(m, -item.price);

    savePlayer(m, {
      inventory: {
        ...inventory,
        [item.name]: currentCount + 1,
      },
    });

    const updatedPlayer = getPlayer(m);

    const text =
      claraWrap("Buy", [`◦ Item: *${item.name}*`,
        `◦ Harga: *${item.price} Gold*`,
        `◦ Sisa Gold: *${updatedPlayer?.gold || 0} Gold*`,
        "◦ Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "buy");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("buy", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
