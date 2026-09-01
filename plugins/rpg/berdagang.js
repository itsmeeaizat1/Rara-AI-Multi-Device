// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Berdagang — Trade goods between villages for profit

import {
  ensureRpg, saveRpg, addExp, addGold, removeGold,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "berdagang",
  alias: ["berdagang", "dagang", "trader"],
  category: "rpg",
  description: "Dagang barang antar desa untuk profit (buy low, sell high)",
  usage: ".berdagang",
  example: ".berdagang",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 0,
  isEnabled: true,
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

async function handler(m, { sock }) {
  try {
    await m.react("🕒");

    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("berdagang", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const cd = checkCooldown(m, "lastDagang");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("berdagang", `Cooldown dagang tersisa *${formatTime(cd)}*`, "warn"));
    }

    if (rpg.energy < DAGANG_ENERGY) {
      await m.react("🚫");
      return m.reply(claraWrap("berdagang", `Energi kurang! Butuh *${DAGANG_ENERGY}*. Energy: *${rpg.energy}/${rpg.maxEnergy}*`, "warn"));
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
    const sellPrice = Math.floor(good.base * sellVillage.mod * (0.9 + Math.random() * 0.2));

    // Invest some gold into the trade
    const investAmount = Math.min(rpg.gold, 50 + rpg.level * 5);
    if (investAmount < buyPrice) {
      // Can't afford even 1 unit
      return m.reply(claraWrap("berdagang", `Gold kurang untuk dagang. Minimal butuh *${buyPrice} gold* untuk beli ${good.name}.`, "warn"));
    }

    const qty = Math.floor(investAmount / buyPrice);
    const cost = qty * buyPrice;
    const revenue = qty * sellPrice;
    const profit = revenue - cost;

    removeGold(m, cost, sock);
    addGold(m, revenue);

    const expGain = 30 + Math.floor(Math.abs(profit) / 10);
    addExp(m, expGain);

    saveRpg(m, { energy: rpg.energy, dagangProfit: (rpg.dagangProfit || 0) + profit });
    setCooldown(m, "lastDagang", DAGANG_COOLDOWN);

    await m.react("🐣");
    let msg = `╭─「 ʙᴇʀᴅᴀɢᴀɴɢ 」\n`;
    msg += `│ 🏘️ Dari: *${buyVillage.name}*\n`;
    msg += `│ 📍 Ke: *${sellVillage.name}*\n`;
    msg += `│ 📦 Barang: *${good.name}* x${qty}\n`;
    msg += `│\n`;
    msg += `│ 💵 Beli: *${buyPrice} gold/pcs* (Total: ${cost})\n`;
    msg += `│ 💰 Jual: *${sellPrice} gold/pcs* (Total: ${revenue})\n`;
    msg += `│\n`;

    if (profit > 0) {
      msg += `│ ✅ Profit: *+${profit} gold*\n`;
    } else if (profit < 0) {
      msg += `│ ❌ Rugi: *${profit} gold*\n`;
    } else {
      msg += `│ 🟰 Break even: *0 gold*\n`;
    }

    msg += `│ ✦ EXP: *+${expGain}*\n`;
    msg += `│\n`;
    msg += `│ 💼 Gold: *${rpg.gold - cost + revenue}*\n`;
    msg += `│ ⚡ Energy: *${rpg.energy}/${rpg.maxEnergy}*\n`;
    msg += `╰──────────`;

    return m.reply(msg);
  } catch (err) {
    console.error("berdagang error:", err);
    await m.react("❌");
    return m.reply(claraWrap("berdagang", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
