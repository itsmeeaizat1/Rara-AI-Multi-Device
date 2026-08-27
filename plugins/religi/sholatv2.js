// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// sholatv2.js — Jadwal sholat via myquran.com v2 API (no API key)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "sholatv2",
  alias: ["sholatv2"],
  category: "religi",
  description: "Jadwal sholat harian per kota Indonesia via myquran.com",
  usage: ".sholatv2 <nama kota>",
  example: ".sholatv2 Jakarta\n.sholatv2 Bandung\n.sholatv2 Makassar",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const API = "https://api.myquran.com/v2/sholat";

async function searchCity(query) {
  const res = await fetch(`${API}/kota/cari/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`myquran API ${res.status}`);
  const json = await res.json();
  return json?.data || [];
}

async function getSchedule(cityId, date) {
  const res = await fetch(`${API}/jadwal/${cityId}/${date}`);
  if (!res.ok) throw new Error(`myquran API ${res.status}`);
  const json = await res.json();
  return json?.data?.jadwal || null;
}

async function handler(m, { sock, config, db }) {
  try {
    const query = m.args?.join(" ") || "";

    if (!query) {
      return m.reply(claraWrap("Jadwal Sholat v2", [
        "Jadwal sholat harian per kota Indonesia",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}sholatv2 <nama kota>`,
        "",
        "💡 *Contoh:*",
        `${m.prefix}sholatv2 Jakarta`,
        `${m.prefix}sholatv2 Bandung`,
        `${m.prefix}sholatv2 Makassar`,
      ]));
    }

    await m.react("🕒");

    // Search city
    const cities = await searchCity(query);
    if (!cities || !cities.length) {
      await m.react("🐣");
      return m.reply(claraWrap("Jadwal Sholat v2", `Kota "${query}" tidak ditemukan. Coba nama kota lain.`));
    }

    const city = cities[0]; // take first match
    const cityId = city.id;

    // Get today's schedule
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const jadwal = await getSchedule(cityId, dateStr);
    if (!jadwal) {
      await m.react("🐣");
      return m.reply(claraWrap("Jadwal Sholat v2", `Gagal mengambil jadwal untuk ${city.lokasi}.`));
    }

    const text = `${city.lokasi || city.daerah || query}\n${jadwal.tanggal || dateStr}\n\n🕌 Subuh: ${jadwal.subuh}\n☀️ Terbit: ${jadwal.terbit}\n☀️ Dzuhur: ${jadwal.dzuhur}\n🌤️ Ashar: ${jadwal.ashar}\n🌅 Maghrib: ${jadwal.maghrib}\n🌙 Isya: ${jadwal.isya}`;

    await m.react("🐣");
    return m.reply(claraWrap("Jadwal Sholat v2", text));
  } catch (e) {
    console.error("[sholatv2] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "sholatv2");
  }
}

export { pluginConfig as config, handler };
