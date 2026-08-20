// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Soulbind — Ikat jiwa ke item, jadikan permanent & un-tradable
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgsoulbind",
  alias: ["soulbindrpg", "ikatjiwa", "soulbind", "jikasoul", "bindjiwa"],
  category: "rpg",
  description: "RPG Soulbind — Ikat jiwa ke item, jadikan permanent & lebih kuat",
  usage: ".rpgsoulbind bind <item> — Ikat jiwa ke item (biaya)\n.rpgsoulbind list — Lihat item terikat\n.rpgsoulbind unbind <item> — Lepaskan ikatan\n.rpgsoulbind info — Statistik",
  example: ".rpgsoulbind bind diamond\n.rpgsoulbind list",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 10,
  isEnabled: true,
};

const BIND_COST = 5000;
const UNBIND_COST = 2000;

const BINDABLE_ITEMS = {
  diamond: { name: "Diamond", emoji: "💎", bindBonus: "atk+10, crit+5%", desc: "Permata terikat jiwa" },
  emerald: { name: "Emerald", emoji: "💚", bindBonus: "def+10, hp+30", desc: "Zamrud terikat jiwa" },
  iron: { name: "Iron", emoji: "⚙️", bindBonus: "atk+5, def+5", desc: "Besi terikat jiwa" },
  wood: { name: "Wood", emoji: "🪵", bindBonus: "stamina+5", desc: "Kayu terikat jiwa" },
  rock: { name: "Rock", emoji: "🪨", bindBonus: "def+10", desc: "Batu terikat jiwa" },
  string: { name: "String", emoji: "🧵", bindBonus: "speed+5", desc: "Benang terikat jiwa" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Soulbind", [
        "IKAT JIWA",
        "Ikat jiwa ke item, jadikan permanent & lebih kuat",
        "Item terikat tidak bisa dijual/trade, tapi bonus permanen",
        "",
        "BIND COST: " + BIND_COST + "g per item",
        "UNBIND COST: " + UNBIND_COST + "g (kembali item)",
        "",
        "PERINTAH:",
        usedPrefix + "rpgsoulbind bind <item> - Ikat jiwa",
        usedPrefix + "rpgsoulbind list - Lihat item terikat",
        usedPrefix + "rpgsoulbind unbind <item> - Lepaskan",
        usedPrefix + "rpgsoulbind info - Statistik",
        "",
        "Item: " + Object.keys(BINDABLE_ITEMS).join(", "),
      ], "info"));
    }

    if (action === "info") {
      const stats = player.soulbindStats || {};
      const lines = [
        "STATISTIK SOULBIND",
        "Total bind: " + (stats.binds || 0),
        "Total unbind: " + (stats.unbinds || 0),
        "Item aktif: " + (player.soulbound ? Object.keys(player.soulbound).length : 0),
        "Total gold: " + (stats.totalGold || 0),
      ];
      return m.reply(claraWrap("RPG Soulbind", lines, "info"));
    }

    if (action === "list") {
      if (!player.soulbound || Object.keys(player.soulbound).length === 0) {
        return m.reply(claraWrap("RPG Soulbind", "Belum ada item terikat. Bind: " + usedPrefix + "rpgsoulbind bind <item>", "warn"));
      }

      const lines = ["ITEM TERIKAT JIWA", ""];
      Object.entries(player.soulbound).forEach(([id, data]) => {
        const item = BINDABLE_ITEMS[id];
        if (!item) return;
        lines.push(item.emoji + " " + item.name + " x" + data.count);
        lines.push("   Bonus: " + item.bindBonus);
        lines.push("   Dikat: " + new Date(data.boundAt).toLocaleDateString("id-ID"));
      });

      return m.reply(claraWrap("RPG Soulbind", lines, "info"));
    }

    if (action === "bind") {
      const itemId = args[1]?.toLowerCase();
      const item = BINDABLE_ITEMS[itemId];

      if (!item) {
        return m.reply(claraWrap("RPG Soulbind", [
          "Item tidak valid!",
          "Tersedia: " + Object.keys(BINDABLE_ITEMS).join(", "),
        ], "warn"));
      }

      if ((player[itemId] || 0) < 1) {
        return m.reply(claraWrap("RPG Soulbind", "Tidak punya " + item.name + "!", "warn"));
      }

      if ((player.gold || 0) < BIND_COST) {
        return m.reply(claraWrap("RPG Soulbind", "Gold kurang! Butuh: " + BIND_COST, "warn"));
      }

      addGold(m, -BIND_COST);
      player[itemId] = (player[itemId] || 0) - 1;

      if (!player.soulbound) player.soulbound = {};
      if (!player.soulbound[itemId]) {
        player.soulbound[itemId] = { count: 1, boundAt: Date.now() };
      } else {
        player.soulbound[itemId].count++;
      }

      if (!player.soulbindStats) player.soulbindStats = {};
      player.soulbindStats.binds = (player.soulbindStats.binds || 0) + 1;
      player.soulbindStats.totalGold = (player.soulbindStats.totalGold || 0) + BIND_COST;

      savePlayer(m, player);

      return m.reply(claraWrap("RPG Soulbind", [
        "JIWA TERIKAT!",
        item.emoji + " " + item.name,
        item.desc,
        "",
        "Bonus permanen: " + item.bindBonus,
        "Biaya: " + BIND_COST + " gold",
        "Total terikat: " + player.soulbound[itemId].count,
      ], "info"));
    }

    if (action === "unbind") {
      const itemId = args[1]?.toLowerCase();

      if (!player.soulbound?.[itemId]) {
        return m.reply(claraWrap("RPG Soulbind", "Item tidak terikat!", "warn"));
      }

      if ((player.gold || 0) < UNBIND_COST) {
        return m.reply(claraWrap("RPG Soulbind", "Gold kurang! Butuh: " + UNBIND_COST, "warn"));
      }

      addGold(m, -UNBIND_COST);
      player[itemId] = (player[itemId] || 0) + 1;
      player.soulbound[itemId].count--;

      if (player.soulbound[itemId].count <= 0) {
        delete player.soulbound[itemId];
      }

      if (!player.soulbindStats) player.soulbindStats = {};
      player.soulbindStats.unbinds = (player.soulbindStats.unbinds || 0) + 1;

      savePlayer(m, player);

      return m.reply(claraWrap("RPG Soulbind", [
        "Ikatan dilepaskan!",
        BINDABLE_ITEMS[itemId].emoji + " " + BINDABLE_ITEMS[itemId].name + " dikembalikan",
        "Biaya: " + UNBIND_COST + " gold",
      ], "info"));
    }

    return m.reply(claraWrap("RPG Soulbind", "Perintah: bind, unbind, list, info", "warn"));
  } catch (e) {
    console.error("[RpgSoulbind]", e);
    return m.reply(claraWrap("RPG Soulbind", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
