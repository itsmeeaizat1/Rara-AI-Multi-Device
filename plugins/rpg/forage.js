// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Forage — Cari tanaman/herba di alam
// Rombak khas (batch #11): animasi Keranjang Mengisi +
// item khas Benih Langka + tool Keranjang Anyam.

import { ensureRpg, saveRpg, getCash, spendCash, formatRp } from "../../src/lib/nova-rpg-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { shapeForage } from "../../src/lib/nova-rpg-shapes.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "forage",
  alias: ["forage", "cariherba", "gather"],
  category: "rpg",
  description: "Cari tanaman dan herba di alam",
  usage: ".forage — cari tanaman liar\n.forage keranjang — status tool\n.forage upgrade — upgrade keranjang (+10% EXP per level)",
  example: ".forage",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, energi: 5, isEnabled: true,
};

const FORAGE_ITEMS = [
  { name: "herba", rarity: "common", value: 5 },
  { name: "akar ajaib", rarity: "uncommon", value: 15 },
  { name: "jamur emas", rarity: "rare", value: 50 },
  { name: "bunga langka", rarity: "rare", value: 80 },
  { name: "daun suci", rarity: "epic", value: 200 },
];

// ─── KHAS FORAGE: 🌱 Benih Langka & 🧺 Keranjang Anyam ───
const TOOL = {
  name: "🧺 Keranjang Anyam", dbKey: "forageTool",
  SEED_CHANCE: 30,          // % per forage (nemu daun suci dijamin +2)
  seedCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 20000 * (lv + 1),
  expBonus: (lv) => 0.1 * lv, // EXP forage +10% per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, seeds: 0 });

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("forage", "RPG belum siap. Ketik .daftar dulu.", "error"));
    const prefix = m.prefix || ".";
    const sub = (m.args?.[0] || "").toLowerCase();

    // ── subcommand khas: keranjang status ──
    if (sub === "keranjang" || sub === "status") {
      const tool = getTool(m.sender);
      const lv = tool.level || 0;
      return m.reply(novaRpgBox("forage",
        `🧺 KERANJANG ANYAM KAMU\n\n` +
        `Level : *Lv.${lv}*\n⭐ Bonus EXP : +${10 * lv}%\n🌱 Benih Langka : ${tool.seeds || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.seedCost(lv)}x Benih + ${formatRp(TOOL.rpCost(lv))}\nKetik: ${prefix}forage upgrade`));
    }

    // ── subcommand khas: upgrade ──
    if (sub === "upgrade") {
      const tool = getTool(m.sender);
      const lv = tool.level || 0;
      const needSeed = TOOL.seedCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.seeds || 0) < needSeed) {
        await m.react("❌");
        return m.reply(novaRpgBox("forage",
          `🌱 Upgrade Keranjang ke Lv.${lv + 1} butuh:\n\n• Benih Langka : ${needSeed}x (punya ${tool.seeds || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Benih didapat dari forage sendiri — 30% per cari, nemu daun suci dijamin +2!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        await m.react("❌");
        return m.reply(novaRpgBox("forage", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.seeds = (fresh.seeds || 0) - needSeed;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      await getDatabase().setPlayerData?.(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(novaRpgBox("forage",
        `🧺 KERANJANG UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n⭐ Bonus EXP : +${10 * (lv + 1)}%\n\n🌱 Material : −${needSeed} Benih Langka\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    // ── main forage ──
    if ((rpg.energy || 0) < 5) return m.reply(novaRpgBox("forage", "Energi tidak cukup. Butuh 5 energi.", "info"));

    await m.react("🕒");
    const tool = getTool(m.sender);
    const lv = tool.level || 0;

    // Animasi khas: keranjang mengisi
    await shapeForage(m, sock);

    // Roll item (mekanik asli gak berubah)
    const item = FORAGE_ITEMS[Math.floor(Math.random() * FORAGE_ITEMS.length)];
    rpg.energy = (rpg.energy || 0) - 5;
    rpg.inventory = rpg.inventory || {};
    rpg.inventory[item.name] = (rpg.inventory[item.name] || 0) + 1;
    const baseExp = 10;
    const expGain = Math.floor(baseExp * (1 + TOOL.expBonus(lv)));
    rpg.exp = (rpg.exp || 0) + expGain;

    // 🌱 Benih Langka — item khas forage (30%, daun suci dijamin +2)
    let seedGain = item.name === "daun suci" ? 2 : 0;
    if (seedGain === 0 && Math.random() * 100 < TOOL.SEED_CHANCE) seedGain = 1;
    if (seedGain > 0) {
      const fresh = getTool(m.sender);
      fresh.seeds = (fresh.seeds || 0) + seedGain;
      await getDatabase().setPlayerData?.(m.sender, TOOL.dbKey, fresh);
    }

    saveRpg(m, rpg);
    await m.react("🐣");
    return m.reply(novaRpgBox("forage",
      `🌿 KAMU MENEMUKAN TANAMAN LIAR!\n\n` +
      `🎁 Item : *${item.name}* (${item.rarity})\n` +
      `⭐ EXP : +${expGain}\n` +
      (seedGain ? `🌱 Benih Langka : +${seedGain}x (total ${getTool(m.sender).seeds}x)\n` : "") +
      `⚡ Energi : ${rpg.energy}/${rpg.maxEnergy || 100}\n` +
      (lv ? `\n🧺 Keranjang : Lv.${lv} (+${10 * lv}% EXP)` : `\n💡 Keranjang bisa diupgrade: ${prefix}forage keranjang`)));
  } catch (e) {
    console.error("forage error:", e.message);
    await m.react("❌");
    return m.reply(novaRpgBox("forage", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
