// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// igmp3.js — Download audio dari Instagram (pakai scraper ig.js lokal)
import { PinDL } from "../../src/scraper/pindl.js";
import { igDownload } from "../../src/scraper/ig.js";
import { novaError, novaGuide, mediaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "igmp3",
  alias: ["igmp3"],
  category: "download",
  description: "Download audio dari Instagram",
  usage: ".igmp3 <url_instagram>",
  example: ".igmp3 https://www.instagram.com/reel/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.text?.trim();
    if (!url || !url.includes("instagram.com")) {
      return m.reply(novaGuide("IG MP3", "Kirim URL Instagram yang valid!", ".igmp3 https://www.instagram.com/reel/xxx"));
    }

    await m.react("🕒");

    // Pakai scraper IG lokal
    let result;
    try {
      result = await igDownload(url);
    } catch (e) {
      console.error("[igmp3.js] ig scraper:", e.message);
      await m.react("❌");
      return m.reply(novaError("IG MP3", "Gagal mengunduh dari Instagram. Pastikan URL valid!"));
    }

    if (!result || (!result.url && !result.download)) {
      await m.react("❌");
      return m.reply(novaError("IG MP3", "Media tidak ditemukan atau private!"));
    }

    const mediaUrl = result.url || result.download;
    const title = result.title || "Instagram Audio";

    // Download sebagai audio
    const axios = (await import("axios")).default;
    const audioRes = await axios.get(mediaUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(audioRes.data);

    const caption = mediaCaption({
      platformIcon: "📸",
      platformName: "Instagram",
      title,
      format: "🎵 Audio",
      method: "Scraper Lokal",
    });

    await sock.sendMessage(m.chat, {
      audio: buffer,
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${title}.mp3`,
    }, { quoted: m });
    await m.reply(caption);
    await m.react("🐣");
  } catch (err) {
    console.error("[IG MP3]", err);
    await m.react("❌");
    m.reply(novaError("IG MP3", "Gagal download audio Instagram. Coba lagi nanti!"));
  }
}

export { pluginConfig as config, handler };
