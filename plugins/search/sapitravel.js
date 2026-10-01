// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Travel Suite — .gtiket .ghotels
// 🔹 Tiket pesawat PLAIN TEXT: harga, jam terbang, airline, transit.
//    Hotel: harga, rating, lokasi. GAK PERLU KLIK LINK.
// ═════════════════════════════════════════════

import { searchApiEngine, _setSearchApiHttpForTest } from "../../src/scraper/searchapi.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { sapiErrorMessage, renderFlights, renderHotels } from "../../src/lib/nova-sapi-render.js";

const pluginConfig = {
  name: "sapitravel",
  alias: ["gtiket", "gflights", "ghotels"],
  category: "search",
  description: "Tiket pesawat & hotel plain text — harga, jam, rating tanpa klik link",
  usage: ".gtiket <IATA asal> | <IATA tujuan> | <DD-MM-YYYY> [| PP DD-MM-YYYY]\n.ghotels <kota> [| mulai DD-MM-YYYY | sampai DD-MM-YYYY]",
  example: ".gtiket CGK | DPS | 20-09-2026 | .ghotels Bandung",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 2, isEnabled: true,
};

/** DD-MM-YYYY → YYYY-MM-DD */
function toIsoDate(d) {
  const mm = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(d).trim());
  if (!mm) return null;
  return `${mm[3]}-${String(mm[2]).padStart(2, "0")}-${String(mm[1]).padStart(2, "0")}`;
}

async function handler(m, { sock }) {
  try {
    const cmd = (m.command || "gtiket").toLowerCase();
    const q = (m.args || []).join(" ").trim();

    if (!q) {
      const usage = cmd === "ghotels"
        ? `🏨 Hotel: harga, rating, lokasi.\n\nFormat: *.ghotels <kota> [| mulai DD-MM-YYYY | sampai DD-MM-YYYY]*\n\nContoh: .ghotels Bandung | 20-09-2026 | 22-09-2026`
        : `✈️ Tiket pesawat: harga, jam terbang, airline, transit.\n\nFormat: *.gtiket <IATA asal> | <IATA tujuan> | <DD-MM-YYYY> [| PP DD-MM-YYYY>*\n\nKode IATA contoh: CGK/DPS/JOG/SUB/KNO\nContoh: .gtiket CGK | DPS | 20-09-2026`;
      return m.reply(novaWrap("gtiket", usage));
    }

    await m.react("🧠");

    if (cmd === "ghotels") {
      const parts = q.split("|").map((s) => s.trim());
      const city = parts[0];
      if (!city) { await m.react("❌"); return m.reply(novaWrap("gtiket", "⚠️ Nama kota kosong.")); }
      const params = { q: city, adults: 2 };
      if (parts[1] && toIsoDate(parts[1])) params.check_in_date = toIsoDate(parts[1]);
      if (parts[2] && toIsoDate(parts[2])) params.check_out_date = toIsoDate(parts[2]);
      const r = await searchApiEngine("google_hotels", params);
      if (!r.ok) { await m.react("❌"); return m.reply(novaWrap("gtiket", sapiErrorMessage(r.error))); }
      const body = renderHotels(r.data);
      if (!body) { await m.react("❌"); return m.reply(novaWrap("gtiket", "⚠️ Gak ada hotel ketemu — coba nama kota lain.")); }
      await m.react("🐣");
      return m.reply(novaWrap("gtiket", `🏨 *HOTEL DI ${city.toUpperCase().slice(0, 40)}*\n\n${body}`));
    }

    // .gtiket
    const parts = q.split("|").map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      await m.react("❌");
      return m.reply(novaWrap("gtiket", `💡 Format: *.gtiket <IATA asal> | <IATA tujuan> | <DD-MM-YYYY> [| PP DD-MM-YYYY]*\n\nContoh: .gtiket CGK | DPS | 20-09-2026`));
    }
    const dep = parts[0].toUpperCase().replace(/\s/g, "");
    const arr = parts[1].toUpperCase().replace(/\s/g, "");
    const outDate = toIsoDate(parts[2]);
    if (!/^[A-Z]{3}$/.test(dep) || !/^[A-Z]{3}$/.test(arr)) {
      await m.react("❌");
      return m.reply(novaWrap("gtiket", "⚠️ Kode bandara harus 3 huruf IATA (CGK, DPS, JOG, SUB, KNO, dll)."));
    }
    if (!outDate) {
      await m.react("❌");
      return m.reply(novaWrap("gtiket", "⚠️ Tanggal harus format DD-MM-YYYY (contoh 20-09-2026)."));
    }
    const params = { departure_id: dep, arrival_id: arr, outbound_date: outDate, currency: "IDR" };
    const retDate = parts[3] && toIsoDate(parts[3].replace(/^PP:?/i, "").trim());
    if (retDate) {
      params.return_date = retDate;
    } else {
      params.flight_type = "one_way";
    }

    const r = await searchApiEngine("google_flights", params);
    if (!r.ok) { await m.react("❌"); return m.reply(novaWrap("gtiket", sapiErrorMessage(r.error))); }
    const body = renderFlights(r.data);
    if (!body) { await m.react("❌"); return m.reply(novaWrap("gtiket", "⚠️ Gak ada tiket ketemu rute/tanggal itu.")); }
    await m.react("🐣");
    return m.reply(novaWrap("gtiket",
      `✈️ *${dep} → ${arr} — ${parts[2]}${retDate ? ` (PP)` : ""}*\n\n${body}\n\n💡 Harga Google Flights — bisa beda dikit pas checkout.`));
  } catch (err) {
    console.error("[sapitravel]", err.message);
    await m.react("❌");
    return m.reply(novaWrap("gtiket", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setSearchApiHttpForTest };
