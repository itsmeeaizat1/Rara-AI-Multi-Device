// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "couplelb",
  alias: ["coupleleaderboard", "topcouple", "rpgcouplelb"],
  category: "rpg",
  description: "Ranking couple RPG",
  usage: ".couplelb"
};

async function handler(m, { sock }) {
    try {
      const couples = getLeaderboard("couple", 10);
      if (couples.length === 0) {
        return await sendReplyWithNav(sock, m, "❀°˖ 𝗥𝗮𝗻𝗸𝗶𝗻𝗴 𝗖𝗼𝘂𝗽𝗹𝗲 ˖°❀\n\n┊ ➶ Belum ada couple terdaftar\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀", "couplelb");
      }
      const medals = ["🥇", "🥈", "🥉"];
      let text = "❀°˖ 𝗥𝗮𝗻𝗸𝗶𝗻𝗴 𝗖𝗼𝘂𝗽𝗹𝗲 ˖°❀\n\n";
      couples.forEach((c, i) => {
        const rank = i < 3 ? medals[i] : `${i + 1}.`;
        const status = c.married ? "💍" : "❤️";
        text += `┊ ➶ ${rank} ${c.name} & ${c.coupleName} ${status} (${c.score} pts)\n`;
      });
      text += "\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀";
      return await sendReplyWithNav(sock, m, text, "couplelb");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
