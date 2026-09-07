import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "npcrpg", alias: ["npcrpg", "npc"],
  category: "rpg", description: "Bicara dengan NPC",
  usage: ".npcrpg <nama>", example: ".npcrpg penjaga",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};
const NPCS = {
  penjaga: "⚔️ Penjaga: Dunia ini berbahaya... simpan koinmu di bank! Gunakan .bankrpg untuk menyimpan.",
  penjual: "🛒 Penjual: Aku punya ramuan langka, coba .shoprpg!",
  tetua: "👴 Tetua: Hanya yang berani yang bisa menaklukkan .finaltrialrpg.",
  pandai: "🧙 Pandai Besi: Bawa material ke .blacksmith untuk meningkatkan senjata!",
};
async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim().toLowerCase();
    if (!text || !NPCS[text]) return m.reply(novaRpgBox("npcrpg", `NPC tersedia: ${Object.keys(NPCS).join(", ")}\nContoh: ${m.prefix}npcrpg penjaga`, "guide"));
  await animGeneric(m, sock, "🧙", "NPC Interaction");
    return m.reply(novaRpgBox("npcrpg", NPCS[text], "info"));
  } catch (e) { return m.reply(novaRpgBox("npcrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
