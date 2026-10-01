// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Invest — Invest gold for passive income (risk/reward)

import {
  ensureRpg, saveRpg, addGold, removeGold,
  checkCooldown, setCooldown, formatTime
} from "../../src/lib/rara-rpg-service.js";
import { raraGameBox, gameCTA, raraRpgBox } from "../../src/lib/rara-games.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "invest",
  alias: ["invest", "investrpg", "investasi"],
  category: "rpg",
  description: "Investasi gold — return 80-120% dalam 1 jam (risk: bisa rugi)",
  usage: ".invest <jumlah>",
  example: ".invest 1000",
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
    if (!rpg) return m.reply(raraRpgBox("investrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

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
      return m.reply(raraGameBox({
        title: "investrpg", icon: "📈",
        flavor: profit >= 0 ? "📈 *INVESTASI PROFIT!*" : "📉 *INVESTASI RUGI!*",
        body: [
          `│ • Modal : ${investAmount} Gold`,
          `│ • Return : ${returnValue} Gold`,
          profit >= 0 ? `│ • ✅ Profit : +${profit} Gold` : `│ • ❌ Rugi : ${profit} Gold`,
          `│ • 💰 Gold sekarang : ${rpg.gold + returnValue} Gold`,
        ].join("\n"),
        cta: gameCTA("investrpg"),
      }));
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
                return m.reply(raraRpgBox("investrpg", msg));
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
            return m.reply(raraRpgBox("investrpg", msg));
    }

    const amount = parseInt(action);

    if (!amount || amount < MIN_INVEST) {
  await animGeneric(m, sock, "📈", "Investing");
      return m.reply(raraRpgBox("investrpg", `Minimal invest *${MIN_INVEST} gold*.`, "warn"));
    }

    if (amount > MAX_INVEST) {
      return m.reply(raraRpgBox("investrpg", `Maksimal invest *${MAX_INVEST} gold* per investasi.`, "warn"));
    }

    if (rpg.invest?.active) {
      return m.reply(raraRpgBox("investrpg", "Masih ada investasi berjalan. Ketik .investrpg untuk cek status.", "warn"));
    }

    if (rpg.gold < amount) {
      await m.react("🚫");
      return m.reply(raraRpgBox("investrpg", `Gold tidak cukup! Kamu punya *${rpg.gold}*, butuh *${amount}*.`, "warn"));
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
    return m.reply(raraGameBox({
      title: "investrpg", icon: "📈",
      flavor: "📈 *INVESTASI DIMULAI!*",
      body: [
        `│ • 💵 Modal : ${amount} Gold`,
        `│ • ⏰ Durasi : 1 jam`,
        `│ • 📊 Estimasi return : ${Math.floor(amount * 0.8)}-${Math.floor(amount * 1.2)} Gold`,
        "",
        "Ketik .investrpg lagi setelah 1 jam",
        "untuk mengambil hasil investasi",
      ].join("\n"),
      cta: gameCTA("investrpg"),
    }));
  } catch (err) {
    console.error("investrpg error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("investrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
