// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * .cuacav2 — cek cuaca rinci BMKG-style untuk kota apapun.
 * Menampilkan: suhu, kelembapan, tekanan, angin, presipitasi, UV, visibility, cloud cover,
 * prakiraan 6 jam ke depan, dan prakiraan 3 hari.
 */

import {
  geocodeCity,
  fetchDetailedWeather,
  formatDetailedWeather,
  DEFAULT_LOCATIONS,
} from "../../src/lib/nova-bmkg-cuaca-scheduler.js";

const pluginConfig = {
  name: "cuacav2",
  alias: ["cuacav2"],
  category: "info",
  description: "Cek cuaca rinci v2 (BMKG-style (suhu, angin, tekanan, UV, prakiraan 3 hari)",
  usage: ".cuacav2 [nama kota]",
  example: ".cuacav2 Jakarta",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const cityName = (m.args || []).join(" ").trim();

  try {
    let location;
    if (!cityName) {
      location = DEFAULT_LOCATIONS[0];
    } else {
      location = await geocodeCity(cityName);
    }

    const data = await fetchDetailedWeather(location);
    const txt = formatDetailedWeather(data, location, "Sekarang");
    return await m.reply(claraWrap("cuacav2", txt));
  } catch (error) {
    return m.reply(
      "Gagal ambil data cuaca nih\n" + error.message + "\n\n" +
      "Contoh: .cuacav2 Jakarta"
    );
  }
}

export { pluginConfig as config, handler };
