// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Recycle — Recycle items, exchange for coins, stash all

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "recycle",
  alias: ["recycle"],
  category: "rpg",
  description: "Daur ulang item jadi fragmen, tukar item jadi koin, pindah semua ke storage",
  usage: ".recycle <item> | .exchange <item> | .stashall",
  example: ".recycle rawMeat",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, text, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("recycle", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "recycle") {
      const itemName = (text || "").trim();
      if (!itemName) return m.reply(claraWrap("recycle", "Masukkan nama item. Contoh: .recycle rawMeat", "guide"));
      rpg.inventory = rpg.inventory || {};
  await animGeneric(m, sock, "♻️", "Recycling");
      if (!rpg.inventory[itemName] || rpg.inventory[itemName] < 1) return m.reply(claraWrap("recycle", "Item *" + itemName + "* tidak ada di inventory.", "info"));

      await m.react("🕒");
      rpg.inventory[itemName] -= 1;
      if (rpg.inventory[itemName] <= 0) delete rpg.inventory[itemName];
      rpg.inventory.fragmen = (rpg.inventory.fragmen || 0) + 1;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Item *" + itemName + "* dihancurkan jadi *fragmen*!\nFragmen: " + rpg.inventory.fragmen);
    }

    if (command === "exchange") {
      const itemName = (text || "").trim();
      if (!itemName) return m.reply(claraWrap("exchange", "Masukkan nama item. Contoh: .exchange rawMeat", "guide"));
      rpg.inventory = rpg.inventory || {};
      if (!rpg.inventory[itemName] || rpg.inventory[itemName] < 1) return m.reply(claraWrap("exchange", "Item *" + itemName + "* tidak ada di inventory.", "info"));

      await m.react("🕒");
      rpg.inventory[itemName] -= 1;
      if (rpg.inventory[itemName] <= 0) delete rpg.inventory[itemName];
      const coins = 200;
      rpg.gold = (rpg.gold || 0) + coins;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Kamu tukar *" + itemName + "* jadi " + coins + " koin!\nTotal gold: " + rpg.gold);
    }

    if (command === "stashall") {
      rpg.inventory = rpg.inventory || {};
      rpg.storage = rpg.storage || {};
      const itemCount = Object.keys(rpg.inventory).length;
      if (itemCount === 0) return m.reply(claraWrap("stashall", "Inventory kosong.", "info"));

      await m.react("🕒");
      for (const [item, count] of Object.entries(rpg.inventory)) {
        rpg.storage[item] = (rpg.storage[item] || 0) + count;
      }
      rpg.inventory = {};
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Semua item dipindah ke storage!\n" + itemCount + " jenis item dipindah");
    }
  } catch (e) {
    console.error("recycle error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "recycle", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
