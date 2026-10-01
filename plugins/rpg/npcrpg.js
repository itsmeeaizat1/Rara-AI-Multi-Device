import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";
const pluginConfig = {
  name: "npc", alias: ["npc", "npcrpg"],
  category: "rpg", description: "Bicara dengan NPC",
  usage: ".npc <nama>", example: ".npc penjaga",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
const NPCS = {
  penjaga: "⚔️ Penjaga: Dunia ini berbahaya... simpan goldmu di bank! Gunakan .bankrpg untuk menyimpan.",
  penjual: "🛒 Penjual: Aku punya ramuan langka, coba .shoprpg!",
  tetua: "👴 Tetua: Hanya yang berani yang bisa menaklukkan .finaltrialrpg.",
  pandai: "🧙 Pandai Besi: Bawa material ke .blacksmith untuk meningkatkan senjata!",
};
async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text || !NPCS[text]) return m.reply(raraRpgBox("npcrpg", `NPC tersedia: ${Object.keys(NPCS).join(", ")}\nContoh: ${m.prefix}npcrpg penjaga`, "guide"));
  await animGeneric(m, sock, "🧙", "NPC Interaction");
    return m.reply(raraRpgBox("npcrpg", NPCS[text], "info"));
  } catch (e) { return m.reply(raraRpgBox("npcrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
