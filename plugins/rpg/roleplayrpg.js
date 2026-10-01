// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Roleplay — Ekspresikan aksi RP
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "roleplay", alias: ["roleplay", "roleplayrpg", "rp"],
  category: "rpg", description: "Ekspresikan aksi roleplay",
  usage: ".roleplay <aksi>", example: ".roleplay aku memeluk naga yang terluka",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(raraRpgBox("roleplayrpg", `Ketik teks RP-mu.\nContoh: ${m.prefix}roleplayrpg aku memeluk naga yang terluka...`, "guide"));
  await animGeneric(m, sock, "🎭", "Role Play");
    return m.reply(raraRpgBox("roleplayrpg", `🎭 *${m.pushName} beraksi:*\n_${text}_`, "info"));
  } catch (e) {
    return m.reply(raraRpgBox("roleplayrpg", "Terjadi error.", "error"));
  }
}
export { pluginConfig as config, handler };
