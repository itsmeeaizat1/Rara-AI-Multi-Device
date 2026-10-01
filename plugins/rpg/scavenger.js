// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Sampah — Collect trash for recycling (low effort, low reward, eco)

import {
  ensureRpg, addExp, addGold, useEnergy, addItem,
  checkCooldown, setCooldown, formatTime,
  bumpPlayerStat, getCash, spendCash, formatRp,
} from "../../src/lib/rara-rpg-service.js";
import { reactCooldown } from "../../src/lib/rara-menu-style.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import { shapeSampah } from "../../src/lib/rara-rpg-shapes.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "scavenger",
  alias: ["sampah", "buangsampah"],
  category: "rpg",
  description: "Kumpulkan sampah untuk didaur ulang — gold kecil tapi EXP lumayan",
  usage: ".sampah",
  example: ".sampah",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SAMPAH_ENERGY = 3;
const SAMPAH_COOLDOWN = 20 * 1000;

const SAMPAH_TYPES = [
  { name: "Botol Plastik", gold: 2, exp: 5, drop: "plasticBottle", chance: 80 },
  { name: "Kaleng Aluminium", gold: 5, exp: 8, drop: "aluminumCan", chance: 60 },
  { name: "Kertas Bekas", gold: 1, exp: 3, drop: "scrapPaper", chance: 90 },
  { name: "Besi Tua", gold: 8, exp: 12, drop: "scrapIron", chance: 30 },
  { name: "Elektronik Rusak", gold: 15, exp: 20, drop: "eWaste", chance: 10 },
];

// ─── KHAS SAMPAH: ♻️ Kepingan Daur Ulang & 🚚 Gerobak Daur Ulang ───
const TOOL = {
  name: "🚚 Gerobak Daur Ulang", dbKey: "sampahTool",
  SCRAP_CHANCE: 30,               // % per kumpul (nemu e-waste dijamin +2)
  scrapCost: (lv) => 2 * (lv + 1),
  rpCost: (lv) => 25000 * (lv + 1),
  rewardBonus: (lv) => 0.1 * lv,  // gold & EXP +10% per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, scraps: 0 });

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("sampah", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // ── subcommand khas sampah: gerobak status & upgrade ──
    const sub = (m.args?.[0] || "").toLowerCase();
    const tool = getTool(m.sender);
    const lv = tool.level || 0;
    if (sub === "gerobak" || sub === "status") {
      return m.reply(raraRpgBox("sampah",
        `🚚 GEROBAK DAUR ULANG KAMU\n\n` +
        `Level : *Lv.${lv}*\n💰 Bonus gold : +${10 * lv}%\n✨ Bonus EXP : +${10 * lv}%\n♻️ Kepingan Daur Ulang : ${tool.scraps || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.scrapCost(lv)}x Kepingan + ${formatRp(TOOL.rpCost(lv))}\nKetik: .sampah upgrade`));
    }
    if (sub === "upgrade") {
      const needSc = TOOL.scrapCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.scraps || 0) < needSc) {
        return m.reply(raraRpgBox("sampah",
          `♻️ Upgrade Gerobak ke Lv.${lv + 1} butuh:\n\n• Kepingan Daur Ulang : ${needSc}x (punya ${tool.scraps || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Kepingan didapat dari .sampah sendiri — 30% per kumpul, nemu Elektronik Rusak dijamin +2!`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        return m.reply(raraRpgBox("sampah", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.scraps = (fresh.scraps || 0) - needSc;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("sampah",
        `🚚 GEROBAK UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n💰 Bonus gold : +${10 * (lv + 1)}%\n✨ Bonus EXP : +${10 * (lv + 1)}%\n\n♻️ Material : −${needSc} Kepingan Daur Ulang\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    const cd = checkCooldown(m, "lastSampah");
    if (cd) {
      await reactCooldown(m);
      return m.reply(raraRpgBox("sampah", `Cooldown tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < SAMPAH_ENERGY) {
      await m.react("🚫");
      return m.reply(raraRpgBox("sampah", `Energi kurang! Butuh *${SAMPAH_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    useEnergy(m, SAMPAH_ENERGY, sock);

    // Animasi khas sampah: GOT BERSIH (🧹 menyapu, sampah jadi ♻️)
    await shapeSampah(m, sock);

    // Roll 1-3 items
    const found = [];
    const count = Math.floor(Math.random() * 3) + 1;
    let totalGold = 0;
    let totalExp = 0;
    let gotEwaste = false;

    for (let i = 0; i < count; i++) {
      const trash = SAMPAH_TYPES[Math.floor(Math.random() * SAMPAH_TYPES.length)];
      const goldGain = Math.floor(trash.gold * (1 + Math.random() * 0.5) * (1 + TOOL.rewardBonus(lv)));
      const expGain = Math.floor(trash.exp * (1 + Math.random() * 0.5) * (1 + TOOL.rewardBonus(lv)));

      totalGold += goldGain;
      totalExp += expGain;

      if (trash.drop === "eWaste") gotEwaste = true;
      if (Math.random() * 100 < trash.chance) {
        addItem(m, trash.drop, 1);
        found.push(`${trash.name} (+${goldGain} gold, +${expGain} EXP)`);
      } else {
        found.push(`${trash.name} (+${goldGain} gold, +${expGain} EXP)`);
      }
    }

    // ♻️ Kepingan Daur Ulang — item khas sampah (30% per kumpul, e-waste dijamin +2)
    let scrapGain = gotEwaste ? 2 : 0;
    if (scrapGain === 0 && Math.random() * 100 < TOOL.SCRAP_CHANCE) scrapGain = 1;
    if (scrapGain > 0) {
      const freshTool = getTool(m.sender);
      freshTool.scraps = (freshTool.scraps || 0) + scrapGain;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, freshTool);
    }

    addGold(m, totalGold);
    await bumpPlayerStat(m, "sampah", "totalSampah", 1);
    addExp(m, totalExp);

    setCooldown(m, "lastSampah", SAMPAH_COOLDOWN);

    await m.react("🐣");
    return m.reply(raraRpgBox("sampah",
      `♻️ SAMPAH BERHASIL DIKUMPULKAN!\n\n` +
      `Hasil kulet sampah (${count} item):\n${found.map(f => `• ${f}`).join("\n")}\n\n` +
      `💰 Total gold : +${totalGold}\n✨ Total EXP : +${totalExp}\n⚡ Energi : ${rpg.energy}/${rpg.maxEnergy}\n` +
      (scrapGain ? `♻️ Kepingan Daur Ulang : +${scrapGain}x (total ${getTool(m.sender).scraps}x)\n` : "") +
      (lv ? `🚚 Gerobak : Lv.${lv} (+${10 * lv}% gold & EXP)` : `\n💡 Gerobak bisa diupgrade: .sampah gerobak`)));
  } catch (err) {
    console.error("sampah error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("sampah", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
