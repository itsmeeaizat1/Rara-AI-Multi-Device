// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Weather — Cuaca dunia RPG
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "weatherrpg", alias: ["weatherrpg", "cuacarpg"], // "weather" dilepas 15 Sep 2026 — nama .weather dipindah ke fitur cuaca (cuaca-v15)
  category: "rpg", description: "Cek cuaca dunia RPG",
  usage: ".weatherrpg", example: ".weatherrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cuaca = ["☀️ Cerah", "🌧️ Hujan", "⛈️ Badai", "🌫️ Berkabut", "❄️ Salju"];
    const efek = ["Drop rate normal", "Fishing +20%", "Hunt berbahaya!", "Visibility rendah", "Mine +10%"];
    const idx = Math.floor(Math.random() * cuaca.length);
  await animGeneric(m, sock, "🌤️", "Checking Weather");
    return m.reply(novaRpgBox("weatherrpg", `🌦️ Cuaca hari ini: *${cuaca[idx]}*\nEffect: ${efek[idx]}`, "info"));
  } catch (e) {
    return m.reply(novaRpgBox("weatherrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
