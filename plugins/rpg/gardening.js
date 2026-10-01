// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Berkebon — Farm crops for gold and materials

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy,
  addItem, ITEM_DB,
  checkCooldown, setCooldown, formatTime,
  getCash, spendCash, formatRp} from "../../src/lib/rara-rpg-service.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import { shapeBerkebon } from "../../src/lib/rara-rpg-shapes.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "gardening",
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

// ─── KHAS BERKEBON: 🌻 Bunga Langka & 🚜 Traktor Mini ───
const TOOL = {
  name: "🚜 Traktor Mini", dbKey: "berkebonTool",
  FLOWER_CHANCE: 30,               // % per panen (stroberi dijamin +1)
  flowerCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 35000 * (lv + 1),
  growFactor: (lv) => Math.max(0.5, 1 - 0.1 * lv),  // grow time −10% per level (min 50%)
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, flowers: 0 });

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("berkebon", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // ── subcommand khas berkebon: traktor status & upgrade ──
    const sub = (m.args?.[0] || "").toLowerCase();
    const tool = getTool(m.sender);
    const lv = tool.level || 0;
    if (sub === "traktor" || sub === "status") {
      return m.reply(raraRpgBox("berkebon",
        `🚜 TRAKTOR MINI KAMU\n\n` +
        `Level : *Lv.${lv}*\n⏱️ Grow time : −${Math.round((1 - TOOL.growFactor(lv)) * 100)}%\n🌻 Bunga Langka : ${tool.flowers || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.flowerCost(lv)}x Bunga Langka + ${formatRp(TOOL.rpCost(lv))}\nKetik: .berkebon upgrade`));
    }
    if (sub === "upgrade") {
      const needFl = TOOL.flowerCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.flowers || 0) < needFl) {
        return m.reply(raraRpgBox("berkebon",
          `🌻 Upgrade Traktor ke Lv.${lv + 1} butuh:\n\n• Bunga Langka : ${needFl}x (punya ${tool.flowers || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Bunga didapat dari .berkebon panen sendiri — 30% per panen, stroberi dijamin +1!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        return m.reply(raraRpgBox("berkebon", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.flowers = (fresh.flowers || 0) - needFl;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("berkebon",
        `🚜 TRAKTOR UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n⏱️ Grow time : −${Math.round((1 - TOOL.growFactor(lv + 1)) * 100)}%\n\n🌻 Material : −${needFl} Bunga Langka\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

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
                    return m.reply(raraRpgBox("berkebon", msg));
        }
      }
    }

    if (!action || action === "cek") {
      let msg = "";

      if (rpg.farm.crop) {
        const crop = CROPS.find(c => c.id === rpg.farm.crop);
        if (crop) {
          const elapsed = Date.now() - rpg.farm.plantedAt;
          const remaining = (rpg.farm.growTime || crop.growTime) - elapsed;
          if (remaining > 0) {
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            msg += `🌱 Tanaman: *${crop.name}*\n`;
            msg += `⏰ Tumbuh: *${mins}m ${secs}s* lagi\n`;
            msg += `📊 Progress: ${Math.min(100, Math.floor(elapsed / (rpg.farm.growTime || crop.growTime) * 100))}%\n`;
          } else {
            msg += `🌾 ${crop.name} siap dipanen!\n`;
            msg += `📌 Ketik *.berkebon panen*\n`;
          }
        }
      } else {
        msg += `📭 Kebon kosong\n`;
        msg += `
`;
        msg += `📋 *tanaman tersedia*\n`;
        for (const crop of CROPS) {
          msg += `🌱 ${crop.name} (${crop.id}) — ${crop.growTime / 60000}m\n`;
        }
        msg += `
`;
        msg += `📌 .berkebon tanam <id> untuk mulai\n`;
      }

            return m.reply(raraRpgBox("berkebon", msg));
    }

    if (action === "tanam" || action === "plant") {
      const cropId = args[1]?.toLowerCase();
      const crop = CROPS.find(c => c.id === cropId);

      if (!crop) {
        return m.reply(raraRpgBox("berkebon", `Tanaman tidak dikenal. Pilih: ${CROPS.map(c => c.id).join(", ")}`, "warn"));
      }

      if (rpg.farm.crop) {
        return m.reply(raraRpgBox("berkebon", "Masih ada tanaman yang tumbuh. Panen dulu!", "warn"));
      }

      if (rpg.energy < KEBON_ENERGY) {
        await m.react("🚫");
        return m.reply(raraRpgBox("berkebon", `Energi kurang! Butuh *${KEBON_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
      }

      useEnergy(m, KEBON_ENERGY, sock);

      const effGrow = Math.round(crop.growTime * TOOL.growFactor(lv));
      rpg.farm = {
        crop: crop.id,
        growTime: effGrow,
        plantedAt: Date.now(),
      };
      saveRpg(m, { farm: rpg.farm });

      await m.react("🐣");
      await shapeBerkebon(m, sock, "tanam", crop.name);
      return m.reply(raraRpgBox("berkebon",
        `🌱 BERHASIL MENANAM!\n\n` +
        `🌱 Tanaman : ${crop.name}\n⏰ Grow time : ${(effGrow / 60000).toFixed(1)} menit${effGrow < crop.growTime ? ` (traktor! aslinya ${(crop.growTime / 60000).toFixed(0)})` : ""}\n\n` +
        `Ketik .berkebon cek untuk cek progress\nKetik .berkebon panen saat sudah siap`));
    }

    if (action === "panen" || action === "harvest") {
      if (!rpg.farm.crop) {
        return m.reply(raraRpgBox("berkebon", "Tidak ada tanaman untuk dipanen.", "warn"));
      }

      const crop = CROPS.find(c => c.id === rpg.farm.crop);
      if (!crop) {
        rpg.farm = { crop: null, plantedAt: 0 };
        saveRpg(m, { farm: rpg.farm });
        return m.reply(raraRpgBox("berkebon", "Tanaman tidak dikenal. Kebon direset.", "warn"));
      }

      const effGrow = rpg.farm.growTime || crop.growTime;
      const elapsed = Date.now() - rpg.farm.plantedAt;
      if (elapsed < effGrow) {
        const remaining = effGrow - elapsed;
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        return m.reply(raraRpgBox("berkebon", `Belum siap panen! Tunggu *${mins}m ${secs}s* lagi.`, "warn"));
      }

      // Harvest!
      const goldGain = Math.floor(Math.random() * (crop.gold[1] - crop.gold[0] + 1)) + crop.gold[0];
      const expGain = Math.floor(Math.random() * (crop.exp[1] - crop.exp[0] + 1)) + crop.exp[0];
      const itemQty = Math.floor(Math.random() * 3) + 1;

      addGold(m, goldGain);
      addExp(m, expGain);
      addItem(m, crop.item, itemQty);

      // 🌻 Bunga Langka — item khas berkebon (30% per panen, stroberi dijamin +1)
      let flowerGain = 0;
      if (crop.id === "strawberry") flowerGain = 1;
      if (flowerGain === 0 && Math.random() * 100 < TOOL.FLOWER_CHANCE) flowerGain = 1;
      if (flowerGain > 0) {
        const freshTool = getTool(m.sender);
        freshTool.flowers = (freshTool.flowers || 0) + flowerGain;
        getDatabase().setPlayerData(m.sender, TOOL.dbKey, freshTool);
      }

      rpg.farm = { crop: null, plantedAt: 0 };
      saveRpg(m, { farm: rpg.farm });

      await m.react("🐣");
      await shapeBerkebon(m, sock, "panen", crop.name);
      return m.reply(raraRpgBox("berkebon",
        `🌾 PANEN BERHASIL!\n\n` +
        `🌾 Tanaman : ${crop.name}\n\n` +
        `💰 Gold : +${goldGain}\n💵 Uang : Rp ${getCash(m)}\n✨ EXP : +${expGain}\n📦 Item : +${itemQty}x ${ITEM_DB[crop.item]?.name || crop.item}\n` +
        (flowerGain ? `🌻 Bunga Langka : +${flowerGain}x (total ${getTool(m.sender).flowers}x)\n` : "") +
        `\nKetik .berkebon tanam <id> untuk tanam lagi` +
        (lv ? `\n🚜 Traktor : Lv.${lv} (grow time −${Math.round((1 - TOOL.growFactor(lv)) * 100)}%)` : `\n💡 Traktor bisa diupgrade: .berkebon traktor`)));
    }

    return m.reply(raraRpgBox("berkebon", "Aksi tidak dikenal. Gunakan: tanam, panen, atau cek", "warn"));
  } catch (err) {
    console.error("berkebon error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("berkebon", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
