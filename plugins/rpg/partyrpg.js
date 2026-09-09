import { ensureRpg, saveRpg, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "party", alias: ["party", "partyrpg", "tim"],
  category: "rpg", description: "Kelola party RPG (lihat/tambah anggota via reply)",
  usage: ".party (atau reply untuk add)", example: ".party",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 5, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("partyrpg", "RPG belum siap.", "error"));
    if (!rpg.party) rpg.party = [];
    if (!m.quoted && !m.args.length) {
  await animGeneric(m, sock, "👥", "Forming Party");
      if (!rpg.party.length) return m.reply(novaRpgBox("partyrpg", "👥 Party-mu kosong. Reply seseorang untuk mengajak bergabung.", "info"));
      return m.reply(novaRpgBox("partyrpg", `👥 *PARTY-MU:*\n${rpg.party.map((id, i) => `${i+1}. ${id.split("@")[0]}`).join("\n")}`, "info"));
    }
    if (m.quoted) {
      const target = m.quoted.sender;
      if (rpg.party.includes(target)) return m.reply(novaRpgBox("partyrpg", "Sudah ada di party.", "info"));
      if (rpg.party.length >= 5) return m.reply(novaRpgBox("partyrpg", "Party sudah penuh (max 5).", "error"));
      rpg.party.push(target);
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply(novaRpgBox("partyrpg", `✅ ${target.split("@")[0]} ditambahkan ke party-mu.`, "success"));
    }
  } catch (e) { return m.reply(novaRpgBox("partyrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
