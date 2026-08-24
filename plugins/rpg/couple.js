// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { ensurePlayer, getPlayer } from "../../src/lib/nova-rpg-service.js";

global.rpgMatch = global.rpgMatch || {};

export default {
  name: "couple",
  alias: ["rpgcouple", "pacaran", "jadianrequest"],
  category: "rpg",
  description: "Ajak seseorang berpacaran di RPG",
  usage: ".couple @tag",
  async handler(m, { sock, args }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const player = getPlayer(m);
      if (player?.coupleId) {
        return await sendReplyWithNav(sock, m, `❤️ Kamu sudah berpacaran dengan ${player.coupleName}!`, "couple");
      }
      const target = m.mentionedJid?.[0] || (args[0]?.startsWith("62") ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null);
      if (!target) {
        return await sendReplyWithNav(sock, m, "❌ Tag orang yang mau diajak pacaran!\nContoh: .couple @tag", "couple");
      }
      if (target === m.sender) {
        return await sendReplyWithNav(sock, m, "❌ Tidak bisa berpacaran dengan diri sendiri!", "couple");
      }
      global.rpgMatch[m.sender] = { target, time: Date.now(), type: "couple" };
      const targetName = target.split("@")[0];
      let text = `❀°˖ 𝗔𝗷𝗮𝗸𝗮𝗻 𝗣𝗮𝗰𝗮𝗿𝗮𝗻 ˖°❀

┊ ➶ ${m.pushName} mengajak @${targetName} berpacaran ❤️
┊ ➶ Ketik .terimajadian untuk terima
┊ ➶ Ketik .tolakjadian untuk tolak

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await sendReplyWithNav(sock, m, text, "couple");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }
};
