// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// snackvideov2.js — SnackVideo Downloader v2 (siputzx API)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "snackvideov2",
  alias: ["snackvideov2", "svdl2", "sv2"],
  category: "download",
  description: "Download SnackVideo v2 (siputzx API)",
  usage: ".snackvideov2 <url SnackVideo>",
  example: ".snackvideov2 https://www.snackvideo.com/@user/video/123",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const url = m.args.join(" ").trim();
    if (!url || !url.match(/snackvideo\.com/i)) {
      return m.reply(claraWrap("snackvideov2", `Kirim URL SnackVideo yang valid.\n\nContoh: ${m.prefix}snackvideov2 https://www.snackvideo.com/@user/video/123`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://api.siputzx.my.id/api/d/snackvideo?url=${encodeURIComponent(url)}`, {
      timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.data && !data.result)) {
      await m.react("❌");
      return m.reply(claraWrap("snackvideov2", "Gagal download. URL mungkin invalid.", "error"));
    }

    const r = data.data || data.result || data;
    await m.react("🐣");

    // Video URL
    const videoUrl = r.video || r.videoUrl || r.url || r.download;
    if (!videoUrl) {
      await m.react("❌");
      return m.reply(claraWrap("snackvideov2", "Video URL tidak ditemukan.", "error"));
    }

    const vidRes = await axios.get(videoUrl, {
      responseType: "arraybuffer", timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(vidRes.data);

    let msg = `╭─「 sɴᴀᴄᴋ ᴠɪᴅᴇᴏ v2 」\n`;
    if (r.title || r.caption) _lines.push(`Judul: *${(r.title || r.caption).slice(0, 80)}*`);
    if (r.author || r.username) _lines.push(`Author: *@${r.author || r.username}*`);
    if (r.likes) _lines.push(`Likes: *${r.likes}*`);
    _lines.push(`Size: *${(buffer.length / 1024 / 1024).toFixed(1)} MB*`);
    _lines.push(`Engine: siputzx API`);
    return await sock.sendMessage(m.chat, { video: buffer, caption: msg });
  } catch (err) {
    console.error("snackvideov2 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("snackvideov2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
