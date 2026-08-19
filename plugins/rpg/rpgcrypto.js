// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Crypto Market — Trading crypto real-time dari CoinGecko API
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import fetch from "node-fetch";

const pluginConfig = {
  name: "rpgcrypto",
  alias: ["rpgrcoin", "cryptotrader", "rpgtrading", "rpgsahamcrypto"],
  category: "rpg",
  description: "RPG Crypto Market — trading crypto real-time pakai koin game, harga live dari CoinGecko!",
  usage: ".rpgcrypto market | .rpgcrypto buy <pair> <jumlah> | .rpgcrypto sell <pair> <jumlah> | .rpgcrypto portfolio | .rpgcrypto price <pair>",
  example: ".rpgcrypto market\n.rpgcrypto buy bitcoin 0.001",
  isGroup: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const TRACKED_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "ripple", symbol: "XRP", name: "Ripple" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "binancecoin", symbol: "BNB", name: "Binance Coin" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
];

async function fetchPrices() {
  try {
    const ids = TRACKED_COINS.map((c) => c.id).join(",");
    const res = await fetch(COINGECKO_BASE + "/simple/price?ids=" + ids + "&vs_currencies=usd&include_24hr_change=true");
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("[Crypto] fetch error:", e);
    return null;
  }
}

async function fetchCoinPrice(coinId) {
  try {
    const res = await fetch(COINGECKO_BASE + "/simple/price?ids=" + coinId + "&vs_currencies=usd&include_24hr_change=true");
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// 1 koin game = $1 USD (fixed rate untuk simplicity)
const GAME_RATE = 1;

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // MARKET
    if (sub === "market" || sub === "pasar" || sub === "" || sub === "cek") {
      m.reply(claraWrap("RPG Crypto Market", "Mengambil harga real-time dari CoinGecko..."));
      const prices = await fetchPrices();
      if (!prices) {
        return m.reply(claraWrap("RPG Crypto Market", "Gagal menghubungi CoinGecko API. Coba lagi nanti!"));
      }

      let lines = ["CRYPTO MARKET (Live from CoinGecko)", "", "1 koin game = $1 USD", ""];
      TRACKED_COINS.forEach((coin) => {
        const data = prices[coin.id];
        if (data) {
          const price = data.usd;
          const change = data.usd_24h_change || 0;
          const arrow = change >= 0 ? "+" : "";
          const trend = change >= 0 ? "NAIK" : "TURUN";
          lines.push(coin.symbol + " (" + coin.name + ")");
          lines.push("  $" + price.toFixed(price < 1 ? 6 : 2) + " (" + arrow + change.toFixed(2) + "%) " + trend);
          lines.push("  " + (price * GAME_RATE).toFixed(2) + " koin/game");
          lines.push("");
        }
      });
      lines.push("Ketik .rpgcrypto buy <pair> <jumlah>");
      lines.push("Contoh: .rpgcrypto buy bitcoin 0.001");
      lines.push("Koin kamu: " + (user.koin || 0));
      return m.reply(claraWrap("RPG Crypto Market", lines));
    }

    // PRICE
    if (sub === "price" || sub === "harga") {
      const coinId = (args[1] || "").toLowerCase();
      const coin = TRACKED_COINS.find((c) => c.id === coinId || c.symbol.toLowerCase() === coinId);
      if (!coin) {
        return m.reply(claraWrap("RPG Crypto Market", "Coin tidak ditemukan! Pilih: " + TRACKED_COINS.map((c) => c.symbol).join(", ")));
      }
      const data = await fetchCoinPrice(coin.id);
      if (!data || !data[coin.id]) return m.reply(claraWrap("RPG Crypto Market", "Gagal mengambil harga. Coba lagi!"));

      const price = data[coin.id].usd;
      const change = data[coin.id].usd_24h_change || 0;
      return m.reply(claraWrap("RPG Crypto Market", [
        coin.name + " (" + coin.symbol + ")",
        "",
        "Harga: $" + price.toFixed(price < 1 ? 6 : 2),
        "24h: " + (change >= 0 ? "+" : "") + change.toFixed(2) + "%",
        "Game: " + (price * GAME_RATE).toFixed(2) + " koin",
        "",
        "Beli: .rpgcrypto buy " + coin.id + " <jumlah>",
        "Jual: .rpgcrypto sell " + coin.id + " <jumlah>",
      ], "info"));
    }

    // BUY
    if (sub === "buy" || sub === "beli") {
      const coinId = (args[1] || "").toLowerCase();
      const amount = parseFloat(args[2]);
      const coin = TRACKED_COINS.find((c) => c.id === coinId || c.symbol.toLowerCase() === coinId);
      if (!coin || isNaN(amount) || amount <= 0) {
        return m.reply(claraWrap("RPG Crypto Market", "Format: .rpgcrypto buy <pair> <jumlah_crypto>\nContoh: .rpgcrypto buy bitcoin 0.001"));
      }

      const data = await fetchCoinPrice(coin.id);
      if (!data || !data[coin.id]) return m.reply(claraWrap("RPG Crypto Market", "Gagal mengambil harga. Coba lagi!"));

      const price = data[coin.id].usd;
      const cost = price * amount * GAME_RATE;

      if ((user.koin || 0) < cost) {
        return m.reply(claraWrap("RPG Crypto Market", "Koin tidak cukup!\nButuh: " + cost.toFixed(2) + " koin\nKamu punya: " + (user.koin || 0) + " koin"));
      }

      user.koin -= cost;
      if (!user.cryptoPortfolio) user.cryptoPortfolio = {};
      if (!user.cryptoPortfolio[coin.id]) {
        user.cryptoPortfolio[coin.id] = { amount: 0, invested: 0 };
      }
      user.cryptoPortfolio[coin.id].amount += amount;
      user.cryptoPortfolio[coin.id].invested += cost;
      user.cryptoTrades = (user.cryptoTrades || 0) + 1;
      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Crypto Market", [
        "BUY BERHASIL!",
        "",
        "Coin: " + coin.name + " (" + coin.symbol + ")",
        "Jumlah: " + amount + " " + coin.symbol,
        "Harga: $" + price.toFixed(price < 1 ? 6 : 2),
        "Total: " + cost.toFixed(2) + " koin",
        "",
        "Koin tersisa: " + user.koin.toFixed(2),
        "Ketik .rpgcrypto portfolio untuk lihat portofolio",
      ], "success"));
    }

    // SELL
    if (sub === "sell" || sub === "jual") {
      const coinId = (args[1] || "").toLowerCase();
      const amount = parseFloat(args[2]);
      const coin = TRACKED_COINS.find((c) => c.id === coinId || c.symbol.toLowerCase() === coinId);
      if (!coin || isNaN(amount) || amount <= 0) {
        return m.reply(claraWrap("RPG Crypto Market", "Format: .rpgcrypto sell <pair> <jumlah_crypto>\nContoh: .rpgcrypto sell bitcoin 0.001"));
      }

      const portfolio = user.cryptoPortfolio || {};
      const holding = portfolio[coin.id];
      if (!holding || holding.amount < amount) {
        return m.reply(claraWrap("RPG Crypto Market", "Kamu tidak punya " + amount + " " + coin.symbol + "!\nKetik .rpgcrypto portfolio untuk lihat holdings."));
      }

      const data = await fetchCoinPrice(coin.id);
      if (!data || !data[coin.id]) return m.reply(claraWrap("RPG Crypto Market", "Gagal mengambil harga. Coba lagi!"));

      const price = data[coin.id].usd;
      const proceeds = price * amount * GAME_RATE;
      const avgCost = holding.invested / holding.amount;
      const profit = proceeds - (avgCost * amount);
      const profitPercent = (profit / (avgCost * amount)) * 100;

      user.koin = (user.koin || 0) + proceeds;
      holding.amount -= amount;
      holding.invested -= avgCost * amount;
      if (holding.amount <= 0.000001) delete portfolio[coin.id];
      user.cryptoTrades = (user.cryptoTrades || 0) + 1;
      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Crypto Market", [
        "SELL BERHASIL!",
        "",
        "Coin: " + coin.name + " (" + coin.symbol + ")",
        "Jumlah: " + amount + " " + coin.symbol,
        "Harga jual: $" + price.toFixed(price < 1 ? 6 : 2),
        "Proceeds: " + proceeds.toFixed(2) + " koin",
        "",
        profit >= 0 ? "Profit: +" + profit.toFixed(2) + " koin (+" + profitPercent.toFixed(2) + "%)" : "Loss: " + profit.toFixed(2) + " koin (" + profitPercent.toFixed(2) + "%)",
        "",
        "Koin sekarang: " + user.koin.toFixed(2),
      ], "success"));
    }

    // PORTFOLIO
    if (sub === "portfolio" || sub === "portofolio" || sub === "holdings") {
      const portfolio = user.cryptoPortfolio || {};
      const holdings = Object.entries(portfolio).filter(([_, h]) => h.amount > 0);
      if (holdings.length === 0) {
        return m.reply(claraWrap("RPG Crypto Market", "Portofolio kosong! Ketik .rpgcrypto market untuk lihat harga, lalu .rpgcrypto buy."));
      }

      m.reply(claraWrap("RPG Crypto Market", "Mengambil harga real-time..."));
      const prices = await fetchPrices();
      if (!prices) return m.reply(claraWrap("RPG Crypto Market", "Gagal mengambil harga. Coba lagi!"));

      let lines = ["PORTOFOLIO CRYPTO", ""];
      let totalValue = 0;
      let totalInvested = 0;

      for (const [coinId, holding] of holdings) {
        const coin = TRACKED_COINS.find((c) => c.id === coinId);
        if (!coin) continue;
        const currentPrice = prices[coinId]?.usd || 0;
        const value = currentPrice * holding.amount * GAME_RATE;
        const avgCost = holding.invested / holding.amount;
        const profit = value - (avgCost * holding.amount);
        const profitPercent = (profit / (avgCost * holding.amount)) * 100;
        totalValue += value;
        totalInvested += holding.invested;

        lines.push(coin.symbol + " (" + coin.name + ")");
        lines.push("  Amount: " + holding.amount + " " + coin.symbol);
        lines.push("  Value: " + value.toFixed(2) + " koin");
        lines.push("  Profit: " + (profit >= 0 ? "+" : "") + profit.toFixed(2) + " (" + (profit >= 0 ? "+" : "") + profitPercent.toFixed(1) + "%)");
        lines.push("");
      }

      const totalProfit = totalValue - totalInvested;
      lines.push("TOTAL VALUE: " + totalValue.toFixed(2) + " koin");
      lines.push("TOTAL INVESTED: " + totalInvested.toFixed(2) + " koin");
      lines.push("TOTAL PROFIT: " + (totalProfit >= 0 ? "+" : "") + totalProfit.toFixed(2) + " koin");
      lines.push("", "Koin cash: " + (user.koin || 0).toFixed(2));
      lines.push("Total trades: " + (user.cryptoTrades || 0));

      return m.reply(claraWrap("RPG Crypto Market", lines, totalProfit >= 0 ? "success" : "warn"));
    }

    // HELP
    return m.reply(claraWrap("RPG Crypto Market", [
      "Trading crypto real-time dari CoinGecko API",
      "",
      "CARA PAKAI:",
      usedPrefix + "rpgcrypto market — Lihat harga live",
      usedPrefix + "rpgcrypto price <pair> — Cek harga 1 coin",
      usedPrefix + "rpgcrypto buy <pair> <jumlah> — Beli crypto",
      usedPrefix + "rpgcrypto sell <pair> <jumlah> — Jual crypto",
      usedPrefix + "rpgcrypto portfolio — Lihat portofolio",
      "",
      "Pair tersedia: " + TRACKED_COINS.map((c) => c.symbol).join(", "),
      "1 koin game = $1 USD",
    ]));
  } catch (e) {
    console.error("[RPG Crypto Market]", e);
    m.reply(claraWrap("RPG Crypto Market", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
