// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cekcuacav2.js — Cuaca via OpenWeather API (needs API key)
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "cekcuacav2",
  alias: ["cekcuacav2"],
  category: "info",
  description: "Cek cuaca via OpenWeather (suhu, kelembaban, angin, deskripsi)",
  usage: ".cekcuacav2 [nama kota]",
  example: ".cekcuacav2 Jakarta\n.cekcuacav2 London",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const query = m.args?.join(" ") || "";

    if (!query) {
      return m.reply(claraWrap("Cuaca v2", [
        "Cek cuaca via OpenWeather",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}cekcuacav2 <nama kota>`,
        "",
        "💡 *Contoh:*",
        `${m.prefix}cekcuacav2 Jakarta`,
        `${m.prefix}cekcuacav2 London`,
      ]));
    }

    const apiKey = config.openWeatherKey || config.APIkey?.openweather || "";

    if (!apiKey) {
      return m.reply(claraWrap("Cuaca v2", [
        "API key OpenWeather belum diset nih",
        "",
        "Dapatkan gratis di: https://openweathermap.org/api",
        "Set di config.js: openWeatherKey: \"YOUR_KEY\"",
        "",
        `Atau gunakan ${m.prefix}cekcuaca (versi lama)`,
      ]));
    }

    await m.react("🕒");

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric&lang=id`
    );

    if (res.status === 404) {
      await m.react("🐣");
      return m.reply(claraWrap("Cuaca v2", `Kota "${query}" tidak ditemukan.`));
    }

    if (!res.ok) throw new Error(`OpenWeather ${res.status}`);

    const data = await res.json();

    const name = data.name || query;
    const country = data.sys?.country || "";
    const desc = data.weather?.[0]?.description || "N/A";
    const temp = data.main?.temp ? `${Math.round(data.main.temp)}°C` : "N/A";
    const feels = data.main?.feels_like ? `${Math.round(data.main.feels_like)}°C` : "N/A";
    const humidity = data.main?.humidity ? `${data.main.humidity}%` : "N/A";
    const pressure = data.main?.pressure ? `${data.main.pressure} hPa` : "N/A";
    const wind = data.wind?.speed ? `${data.wind.speed} m/s` : "N/A";

    const text = `${name}, ${country}\n${desc}\n\n🌡️ Suhu: ${temp}\n🤔 Terasa: ${feels}\n💧 Kelembaban: ${humidity}\n📏 Tekanan: ${pressure}\n💨 Angin: ${wind}`;

    await m.react("🐣");
    return m.reply(claraWrap("Cuaca v2", text));
  } catch (e) {
    console.error("[cekcuacav2] error:", e.message);
    await m.react("🐣");
    return m.reply(te(m.prefix, m.command, m.pushName), "cekcuacav2");
  }
}

export { pluginConfig as config, handler };
