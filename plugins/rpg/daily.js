// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
const pluginConfig = {

  name: "daily",
  alias: ["dailyreward", "hadiahharian", "claimharian"],
  category: "rpg",
  description: "Klaim hadiah harian RPG",
  usage: ".daily"
};

async function handler(m, { sock }) {
    try {
      ensurePlayer(m, m.pushName || "Player");
      const cd = checkCooldown(m, "lastDaily", 86400000);
      if (!cd.ready) {
        return await sendReplyWithNav(sock, m, `⏰ Hadiah harian sudah diklaim!\nTunggu ${cd.mins}m ${cd.secs}s lagi.`, "daily");
      }
      const player = ensurePlayer(m);
      const goldReward = 50 + (player.level * 10);
      const expReward = 20 + (player.level * 5);
      addGold(m, goldReward);
      const expResult = addExp(m, expReward);
      setCooldown(m, "lastDaily");
      let text = `❀°˖ 𝗛𝗮𝗱𝗶𝗮𝗵 𝗛𝗮𝗿𝗶𝗮𝗻 ˖°❀

┊ ➶ 𝗚𝗼𝗹𝗱: +${goldReward}
┊ ➶ 𝗘𝗫𝗽: +${expReward}
${expResult.leveledUp ? `\n🎉 𝗟𝗲𝘃𝗲𝗹 𝗨𝗽! Sekarang Level ${expResult.newLevel}!\n` : ""}
┊ ➶ Total Gold: ${(player.gold + goldReward).toLocaleString()}
┊ ➶ Total Exp: ${(player.exp + expReward).toLocaleString()}

❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
      return await sendReplyWithNav(sock, m, text, "daily");
    } catch (e) {
      return await m.reply(`❌ Error: ${e.message}`);
    }
  }

export { pluginConfig as config, handler };
