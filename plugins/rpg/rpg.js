// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "rpg",
  alias: ["rpgmenu", "rpgstart"],
  category: "rpg",
  description: "Menu RPG Nova AI",
  usage: ".rpg"
};

async function handler(m, { sock }) {
    try {
      const player = getPlayer(m);
      const text = `❀°˖ 𝗥𝗣𝗚 𝗡𝗼𝘃𝗮 𝗔𝗜 ˖°❀

┊ ➶ 𝗦𝘁𝗮𝘁𝘂𝘀: ${player ? `Level ${player.level}` : "Belum terdaftar"}

❀°˖ 𝗖𝗼𝗿𝗲 ˖°❀
┊ ➶ .profile — Lihat profil RPG
┊ ➶ .daily — Klaim hadiah harian
┊ ➶ .work — Kerja untuk gold
┊ ➶ .inventory — Lihat inventaris
┊ ➶ .leaderboard — Ranking player

❀°˖ 𝗖𝗶𝗻𝘁𝗮 ˖°❀
┊ ➶ .couple @tag — Ajak pacaran
┊ ➶ .terimajadian — Terima ajakan
┊ ➶ .tolakjadian — Tolak ajakan
┊ ➶ .nikah — Lamar pasangan
┊ ➶ .terimanikah — Terima lamaran
┊ ➶ .tolaknikah — Tolak lamaran
┊ ➶ .divorce — Putus hubungan
┊ ➶ .couplelb — Ranking couple

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await sendReplyWithNav(sock, m, text, "rpg");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
