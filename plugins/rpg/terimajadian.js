// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "terimajadian",
  alias: ["acceptjadian", "terimacouple"],
  category: "rpg",
  description: "Terima ajakan berpacaran",
  usage: ".terimajadian"
};

async function handler(m, { sock }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const requesterId = Object.keys(global.rpgMatch).find(k => {
        const r = global.rpgMatch[k];
        return r.target === m.sender && r.type === "couple" && (Date.now() - r.time) < 300000;
      });
      if (!requesterId) {
        return await m.reply("❌ Tidak ada ajakan pacaran yang menunggu!\nAjakan expired setelah 5 menit.");
      }
      const requesterName = global.rpgMatch[requesterId].requesterName || requesterId.split("@")[0];
      setCouple({ sender: requesterId, key: { remoteJid: m.key?.remoteJid } }, m.sender, m.pushName || "Player");
      setCouple(m, requesterId, requesterName);
      addExp(m, 50);
      addExp({ sender: requesterId, key: { remoteJid: m.key?.remoteJid } }, 50);
      delete global.rpgMatch[requesterId];
      let text = `❀°˖ 𝗣𝗮𝗰𝗮𝗿𝗮𝗻 𝗕𝗮𝗿𝘂 ˖°❀

┊ ➶ ${m.pushName} & ${requesterName}
┊ ➶ Status: Berpacaran ❤️
┊ ➶ Bonus: +50 exp untuk kalian berdua!

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await m.reply(text);
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
