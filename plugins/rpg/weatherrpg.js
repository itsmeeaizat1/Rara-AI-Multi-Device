// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Weather — Cuaca dunia RPG
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";

const pluginConfig = {
  name: "weatherrpg", alias: ["weatherrpg", "cuacarpg"],
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
    return m.reply(claraWrap("weatherrpg", `🌦️ Cuaca hari ini: *${cuaca[idx]}*\nEffect: ${efek[idx]}`, "info"));
  } catch (e) {
    return m.reply(claraWrap("weatherrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
