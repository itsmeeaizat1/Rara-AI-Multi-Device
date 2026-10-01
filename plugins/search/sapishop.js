// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Shopping Suite — .gshopping .amz .ebay .walmart .bestbuy .shein
// 🔹 Produk PLAIN TEXT: nama, harga, toko, rating, ongkir.
// ═════════════════════════════════════════════

import { searchApiEngine, _setSearchApiHttpForTest } from "../../src/scraper/searchapi.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { sapiErrorMessage, renderShopping } from "../../src/lib/nova-sapi-render.js";

const SHOPS = {
  gshopping: { engine: "google_shopping", label: "GOOGLE SHOPPING" },
  gshop: { engine: "google_shopping", label: "GOOGLE SHOPPING" },
  shopg: { engine: "google_shopping", label: "GOOGLE SHOPPING" },
  amz: { engine: "amazon_search", label: "AMAZON" },
  amazon: { engine: "amazon_search", label: "AMAZON" },
  ebay: { engine: "ebay_search", label: "EBAY" },
  walmart: { engine: "walmart_search", label: "WALMART" },
  bestbuy: { engine: "bestbuy_search", label: "BESTBUY" },
  shein: { engine: "shein_search", label: "SHEIN" },
};

const pluginConfig = {
  name: "sapishop",
  alias: ["gshopping", "gshop", "shopg", "amz", "amazon", "ebay", "walmart", "bestbuy", "shein"],
  category: "search",
  description: "Belanja online plain text — harga, toko, rating (Google Shopping/Amazon/eBay/Walmart/BestBuy/Shein)",
  usage: ".gshopping <produk> | .amz <produk> | .ebay <produk> | .walmart <produk> | .bestbuy <produk> | .shein <produk>",
  example: ".gshopping ps5 | .amz mechanical keyboard",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = (m.command || "gshopping").toLowerCase();
    const shop = SHOPS[cmd];
    if (!shop) {
      return m.reply(novaWrap("gshopping", `💡 Toko tersedia: .gshopping .amz .ebay .walmart .bestbuy .shein`));
    }
    const q = (m.args || []).join(" ").trim();
    if (!q) {
      return m.reply(novaWrap("gshopping", `🛍️ ${shop.label} — nama, harga, toko, rating.\n\nContoh: *.${cmd} ${cmd === "shein" ? "dress" : "mechanical keyboard"}*`));
    }

    await m.react("🧠");
    const r = await searchApiEngine(shop.engine, { q });
    if (!r.ok) { await m.react("❌"); return m.reply(novaWrap("gshopping", sapiErrorMessage(r.error))); }
    const body = renderShopping(r.data);
    if (!body) { await m.react("❌"); return m.reply(novaWrap("gshopping", "⚠️ Produk gak ketemu — coba kata kunci lain.")); }
    await m.react("🐣");
    return m.reply(novaWrap("gshopping", `🛍️ *${shop.label} — ${q.toUpperCase().slice(0, 50)}*\n\n${body}`));
  } catch (err) {
    console.error("[sapishop]", err.message);
    await m.react("❌");
    return m.reply(novaWrap("gshopping", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setSearchApiHttpForTest };
