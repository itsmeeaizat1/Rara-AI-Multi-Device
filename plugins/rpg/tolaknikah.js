// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "tolaknikah",
  alias: ["rejectnikah", "tolaklamar", "rejectmarriage"],
  category: "rpg",
  description: "Tolak lamaran nikah",
  usage: ".tolaknikah"
};

async function handler(m, { sock }) {
    try {
      const proposerId = Object.keys(global.rpgMarriage).find(k => {
        const r = global.rpgMarriage[k];
        return r.target === m.sender;
      });
      if (!proposerId) {
        return await m.reply("❌ Tidak ada lamaran yang menunggu!");
      }
      const proposerName = proposerId.split("@")[0];
      delete global.rpgMarriage[proposerId];
      let text = `❀°˖ 𝗟𝗮𝗺𝗮𝗿𝗮𝗻 𝗗𝗶𝘁𝗼𝗹𝗮𝗸 ˖°❀

┊ ➶ ${m.pushName} menolak lamaran ${proposerName}
┊ ➶ Tetap berpacaran ❤️

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await m.reply(text);
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
