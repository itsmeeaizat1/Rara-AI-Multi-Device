// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mining — Mine ore for materials and gold (animated)

import {
  ensureRpg, saveRpg, addExp, addGold, useEnergy,
  addItem, ITEM_DB,
  checkCooldown, setCooldown, formatTime,
  bumpPlayerStat,
  getCash, removeItem, spendCash, formatRp} from "../../src/lib/rara-rpg-service.js";
import { getRpgWeather, rpgWeatherTag } from "../../src/lib/rara-rpg-weather.js";
import { shapeMining } from "../../src/lib/rara-rpg-shapes.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { reactCooldown } from "../../src/lib/rara-menu-style.js";
import { raraGameBox, gameCTA, raraRpgBox } from "../../src/lib/rara-games.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "mining",
  alias: ["mining", "mine", "tambang"],
  category: "rpg",
  description: "Menambang ore untuk material dan gold",
  usage: ".mining",
  example: ".mining",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const MINE_ENERGY = 8;
const MINE_COOLDOWN = 60 * 1000;

const ORE_TABLE = [
  { item: "copperOre", chance: 60, minQty: 1, maxQty: 3 },
  { item: "ironOre", chance: 35, minQty: 1, maxQty: 2 },
  { item: "goldOre", chance: 12, minQty: 1, maxQty: 1 },
  { item: "mithrilOre", chance: 4, minQty: 1, maxQty: 1 },
];

const GOLD_RANGE = [10, 50];
const EXP_RANGE = [20, 60];

// ─── KHAS MINING: ⛏️ BELIUNG — upgrade pakai Bijih Besi hasil gali sendiri ───
const TOOL = {
  name: "⛏️ Beliung", dbKey: "mineTool",
  matId: "ironOre", matName: "🔩 Bijih Besi",
  matCost: (lv) => 3 * (lv + 1), rpCost: (lv) => 20000 * (lv + 1),
  goldBonus: (lv) => 0.15 * lv,
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0 });

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("mining", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // ── subcommand khas mining: upgrade & status beliung ──
    const sub = (m.args?.[0] || "").toLowerCase();
    const tool = getTool(m.sender);
    if (sub === "upgrade") {
      const lv = tool.level || 0;
      const needRp = TOOL.rpCost(lv);
      const needMat = TOOL.matCost(lv);
      const haveMat = (ensureRpg(m, m.pushName).inventory || {})[TOOL.matId]?.qty || 0;
      if (haveMat < needMat) {
        return m.reply(raraRpgBox("mining",
          `🔩 Upgrade Beliung ke Lv.${lv + 1} butuh:

• Bijih Besi : ${needMat}x (punya ${haveMat}x)
• Biaya : ${formatRp(needRp)}

💡 Bijih Besi didapat dari .mining sendiri — gali terus!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        return m.reply(raraRpgBox("mining", `💵 Upgrade butuh *${formatRp(needRp)}*.
Uang kamu: ${formatRp(getCash(m))}
💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      if (!removeItem(m, TOOL.matId, needMat, sock)) {
        return m.reply(raraRpgBox("mining", "🔩 Material gak bisa diambil. Coba lagi.", "error"));
      }
      const fresh = getTool(m.sender);
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("mining",
        `⛏️ BELIUNG UPGRADED!

Level : Lv.${lv} → Lv.${lv + 1}
💰 Bonus gold : +${15 * (lv + 1)}%

🔩 Material : −${needMat} Bijih Besi
💵 Biaya : ${formatRp(needRp)}`, "success"));
    }
    if (sub === "status" || sub === "tool" || sub === "beliung") {
      const lv = tool.level || 0;
      const haveMat = (ensureRpg(m, m.pushName).inventory || {})[TOOL.matId]?.qty || 0;
      return m.reply(raraRpgBox("mining",
        `⛏️ BELIUNG KAMU

Level : *Lv.${lv}*
💰 Bonus gold : +${15 * lv}%
🔩 Bijih Besi : ${haveMat}x

💡 Upgrade ke Lv.${lv + 1}: ${TOOL.matCost(lv)}x Bijih Besi + ${formatRp(TOOL.rpCost(lv))}
Ketik: .mining upgrade`));
    }

    const cd = checkCooldown(m, "lastMine");
    if (cd) {
      await reactCooldown(m);
      return m.reply(raraRpgBox("mining", `Cooldown mining tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < MINE_ENERGY) {
      await m.react("🚫");
      return m.reply(raraRpgBox("mining", `Energi kurang! Butuh *${MINE_ENERGY} energy*. Energy kamu: *${rpg.energy}/${rpg.maxEnergy}*\nGunakan .heal untuk recover.`, "warn"));
    }

    useEnergy(m, MINE_ENERGY, sock);

    // Animasi khas mining: GALI MAKIN DALAM (penampang tanah per kedalaman)
    await shapeMining(m, sock);

    const luckBonus = rpg.luck || 0;
    const dropBonus = rpg.dropBonus || 0;
    const drops = [];

    for (const ore of ORE_TABLE) {
      // 🌦️ CUACA: multiplier peluang ore (salju +20%, badai −30%)
      const chance = Math.min(100, (ore.chance + luckBonus + dropBonus) * getRpgWeather().mine);
      if (Math.random() * 100 <= chance) {
        const qty = Math.floor(Math.random() * (ore.maxQty - ore.minQty + 1)) + ore.minQty;
        drops.push({ item: ore.item, qty });
        addItem(m, ore.item, qty);
      }
    }

    const totalMined = drops.reduce((a, d) => a + d.qty, 0);
    if (totalMined > 0) await bumpPlayerStat(m, "mining", "totalMine", totalMined);

    const expGain = Math.floor(Math.random() * (EXP_RANGE[1] - EXP_RANGE[0] + 1)) + EXP_RANGE[0];
    const weather = getRpgWeather();
    const goldGain = Math.floor((Math.floor(Math.random() * (GOLD_RANGE[1] - GOLD_RANGE[0] + 1)) + GOLD_RANGE[0]) * (1 + TOOL.goldBonus(tool.level || 0)) * weather.mine);
    addExp(m, expGain);
    addGold(m, goldGain);
    setCooldown(m, "lastMine", MINE_COOLDOWN);

    const dropText = drops.length > 0
      ? drops.map(d => `• ${ITEM_DB[d.item]?.name || d.item} : +${d.qty}x`).join("\n")
      : "• gak dapet ore kali ini 😅";
    const lv = tool.level || 0;

    await m.react("🐣");
    return m.reply(raraRpgBox("mining",
      `⛏️ TAMBANG BERHASIL

` +
      `🪨 Temuan:
${dropText}

` +
      `✨ EXP : +${expGain}
💰 Gold : +${goldGain}
💵 Uang : Rp ${getCash(m)}

` +
      `⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}
` +
      `${rpgWeatherTag(weather)}\n` +
      (lv ? `⛏️ Beliung : Lv.${lv} (+${15 * lv}% gold)` : `💡 Beliung bisa diupgrade: .mining status`), "success"));
  } catch (err) {
    console.error("mining error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("mining", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
