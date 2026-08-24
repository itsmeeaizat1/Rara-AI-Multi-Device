// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "divorce",
  alias: ["divorcematch", "putus", "cerai"],
  category: "rpg",
  description: "Putus hubungan dengan pasangan",
  usage: ".divorce"
};

async function handler(m, { sock }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const player = getPlayer(m);
      if (!player?.coupleId && !player?.marriedId) {
        return await m.reply("❌ Kamu tidak punya pasangan!");
      }
      const partnerName = player.marriedName || player.coupleName || "Unknown";
      removeCouple(m);
      let text = `❀°˖ 𝗣𝘂𝘁𝘂𝘀 𝗛𝘂𝗯𝘂𝗻𝗴𝗮𝗻 ˖°❀

┊ ➶ ${m.pushName} & ${partnerName}
┊ ➶ Status: Lajang lagi
┊ ➶ Semoga temukan yang lebih baik 💔

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await m.reply(text);
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
