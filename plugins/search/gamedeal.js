// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gamedeal.js — CheapShark API: game deals & discounts (no API key)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "gamedeal",
  alias: ["gamedeal"],
  category: "search",
  description: "Cari diskon & harga game termurah dari Steam, Epic, dll",
  usage: ".gamedeal <judul game>",
  example: ".gamedeal GTA V\n.gamedeal Cyberpunk",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const API = "https://www.cheapshark.com/api/1.0";

let _storeCache = null;

async function getStores() {
  if (_storeCache) return _storeCache;
  try {
    const res = await fetch(`${API}/stores`);
    if (!res.ok) return [];
    _storeCache = await res.json();
    return _storeCache;
  } catch {
    return [];
  }
}

function storeName(storeId, stores) {
  const s = stores.find(s => String(s.storeID) === String(storeId));
  return s?.storeName || `Store ${storeId}`;
}

async function handler(m, { sock, config, db }) {
  try {
    const query = m.args?.join(" ") || "";

    if (!query) {
      return m.reply(claraWrap("Game Deals", [
        "Cari diskon & harga game termurah",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}gamedeal <judul game>`,
        "",
        "💡 *Contoh:*",
        `${m.prefix}gamedeal GTA V`,
        `${m.prefix}gamedeal Cyberpunk`,
      ]));
    }

    await m.react("🕒");

    const stores = await getStores();

    const res = await fetch(`${API}/deals?title=${encodeURIComponent(query)}&pageSize=5`);
    if (!res.ok) throw new Error(`CheapShark API ${res.status}`);
    const deals = await res.json();

    if (!deals || !deals.length) {
      await m.react("🐣");
      return m.reply(claraWrap("Game Deals", `Tidak ada deal untuk: "${query}"`));
    }

    const lines = deals.slice(0, 5).map((d, i) => {
      const name = d.title || "Unknown";
      const store = storeName(d.storeID, stores);
      const sale = d.salePrice ? `$${d.salePrice}` : "N/A";
      const normal = d.normalPrice ? `$${d.normalPrice}` : "N/A";
      const discount = d.savings ? `${Math.round(parseFloat(d.savings))}% OFF` : "";
      const rating = d.steamRatingPercent ? `★ ${d.steamRatingPercent}%` : "";
      const link = d.dealID ? `https://www.cheapshark.com/redirect?dealID=${d.dealID}` : "";
      return `${i + 1}. ${name}\n   ${store} | ${sale} (was ${normal}) | ${discount}\n   ${rating}${rating ? " | " : ""}${link}`;
    });

    await m.react("🐣");
    return m.reply(claraWrap("Game Deals", [
      `Hasil pencarian: "${query}"`,
      "",
      lines.join("\n\n"),
    ]));
  } catch (e) {
    console.error("[gamedeal] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "gamedeal");
  }
}

export { pluginConfig as config, handler };
