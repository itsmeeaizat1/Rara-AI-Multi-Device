// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "tolakjadian",
  alias: ["rejectjadian", "tolakcouple"],
  category: "rpg",
  description: "Tolak ajakan berpacaran",
  usage: ".tolakjadian"
};

async function handler(m, { sock }) {
    try {
      const requesterId = Object.keys(global.rpgMatch).find(k => {
        const r = global.rpgMatch[k];
        return r.target === m.sender && r.type === "couple";
      });
      if (!requesterId) {
        return await m.reply("❌ Tidak ada ajakan pacaran yang menunggu!");
      }
      const requesterName = requesterId.split("@")[0];
      delete global.rpgMatch[requesterId];
      let text = `❀°˖ 𝗔𝗷𝗮𝗸𝗮𝗻 𝗗𝗶𝘁𝗼𝗹𝗮𝗸 ˖°❀

┊ ➶ ${m.pushName} menolak ajakan ${requesterName}
┊ ➶ Tetap semangat ya! 💪

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await m.reply(text);
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
