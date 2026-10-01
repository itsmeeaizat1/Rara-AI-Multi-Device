// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Maps Suite — .gmaps .gmapsreviews .grute
// 🔹 Info tempat PLAIN TEXT: alamat, rating, jam buka, telepon, situs.
//    Rute: durasi, jarak, langkah-langkah. GAK PERLU KLIK LINK.
// ═════════════════════════════════════════════

import { searchApiEngine, _setSearchApiHttpForTest } from "../../src/scraper/searchapi.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { sapiErrorMessage } from "../../src/lib/nova-sapi-render.js";

const pluginConfig = {
  name: "sapimaps",
  alias: ["gmaps", "gmapsreviews", "grute"],
  category: "search",
  description: "Google Maps plain text — info tempat, ulasan, rute langkah-demi-langkah",
  usage: ".gmaps <tempat>\n.gmapsreviews <tempat>\n.grute <dari> | <ke> [| cara]",
  example: ".gmaps kafe jakarta | .grute stasiun gambir | monas | jalan kaki",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = (m.command || "gmaps").toLowerCase();
    const q = (m.args || []).join(" ").trim();

    if (!q) {
      const usage = cmd === "gmapsreviews"
        ? `📝 Ulasan tempat.\n\nContoh: *.gmapsreviews monas*`
        : cmd === "grute"
          ? `🗺️ Rute langkah-demi-langkah.\n\nFormat: *.grute <dari> | <ke> [| cara]*\nCara: mobil (default), jalan kaki, sepeda, bis\n\nContoh: .grute stasiun gambir | monas`
          : `📍 Info tempat (alamat, rating, jam buka, telepon).\n\nContoh: *.gmaps kafe jakarta*`;
      return m.reply(novaWrap("gmaps", usage));
    }

    await m.react("🧠");
    let r;
    if (cmd === "gmaps") {
      r = await searchApiEngine("google_maps", { q });
    } else if (cmd === "gmapsreviews") {
      r = await searchApiEngine("google_maps_reviews", { q });
    } else {
      // .grute dari | ke [| cara]
      const parts = q.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) {
        await m.react("❌");
        return m.reply(novaWrap("gmaps", `💡 Format: *.grute <dari> | <ke> [| cara]*\n\nContoh: .grute stasiun gambir | monas | jalan kaki`));
      }
      const from = parts[0];
      const to = parts[1];
      const modeRaw = (parts[2] || "mobil").toLowerCase();
      const modeMap = { mobil: "driving", driving: "driving", mobilket: "driving", "jalan kaki": "walking", jalan: "walking", walking: "walking", sepeda: "cycling", cycling: "cycling", bis: "transit", transit: "transit", kereta: "transit", pesawat: "flying", flying: "flying" };
      const mode = modeMap[modeRaw] || modeMap[(modeRaw || "").split(" ")[0]] || "driving";
      r = await searchApiEngine("google_maps_directions", { from, to, travel_mode: mode, distance_units: "km" });
    }

    if (!r.ok) {
      await m.react("❌");
      return m.reply(novaWrap("gmaps", sapiErrorMessage(r.error)));
    }

    const { renderPlaces, renderReviews, renderDirections } = await import("../../src/lib/nova-sapi-render.js");
    let body = null;
    if (cmd === "gmaps") body = renderPlaces(r.data);
    else if (cmd === "gmapsreviews") body = renderReviews(r.data);
    else body = renderDirections(r.data);

    if (!body) {
      await m.react("❌");
      return m.reply(novaWrap("gmaps", "⚠️ Gak ada hasil — coba nama tempat lebih spesifik."));
    }
    await m.react("🐣");
    return m.reply(novaWrap("gmaps", body));
  } catch (err) {
    console.error("[sapimaps]", err.message);
    await m.react("❌");
    return m.reply(novaWrap("gmaps", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setSearchApiHttpForTest };
