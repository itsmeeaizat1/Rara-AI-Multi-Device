// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// tiktokv3.js — TikTok Downloader v3 (nexray API fallback)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tiktokv3",
  alias: ["tiktokv3", "ttdl3", "tt3"],
  category: "download",
  description: "Download TikTok video v3 (nexray API)",
  usage: ".tiktokv3 <url TikTok>",
  example: ".tiktokv3 https://www.tiktok.com/@user/video/123",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.args.join(" ").trim();
    if (!url || !url.match(/tiktok\.com|vt\.tiktok/i)) {
      return m.reply(claraWrap("tiktokv3", `Kirim URL TikTok yang valid.\n\nContoh: ${m.prefix}tiktokv3 https://www.tiktok.com/@user/video/123`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://api.nexray.web.id/downloader/tiktok?url=${encodeURIComponent(url)}`, {
      timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.result && !data.data)) {
      await m.react("❌");
      return m.reply(claraWrap("tiktokv3", "Gagal download. URL mungkin invalid atau private.", "error"));
    }

    const r = data.result || data.data || data;
    await m.react("🐣");

    // TikTok biasanya ada video + audio + images
    if (r.video && !r.images) {
      // Video download
      const vidRes = await axios.get(r.video?.noWatermark || r.video?.url || r.video, {
        responseType: "arraybuffer", timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const buffer = Buffer.from(vidRes.data);

      let msg = `╭─「 ᴛɪᴋᴛᴏᴋ v3 」\n`;
      if (r.title || r.desc) _lines.push(`Judul: *${(r.title || r.desc).slice(0, 80)}*`);
      if (r.author || r.username) _lines.push(`Author: *@${r.author || r.username}*`);
      _lines.push(`Size: *${(buffer.length / 1024 / 1024).toFixed(1)} MB*`);
      _lines.push(`Engine: nexray API`);
      return await sock.sendMessage(m.chat, { video: buffer, caption: msg });
    } else if (r.images && Array.isArray(r.images) && r.images.length > 0) {
      // Slideshow/image gallery
      let msg = `╭─「 ᴛɪᴋᴛᴏᴋ v3 」\n`;
      if (r.title || r.desc) _lines.push(`Judul: *${(r.title || r.desc).slice(0, 80)}*`);
      if (r.author || r.username) _lines.push(`Author: *@${r.author || r.username}*`);
      _lines.push(`Type: Slideshow (${r.images.length} foto)`);
      _lines.push(`Engine: nexray API`);
      // Kirim caption dulu
      await m.reply(msg);

      // Kirim images
      for (const imgUrl of r.images.slice(0, 10)) {
        try {
          const imgRes = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } });
          await sock.sendMessage(m.chat, { image: Buffer.from(imgRes.data) });
        } catch {}
      }

      // Audio kalau ada
      if (r.music || r.audio) {
        try {
          const audioUrl = r.music?.url || r.audio?.url || r.music || r.audio;
          const audRes = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 30000, headers: { "User-Agent": "Mozilla/5.0" } });
          await sock.sendMessage(m.chat, { audio: Buffer.from(audRes.data), mimetype: "audio/mp4", ptt: false });
        } catch {}
      }
      return;
    } else {
      return m.reply(claraWrap("tiktokv3", "Format response tidak dikenali.", "error"));
    }
  } catch (err) {
    console.error("tiktokv3 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("tiktokv3", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
