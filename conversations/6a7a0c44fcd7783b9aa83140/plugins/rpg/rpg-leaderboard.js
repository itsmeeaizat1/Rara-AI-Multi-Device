import { alyaHeader, separator, tipText , claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getRole } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgboard", alias: ["rpgleaderboard", "rpglb", "toprpg2"], category: "rpg",
  description: "Top player RPG", usage: ".rpgboard",
  example: ".rpgboard", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 10, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    if (!db.rpg) { m.reply(claraWrap("Rpgboard", "Belum ada player RPG.")); return { handled: true }; }
    
    const players = Object.entries(db.rpg)
      .map(([jid, data]) => ({ jid, ...data }))
      .sort((a, b) => b.exp - a.exp)
      .slice(0, 10);
    
    if (!players.length) {
      m.reply(claraWrap("Rpgboard", "Belum ada player RPG."));
      return { handled: true };
    }
    
    let text = claraWrap("RPG Leaderboard", "🏆") + "\n\n";
    const medals = ["🥇", "🥈", "🥉"];
    players.forEach((p, i) => {
      const rank = i < 3 ? medals[i] : `${i + 1}.`;
      const role = getRole(p.level);
      text += `${rank} @${p.jid.split("@")[0]}\n`;
      text += `   Lv.${p.level} | ${role} | ${p.exp} EXP\n\n`;
    });
    text += separator("━", 22) + "\n" + tipText(`Ketik ${prefix}rpgprofile untuk lihat profil kamu`);
    await sendReplyWithNav(sock, m, text, "rpgboard");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };