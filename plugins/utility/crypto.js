// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "crypto",
  alias: ["crypto"],
  category: "utility",
  description: "Track harga crypto real-time dari CoinGecko",
  usage: ".crypto <command>",
  example: ".crypto bitcoin",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const CG_BASE = "https://api.coingecko.com/api/v3";

function fmtNum(n) {
  if (n == null) return "-";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

function fmtPrice(n) {
  if (n == null) return "-";
  if (n >= 1) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 0.01) return "$" + n.toFixed(4);
  return "$" + n.toFixed(8);
}

function pctStr(n) {
  if (n == null) return "-";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pctArrow(n) {
  if (n == null) return "";
  if (n >= 0) return "▲";
  return "▼";
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const args = m.text?.trim().split(/\s+/) || [];
    const sub = (args[0] || "").toLowerCase();

    // === HELP ===
    if (!sub || sub === "help" || sub === "bantuan") {
      return m.reply( claraWrap("Crypto Tracker", [
        "Track harga crypto real-time dari CoinGecko",
        "",
        "Perintah:",
        ".crypto bitcoin - Cek harga BTC",
        ".crypto ethereum - Cek harga ETH",
        ".crypto top - Top 10 coins by market cap",
        ".crypto trending - Trending coins sekarang",
        ".crypto <coin> detail - Info lengkap coin",
        ".crypto list - Cari nama coin yang support",
        "",
        "Contoh: .crypto solana",
        "Sumber: CoinGecko API (free)",
      ]), { commandName: "crypto" });
    }
    // === TOP 10 ===
    if (sub === "top") {
      const res = await axios.get(`${CG_BASE}/coins/markets`, {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 10,
          page: 1,
          sparkline: false,
          price_change_percentage: "24h",
        },
        timeout: 15000,
      });

      const coins = res.data || [];
      if (!coins.length) {
        return m.reply(claraWrap("Crypto Tracker", "Gagal nih ambil data top coins", "error"));
      }

      const lines = coins.map((c, i) => {
        const arrow = pctArrow(c.price_change_percentage_24h);
        return `${i + 1}. ${c.symbol.toUpperCase()} - ${fmtPrice(c.current_price)} ${arrow} ${pctStr(c.price_change_percentage_24h)}`;
      });

      lines.push("");
      lines.push(`Market cap total: ${fmtNum(coins.reduce((s, c) => s + (c.market_cap || 0), 0))}`);
      return m.reply(claraWrap("Top 10 Crypto", lines));
    }

    // === TRENDING ===
    if (sub === "trending") {
      const res = await axios.get(`${CG_BASE}/search/trending`, {
        timeout: 15000,
      });

      const coins = (res.data?.coins || []).slice(0, 7);
      if (!coins.length) {
        return m.reply(claraWrap("Crypto Tracker", "Gagal nih ambil trending coins", "error"));
      }

      const lines = coins.map((c, i) => {
        const item = c.item;
        return `${i + 1}. ${item.symbol} (${item.name}) - Rank #${item.market_cap_rank || "-"}`;
      });

      lines.push("");
      lines.push("Trending berdasarkan pencarian CoinGecko");
      return m.reply(claraWrap("Trending Crypto", lines));
    }

    // === LIST / SEARCH ===
    if (sub === "list") {
      const query = args.slice(1).join(" ").toLowerCase().trim();
      const res = await axios.get(`${CG_BASE}/coins/list`, { timeout: 15000 });
      const allCoins = res.data || [];

      let filtered = allCoins;
      if (query) {
        filtered = allCoins.filter(
          (c) =>
            c.symbol?.toLowerCase().includes(query) ||
            c.id?.toLowerCase().includes(query) ||
            c.name?.toLowerCase().includes(query)
        );
      }

      if (!filtered.length) {
        return m.reply(claraWrap("Crypto Tracker", `Coin "${query}" tidak ditemukan`, "warn"));
      }

      const show = filtered.slice(0, 20);
      const lines = show.map((c) => `${c.symbol.toUpperCase()} -> ${c.id}`);

      if (filtered.length > 20) {
        lines.push("");
        lines.push(`Total: ${filtered.length} coins (tampilkan 20)`);
        lines.push(`Cari lebih spesifik: .crypto list ${query} btc`);
      }
      return m.reply(claraWrap("Crypto List", lines));
    }

    // === PRICE / DETAIL ===
    const coinId = sub;
    const wantDetail = (args[1] || "").toLowerCase() === "detail";

    // Try to resolve coin ID
    let resolvedId = coinId;
    // Common aliases
    const aliases = {
      btc: "bitcoin",
      eth: "ethereum",
      sol: "solana",
      bnb: "binancecoin",
      xrp: "ripple",
      ada: "cardano",
      doge: "dogecoin",
      dot: "polkadot",
      matic: "matic-network",
      avax: "avalanche-2",
      link: "chainlink",
      uni: "uniswap",
      atom: "cosmos",
      ltc: "litecoin",
      trx: "tron",
      shib: "shiba-inu",
      pepe: "pepe",
      usdt: "tether",
      usdc: "usd-coin",
      dai: "dai",
    };

    if (aliases[coinId]) {
      resolvedId = aliases[coinId];
    }

    // Fetch coin data
    const res = await axios.get(`${CG_BASE}/coins/${resolvedId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false,
      },
      timeout: 15000,
    });

    const coin = res.data;
    if (!coin || !coin.market_data) {
      return m.reply(claraWrap("Crypto Tracker", `Coin "${coinId}" tidak ditemukan. Coba .crypto list ${coinId}`, "warn"));
    }

    const md = coin.market_data;
    const name = coin.name || coinId;
    const symbol = (coin.symbol || "").toUpperCase();
    const price = md.current_price?.usd || 0;
    const change24h = md.price_change_percentage_24h || 0;
    const change7d = md.price_change_percentage_7d || 0;
    const change14d = md.price_change_percentage_14d || 0;
    const marketCap = md.market_cap?.usd;
    const volume24h = md.total_volume?.usd;
    const high24h = md.high_24h?.usd;
    const low24h = md.low_24h?.usd;
    const ath = md.ath?.usd;
    const athChange = md.ath_change_percentage?.usd || 0;
    const atl = md.atl?.usd;
    const rank = md.market_cap_rank;
    const supply = md.circulating_supply;
    const maxSupply = md.total_supply;

    if (wantDetail) {
      const lines = [
        `${name} (${symbol})`,
        "",
        `Rank: #${rank || "-"}`,
        `Harga: ${fmtPrice(price)}`,
        `24h: ${pctArrow(change24h)} ${pctStr(change24h)}`,
        `7d: ${pctArrow(change7d)} ${pctStr(change7d)}`,
        `14d: ${pctArrow(change14d)} ${pctStr(change14d)}`,
        "",
        `Market Cap: ${fmtPrice(marketCap)} (${fmtNum(marketCap)})`,
        `Volume 24h: ${fmtPrice(volume24h)}`,
        `Supply: ${fmtNum(supply)} ${symbol}`,
        `Max Supply: ${maxSupply ? fmtNum(maxSupply) : "Tidak terbatas"}`,
        "",
        `High 24h: ${fmtPrice(high24h)}`,
        `Low 24h: ${fmtPrice(low24h)}`,
        `ATH: ${fmtPrice(ath)} (${pctStr(athChange)})`,
        `ATL: ${fmtPrice(atl)}`,
        "",
        `Diputar: ${coin.description?.en ? coin.description.en.replace(/<[^>]+>/g, "").substring(0, 200) + "..." : "Tidak ada"}`,
      ];
      return m.reply(claraWrap(`Crypto Detail - ${symbol}`, lines));
    }

    // Simple price view
    const lines = [
      `${name} (${symbol})`,
      "",
      `Harga: ${fmtPrice(price)}`,
      `24h: ${pctArrow(change24h)} ${pctStr(change24h)}`,
      `7d: ${pctArrow(change7d)} ${pctStr(change7d)}`,
      `Rank: #${rank || "-"}`,
      `Market Cap: ${fmtPrice(marketCap)}`,
      `Volume: ${fmtPrice(volume24h)}`,
      `High 24h: ${fmtPrice(high24h)}`,
      `Low 24h: ${fmtPrice(low24h)}`,
    ];
    return m.reply(claraWrap(`Crypto - ${symbol}`, lines));
  } catch (error) {
    if (error.response?.status === 404) {
      return m.reply(claraWrap("Crypto Tracker", "Coin tidak ditemukan. Coba .crypto list untuk cari nama yang benar.", "warn"));
    }
    return m.reply(claraWrap("Crypto Tracker", `Gagal: ${error.message}`, "error"));
  }
}

export { pluginConfig as config, handler };
