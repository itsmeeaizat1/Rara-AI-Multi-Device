// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "inventory",
  alias: ["inv", "rpginv", "tas"],
  category: "rpg",
  description: "Lihat inventaris RPG",
  usage: ".inventory"
};

async function handler(m, { sock }) {
    try {
      const player = ensurePlayer(m, m.pushName || "Player");
      if (!player) return await m.reply("❌ Gagal load player");
      const items = player.inventory || {};
      const itemList = Object.keys(items);
      let text = `❀°˖ 𝗜𝗻𝘃𝗲𝗻𝘁𝗮𝗿𝗶𝘀 ˖°❀

┊ ➶ 𝗘𝗺𝗽𝘁𝘆 — belum ada item

`;
      if (itemList.length > 0) {
        text = `❀°˖ 𝗜𝗻𝘃𝗲𝗻𝘁𝗮𝗿𝗶𝘀 ˖°❀

`;
        for (const [itemId, qty] of Object.entries(items)) {
          text += `┊ ➶ ${itemId}: ${qty}\n`;
        }
      }
      text += `\n┊ ➶ Total slot: ${itemList.length}/50\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await m.reply(text);
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
