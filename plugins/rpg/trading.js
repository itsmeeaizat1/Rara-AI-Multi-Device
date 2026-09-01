// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// trading.js — Trading System (jual beli item antar player via market)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "trading",
  alias: ["trading", "marketrpg", "rpgmarket", "traderpg"],
  category: "rpg",
  description: "Trading system — jual beli item di market RPG",
  usage: ".trading (cek market)\n.trading sell <item> <price> (jual)\n.trading buy <id> (beli)",
  example: ".trading\n.trading sell Iron Sword 1000\n.trading buy 1",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

// Global market (in-memory, ideally DB)
const market = new Map();
let marketId = 0;

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();

    if (subCmd === "sell" || subCmd === "jual") {
      const itemName = m.args[1];
      const price = parseInt(m.args[2] || "0");

      if (!itemName || !price || price < 1) {
        return m.reply(claraWrap("trading", `Format: ${m.prefix}trading sell <item> <price>\n\nContoh: ${m.prefix}trading sell Iron Sword 1000`, "guide"));
      }

      // Cek inventory
      const inv = await db.getPlayerData?.(m.sender, "inventory") || { items: [] };
      const itemIdx = inv.items?.findIndex(i => i.name?.toLowerCase() === itemName.toLowerCase());
      if (itemIdx === -1 || itemIdx === undefined) {
        await m.react("❌");
        return m.reply(claraWrap("trading", `Item "${itemName}" tidak ada di inventory.`, "error"));
      }

      // Pindah ke market
      const item = inv.items.splice(itemIdx, 1)[0];
      await db.setPlayerData?.(m.sender, "inventory", inv);

      const id = ++marketId;
      market.set(String(id), {
        id,
        item,
        price,
        seller: m.sender,
        sellerName: m.pushName,
        posted: Date.now(),
      });

      await m.react("🐣");
      let msg = `╭─「 *ᴍᴀʀᴋᴇᴛ - sᴇʟʟ* 」\n`;
      msg += `│ Item: *${item.name || itemName}*\n`;
      msg += `│ Price: *${price} gold*\n`;
      msg += `│ ID: *${id}*\n`;
      msg += `│\n`;
      msg += `│ Item dipasang di market!\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    if (subCmd === "buy" || subCmd === "beli") {
      const id = m.args[1];
      if (!id) {
        return m.reply(claraWrap("trading", `Format: ${m.prefix}trading buy <id>\n\nCek ID: ${m.prefix}trading`, "guide"));
      }

      const listing = market.get(String(id));
      if (!listing) {
        await m.react("❌");
        return m.reply(claraWrap("trading", `Item ID "${id}" tidak ditemukan di market.`, "error"));
      }

      if (listing.seller === m.sender) {
        return m.reply(claraWrap("trading", "Kamu tidak bisa beli item sendiri.", "error"));
      }

      // Cek gold
      try {
        const gold = await db.getGold?.(m.sender) || 0;
        if (gold < listing.price) {
          await m.react("❌");
          return m.reply(claraWrap("trading", `Gold tidak cukup! Butuh ${listing.price} gold.`, "error"));
        }
        await db.minGold?.(m.sender, listing.price);
        await db.addGold?.(listing.seller, listing.price);
      } catch {}

      // Transfer item
      const inv = await db.getPlayerData?.(m.sender, "inventory") || { items: [] };
      inv.items.push(listing.item);
      await db.setPlayerData?.(m.sender, "inventory", inv);

      market.delete(String(id));

      await m.react("🐣");
      let msg = `╭─「 *ᴍᴀʀᴋᴇᴛ - ʙᴜʏ* 」\n`;
      msg += `│ Item: *${listing.item.name}*\n`;
      msg += `│ Price: *${listing.price} gold*\n`;
      msg += `│ Dari: ${listing.sellerName}\n`;
      msg += `│\n`;
      msg += `│ ✅ Berhasil dibeli!\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }

    // LIST MARKET (default)
    if (market.size === 0) {
      return m.reply(claraWrap("trading", `Market kosong.\n\nJual item: ${m.prefix}trading sell <item> <price>`, "guide"));
    }

    let msg = `╭─「 *ʀᴘɢ ᴍᴀʀᴋᴇᴛ* 」\n`;
    let count = 0;
    for (const [id, listing] of market) {
      if (count >= 15) break;
      msg += `│ [${id}] ${listing.item.emoji || "📦"} *${listing.item.name}*\n`;
      msg += `│   Price: ${listing.price}g | By: ${listing.sellerName}\n`;
      count++;
    }
    msg += `│\n`;
    msg += `│ ${m.prefix}trading buy <id>\n`;
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("trading error:", err);
    await m.react("❌");
    return m.reply(claraWrap("trading", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
