// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Huntwild — Berburu hewan liar
// Rombak khas (batch #12): animasi Hewan dalam Semak +
// item khas Taring Liar + tool Anjing Pemburu.

import { ensureRpg, addItem, useEnergy, addExp, getCash, spendCash, formatRp } from "../../src/lib/rara-rpg-service.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { shapeHuntwild } from "../../src/lib/rara-rpg-shapes.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "huntwild", alias: ["huntwild", "huntwildrpg"],
  category: "rpg", description: "Berburu hewan liar (10 energy)",
  usage: ".huntwild — berburu hewan liar\n.huntwild anjing — status tool\n.huntwild upgrade — upgrade anjing pemburu (+10% EXP per level)",
  example: ".huntwild",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 15, energi: 10, isEnabled: true,
};

const ANIMALS = [
  { name: "rusa", emoji: "🦌", drops: [] },
  { name: "kelinci", emoji: "🐰", drops: [] },
  { name: "beruang", emoji: "🐻", drops: [{ item: "bearClaw", chance: 30 }] },
  { name: "serigala", emoji: "🐺", drops: [{ item: "wolfPelt", chance: 30 }] },
  { name: "rubah", emoji: "🦊", drops: [] },
  { name: "babi hutan", emoji: "🐗", drops: [] },
];

// ─── KHAS HUNTWILD: 🦴 Taring Liar & 🐕 Anjing Pemburu ───
const TOOL = {
  name: "🐕 Anjing Pemburu", dbKey: "huntwildTool",
  FANG_CHANCE: 30,          // % per buru (nemu beruang dijamin +2)
  fangCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 25000 * (lv + 1),
  expBonus: (lv) => 0.1 * lv, // EXP buru +10% per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, fangs: 0 });

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("huntwild", "RPG belum siap.", "error"));
    const prefix = m.prefix || ".";
    const sub = (m.args?.[0] || "").toLowerCase();

    // ── subcommand khas: anjing status ──
    if (sub === "anjing" || sub === "status") {
      const tool = getTool(m.sender);
      const lv = tool.level || 0;
      return m.reply(raraRpgBox("huntwild",
        `🐕 ANJING PEMBURU KAMU\n\n` +
        `Level : *Lv.${lv}*\n⭐ Bonus EXP : +${10 * lv}%\n🦴 Taring Liar : ${tool.fangs || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.fangCost(lv)}x Taring + ${formatRp(TOOL.rpCost(lv))}\nKetik: ${prefix}huntwild upgrade`));
    }

    // ── subcommand khas: upgrade ──
    if (sub === "upgrade") {
      const tool = getTool(m.sender);
      const lv = tool.level || 0;
      const needFang = TOOL.fangCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.fangs || 0) < needFang) {
        await m.react("❌");
        return m.reply(raraRpgBox("huntwild",
          `🦴 Upgrade Anjing ke Lv.${lv + 1} butuh:\n\n• Taring Liar : ${needFang}x (punya ${tool.fangs || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Taring didapat dari berburu sendiri — 30% per buru, nemu beruang dijamin +2!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        await m.react("❌");
        return m.reply(raraRpgBox("huntwild", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.fangs = (fresh.fangs || 0) - needFang;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      await getDatabase().setPlayerData?.(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("huntwild",
        `🐕 ANJING UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n⭐ Bonus EXP : +${10 * (lv + 1)}%\n\n🦴 Material : −${needFang} Taring Liar\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    // ── main buru ──
    if (rpg.energy < 10) return m.reply(raraRpgBox("huntwild", "Energy tidak cukup.", "error"));
    await m.react("🕒");
    const tool = getTool(m.sender);
    const lv = tool.level || 0;

    // Roll hewan (mekanik asli gak berubah)
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];

    // Animasi khas: hewan dalam semak
    await shapeHuntwild(m, sock, animal.emoji);

    useEnergy(m, 10, sock);
    // FIX BUG LAMA: daging_* gak pernah ada di ITEM_DB → addItem selalu gagal
    // diam-diam. Sekarang drop beneran: rawMeat selalu + bonus per hewan.
    addItem(m, "rawMeat", 1);
    const bonusDrops = [];
    for (const d of animal.drops || []) {
      if (Math.random() * 100 < d.chance) { addItem(m, d.item, 1); bonusDrops.push(d.item); }
    }
    const baseExp = 20;
    const expGain = Math.floor(baseExp * (1 + TOOL.expBonus(lv)));
    addExp(m, expGain);

    // 🦴 Taring Liar — item khas huntwild (30%, beruang dijamin +2)
    let fangGain = animal.name === "beruang" ? 2 : 0;
    if (fangGain === 0 && Math.random() * 100 < TOOL.FANG_CHANCE) fangGain = 1;
    if (fangGain > 0) {
      const fresh = getTool(m.sender);
      fresh.fangs = (fresh.fangs || 0) + fangGain;
      await getDatabase().setPlayerData?.(m.sender, TOOL.dbKey, fresh);
    }

    // CATATAN: useEnergy/addItem/addExp sudah save sendiri — JANGAN saveRpg(m, rpg)
    // lagi di sini (stale-ref: rpg lama gak bawa mutasi service → overwrite hilang)
    const fresh = ensureRpg(m, m.pushName);
    await m.react("🐣");
    return m.reply(raraRpgBox("huntwild",
      `🏹 BURUAN DIDAPAT!\n\n` +
      `🎯 Tangkapan : *${animal.name}* ${animal.emoji}\n` +
      `📦 Drop : Daging Mentah x1${bonusDrops.length ? ` + ${bonusDrops.map((b) => b === "bearClaw" ? "Cakar Beruang x1" : "Bulu Serigala x1").join(", ")}` : ""}\n` +
      `⭐ EXP : +${expGain}\n` +
      (fangGain ? `🦴 Taring Liar : +${fangGain}x (total ${getTool(m.sender).fangs}x)\n` : "") +
      `⚡ Energi : ${fresh.energy}/${fresh.maxEnergy || 100}\n` +
      (lv ? `\n🐕 Anjing : Lv.${lv} (+${10 * lv}% EXP)` : `\n💡 Anjing pemburu bisa diupgrade: ${prefix}huntwild anjing`)));
  } catch (e) {
    console.error("huntwild error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox("huntwild", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
