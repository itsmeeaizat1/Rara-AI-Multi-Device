// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Recycle — Recycle items, exchange for coins, stash all

import { ensureRpg, saveRpg } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "recycle",
  alias: ["recycle"],
  category: "rpg",
  description: "Daur ulang item jadi fragmen, tukar item jadi gold, pindah semua ke storage",
  usage: ".recycle <item> | .exchange <item> | .stashall",
  example: ".recycle rawMeat",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, text, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("recycle", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "recycle") {
      const itemName = (text || "").trim();
      if (!itemName) return m.reply(raraRpgBox("recycle", "Masukkan nama item. Contoh: .recycle rawMeat", "guide"));
      rpg.inventory = rpg.inventory || {};
  await animGeneric(m, sock, "♻️", "Recycling");
      if (!rpg.inventory[itemName] || rpg.inventory[itemName] < 1) return m.reply(raraRpgBox("recycle", "Item *" + itemName + "* tidak ada di inventory.", "info"));

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
      if (!itemName) return m.reply(raraRpgBox("exchange", "Masukkan nama item. Contoh: .exchange rawMeat", "guide"));
      rpg.inventory = rpg.inventory || {};
      if (!rpg.inventory[itemName] || rpg.inventory[itemName] < 1) return m.reply(raraRpgBox("exchange", "Item *" + itemName + "* tidak ada di inventory.", "info"));

      await m.react("🕒");
      rpg.inventory[itemName] -= 1;
      if (rpg.inventory[itemName] <= 0) delete rpg.inventory[itemName];
      const coins = 200;
      rpg.gold = (rpg.gold || 0) + coins;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Kamu tukar *" + itemName + "* jadi " + coins + " gold!\nTotal gold: " + rpg.gold);
    }

    if (command === "stashall") {
      rpg.inventory = rpg.inventory || {};
      rpg.storage = rpg.storage || {};
      const itemCount = Object.keys(rpg.inventory).length;
      if (itemCount === 0) return m.reply(raraRpgBox("stashall", "Inventory kosong.", "info"));

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
    return m.reply(raraRpgBox(m.command || "recycle", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
