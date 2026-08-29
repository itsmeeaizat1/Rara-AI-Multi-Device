// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import instagramDownloader from "../../src/scraper/ig.js";
import { claraWrap, claraLine, mediaCaption, toSC, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "instagramdl",
  alias: ["instagramdl"],
  category: "download",
  description: "Download video/foto Instagram",
  usage: ".instagramdl <url>",
  example: ".instagramdl https://www.instagram.com/reel/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const IG_REGEX = /instagram\.com\/(p|reel|reels|stories|tv)\//i;

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply(novaNoInput("Instagram DL", "Kirim URL postingan, reel, atau story Instagram!", `${m.prefix}igdl https://www.instagram.com/reel/xxx`));
  }

  if (!IG_REGEX.test(url)) {
    return m.reply(novaGuide("Instagram DL", "URL-nya gak valid nih! Gunakan link Instagram (reel/post/story).", `${m.prefix}igdl https://www.instagram.com/reel/xxx`));
  }
  try {
    const result = await instagramDownloader(url);

    if (!result?.media?.length) {
      return m.reply(novaEmpty("Instagram DL", "Gagal mengambil media dari Instagram. Coba link lain ya!"));
    }

    const isStory = url.includes("/stories/");
    let caption = mediaCaption({
      platformIcon: "📸",
      platformName: isStory ? "Instagram Story" : "Instagram",
      title: result.title || "Instagram Media",
      author: result.username && result.username !== "-" ? result.username : null,
      likes: result.likes && result.likes !== "-" ? result.likes : null,
      comments: result.comment && result.comment !== "-" ? result.comment : null,
      uploadDate: result.taken_at && result.taken_at !== "-" ? result.taken_at : null,
      format: result.media.length > 1 ? `${result.media.length} Media` : "Media",
      method: "Nova AI",
    });

    for (const item of result.media) {
      if (item.type === "video" || item.type === "mp4") {
        await sock.sendMessage(
          m.chat,
          { video: { url: item.url }, caption },
          { quoted: m },
        );
      } else {
        await sock.sendMessage(
          m.chat,
          { image: { url: item.url }, caption },
          { quoted: m },
        );
      }
      caption = "";
    }
  } catch (err) {
    return m.reply(novaError("Instagram DL", `Gagal mengunduh media Instagram: ${err.message}`));
  }
}

export { pluginConfig as config, handler };