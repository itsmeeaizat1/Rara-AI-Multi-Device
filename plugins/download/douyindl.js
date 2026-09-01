// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// douyindl — Download video/audio dari Douyin (TikTok China)
// Primary: IkyyXD /download/douyin → /download/all-in-one | Fallback: azbry API
import { ikyyDownload } from "../../src/scraper/ikyydl.js";
import axios from "axios";
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "douyindl",
  alias: ["douyindl"],
  category: "download",
  description: "Download video/audio dari Douyin (TikTok China)",
  usage: ".douyindl <url>",
  example: ".douyindl https://v.douyin.com/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

// Builtin fallback — azbry API
async function azbryFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`https://api.azbry.com/api/downloader/douyin?url=${encodeURIComponent(url)}`, { timeout: 30000 });
      if (res.data?.status && res.data?.result) return res.data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error("Gagal mengambil data dari server");
}

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(novaNoInput("Douyin DL", "Kirim URL Douyin (TikTok China) yang mau didownload!", `${m.prefix}douyindl https://v.douyin.com/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD (douyin endpoint → all-in-one fallback)
    const result = await ikyyDownload(text, "douyin", { apikey: "kyzz" });

    if (result?.medias?.length) {
      const video = result.medias.find(m => m.type === "video") || result.medias[0];
      const audio = result.medias.find(m => m.type === "audio");

      let caption = claraWrap("Douyin DL", [
        result.title || "Media",
        result.author ? `Author: ${result.author}` : "",
      ].filter(Boolean).join("\n"));

      await m.react("🐣");
      await sock.sendMedia(m.chat, video.url, caption, m, { type: "video" });
      return;
    }

    // Step 2: Fallback to azbry API
    console.log("[douyindl.js] IkyyXD failed, falling back to azbry...");
    try {
      const data = await azbryFetch(text);
      const r = data.result;

      let caption = `🎵 *${r.platform || "Douyin"}*\n\n${r.title || ""}`;

      if (r.video) {
        await m.react("🐣");
        await sock.sendMedia(m.chat, r.video, caption, m, { type: "video" });
      } else if (r.audio) {
        await m.react("🐣");
        await sock.sendMessage(m.chat, {
          audio: { url: r.audio },
          mimetype: "audio/mpeg",
        }, { quoted: m });
      } else {
        await m.react("❌");
        await m.reply(novaError("Douyin DL", "Gagal ambil media — coba link lain ya"));
      }
      return;
    } catch (e) {
      console.error("[douyindl.js] azbry fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(novaError("Douyin DL", "Gagal download — coba link lain ya"));
  } catch (error) {
    console.error("[douyindl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("Douyin DL", "Ada error nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
