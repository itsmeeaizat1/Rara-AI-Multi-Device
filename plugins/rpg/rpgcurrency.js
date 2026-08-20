// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Currency — Sistem mata uang, trading & exchange rate fluktuasi
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, addExp, savePlayer } from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "rpgcurrency",
  alias: ["currencyrpg", "exchangerpg", "traderpg", "currencytrade", "koinrpg"],
  category: "rpg",
  description: "RPG Currency — Trading mata uang dengan exchange rate fluktuatif",
  usage: ".rpgcurrency market — Lihat pasar & rate\n.rpgcurrency buy <id> <jumlah> — Beli mata uang\n.rpgcurrency sell <id> <jumlah> — Jual mata uang\n.rpgcurrency portfolio — Lihat investasi\n.rpgcurrency info — Statistik trading",
  example: ".rpgcurrency market\n.rpgcurrency buy silver 100",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CURRENCIES = [
  { id: "copper", name: "Koin Tembaga", emoji: "🟤", baseRate: 1, volatility: 0.05, desc: "Mata uang paling stabil" },
  { id: "silver", name: "Perak", emoji: "⚪", baseRate: 5, volatility: 0.10, desc: "Nilai menengah, fluktuasi sedang" },
  { id: "gold_coin", name: "Koin Emas", emoji: "🟡", baseRate: 20, volatility: 0.15, desc: "Nilai tinggi, fluktuasi besar" },
  { id: "gem", name: "Permata", emoji: "💎", baseRate: 100, volatility: 0.25, desc: "Mata uang premium, sangat fluktuatif" },
  { id: "soul", name: "Soul Coin", emoji: "👻", baseRate: 500, volatility: 0.40, desc: "LEGENDARY, fluktuasi ekstrem" },
];

// Exchange rates fluctuate based on time (simple pseudo-random based on Date)
function getCurrentRate(currency) {
  const hour = new Date().getHours();
  const seed = Math.sin(hour * currency.baseRate + currency.volatility * 100) * 0.5 + 0.5;
  const fluctuation = (seed - 0.5) * 2 * currency.volatility;
  return Math.max(0.1, currency.baseRate * (1 + fluctuation));
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const action = args[0]?.toLowerCase();
    const player = ensurePlayer(m);

    if (!action || action === "help") {
      return m.reply(claraWrap("RPG Currency", [
        "TRADING MATA UANG",
        "Beli & jual mata uang, rate berubah tiap jam",
        "Profit dari fluktuasi rate!",
        "",
        "MATA UANG:",
        "🟤 Tembaga (rate 1, stabil)",
        "⚪ Perak (rate 5, sedang)",
        "🟡 Emas (rate 20, besar)",
        "💎 Permata (rate 100, sangat volatile)",
        "👻 Soul Coin (rate 500, ekstrem) LEGENDARY",
        "",
        "PERINTAH:",
        usedPrefix + "rpgcurrency market - Lihat rate",
        usedPrefix + "rpgcurrency buy <id> <jumlah>",
        usedPrefix + "rpgcurrency sell <id> <jumlah>",
        usedPrefix + "rpgcurrency portfolio - Investasi",
        usedPrefix + "rpgcurrency info - Statistik",
      ], "info"));
    }

    if (action === "market") {
      const lines = ["PASAR MATA UANG", "(Rate berubah tiap jam)", ""];

      CURRENCIES.forEach(c => {
        const rate = getCurrentRate(c);
        const trend = rate > c.baseRate ? "NAIK" : "TURUN";
        const changePercent = Math.round(((rate / c.baseRate - 1) * 100));
        lines.push(c.emoji + " " + c.name + " (" + c.id + ")");
        lines.push("   Rate: " + rate.toFixed(2) + "g | " + trend + " " + (changePercent >= 0 ? "+" : "") + changePercent + "%");
      });

      lines.push("");
      lines.push("Beli: " + usedPrefix + "rpgcurrency buy <id> <jumlah>");
      lines.push("Jual: " + usedPrefix + "rpgcurrency sell <id> <jumlah>");

      return m.reply(claraWrap("RPG Currency", lines, "info"));
    }

    if (action === "portfolio") {
      const portfolio = player.currencyPortfolio || {};
      const lines = ["PORTFOLIO INVESTASI", ""];

      let totalValue = 0;
      let hasItems = false;

      CURRENCIES.forEach(c => {
        const amount = portfolio[c.id] || 0;
        if (amount > 0) {
          hasItems = true;
          const rate = getCurrentRate(c);
          const value = Math.round(amount * rate);
          totalValue += value;
          const invested = portfolio[c.id + "_invested"] || 0;
          const profit = value - invested;
          lines.push(c.emoji + " " + c.name + " x" + amount);
          lines.push("   Value: " + value + "g | Profit: " + (profit >= 0 ? "+" : "") + profit + "g");
        }
      });

      if (!hasItems) {
        lines.push("Portfolio kosong!");
        lines.push("Beli: " + usedPrefix + "rpgcurrency buy <id> <jumlah>");
      } else {
        lines.push("");
        lines.push("Total value: " + totalValue + " gold");
      }

      return m.reply(claraWrap("RPG Currency", lines, "info"));
    }

    if (action === "buy") {
      const currId = args[1]?.toLowerCase();
      const amount = parseInt(args[2]) || 0;
      const currency = CURRENCIES.find(c => c.id === currId);

      if (!currency) return m.reply(claraWrap("RPG Currency", "Mata uang tidak ditemukan", "warn"));
      if (amount < 1) return m.reply(claraWrap("RPG Currency", "Jumlah minimal 1", "warn"));

      const rate = getCurrentRate(currency);
      const totalCost = Math.round(amount * rate);

      if ((player.gold || 0) < totalCost) {
        return m.reply(claraWrap("RPG Currency", "Gold kurang! Butuh: " + totalCost + "g (rate " + rate.toFixed(2) + " x " + amount + ")", "warn"));
      }

      addGold(m, -totalCost);

      if (!player.currencyPortfolio) player.currencyPortfolio = {};
      player.currencyPortfolio[currency.id] = (player.currencyPortfolio[currency.id] || 0) + amount;
      player.currencyPortfolio[currency.id + "_invested"] = (player.currencyPortfolio[currency.id + "_invested"] || 0) + totalCost;

      if (!player.currencyStats) player.currencyStats = {};
      player.currencyStats.buys = (player.currencyStats.buys || 0) + 1;
      player.currencyStats.invested = (player.currencyStats.invested || 0) + totalCost;

      savePlayer(m, player);

      return m.reply(claraWrap("RPG Currency", [
        "PEMBELIAN BERHASIL!",
        currency.emoji + " " + currency.name + " x" + amount,
        "Rate: " + rate.toFixed(2) + "g",
        "Total: " + totalCost + " gold",
        "",
        "Jual saat rate naik untuk profit!",
        usedPrefix + "rpgcurrency sell " + currency.id + " " + amount,
      ], "info"));
    }

    if (action === "sell") {
      const currId = args[1]?.toLowerCase();
      const amount = parseInt(args[2]) || 0;
      const currency = CURRENCIES.find(c => c.id === currId);

      if (!currency) return m.reply(claraWrap("RPG Currency", "Mata uang tidak ditemukan", "warn"));
      if (amount < 1) return m.reply(claraWrap("RPG Currency", "Jumlah minimal 1", "warn"));

      const held = player.currencyPortfolio?.[currency.id] || 0;
      if (held < amount) {
        return m.reply(claraWrap("RPG Currency", "Punya " + held + " " + currency.name + ", butuh " + amount, "warn"));
      }

      const rate = getCurrentRate(currency);
      const revenue = Math.round(amount * rate);

      addGold(m, revenue);
      player.currencyPortfolio[currency.id] -= amount;
      const invested = player.currencyPortfolio[currency.id + "_invested"] || 0;
      const profit = revenue - Math.round((invested / held) * amount);
      player.currencyPortfolio[currency.id + "_invested"] = Math.max(0, invested - Math.round((invested / held) * amount));

      if (!player.currencyStats) player.currencyStats = {};
      player.currencyStats.sells = (player.currencyStats.sells || 0) + 1;
      player.currencyStats.revenue = (player.currencyStats.revenue || 0) + revenue;

      savePlayer(m, player);

      return m.reply(claraWrap("RPG Currency", [
        "PENJUALAN BERHASIL!",
        currency.emoji + " " + currency.name + " x" + amount,
        "Rate: " + rate.toFixed(2) + "g",
        "Revenue: +" + revenue + " gold",
        "Profit: " + (profit >= 0 ? "+" : "") + profit + " gold",
      ], "info"));
    }

    if (action === "info") {
      const stats = player.currencyStats || {};
      const lines = [
        "STATISTIK TRADING",
        "Total beli: " + (stats.buys || 0),
        "Total jual: " + (stats.sells || 0),
        "Total invested: " + (stats.invested || 0) + "g",
        "Total revenue: " + (stats.revenue || 0) + "g",
        "Net profit: " + ((stats.revenue || 0) - (stats.invested || 0)) + "g",
      ];
      return m.reply(claraWrap("RPG Currency", lines, "info"));
    }

    return m.reply(claraWrap("RPG Currency", "Perintah: market, buy, sell, portfolio, info", "warn"));
  } catch (e) {
    console.error("[RpgCurrency]", e);
    return m.reply(claraWrap("RPG Currency", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
