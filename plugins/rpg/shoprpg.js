// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Shop — Buy and sell items

import {
  ensureRpg, saveRpg, addGold, removeGold, addItem, removeItem,
  getInventory, ITEM_DB, getItemCount, equipItem
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "shoprpg",
  alias: ["shoprpg", "toko", "shop"],
  category: "rpg",
  description: "Beli dan jual item RPG (potion, equipment, material)",
  usage: ".shoprpg <buy|sell> <item> [qty]",
  example: ".shoprpg buy hpPotion 5",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const SHOP_ITEMS = [
  { id: "hpPotion", name: "Ramuan HP", price: 50, type: "consumable" },
  { id: "mpPotion", name: "Ramuan MP", price: 50, type: "consumable" },
  { id: "energyDrink", name: "Minuman Energi", price: 30, type: "consumable" },
  { id: "bread", name: "Roti", price: 10, type: "consumable" },
  { id: "cookedMeat", name: "Steak", price: 25, type: "consumable" },
  { id: "luckyCharm", name: "Jimat Keberuntungan", price: 100, type: "consumable" },
  { id: "woodenSword", name: "Pedang Kayu", price: 50, type: "weapon" },
  { id: "ironSword", name: "Pedang Besi", price: 150, type: "weapon" },
  { id: "leatherArmor", name: "Baju Kulit", price: 80, type: "armor" },
  { id: "ironArmor", name: "Baju Besi", price: 200, type: "armor" },
  { id: "leatherCap", name: "Topi Kulit", price: 30, type: "helmet" },
  { id: "leatherBoots", name: "Sepatu Kulit", price: 30, type: "boots" },
  { id: "dungeonKey", name: "Kunci Dungeon", price: 200, type: "key" },
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("shoprpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Show shop list
    if (!action || action === "list") {
      let msg = `╭─「 sʜᴏᴘ ʀᴘɢ 」\n`;
      msg += `│ 💰 Gold kamu: *${rpg.gold}*\n`;
      msg += `│\n`;
      msg += `│ 📦 *ᴄᴏɴsᴜᴍᴀʙʟᴇ*\n`;
      for (const item of SHOP_ITEMS.filter(i => i.type === "consumable")) {
        msg += `│ ${item.name} — *${item.price} gold* (${item.id})\n`;
      }
      msg += `│\n`;
      msg += `│ ⚔️ *ᴇϙᴜɪᴘᴍᴇɴᴛ*\n`;
      for (const item of SHOP_ITEMS.filter(i => i.type === "weapon" || i.type === "armor" || i.type === "helmet" || i.type === "boots")) {
        msg += `│ ${item.name} — *${item.price} gold* (${item.id})\n`;
      }
      msg += `│\n`;
      msg += `│ 🔑 *ᴋᴇʏs*\n`;
      for (const item of SHOP_ITEMS.filter(i => i.type === "key")) {
        msg += `│ ${item.name} — *${item.price} gold* (${item.id})\n`;
      }
      msg += `│\n`;
      msg += `│ 📌 Cara pakai:\n`;
      msg += `│ .shoprpg buy <nama_item> [qty]\n`;
      msg += `│ .shoprpg sell <nama_item> [qty]\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    if (action === "buy") {
      const itemId = args[1];
      const qty = parseInt(args[2]) || 1;

      if (!itemId) return m.reply(claraWrap("shoprpg", "Item tidak ditemukan. Ketik .shoprpg untuk lihat daftar.", "warn"));

      // Cari item di SHOP_ITEMS (by id atau name fuzzy)
      const shopItem = SHOP_ITEMS.find(i => i.id === itemId || i.name.toLowerCase() === itemId.toLowerCase());
      if (!shopItem) return m.reply(claraWrap("shoprpg", `Item *${itemId}* tidak dijual di shop.`, "warn"));

      const total = shopItem.price * qty;
      if (rpg.gold < total) {
        await m.react("🚫");
        return m.reply(claraWrap("shoprpg", `Gold tidak cukup! Butuh *${total} gold* untuk *${qty}x ${shopItem.name}*. Gold kamu: *${rpg.gold}*`, "warn"));
      }

      removeGold(m, total, sock);
      addItem(m, shopItem.id, qty);

      await m.react("🐣");
      let msg = `╭─「 sʜᴏᴘ ʀᴘɢ 」\n`;
      msg += `│ ✅ Berhasil membeli!\n`;
      msg += `│\n`;
      msg += `│ 📦 Item: *${shopItem.name}*\n`;
      msg += `│ 🔢 Jumlah: *${qty}x*\n`;
      msg += `│ 💰 Harga: *${total} gold*\n`;
      msg += `│ 💼 Sisa gold: *${rpg.gold - total}*\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    if (action === "sell") {
      const itemId = args[1];
      const qty = parseInt(args[2]) || 1;

      if (!itemId) return m.reply(claraWrap("shoprpg", "Item apa yang mau dijual? Ketik .shoprpg untuk lihat daftar.", "warn"));

      // Cari item di ITEM_DB
      const itemInfo = ITEM_DB[itemId];
      if (!itemInfo) return m.reply(claraWrap("shoprpg", `Item *${itemId}* tidak dikenal.`, "warn"));

      const owned = getItemCount(m, itemId);
      if (owned < qty) {
        await m.react("🚫");
        return m.reply(claraWrap("shoprpg", `Item tidak cukup! Kamu punya *${owned}x ${itemInfo.name}*, mau jual *${qty}x*.`, "warn"));
      }

      const sellPrice = Math.floor((itemInfo.value || 5) * 0.6); // 60% dari value
      const total = sellPrice * qty;

      removeItem(m, itemId, qty, sock);
      addGold(m, total);

      await m.react("🐣");
      let msg = `╭─「 sʜᴏᴘ ʀᴘɢ 」\n`;
      msg += `│ ✅ Berhasil menjual!\n`;
      msg += `│\n`;
      msg += `│ 📦 Item: *${itemInfo.name}*\n`;
      msg += `│ 🔢 Jumlah: *${qty}x*\n`;
      msg += `│ 💰 Diterima: *${total} gold*\n`;
      msg += `│ 💼 Total gold: *${rpg.gold + total}*\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    return m.reply(claraWrap("shoprpg", "Aksi tidak dikenal. Gunakan .shoprpg, .shoprpg buy <item>, atau .shoprpg sell <item>", "warn"));
  } catch (err) {
    console.error("shoprpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("shoprpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
