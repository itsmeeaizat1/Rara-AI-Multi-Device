// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Berkebon — Farm crops for gold and materials

import { animFarm } from "../../src/lib/nova-rpg-anim.js";
import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy,
  addItem, ITEM_DB,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "berkebon",
  alias: ["berkebon", "kebon", "farming", "tanam"],
  category: "rpg",
  description: "Tanam & panen hasil kebun untuk material dan gold",
  usage: ".berkebon <tanam|panen|cek>",
  example: ".berkebon tanam",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const KEBON_ENERGY = 8;
const TANAM_COOLDOWN = 0;
const PANEN_COOLDOWN = 5 * 60 * 1000; // 5 menit grow time

const CROPS = [
  { id: "wheat", name: "Gandum", growTime: 3 * 60 * 1000, gold: [20, 40], exp: [15, 30], item: "wheat" },
  { id: "corn", name: "Jagung", growTime: 4 * 60 * 1000, gold: [30, 60], exp: [20, 40], item: "corn" },
  { id: "herb", name: "Herba", growTime: 5 * 60 * 1000, gold: [40, 80], exp: [25, 50], item: "herb" },
  { id: "strawberry", name: "Stroberi", growTime: 6 * 60 * 1000, gold: [60, 120], exp: [30, 60], item: "strawberry" },
];

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("berkebon", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Init farm
    if (!rpg.farm) rpg.farm = { crop: null, plantedAt: 0 };

    // Check harvest
    if (rpg.farm.crop && Date.now() >= rpg.farm.plantedAt + rpg.farm.growTime) {
      // Auto-notify crop ready
      if (action !== "panen") {
        const crop = CROPS.find(c => c.id === rpg.farm.crop);
        if (crop) {
          let msg = "";
          msg += `🌱 Tanaman siap dipanen!\n`;
          msg += `📦 ${crop.name} — ketik *.berkebon panen*\n`;
                    return m.reply(msg);
        }
      }
    }

    if (!action || action === "cek") {
      let msg = "";

      if (rpg.farm.crop) {
        const crop = CROPS.find(c => c.id === rpg.farm.crop);
        if (crop) {
          const elapsed = Date.now() - rpg.farm.plantedAt;
          const remaining = crop.growTime - elapsed;
          if (remaining > 0) {
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            msg += `🌱 Tanaman: *${crop.name}*\n`;
            msg += `⏰ Tumbuh: *${mins}m ${secs}s* lagi\n`;
            msg += `📊 Progress: ${Math.min(100, Math.floor(elapsed / crop.growTime * 100))}%\n`;
          } else {
            msg += `🌾 ${crop.name} siap dipanen!\n`;
            msg += `📌 Ketik *.berkebon panen*\n`;
          }
        }
      } else {
        msg += `📭 Kebon kosong\n`;
        msg += `
`;
        msg += `📋 *ᴛᴀɴᴀᴍᴀɴ ᴛᴇʀsᴇᴅɪᴀ*\n`;
        for (const crop of CROPS) {
          msg += `🌱 ${crop.name} (${crop.id}) — ${crop.growTime / 60000}m\n`;
        }
        msg += `
`;
        msg += `📌 .berkebon tanam <id> untuk mulai\n`;
      }

            return m.reply(msg);
    }

    if (action === "tanam" || action === "plant") {
      const cropId = args[1]?.toLowerCase();
      const crop = CROPS.find(c => c.id === cropId);

      if (!crop) {
        return m.reply(claraWrap("berkebon", `Tanaman tidak dikenal. Pilih: ${CROPS.map(c => c.id).join(", ")}`, "warn"));
      }

      if (rpg.farm.crop) {
        return m.reply(claraWrap("berkebon", "Masih ada tanaman yang tumbuh. Panen dulu!", "warn"));
      }

      if (rpg.energy < KEBON_ENERGY) {
        await m.react("🚫");
        return m.reply(claraWrap("berkebon", `Energi kurang! Butuh *${KEBON_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
      }

      useEnergy(m, KEBON_ENERGY, sock);

      rpg.farm = {
        crop: crop.id,
        growTime: crop.growTime,
        plantedAt: Date.now(),
      };
      saveRpg(m, { farm: rpg.farm });

      await m.react("🐣");
      let msg = "";
      msg += `✅ Berhasil tanam!\n`;
      msg += `🌱 Tanaman: *${crop.name}*\n`;
      msg += `⏰ Grow time: *${crop.growTime / 60000} menit*\n`;
      msg += `
`;
      msg += `Ketik .berkebon cek untuk cek progress\n`;
      msg += `Ketik .berkebon panen saat sudah siap\n`;
      
      await animFarm(m, sock, "Menanam");
      return m.reply(msg);
    }

    if (action === "panen" || action === "harvest") {
      if (!rpg.farm.crop) {
        return m.reply(claraWrap("berkebon", "Tidak ada tanaman untuk dipanen.", "warn"));
      }

      const crop = CROPS.find(c => c.id === rpg.farm.crop);
      if (!crop) {
        rpg.farm = { crop: null, plantedAt: 0 };
        saveRpg(m, { farm: rpg.farm });
        return m.reply(claraWrap("berkebon", "Tanaman tidak dikenal. Kebon direset.", "warn"));
      }

      const elapsed = Date.now() - rpg.farm.plantedAt;
      if (elapsed < crop.growTime) {
        const remaining = crop.growTime - elapsed;
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        return m.reply(claraWrap("berkebon", `Belum siap panen! Tunggu *${mins}m ${secs}s* lagi.`, "warn"));
      }

      // Harvest!
      const goldGain = Math.floor(Math.random() * (crop.gold[1] - crop.gold[0] + 1)) + crop.gold[0];
      const expGain = Math.floor(Math.random() * (crop.exp[1] - crop.exp[0] + 1)) + crop.exp[0];
      const itemQty = Math.floor(Math.random() * 3) + 1;

      addGold(m, goldGain);
      addExp(m, expGain);
      addItem(m, crop.item, itemQty);

      rpg.farm = { crop: null, plantedAt: 0 };
      saveRpg(m, { farm: rpg.farm });

      await m.react("🐣");
      let msg = "";
      msg += `✅ Panen berhasil!\n`;
      msg += `🌾 Tanaman: *${crop.name}*\n`;
      msg += `
`;
      msg += `📦 *ʜᴀsɪʟ ᴘᴀɴᴇɴ*\n`;
      msg += `💰 Gold: *+${goldGain}*\n`;
      msg += `✦ EXP: *+${expGain}*\n`;
      msg += `📦 Item: *+${itemQty}x ${ITEM_DB[crop.item]?.name || crop.item}*\n`;
      msg += `
`;
      msg += `📌 Ketik .berkebon tanam <id> untuk tanam lagi\n`;
      
      return m.reply(msg);
    }

    return m.reply(claraWrap("berkebon", "Aksi tidak dikenal. Gunakan: tanam, panen, atau cek", "warn"));
  } catch (err) {
    console.error("berkebon error:", err);
    await m.react("❌");
    return m.reply(claraWrap("berkebon", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
