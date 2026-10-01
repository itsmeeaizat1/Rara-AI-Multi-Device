// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// weathersystemrpg.js — Sistem Cuaca Dunia RPG (upgrade owner 15 Sep 2026)
// Dulu: dice acak kosong (cuacarpg/weatherrpg). Sekarang: cuaca harian global
// deterministik yang BENERAN mempengaruhi .mancing / .berburu / .mining.
import { raraRpgBox } from "../../src/lib/rara-games.js";
import { getRpgWeather, getRpgWeatherForecast, rpgWeatherTag } from "../../src/lib/rara-rpg-weather.js";

const pluginConfig = {
  name: "weathersystemrpg", alias: ["weathersystemrpg"], // rename owner 15 Sep 2026: alias lama (weather/weatherrpg/cuacarpg) dihapus
  category: "rpg", description: "Cek cuaca dunia RPG hari ini + efek nyata ke mancing/berburu/mining",
  usage: ".weathersystemrpg", example: ".weathersystemrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🧠");
    const w = getRpgWeather();
    const t = getRpgWeatherForecast(1); // besok
    const pct = (v) => `${v > 1 ? "+" : ""}${Math.round((v - 1) * 100)}%`;
    const lines = [
      `${w.emoji} *CUACA HARI INI: ${w.label.toUpperCase()}*`,
      "",
      `"${w.desc}"`,
      "",
      "*Efek hari ini:*",
      `🎣 Mancing : ${pct(w.fish)} (ikan langka & mutiara)`,
      `⚔️ Berburu : ${pct(w.hunt)} (EXP & Gold buruan)`,
      `⛏️ Mining : ${pct(w.mine)} (peluang ore & gold)`,
      "",
      `🌫️ Prakiraan besok : ${t.emoji} ${t.label}`,
      "",
      "💡 Cuaca berganti tiap tengah malam WIB — sama untuk semua player.",
    ];
    await m.react("🐣");
    return m.reply(raraRpgBox("weathersystemrpg", lines.join("\n"), "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(raraRpgBox("weathersystemrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
