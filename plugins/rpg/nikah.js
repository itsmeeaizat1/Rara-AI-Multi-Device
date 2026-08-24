// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "nikah",
  alias: ["lamar", "marry", "nghajian"],
  category: "rpg",
  description: "Lamar pasangan untuk menikah",
  usage: ".nikah"
};

async function handler(m, { sock }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const player = getPlayer(m);
      if (!player?.coupleId) {
        return await m.reply("❌ Kamu belum berpacaran!\nGunakan .couple @tag dulu.");
      }
      if (player?.married) {
        return await m.reply(`💍 Kamu sudah menikah dengan ${player.marriedName}!`);
      }
      global.rpgMarriage[m.sender] = { target: player.coupleId, time: Date.now() };
      let text = `❀°˖ 𝗟𝗮𝗺𝗮𝗿𝗮𝗻 ˖°❀

┊ ➶ ${m.pushName} melamar ${player.coupleName} 💍
┊ ➶ Ketik .terimanikah untuk terima
┊ ➶ Ketik .tolaknikah untuk tolak

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await m.reply(text);
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
