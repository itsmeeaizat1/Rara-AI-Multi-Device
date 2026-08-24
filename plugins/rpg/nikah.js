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
        return await sendReplyWithNav(sock, m, "❌ Kamu belum berpacaran!\nGunakan .couple @tag dulu.", "nikah");
      }
      if (player?.married) {
        return await sendReplyWithNav(sock, m, `💍 Kamu sudah menikah dengan ${player.marriedName}!`, "nikah");
      }
      global.rpgMarriage[m.sender] = { target: player.coupleId, time: Date.now() };
      let text = `❀°˖ 𝗟𝗮𝗺𝗮𝗿𝗮𝗻 ˖°❀

┊ ➶ ${m.pushName} melamar ${player.coupleName} 💍
┊ ➶ Ketik .terimanikah untuk terima
┊ ➶ Ketik .tolaknikah untuk tolak

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await sendReplyWithNav(sock, m, text, "nikah");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
