// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

global.rpgMarriage = global.rpgMarriage || {};

export default {
  name: "tolaknikah",
  alias: ["rejectnikah", "tolaklamar", "rejectmarriage"],
  category: "rpg",
  description: "Tolak lamaran nikah",
  usage: ".tolaknikah",
  async handler(m, { sock }) {
    try {
      const proposerId = Object.keys(global.rpgMarriage).find(k => {
        const r = global.rpgMarriage[k];
        return r.target === m.sender;
      });
      if (!proposerId) {
        return await sendReplyWithNav(sock, m, "❌ Tidak ada lamaran yang menunggu!", "tolaknikah");
      }
      const proposerName = proposerId.split("@")[0];
      delete global.rpgMarriage[proposerId];
      let text = `❀°˖ 𝗟𝗮𝗺𝗮𝗿𝗮𝗻 𝗗𝗶𝘁𝗼𝗹𝗮𝗸 ˖°❀

┊ ➶ ${m.pushName} menolak lamaran ${proposerName}
┊ ➶ Tetap berpacaran ❤️

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await sendReplyWithNav(sock, m, text, "tolaknikah");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }
};
