// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG TimeTravel — Perjalanan waktu harian
// Rombak khas (batch #13): animasi Lorong Waktu + 4 era tujuan
// dengan artefak masing-masing + item khas Kristal Waktu +
// tool Jam Pasir Kronos (+10% gold per level).

import { ensureRpg, saveRpg, addGold, addItem, getCash, spendCash, formatRp } from "../../src/lib/rara-rpg-service.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { shapeTimetravel } from "../../src/lib/rara-rpg-shapes.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "timetravel", alias: ["timetravel", "timetravelrpg"],
  category: "rpg", description: "Perjalanan waktu — jelajahi 4 era & bawa pulang artefak + gold (24 jam)",
  usage: ".timetravel — jelajah era acak\n.timetravel jam — status jam pasir\n.timetravel upgrade — upgrade jam pasir (+10% gold per level)",
  example: ".timetravel",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 20, isEnabled: true,
};

// ─── 4 ERA TUJUAN — masing-masing punya artefak khas ───
const ERAS = [
  { key: "prasejarah", emoji: "🦖", name: "Era Prasejarah", year: "66.000.000 SM", item: "fossilPurba", itemLabel: "Fosil Purba", dropChance: 30 },
  { key: "mesir", emoji: "🏺", name: "Mesir Kuno", year: "3.000 SM", item: "amuletMesir", itemLabel: "Amulet Mesir", dropChance: 30 },
  { key: "majapahit", emoji: "🏯", name: "Kerajaan Majapahit", year: "1400 M", item: "kerisMajapahit", itemLabel: "Keris Majapahit", dropChance: 30 },
  { key: "masadepan", emoji: "🚀", name: "Masa Depan", year: "3000 M", item: "chipKuantum", itemLabel: "Chip Kuantum", dropChance: 30 },
];

// ─── KHAS TIMETRAVEL: 🌀 Kristal Waktu & 🕒 Jam Pasir Kronos ───
const TOOL = {
  name: "🕒 Jam Pasir Kronos", dbKey: "timetravelTool",
  CRYSTAL_CHANCE: 30,         // % per travel (era Masa Depan dijamin +2)
  crystalCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 30000 * (lv + 1),
  goldBonus: (lv) => 0.1 * lv, // gold reward +10% per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, crystals: 0 });

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("timetravel", "RPG belum siap.", "error"));
    const prefix = m.prefix || ".";
    const sub = (m.args?.[0] || "").toLowerCase();

    // ── subcommand khas: jam status ──
    if (sub === "jam" || sub === "status") {
      const tool = getTool(m.sender);
      const lv = tool.level || 0;
      return m.reply(raraRpgBox("timetravel",
        `🕒 JAM PASIR KRONOS KAMU\n\n` +
        `Level : *Lv.${lv}*\n💰 Bonus Gold : +${10 * lv}%\n🌀 Kristal Waktu : ${tool.crystals || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.crystalCost(lv)}x Kristal + ${formatRp(TOOL.rpCost(lv))}\nKetik: ${prefix}timetravel upgrade`));
    }

    // ── subcommand khas: upgrade ──
    if (sub === "upgrade") {
      const tool = getTool(m.sender);
      const lv = tool.level || 0;
      const needCrys = TOOL.crystalCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.crystals || 0) < needCrys) {
        await m.react("❌");
        return m.reply(raraRpgBox("timetravel",
          `🌀 Upgrade Jam Pasir ke Lv.${lv + 1} butuh:\n\n• Kristal Waktu : ${needCrys}x (punya ${tool.crystals || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Kristal didapat dari perjalanan sendiri — 30% per jelajah, sampai Masa Depan dijamin +2!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        await m.react("❌");
        return m.reply(raraRpgBox("timetravel", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.crystals = (fresh.crystals || 0) - needCrys;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      await getDatabase().setPlayerData?.(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("timetravel",
        `🕒 JAM PASIR UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n💰 Bonus Gold : +${10 * (lv + 1)}%\n\n🌀 Material : −${needCrys} Kristal Waktu\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    // ── main travel (cek cooldown DULU — bug lama: animasi jalan walau tolak) ──
    if (rpg.lastTimetravel && Date.now() - rpg.lastTimetravel < 86400000) {
      const sisa = Math.ceil((86400000 - (Date.now() - rpg.lastTimetravel)) / 3600000);
      return m.reply(raraRpgBox("timetravel", `🕒 Mesin waktu masih mengisi daya.\nCoba lagi dalam ±${sisa} jam.`, "info"));
    }
    // CATATAN: energi game dicek & dipotong dispatcher (config energi: 20)
    await m.react("🕒");
    const tool = getTool(m.sender);
    const lv = tool.level || 0;

    // Roll era tujuan
    const era = ERAS[Math.floor(Math.random() * ERAS.length)];

    // Animasi khas: lorong waktu
    await shapeTimetravel(m, sock, era);

    saveRpg(m, { lastTimetravel: Date.now() });

    // Reward: gold (base 1000-2000, +10% per level jam pasir)
    const baseGold = Math.floor(Math.random() * 1000) + 1000;
    const goldGain = Math.floor(baseGold * (1 + TOOL.goldBonus(lv)));
    addGold(m, goldGain);

    // Artefak era (30%)
    let artefak = null;
    if (Math.random() * 100 < era.dropChance) {
      addItem(m, era.item, 1);
      artefak = era.itemLabel;
    }

    // 🌀 Kristal Waktu (30%, Masa Depan dijamin +2)
    let crysGain = era.key === "masadepan" ? 2 : 0;
    if (crysGain === 0 && Math.random() * 100 < TOOL.CRYSTAL_CHANCE) crysGain = 1;
    if (crysGain > 0) {
      const fresh = getTool(m.sender);
      fresh.crystals = (fresh.crystals || 0) + crysGain;
      await getDatabase().setPlayerData?.(m.sender, TOOL.dbKey, fresh);
    }

    await m.react("🐣");
    return m.reply(raraRpgBox("timetravel",
      `${era.emoji} KAMU MENDARAT DI ${era.name.toUpperCase()}!\n\n` +
      `📍 Tahun : ${era.year}\n` +
      `💰 Gold : +${goldGain}\n` +
      (artefak ? `🏺 Artefak : *${artefak}* x1\n` : "") +
      (crysGain ? `🌀 Kristal Waktu : +${crysGain}x (total ${getTool(m.sender).crystals}x)\n` : "") +
      `⚡ Energi : ${ensureRpg(m, m.pushName).energy}/${ensureRpg(m, m.pushName).maxEnergy || 100}\n` +
      (lv ? `\n🕒 Jam Pasir : Lv.${lv} (+${10 * lv}% gold)` : `\n💡 Jam pasir bisa diupgrade: ${prefix}timetravel jam`)));
  } catch (e) {
    console.error("timetravel error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox("timetravel", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
