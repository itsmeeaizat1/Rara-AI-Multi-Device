// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import { tiktokSearchVideo } from "../../src/scraper/tiktoksearch.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "playtiktok",
  alias: ["playtiktok"],
  category: "search",
  description: "Cari dan kirim satu video TikTok terbaik",
  usage: ".playtiktok <query>",
  example: ".playtiktok cewe tiktok",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function formatNumber(n) {
  const value = Number(n) || 0;
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toString();
}

async function handler(m, { sock }) {
  const query = m.args.join(" ")?.trim();

  if (!query) {
    return m.reply( `🎵 *ᴘʟᴀʏ ᴛɪᴋᴛᴏᴋ*\n\nContoh:\n\`${m.prefix}playtiktok cewe tiktok\``, "playtiktok");
  }

  m.react("🕒");

  try {
    const videos = await tiktokSearchVideo(query);
    if (!videos || videos.length === 0) {
      return m.reply(novaError("PlayTikTok", `Gak nemu video untuk: ${query} nih`));
    }

    const video = videos[0];
    let caption = "🎵 *ᴘʟᴀʏ ᴛɪᴋᴛᴏᴋ*\n\n";
    caption += `📌 *ᴊᴜᴅᴜʟ:* ${video.title || "-"}\n`;
    caption += `👤 *ᴀᴜᴛʜᴏʀ:* ${video.author?.nickname || "-"}\n`;
    caption += `👀 *ᴠɪᴇᴡꜱ:* ${formatNumber(video.stats?.plays)}\n`;
    caption += `❤️ *ʟɪᴋᴇꜱ:* ${formatNumber(video.stats?.likes)}\n`;
    caption += `💬 *ᴄᴏᴍᴍᴇɴᴛꜱ:* ${formatNumber(video.stats?.comments)}\n`;
    caption += `🔁 *ꜱʜᴀʀᴇꜱ:* ${formatNumber(video.stats?.shares)}\n`;
    caption += `🎧 *ᴍᴜꜱɪᴄ:* ${video.music || "-"}\n`;
    caption += `🔗 *ʟɪɴᴋ:* ${video.link}`;

    await sock.sendMedia(m.chat, video.link, caption, m, {
      type: "video",
      mimetype: "video/mp4",
      contextInfo: {
        forwardingScore: 0,
        isForwarded: false,
      },
    });

    m.react("🐣");
  } catch (error) {
    console.log(error);
    m.reply(claraWrap("playtiktok", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
