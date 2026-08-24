// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { getLeaderboard } from "../../src/lib/nova-rpg-service.js";

export default {
  name: "leaderboard",
  alias: ["rpglb", "rpleaderboard", "toprpg"],
  category: "rpg",
  description: "Ranking player RPG",
  usage: ".leaderboard",
  async handler(m, { sock }) {
    try {
      const players = getLeaderboard("level", 10);
      if (players.length === 0) {
        return await sendReplyWithNav(sock, m, "❀°˖ 𝗥𝗮𝗻𝗸𝗶𝗻𝗴 𝗣𝗹𝗮𝘆𝗲𝗿 ˖°❀\n\n┊ ➶ Belum ada player terdaftar\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀", "leaderboard");
      }
      const medals = ["🥇", "🥈", "🥉"];
      let text = "❀°˖ 𝗥𝗮𝗻𝗸𝗶𝗻𝗴 𝗣𝗹𝗮𝘆𝗲𝗿 ˖°❀\n\n";
      players.forEach((p, i) => {
        const rank = i < 3 ? medals[i] : `${i + 1}.`;
        text += `┊ ➶ ${rank} ${p.name} — Lv.${p.level} (${p.exp} exp)\n`;
      });
      text += "\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀";
      return await sendReplyWithNav(sock, m, text, "leaderboard");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }
};
