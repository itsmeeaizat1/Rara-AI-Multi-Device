import { ensureRpg, saveRpg, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "partyrpg", alias: ["partyrpg"], aliases: ["partyrpg", "party", "tim"],
  category: "rpg", description: "Kelola party RPG (lihat/tambah anggota via reply)",
  usage: ".partyrpg (atau reply untuk add)", example: ".partyrpg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 5, isEnabled: true,
};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("partyrpg", "RPG belum siap.", "error"));
    if (!rpg.party) rpg.party = [];
    if (!m.quoted && !m.args.length) {
      if (!rpg.party.length) return m.reply(claraWrap("partyrpg", "👥 Party-mu kosong. Reply seseorang untuk mengajak bergabung.", "info"));
      return m.reply(claraWrap("partyrpg", `👥 *PARTY-MU:*\n${rpg.party.map((id, i) => `${i+1}. ${id.split("@")[0]}`).join("\n")}`, "info"));
    }
    if (m.quoted) {
      const target = m.quoted.sender;
      if (rpg.party.includes(target)) return m.reply(claraWrap("partyrpg", "Sudah ada di party.", "info"));
      if (rpg.party.length >= 5) return m.reply(claraWrap("partyrpg", "Party sudah penuh (max 5).", "error"));
      rpg.party.push(target);
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply(claraWrap("partyrpg", `✅ ${target.split("@")[0]} ditambahkan ke party-mu.`, "success"));
    }
  } catch (e) { return m.reply(claraWrap("partyrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
