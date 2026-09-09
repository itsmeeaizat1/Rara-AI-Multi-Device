// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Nebang — Cut trees for wood (different tree types, scaling)

import {
  ensureRpg, addExp, addGold, useEnergy, addItem, ITEM_DB,
  checkCooldown, setCooldown, formatTime,
  bumpPlayerStat,
  getCash, spendCash, formatRp} from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
import { shapeNebang } from "../../src/lib/nova-rpg-shapes.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "nebang",
  alias: ["nebang", "tebang", "menebang", "woodcutting"],
  category: "rpg",
  description: "Menebang pohon untuk kayu dan gold",
  usage: ".nebang",
  example: ".nebang",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const NEBANG_ENERGY = 6;
const NEBANG_COOLDOWN = 45 * 1000;

// ─── KHAS NEBANG: 🪚 Serpih Kayu Keras & 🪓 Gergaji Mesin ───
const TOOL = {
  name: "🪓 Gergaji Mesin", dbKey: "nebangTool",
  SHARD_CHANCE: 40,            // % per tebang
  shardCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 25000 * (lv + 1),
  goldBonus: (lv) => 0.15 * lv,
  dropBonus: (lv) => 5 * lv,    // peluang drop kayu naik per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, shards: 0 });

const TREES = [
  { name: "Pohon Pinus", minLv: 1, gold: [5, 20], exp: [10, 25], drop: "pineWood", dropChance: 80 },
  { name: "Pohon Mahoni", minLv: 5, gold: [15, 40], exp: [20, 45], drop: "mahoganyWood", dropChance: 70 },
  { name: "Pohon Jati", minLv: 15, gold: [30, 70], exp: [35, 70], drop: "teakWood", dropChance: 60 },
  { name: "Pohon Ebony", minLv: 30, gold: [60, 120], exp: [50, 100], drop: "ebonyWood", dropChance: 50 },
  { name: "Pohon Mistik", minLv: 50, gold: [100, 250], exp: [80, 150], drop: "mysticWood", dropChance: 35 },
];

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("nebang", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // ── subcommand khas nebang: gergaji status & upgrade ──
    const sub = (m.args?.[0] || "").toLowerCase();
    const tool = getTool(m.sender);
    const lv = tool.level || 0;

    if (sub === "gergaji" || sub === "status") {
      return m.reply(novaRpgBox("nebang",
        `🪓 GERGAJI KAMU

` +
        `Level : *Lv.${lv}*
💰 Bonus gold : +${15 * lv}%
🪵 Peluang drop kayu : +${5 * lv}%
🪚 Serpih Kayu Keras : ${tool.shards || 0}x

` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.shardCost(lv)}x Serpih + ${formatRp(TOOL.rpCost(lv))}
Ketik: .nebang upgrade`));
    }

    if (sub === "upgrade") {
      const needShard = TOOL.shardCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.shards || 0) < needShard) {
        return m.reply(novaRpgBox("nebang",
          `🪚 Upgrade Gergaji ke Lv.${lv + 1} butuh:

• Serpih Kayu Keras : ${needShard}x (punya ${tool.shards || 0}x)
• Biaya : ${formatRp(needRp)}

💡 Serpih didapat dari .nebang sendiri — 40% per tebang, pohon Ebony/Mistik dijamin +2!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        return m.reply(novaRpgBox("nebang", `💵 Upgrade butuh *${formatRp(needRp)}*.
Uang kamu: ${formatRp(getCash(m))}
💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.shards = (fresh.shards || 0) - needShard;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(novaRpgBox("nebang",
        `🪓 GERGAJI UPGRADED!

Level : Lv.${lv} → Lv.${lv + 1}
💰 Bonus gold : +${15 * (lv + 1)}%
🪵 Peluang drop kayu : +${5 * (lv + 1)}%

🪚 Material : −${needShard} Serpih Kayu Keras
💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    const cd = checkCooldown(m, "lastNebang");
    if (cd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("nebang", `Cooldown tebang tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < NEBANG_ENERGY) {
      await m.react("🚫");
      return m.reply(novaRpgBox("nebang", `Energi kurang! Butuh *${NEBANG_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    // Pick tree based on level
    const available = TREES.filter(t => rpg.level >= t.minLv);
    const tree = available[Math.floor(Math.random() * available.length)];

    useEnergy(m, NEBANG_ENERGY, sock);

    // Animasi khas nebang: TIMBER! (pohon miring per frame sampai tumbang)
    await shapeNebang(m, sock, tree.name, "🌲");

    const goldGain = Math.floor((Math.floor(Math.random() * (tree.gold[1] - tree.gold[0] + 1)) + tree.gold[0]) * (1 + TOOL.goldBonus(lv)));
    const expGain = Math.floor(Math.random() * (tree.exp[1] - tree.exp[0] + 1)) + tree.exp[0];

    addGold(m, goldGain);
    addExp(m, expGain);
    await bumpPlayerStat(m, "nebang", "totalNebang", 1);

    // Drop wood (peluang naik sesuai level gergaji)
    let woodLine = "";
    if (Math.random() * 100 < Math.min(95, tree.dropChance + TOOL.dropBonus(lv))) {
      const qty = Math.floor(Math.random() * 3) + 1;
      addItem(m, tree.drop, qty);
      woodLine = `🪵 ${ITEM_DB[tree.drop]?.name || tree.drop} : +${qty}x`;
    }

    // 🪚 Serpih Kayu Keras — item khas nebang
    let shardGain = 0;
    if (["Pohon Ebony", "Pohon Mistik"].includes(tree.name)) shardGain = 2;
    else if (Math.random() * 100 < TOOL.SHARD_CHANCE) shardGain = 1;
    if (shardGain > 0) {
      const freshTool = getTool(m.sender);
      freshTool.shards = (freshTool.shards || 0) + shardGain;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, freshTool);
    }

    setCooldown(m, "lastNebang", NEBANG_COOLDOWN);

    await m.react("🐣");
    return m.reply(novaRpgBox("nebang",
      `🪓 TEBANG SELESAI!

` +
      `🌲 Pohon : ${tree.name}

` +
      `${woodLine || "🪵 kayunya gak jatuh kali ini 😅"}
` +
      (shardGain ? `🪚 Serpih Kayu Keras : +${shardGain}x (total ${getTool(m.sender).shards}x)
` : "") +
      `
` +
      `💰 Gold : +${goldGain}
💵 Uang : Rp ${getCash(m)}
✨ EXP : +${expGain}

` +
      `⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}
` +
      (lv ? `🪓 Gergaji : Lv.${lv} (+${15 * lv}% gold)` : `💡 Gergaji bisa diupgrade: .nebang gergaji`)));
  } catch (err) {
    console.error("nebang error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("nebang", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
