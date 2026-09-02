// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Invest — Invest gold for passive income (risk/reward)

import {
  ensureRpg, saveRpg, addGold, removeGold,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "investrpg",
  alias: ["investrpg", "invest", "investasi"],
  category: "rpg",
  description: "Investasi gold — return 80-120% dalam 1 jam (risk: bisa rugi)",
  usage: ".investrpg <jumlah>",
  example: ".investrpg 1000",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const INVEST_COOLDOWN = 60 * 60 * 1000; // 1 jam
const INVEST_DURATION = 60 * 60 * 1000; // 1 jam
const MIN_INVEST = 100;
const MAX_INVEST = 50000;

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("investrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Cek apakah ada investasi yang sudah selesai
    if (rpg.invest && rpg.invest.active && Date.now() >= rpg.invest.endTime) {
      // Selesai — calculate return
      const investAmount = rpg.invest.amount;
      // 70% chance profit, 30% chance loss
      const isProfit = Math.random() < 0.7;
      let returnValue;

      if (isProfit) {
        const multiplier = 0.8 + Math.random() * 0.4; // 80-120%
        returnValue = Math.floor(investAmount * multiplier);
      } else {
        const lossRate = 0.3 + Math.random() * 0.4; // 30-70% loss
        returnValue = Math.floor(investAmount * (1 - lossRate));
      }

      addGold(m, returnValue);
      const profit = returnValue - investAmount;
      rpg.invest = { active: false, lastResult: { amount: investAmount, returnValue, profit } };
      saveRpg(m, { invest: rpg.invest });

      await m.react("🐣");
      let msg = "";
      msg += `📈 Investasi selesai!\n`;
      msg += `
`;
      msg += `💵 Modal: *${investAmount} gold*\n`;
      if (profit >= 0) {
        msg += `📊 Return: *${returnValue} gold*\n`;
        msg += `✅ Profit: *+${profit} gold*\n`;
      } else {
        msg += `📊 Return: *${returnValue} gold*\n`;
        msg += `❌ Rugi: *${profit} gold*\n`;
      }
      msg += `💰 Gold sekarang: *${rpg.gold + returnValue}*\n`;
      
      return m.reply(msg);
    }

    // Start new investment
    if (!action || action === "status") {
      if (rpg.invest?.active) {
        const remaining = rpg.invest.endTime - Date.now();
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        let msg = "";
        msg += `📈 Investasi aktif!\n`;
        msg += `💵 Modal: *${rpg.invest.amount} gold*\n`;
        msg += `⏰ Selesai dalam: *${mins}m ${secs}s*\n`;
        msg += `
`;
        msg += `Ketik .investrpg lagi saat waktu habis\n`;
        msg += `untuk mengambil hasil investasi\n`;
                return m.reply(msg);
      }

      let msg = "";
      msg += `💰 Gold: *${rpg.gold}*\n`;
      msg += `
`;
      msg += `📌 Cara: .investrpg <jumlah>\n`;
      msg += `💵 Min: *${MIN_INVEST}* | Max: *${MAX_INVEST}*\n`;
      msg += `
`;
      msg += `⚠️ Risk: 70% profit, 30% rugi\n`;
      msg += `📊 Return: 80-120% dalam 1 jam\n`;
            return m.reply(msg);
    }

    const amount = parseInt(action);

    if (!amount || amount < MIN_INVEST) {
  await animGeneric(m, sock, "📈", "Investing");
      return m.reply(claraWrap("investrpg", `Minimal invest *${MIN_INVEST} gold*.`, "warn"));
    }

    if (amount > MAX_INVEST) {
      return m.reply(claraWrap("investrpg", `Maksimal invest *${MAX_INVEST} gold* per investasi.`, "warn"));
    }

    if (rpg.invest?.active) {
      return m.reply(claraWrap("investrpg", "Masih ada investasi berjalan. Ketik .investrpg untuk cek status.", "warn"));
    }

    if (rpg.gold < amount) {
      await m.react("🚫");
      return m.reply(claraWrap("investrpg", `Gold tidak cukup! Kamu punya *${rpg.gold}*, butuh *${amount}*.`, "warn"));
    }

    removeGold(m, amount, sock);
    rpg.invest = {
      active: true,
      amount,
      startTime: Date.now(),
      endTime: Date.now() + INVEST_DURATION,
    };
    saveRpg(m, { invest: rpg.invest });

    await m.react("🐣");
    let msg = "";
    msg += `✅ Investasi dimulai!\n`;
    msg += `
`;
    msg += `💵 Modal: *${amount} gold*\n`;
    msg += `⏰ Durasi: *1 jam*\n`;
    msg += `📊 Estimasi return: *${Math.floor(amount * 0.8)}-${Math.floor(amount * 1.2)} gold*\n`;
    msg += `
`;
    msg += `Ketik .investrpg lagi setelah 1 jam\n`;
    msg += `untuk mengambil hasil investasi\n`;
    
    return m.reply(msg);
  } catch (err) {
    console.error("investrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("investrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
