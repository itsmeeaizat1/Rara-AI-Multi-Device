// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {
  fetchWeather,
  formatWeatherMessage,
  getWeatherStatus,
  resolveWeatherLocation,
} from "../../src/lib/nova-weather-scheduler.js";
import {  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cekcuaca",
  alias: ["weathercheck", "cuacasekarang"],
  category: "info",
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
  await m.react("🕒");

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

    await m.react("✅");
    const _lines = message.split("\n").filter(l => l.trim());
    return await m.reply(claraWrap("cekcuaca", claraWrap(_lines)));
  } catch (error) {
    return m.reply(claraWrap("cekcuaca", [
        "Gagal mengambil cuaca",
        error.message,
        "",
        `Contoh: ${m.prefix}cekcuaca Jakarta`,
      ].join("\n"),));
  }
}

export { pluginConfig as config, handler };