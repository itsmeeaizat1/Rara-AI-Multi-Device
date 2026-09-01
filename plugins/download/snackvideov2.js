// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// snackvideov2.js — Download SnackVideo (pakai tikwm scrape, no API key)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "snackvideov2",
  alias: ["snackvideov2", "svdl2", "sv2"],
  category: "download",
  description: "Download video SnackVideo v2 (tikwm scrape)",
  usage: ".snackvideov2 <url>",
  example: ".snackvideov2 https://www.snackvideo.com/@user/video/123",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function snackDownload(url) {
  // Method 1: tikwm.com (support snackvideo)
  try {
    const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (data?.code === 0 && data?.data) {
      return {
        title: data.data.title,
        author: data.data.author?.nickname,
        video: data.data.play,
        music: data.data.music,
      };
    }
  } catch (e) { console.error('[snackvideov2.js] tikwm:', e.message); }

  // Method 2: Sanka API
  try {
    const { data } = await axios.get(`https://www.sankavollerei.web.id/download/snackvideo?apikey=planaai&url=${encodeURIComponent(url)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (data?.status && data?.result) {
      return {
        title: data.result.title,
        author: data.result.author,
        video: data.result.url || data.result.video,
        music: data.result.music,
      };
    }
  } catch (e) { console.error('[snackvideov2.js] Sanka:', e.message); }

  throw new Error("Gagal download SnackVideo");
}

async function handler(m, { sock }) {
  try {
    const url = m.args.join(" ").trim();
    if (!url || !url.match(/snackvideo\.com|sck\.io/i)) {
      return m.reply(claraWrap("snackvideov2", `Kirim URL SnackVideo yang valid.\n\nContoh: ${m.prefix}snackvideov2 https://www.snackvideo.com/@user/video/123`, "guide"));
    }

    await m.react("🕒");
    const result = await snackDownload(url);

    if (result.video) {
      const vidRes = await axios.get(result.video, {
        responseType: "arraybuffer", timeout: 60000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const buffer = Buffer.from(vidRes.data);

      let _lines = [];
      if (result.title) _lines.push(`Judul: *${result.title.slice(0, 80)}*`);
      if (result.author) _lines.push(`Author: *${result.author}*`);
      _lines.push(`Size: *${(buffer.length / 1024 / 1024).toFixed(1)} MB*`);
      _lines.push(`Engine: tikwm scrape`);

      await sock.sendMessage(m.chat, {
        video: buffer,
        caption: claraWrap("SnackVideo v2", _lines.join("\n")),
      }, { quoted: m });
    }

    if (result.music) {
      const audRes = await axios.get(result.music, {
        responseType: "arraybuffer", timeout: 30000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      await sock.sendMessage(m.chat, {
        audio: Buffer.from(audRes.data),
        mimetype: "audio/mp4", ptt: false,
      }, { quoted: m });
    }

    await m.react("🐣");
  } catch (err) {
    console.error("[snackvideov2]", err);
    await m.react("❌");
    m.reply(claraWrap("snackvideov2", "Gagal download. URL mungkin invalid atau private.", "error"));
  }
}

export { pluginConfig as config, handler };
