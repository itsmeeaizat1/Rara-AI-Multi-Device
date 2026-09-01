// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// warehouse.js — Warehouse/Storage system (store items, expand capacity)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "warehouse",
  alias: ["warehouse", "gudang", "storage", "storeitem"],
  category: "rpg",
  description: "Warehouse — simpan item, perluas kapasitas gudang",
  usage: ".warehouse (cek gudang)\n.warehouse store <item> (simpan)\n.warehouse take <item> (ambil)\n.warehouse expand (perluas)",
  example: ".warehouse store Iron Sword",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

const DEFAULT_SLOTS = 20;
const EXPAND_COST = 2000;
const EXPAND_AMOUNT = 10;

async function getData(db, sender) {
  return await db.getPlayerData?.(sender, "warehouse") || { slots: DEFAULT_SLOTS, items: [] };
}
async function saveData(db, sender, data) {
  await db.setPlayerData?.(sender, "warehouse", data);
}

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const db = await getDatabase();
    const data = await getData(db, m.sender);

    if (subCmd === "store" || subCmd === "simpan") {
      const itemName = m.args.slice(1).join(" ").trim();
      if (!itemName) {
        return m.reply(claraWrap("warehouse", `Mau simpan apa?\n\nContoh: ${m.prefix}warehouse store Iron Sword`, "guide"));
      }

      if ((data.items?.length || 0) >= data.slots) {
        await m.react("❌");
        return m.reply(claraWrap("warehouse", `Gudang penuh! (${data.items.length}/${data.slots}). Expand: ${m.prefix}warehouse expand`, "error"));
      }

      // Ambil dari inventory
      const inv = await db.getPlayerData?.(m.sender, "inventory") || { items: [] };
      const itemIdx = inv.items?.findIndex(i => i.name?.toLowerCase() === itemName.toLowerCase());
      if (itemIdx === -1 || itemIdx === undefined) {
        await m.react("❌");
        return m.reply(claraWrap("warehouse", `Item "${itemName}" tidak ada di inventory.`, "error"));
      }

      const item = inv.items.splice(itemIdx, 1)[0];
      await db.setPlayerData?.(m.sender, "inventory", inv);

      if (!data.items) data.items = [];
      data.items.push(item);
      await saveData(db, m.sender, data);

      await m.react("🐣");
      return m.reply(claraWrap("warehouse", `📦 Disimpan: *${item.name || itemName}*\nGudang: ${data.items.length}/${data.slots}`));
    }

    if (subCmd === "take" || subCmd === "ambil") {
      const itemName = m.args.slice(1).join(" ").trim();
      if (!itemName) {
        return m.reply(claraWrap("warehouse", `Mau ambil apa?\n\nContoh: ${m.prefix}warehouse take Iron Sword`, "guide"));
      }

      const itemIdx = data.items?.findIndex(i => i.name?.toLowerCase() === itemName.toLowerCase());
      if (itemIdx === -1 || itemIdx === undefined) {
        await m.react("❌");
        return m.reply(claraWrap("warehouse", `Item "${itemName}" tidak ada di gudang.`, "error"));
      }

      const item = data.items.splice(itemIdx, 1)[0];
      await saveData(db, m.sender, data);

      // Kembalikan ke inventory
      const inv = await db.getPlayerData?.(m.sender, "inventory") || { items: [] };
      inv.items.push(item);
      await db.setPlayerData?.(m.sender, "inventory", inv);

      await m.react("🐣");
      return m.reply(claraWrap("warehouse", `📤 Diambil: *${item.name || itemName}*\nGudang: ${data.items.length}/${data.slots}`));
    }

    if (subCmd === "expand" || subCmd === "perluas") {
      try {
        const gold = await db.getGold?.(m.sender) || 0;
        if (gold < EXPAND_COST) {
          await m.react("❌");
          return m.reply(claraWrap("warehouse", `Gold kurang! Expand butuh ${EXPAND_COST}g.`, "error"));
        }
        await db.minGold?.(m.sender, EXPAND_COST);
      } catch {}
      data.slots = (data.slots || DEFAULT_SLOTS) + EXPAND_AMOUNT;
      await saveData(db, m.sender, data);
      await m.react("🐣");
      return m.reply(claraWrap("warehouse", `🏗️ Gudang diperluas! +${EXPAND_AMOUNT} slot\nKapasitas: ${data.slots} slot | Biaya: ${EXPAND_COST}g`));
    }

    // LIST (default)
    let msg = `╭─「 ✦ ɢᴜᴅᴀɴɢ ✦ 」\n`;
    msg += `│ Kapasitas: *${data.items?.length || 0}/${data.slots}*\n`;
    msg += `│\n`;
    if (data.items && data.items.length > 0) {
      const grouped = {};
      data.items.forEach(i => { grouped[i.name] = (grouped[i.name]||0) + 1; });
      for (const [name, count] of Object.entries(grouped)) {
        msg += `│ 📦 ${name} x${count}\n`;
      }
    } else {
      msg += `│ (Gudang kosong)\n`;
    }
    msg += `│\n`;
    msg += `│ ${m.prefix}warehouse store <item> - simpan\n`;
    msg += `│ ${m.prefix}warehouse take <item> - ambil\n`;
    msg += `│ ${m.prefix}warehouse expand - perluas (${EXPAND_COST}g)\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("warehouse error:", err);
    await m.react("❌");
    return m.reply(claraWrap("warehouse", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
