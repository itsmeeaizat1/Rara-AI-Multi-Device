// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "couple",
  alias: ["rpgcouple", "pacaran", "jadianrequest"],
  category: "rpg",
  description: "Ajak seseorang berpacaran di RPG",
  usage: ".couple @tag"
};

async function handler(m, { sock, args }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const player = getPlayer(m);
      if (player?.coupleId) {
        return await m.reply(`❤️ Kamu sudah berpacaran dengan ${player.coupleName}!`);
      }
      const target = m.mentionedJid?.[0] || (args[0]?.startsWith("62") ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null);
      if (!target) {
        return await m.reply("❌ Tag orang yang mau diajak pacaran!\nContoh: .couple @tag");
      }
      if (target === m.sender) {
        return await m.reply("❌ Tidak bisa berpacaran dengan diri sendiri!");
      }
      global.rpgMatch[m.sender] = { target, time: Date.now(), type: "couple" };
      const targetName = target.split("@")[0];
      let text = `❀°˖ 𝗔𝗷𝗮𝗸𝗮𝗻 𝗣𝗮𝗰𝗮𝗿𝗮𝗻 ˖°❀

┊ ➶ ${m.pushName} mengajak @${targetName} berpacaran ❤️
┊ ➶ Ketik .terimajadian untuk terima
┊ ➶ Ketik .tolakjadian untuk tolak

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await m.reply(text);
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
