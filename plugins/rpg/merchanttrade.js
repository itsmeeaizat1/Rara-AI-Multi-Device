// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Berdagang — Trade goods between villages for profit
// Rombak khas 9 Sep 2026 (batch #3 antrean animasi per-game):
// - Animasi bentuk baru RUTE KARAVAN (🐪 merangkak di garis jarak)
// - Item khas: 📜 Sertifikat Dagang (tiap dagang untung) → upgrade 🐪 Karavan
// - Result box rapih raraRpgBox

import {
  ensureRpg, saveRpg, addExp, addGold, removeGold,
  spendCash, getCash, formatRp,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/rara-rpg-service.js";
import { reactCooldown } from "../../src/lib/rara-menu-style.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
import { shapeDagang } from "../../src/lib/rara-rpg-shapes.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "merchanttrade",
  alias: ["berdagang", "dagang", "trader"],
  category: "rpg",
  description: "Dagang barang antar desa — untung = Sertifikat Dagang, upgrade Karavan biar harga jual naik",
  usage: ".berdagang\n.berdagang karavan (status)\n.berdagang upgrade",
  example: ".berdagang",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 0, isEnabled: true,
};

const DAGANG_ENERGY = 12;
const DAGANG_COOLDOWN = 3 * 60 * 1000;

const VILLAGES = [
  { name: "Desa Astra", mod: 1.0 },
  { name: "Desa Banten", mod: 1.15 },
  { name: "Desa Cirebon", mod: 0.85 },
  { name: "Desa Demak", mod: 1.2 },
  { name: "Desa Empat", mod: 0.9 },
];

const GOODS = [
  { name: "Beras", base: 20 },
  { name: "Garam", base: 15 },
  { name: "Kayu", base: 30 },
  { name: "Besi", base: 40 },
  { name: "Kain", base: 25 },
  { name: "Rempah", base: 50 },
];

// ─── KHAS BERDAGANG: 📜 Sertifikat Dagang & 🐪 Karavan Unggul ───
const TOOL = {
  name: "🐪 Karavan Unggul", dbKey: "dagangTool",
  certCost: (lv) => 2 * (lv + 1),          // sertifikat untuk level berikutnya
  rpCost: (lv) => 30000 * (lv + 1),        // biaya Rp
  sellBonus: (lv) => 0.1 * lv,             // +10% harga jual per level
};
const getTool = (jid) => (getDatabase().getPlayerData(jid, TOOL.dbKey) || { level: 0, spent: 0, certs: 0 });

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("berdagang", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // ── subcommand khas berdagang: karavan status & upgrade ──
    const sub = (m.args?.[0] || "").toLowerCase();
    const tool = getTool(m.sender);
    const lv = tool.level || 0;

    if (sub === "karavan" || sub === "status") {
      return m.reply(raraRpgBox("berdagang",
        `🐪 KARAVAN KAMU\n\n` +
        `Level : *Lv.${lv}*\n💰 Harga jual : +${10 * lv}%\n📜 Sertifikat Dagang : ${tool.certs || 0}x\n💵 Uang : ${formatRp(getCash(m))}\n\n` +
        `💡 Upgrade ke Lv.${lv + 1}: ${TOOL.certCost(lv)}x Sertifikat + ${formatRp(TOOL.rpCost(lv))}\nKetik: .berdagang upgrade`));
    }

    if (sub === "upgrade") {
      const needCert = TOOL.certCost(lv);
      const needRp = TOOL.rpCost(lv);
      if ((tool.certs || 0) < needCert) {
        return m.reply(raraRpgBox("berdagang",
          `📜 Upgrade Karavan ke Lv.${lv + 1} butuh:\n\n• Sertifikat Dagang : ${needCert}x (punya ${tool.certs || 0}x)\n• Biaya : ${formatRp(needRp)}\n\n💡 Sertifikat didapat dari .berdagang sendiri — tiap dagang UNTUNG dapet +1 (+2 kalau profit ≥100)`, "warn"));
      }
      if (!spendCash(m, needRp)) {
        return m.reply(raraRpgBox("berdagang", `💵 Upgrade butuh *${formatRp(needRp)}*.\nUang kamu: ${formatRp(getCash(m))}\n💡 Kerja dulu: .nguli kerja / .kerja`, "warn"));
      }
      const fresh = getTool(m.sender);
      fresh.certs = (fresh.certs || 0) - needCert;
      fresh.level = (fresh.level || 0) + 1;
      fresh.spent = (fresh.spent || 0) + needRp;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, fresh);
      await m.react("🐣");
      return m.reply(raraRpgBox("berdagang",
        `🐪 KARAVAN UPGRADED!\n\nLevel : Lv.${lv} → Lv.${lv + 1}\n💰 Harga jual : +${10 * (lv + 1)}%\n\n📜 Material : −${needCert} Sertifikat Dagang\n💵 Biaya : ${formatRp(needRp)}`, "success"));
    }

    await m.react("🕒");

    const cd = checkCooldown(m, "lastDagang");
    if (cd) {
      await reactCooldown(m);
      return m.reply(raraRpgBox("berdagang", `Cooldown dagang tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < DAGANG_ENERGY) {
      await m.react("🚫");
      return m.reply(raraRpgBox("berdagang", `Energi kurang! Butuh *${DAGANG_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
    }

    // Energy cost
    rpg.energy = Math.max(0, rpg.energy - DAGANG_ENERGY);

    // Simulate trading: buy at one village, sell at another
    const buyVillage = VILLAGES[Math.floor(Math.random() * VILLAGES.length)];
    let sellVillage;
    do {
      sellVillage = VILLAGES[Math.floor(Math.random() * VILLAGES.length)];
    } while (sellVillage.name === buyVillage.name);

    const good = GOODS[Math.floor(Math.random() * GOODS.length)];
    const buyPrice = Math.floor(good.base * buyVillage.mod * (0.9 + Math.random() * 0.2));
    // Karavan level = harga jual lebih tinggi di desa tujuan
    const sellPrice = Math.floor(good.base * sellVillage.mod * (0.9 + Math.random() * 0.2) * (1 + TOOL.sellBonus(lv)));

    // Invest some gold into the trade
    const investAmount = Math.min(rpg.gold, 50 + rpg.level * 5);
    if (investAmount < buyPrice) {
      // Can't afford even 1 unit
      return m.reply(raraRpgBox("berdagang", `Gold kurang untuk dagang. Minimal butuh *${buyPrice} gold* untuk beli ${good.name}.`, "warn"));
    }

    // Animasi khas berdagang: RUTE KARAVAN
    await shapeDagang(m, sock, buyVillage.name, sellVillage.name, good.name);

    const qty = Math.floor(investAmount / buyPrice);
    const cost = qty * buyPrice;
    const revenue = qty * sellPrice;
    const profit = revenue - cost;

    removeGold(m, cost, sock);
    addGold(m, revenue);

    const expGain = 30 + Math.floor(Math.abs(profit) / 10);
    addExp(m, expGain);

    // 📜 Sertifikat Dagang — item khas berdagang (untung = dapat)
    let certGain = 0;
    if (profit > 0) certGain = profit >= 100 ? 2 : 1;
    if (certGain > 0) {
      const freshTool = getTool(m.sender);
      freshTool.certs = (freshTool.certs || 0) + certGain;
      getDatabase().setPlayerData(m.sender, TOOL.dbKey, freshTool);
    }

    saveRpg(m, { energy: rpg.energy, dagangProfit: (rpg.dagangProfit || 0) + profit });
    setCooldown(m, "lastDagang", DAGANG_COOLDOWN);

    const profitLine = profit > 0 ? `✅ Profit : +${profit} gold` : profit < 0 ? `❌ Rugi : ${profit} gold` : "🟰 Hasil : 0 gold (balik modal)";
    await m.react("🐣");
    return m.reply(raraRpgBox("berdagang",
      `${profit > 0 ? "📈 DAGANG UNTUNG!" : profit < 0 ? "📉 DAGANG RUGI!" : "🟰 BALIK MODAL!"}\n\n` +
      `🏘️ Dari : ${buyVillage.name}\n📍 Ke : ${sellVillage.name}\n📦 Barang : ${good.name} x${qty}\n\n` +
      `💵 Beli : ${buyPrice} gold/pcs (total ${cost})\n💰 Jual : ${sellPrice} gold/pcs (total ${revenue})\n${profitLine}\n✨ EXP : +${expGain}\n\n` +
      (certGain ? `📜 Sertifikat Dagang : +${certGain}x\n` : "") +
      (certGain || (tool.certs || 0) > 0 ? `📜 Sertifikat total : ${((certGain ? (getTool(m.sender).certs) : tool.certs))}x\n` : "") +
      `⚡ Energy : ${rpg.energy}/${rpg.maxEnergy}\n` +
      (lv ? `🐪 Karavan : Lv.${lv} (+${10 * lv}% harga jual)` : `💡 Karavan bisa diupgrade: .berdagang karavan`),
      profit >= 0 ? "success" : "warn"));
  } catch (err) {
    console.error("berdagang error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("berdagang", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
