// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tiktokv4.js — TikTok Downloader V4 via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { claraWrap, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";

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
      await m.react("🐣");
      await sock.sendMedia(m.chat, video.url, result.title || "TikTok Video", m, {
        type: "video",
        contextInfo: { forwardingScore: 0, isForwarded: false },
      });
    } else {
      await m.react("❌");
      await m.reply(novaError("TikTok V4", "Gagal ambil video — coba link lain ya"));
    }
  } catch (error) {
    console.error("[tiktokv4.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("TikTok V4", "Ada error nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
