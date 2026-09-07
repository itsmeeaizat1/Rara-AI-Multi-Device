// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Roleplay — Ekspresikan aksi RP
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "roleplayrpg", alias: ["roleplayrpg", "roleplay", "rp"],
  category: "rpg", description: "Ekspresikan aksi roleplay",
  usage: ".roleplayrpg <aksi>", example: ".roleplayrpg aku memeluk naga yang terluka",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(novaRpgBox("roleplayrpg", `Ketik teks RP-mu.\nContoh: ${m.prefix}roleplayrpg aku memeluk naga yang terluka...`, "guide"));
  await animGeneric(m, sock, "🎭", "Role Play");
    return m.reply(novaRpgBox("roleplayrpg", `🎭 *${m.pushName} beraksi:*\n_${text}_`, "info"));
  } catch (e) {
    return m.reply(novaRpgBox("roleplayrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
