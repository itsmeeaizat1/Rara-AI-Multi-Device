// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 SearchApi Hub — .sapi
// 🔹 Akses SEMUA engine searchapi.io (90+) dalam 1 command.
// 🔹 Output plain text lengkap (alamat/harga/rating) — gak perlu klik link.
// 🔹 STRICT SATUAN: key kosong/401/429 → error asli, no fallback.
// ═════════════════════════════════════════════

import { searchApiEngine, _setSearchApiHttpForTest, _setSearchApiKeyForTest } from "../../src/scraper/searchapi.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { SAPI_ENGINES, getEngineSpec, sapiErrorMessage } from "../../src/lib/rara-sapi-render.js";

const pluginConfig = {
  name: "sapihub",
  alias: ["sapi", "searchapi", "searchapihub"],
  category: "search",
  description: "Semua API searchapi.io (90+ engine: search, maps, belanja, news, dll) — plain text",
  usage: ".sapi list | .sapi <engine> <query>",
  example: ".sapi google_maps kafe jakarta | .sapi bing hp terbaru",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();

    // .sapi / .sapi list → daftar engine
    if (!sub || sub === "list" || sub === "daftar") {
      const keys = Object.keys(SAPI_ENGINES);
      const lines = keys.map((k) => `• ${k} — ${SAPI_ENGINES[k].desc}`);
      return m.reply(raraWrap("sapi",
        `🔌 *SEARCHAPI HUB — ${keys.length} ENGINE TERSEDIA*\n\n` +
        `Semua engine searchapi.io bisa dipanggil dari sini. Hasil = plain text lengkap (alamat, harga, rating, jam, dll — tanpa perlu klik link).\n\n` +
        `📖 *CARA PAKAI:*\n.sapi <engine> <query>\n\n` +
        `Contoh:\n.sapi google_maps kafe jakarta\n.sapi bing laptop gaming\n.sapi google_shopping ps5\n\n` +
        `📚 *ENGINE (${keys.length}):*\n${lines.join("\n")}\n\n` +
        `💡 Fitur keren udah ada command khusus: .gmaps .grute .gtiket .ghotels .gshopping .gnews .gjobs .gevents .gimages .amz .ebay .scholar .gbooks .gpatents .gfinance .ytranscript`));
    }

    await m.react("🧠");

    // .sapi <engine> <query...>
    const engineKey = args[0];
    const query = args.slice(1).join(" ").trim();
    const spec = getEngineSpec(engineKey);

    // engine maps-directions/flights butuh param khusus → arahin command khusus
    if (["google_maps_directions", "grute"].includes(engineKey.toLowerCase())) {
      return m.reply(raraWrap("sapi", `💡 Rute pakai command khusus: *.grute <dari> | <ke>* — contoh: .grute stasiun gambir | monas`));
    }
    if (engineKey.toLowerCase() === "google_flights") {
      return m.reply(raraWrap("sapi", `💡 Tiket pesawat pakai command khusus: *.gtiket CGK | DPS | 20-09-2026* (kode IATA)`));
    }

    if (!query) {
      return m.reply(raraWrap("sapi",
        `💡 Engine *${engineKey}* butuh query.\n\nContoh: *${spec.usage}*`));
    }

    const r = await searchApiEngine(spec.engine, { q: query });
    if (!r.ok) {
      await m.react("❌");
      return m.reply(raraWrap("sapi", sapiErrorMessage(r.error)));
    }

    const body = spec.render(r.data) || "⚠️ Gak ada hasil buat query itu — coba kata kunci lain.";
    await m.react("🐣");
    return m.reply(raraWrap("sapi",
      `🔌 *${(spec.desc || engineKey).toUpperCase().slice(0, 50)}*\n` +
      `🔍 Query: ${query.slice(0, 80)}\n\n${body}`));
  } catch (err) {
    console.error("[sapihub]", err.message);
    await m.react("❌");
    return m.reply(raraWrap("sapi", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setSearchApiHttpForTest, _setSearchApiKeyForTest };
