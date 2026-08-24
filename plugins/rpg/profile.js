// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "profile",
  alias: ["prof", "myprofile", "rpgprofile"],
  category: "rpg",
  description: "Lihat profil RPG kamu",
  usage: ".profile"
};

async function handler(m, { sock }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const text = getPlayerInfo(m);
      return await m.reply(text);
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
