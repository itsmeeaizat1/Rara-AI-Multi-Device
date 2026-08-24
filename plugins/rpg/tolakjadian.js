// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

global.rpgMatch = global.rpgMatch || {};

export default {
  name: "tolakjadian",
  alias: ["rejectjadian", "tolakcouple"],
  category: "rpg",
  description: "Tolak ajakan berpacaran",
  usage: ".tolakjadian",
  async handler(m, { sock }) {
    try {
      const requesterId = Object.keys(global.rpgMatch).find(k => {
        const r = global.rpgMatch[k];
        return r.target === m.sender && r.type === "couple";
      });
      if (!requesterId) {
        return await sendReplyWithNav(sock, m, "❌ Tidak ada ajakan pacaran yang menunggu!", "tolakjadian");
      }
      const requesterName = requesterId.split("@")[0];
      delete global.rpgMatch[requesterId];
      let text = `❀°˖ 𝗔𝗷𝗮𝗸𝗮𝗻 𝗗𝗶𝘁𝗼𝗹𝗮𝗸 ˖°❀

┊ ➶ ${m.pushName} menolak ajakan ${requesterName}
┊ ➶ Tetap semangat ya! 💪

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await sendReplyWithNav(sock, m, text, "tolakjadian");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }
};
