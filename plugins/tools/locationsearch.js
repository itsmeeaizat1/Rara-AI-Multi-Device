// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// locationsearch.js — Apple Maps / Location Search (OpenStreetMap Nominatim)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "locationsearch",
  alias: ["locationsearch", "cari lokasi", "mapsearch", "findplace", "carilokasi"],
  category: "tools",
  description: "Cari lokasi/tempat + kirim pin map (OpenStreetMap)",
  usage: ".locationsearch <nama tempat>",
  example: ".locationsearch Monas Jakarta",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const query = m.args.join(" ").trim();
    if (!query) {
      return m.reply(claraWrap("locationsearch", `Mau cari lokasi apa?\n\nContoh: ${m.prefix}locationsearch Monas Jakarta`, "guide"));
    }

    await m.react("🕒");

    // OpenStreetMap Nominatim API (free, no key)
    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: query,
        format: "json",
        limit: 5,
        addressdetails: 1,
      },
      timeout: 15000,
      headers: { "User-Agent": "NovaBot/1.0" },
    });

    if (!data || data.length === 0) {
      await m.react("❌");
      return m.reply(claraWrap("locationsearch", `Lokasi "${query}" tidak ditemukan.`, "error"));
    }

    const place = data[0];
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    await m.react("🐣");

    // Build address
    let address = "";
    if (place.display_name) {
      address = place.display_name.slice(0, 200);
    }

    let msg = `╭─「 ✦ ʟᴏᴋᴀsɪ ᴅɪᴛᴇᴍᴜᴋᴀɴ ✦ 」\n`;
    msg += `│ Nama: *${place.name || query}*\n`;
    msg += `│ Alamat: ${address}\n`;
    msg += `│ Koordinat: *${lat.toFixed(4)}, ${lon.toFixed(4)}*\n`;
    if (place.type) msg += `│ Tipe: *${place.type}*\n`;
    if (place.class) msg += `│ Kategori: *${place.class}*\n`;
    msg += `│\n`;
    msg += `│ OSM: https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}\n`;
    msg += `╰────  •  ────`;

    // Kirim text info dulu
    await m.reply(msg);

    // Kirim location pin
    await sock.sendMessage(m.chat, {
      location: {
        degreesLatitude: lat,
        degreesLongitude: lon,
        name: place.name || query,
        address: address,
      },
    });
  } catch (err) {
    console.error("locationsearch error:", err);
    await m.react("❌");
    return m.reply(claraWrap("locationsearch", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
