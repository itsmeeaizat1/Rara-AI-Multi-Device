// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// hargakripto.js — Harga Kripto Realtime IDR dari Indodax (exchange kripto Indonesia).
// Sumber: indodax.com Public API (btcid/indodax-official-api-docs, daftar farizdotid) — TANPA API KEY.
// .hargakripto → 10 koin populer | .hargakripto <koin> → detail pair IDR | .hargakripto btc usdt → pair lain
// Riset 24 Sep 2026: endpoint lama /api/{pair} udah invalid method — path BENAR: /api/ticker/{pair}
// (mis. btc_idr) + /api/ticker_all (semua pair, ~76KB). Pair gak valid → {error:"invalid_pair"}.
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const BASE = "https://indodax.com/api";

// ── SEAM TEST ──────────────────────────────────────────────
let _http = null; // async (url) => {status, data}
export function _setHttpForTest(fn) { _http = fn; }
export function _resetSeamsForTest() { _http = null; }

async function fetchJson(url) {
  if (_http) return _http(url);
  const res = await axios.get(url, {
    timeout: 30000, validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0", "Accept": "application/json" },
  });
  return { status: res.status, data: res.data };
}

const POPULAR = ["btc", "eth", "bnb", "sol", "xrp", "doge", "ada", "avax", "link", "dot"];
const NAMA_KOIN = {
  btc: "Bitcoin", eth: "Ethereum", bnb: "BNB", sol: "Solana", xrp: "XRP",
  doge: "Dogecoin", ada: "Cardano", avax: "Avalanche", link: "Chainlink", dot: "Polkadot",
};
const rp = (n) => {
  const num = Number(n);
  if (!isFinite(num)) return String(n);
  return "Rp " + num.toLocaleString("id-ID", { maximumFractionDigits: 0 });
};

const pluginConfig = {
  name: "hargakripto",
  alias: ["hargakripto", "kripto", "hargacrypto", "indodax", "cryptoidr"],
  category: "search",
  desc: "Harga kripto realtime IDR dari Indodax — 10 koin populer + detail per koin",
  usage: ".hargakripto | .hargakripto <koin> | .hargakripto <koin> <pasangan>",
  example: ".hargakripto btc",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  const args = (m.args || []).map((a) => String(a).toLowerCase().trim()).filter(Boolean);
  try {
    // tanpa arg → daftar 10 koin populer
    if (!args.length) {
      const { status, data } = await fetchJson(`${BASE}/ticker_all`);
      if (status !== 200 || !data?.tickers) {
        return m.reply(claraWrap("Harga Kripto", `❌ Indodax bermasalah (${status}). Coba lagi nanti.`));
      }
      const lines = POPULAR.map((c) => {
        const t = data.tickers[`${c}_idr`];
        const harga = t ? rp(t.last) : "—";
        return `▸ ${NAMA_KOIN[c] || c.toUpperCase()} (${c.toUpperCase()}): ${harga}`;
      }).join("\n");
      return m.reply(claraWrap("Harga Kripto (Indodax)",
        `10 koin populer sekarang:\n\n${lines}\n\nDetail: .hargakripto <koin>\nContoh: .hargakripto btc`));
    }
    // resolusi pair: "btc" + [quote] → btc_idr; "btc_usdt" → langsung
    let pair;
    if (args[0].includes("_")) pair = args[0];
    else pair = `${args[0]}_${args[1] || "idr"}`;
    const { status, data } = await fetchJson(`${BASE}/ticker/${pair}`);
    if (status !== 200 || !data || data.error) {
      const err = data?.error || status;
      if (err === "invalid_pair") {
        return m.reply(claraWrap("Harga Kripto", `🔎 Pair "${pair}" gak ada di Indodax.\n\nCoba: .hargakripto btc · .hargakripto eth usdt\nPair format: <koin>_<pasangan> (mis. btc_idr, eth_usdt).`));
      }
      return m.reply(claraWrap("Harga Kripto", `❌ Indodax bermasalah (${err}). Coba lagi nanti.`));
    }
    const t = data.ticker || {};
    const koin = pair.replace(/_/g, "/").toUpperCase();
    const volKey = Object.keys(t).find((k) => k.startsWith("vol_") && k !== `vol_${pair.split("_")[1]}`);
    const lines = [
      `Koin: ${koin}`,
      `Harga: ${rp(t.last)}`,
      `Beli: ${rp(t.buy)}`,
      `Jual: ${rp(t.sell)}`,
      `24j Tertinggi: ${rp(t.high)}`,
      `24j Terendah: ${rp(t.low)}`,
      `Volume 24j: ${t[volKey] ? Number(t[volKey]).toLocaleString("id-ID") + " " + pair.split("_")[0].toUpperCase() : "—"}`,
    ].join("\n");
    return m.reply(claraWrap("Harga Kripto (Indodax)", `${lines}\n\nSumber: Indodax, realtime.`));
  } catch (e) {
    return m.reply(claraWrap("Harga Kripto", `❌ Gagal nyambung ke Indodax: ${e.message || e}`));
  }
}

export { handler, pluginConfig };
export default handler;
