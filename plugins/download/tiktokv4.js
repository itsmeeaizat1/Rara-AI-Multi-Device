// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tiktokv4.js — TikTok Downloader V4 via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { claraWrap, novaError, novaGuide, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tiktokv4",
  alias: ["tiktokv4", "ttv4"],
  category: "download",
  description: "Download video TikTok (V4)",
  usage: ".ttv4 <url>",
  example: ".ttv4 https://vt.tiktok.com/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(novaGuide("TikTok V4", "Download video TikTok V4! Kasih linknya ya!", `${m.prefix}ttv4 https://vt.tiktok.com/xxx`));
  }
  if (!text.match(/tiktok\.com|vt\.tiktok/i)) {
    return m.reply(novaGuide("TikTok V4", "URL-nya gak valid nih! Pakai link TikTok ya.", `${m.prefix}ttv4 https://vt.tiktok.com/xxx`));
  }

  try {
    await m.react("🕒");
    const result = await ikyyDl("tiktokv4", text);

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      const caption = mediaCaption({
        platformIcon: "🎵", platformName: "TikTok V4",
        title: result.title || "TikTok Video",
        author: result.author || null,
        duration: result.duration || null,
        description: result.description ? String(result.description).slice(0, 120) : null,
        format: "Video (No Watermark)", method: "IkyyXD",
      });
      await m.react("🐣");
    await m.reply(novaBerhasil("tiktokv4"));
      await sock.sendMessage(m.chat, {
        video: { url: video.url }, caption,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(novaGagal("TikTok V4"));
    }
  } catch (error) {
    console.error("[tiktokv4.js]:", error.message);
    await m.react("❌");
    return m.reply(novaGangguan("TikTok V4"));
  }
}

export { pluginConfig as config, handler };
