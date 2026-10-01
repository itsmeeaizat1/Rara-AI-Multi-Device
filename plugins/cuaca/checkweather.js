// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {
  fetchWeather,
  formatWeatherMessage,
  getWeatherStatus,
  resolveWeatherLocation,
} from "../../src/lib/nova-weather-scheduler.js";
import { novaError, novaEmpty, novaGuide, novaNoInput,  novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cekcuaca",
  alias: ["cekcuaca"],
  category: "cuaca",
  description: "Cek informasi cuaca saat ini",
  usage: ".cekcuaca [nama kota]",
  example: ".cekcuaca Bandung",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const city = (m.args || []).join(" ").trim();
  try {
    const settings = getWeatherStatus();
    const location = city
      ? await resolveWeatherLocation(city)
      : settings.location;
    const forecast = await fetchWeather(location, settings.timezone);
    const message = formatWeatherMessage(
      forecast,
      { ...settings, location },
      { label: "Sekarang" },
    );
    const _lines = message.split("\n");
    return await m.reply(novaWrap("Cek Cuaca", _lines));
  } catch (error) {
    return m.reply(novaWrap("cekcuaca", [
        "Gagal ambil cuaca nih",
        error.message,
        "",
        `Contoh: ${m.prefix}cekcuaca Jakarta`,
      ].join("\n"),));
  }
}

export { pluginConfig as config, handler };