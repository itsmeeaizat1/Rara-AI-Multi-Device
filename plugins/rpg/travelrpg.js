// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Travel — Pindah lokasi
import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "travel", alias: ["travel", "travelrpg"],
  category: "rpg", description: "Pindah ke lokasi RPG",
  usage: ".travel <lokasi>", example: ".travel hutan",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 5, isEnabled: true,
};

const LOCATIONS = {
  hutan: "🌲 Hutan Kabut — Banyak monster liar",
  desa: "⛩️ Desa Hilang — Tempat aman, NPC tersedia",
  gunung: "🌋 Gunung Merapi — Boss area, high risk",
  kuil: "🏯 Kuil Kuno — Quest & misteri",
  kastil: "🏰 Kastil Tua — Dungeon & harta",
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("travelrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text || !LOCATIONS[text]) {
      let list = Object.entries(LOCATIONS).map(([k,v]) => `• ${v}`).join("\n");
      return m.reply(novaRpgBox("travelrpg", `🗺️ Lokasi tersedia:\n${list}\n\nContoh: ${m.prefix}travelrpg hutan`, "guide"));
    }
    rpg.location = text;
    saveRpg(m, rpg);
    await m.react("🐣");
  await animGeneric(m, sock, "🧭", "Traveling");
    return m.reply(novaRpgBox("travelrpg", `🧭 Kamu berpindah ke *${LOCATIONS[text]}*`, "success"));
  } catch (e) {
    console.error("travelrpg error:", e.message);
    await m.react("❌");
    return m.reply(novaRpgBox("travelrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
