// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "xnxx2",
  alias: ["xnxxdl", "xnxxdownload"],
  category: "nsfw",
  description: "Download video dari XVideos/XNXX by URL (NSFW)",
  usage: ".xnxx2 <url>",
  example: ".xnxx2 https://www.xnxx.com/video-xxxx",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: true,
  cooldown: 60,
  energi: 5,
  isEnabled: false,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url || (!url.includes("xnxx") && !url.includes("xvideos"))) {
    return sendReplyWithNav(sock, m, `🔞 *XNXX Downloader*\n\nKirim URL video XNXX/XVideos\n\nContoh: \`${m.prefix}xnxx2 https://www.xnxx.com/video-xxxx\``, "xnxx2");
  }

  await m.react("🕐");

  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/xnxxdl?url=${encodeURIComponent(url)}`,
      { timeout: 60000 }
    );

    if (!res.data?.status || !res.data?.data) {
      return sendReplyWithNav(sock, m, "❌ Gagal download. URL mungkin tidak valid.", "xnxx2");
    }

    const d = res.data.data;
    let text = `🔞 *XNXX DOWNLOAD*\n\n`;
    text += `*Title:* ${d.title || "-"}\n`;
    text += `*Duration:* ${d.duration || "-"}\n`;
    text += `*Quality:* ${d.quality || "-"}\n`;
    text += `\nSedang mengirim video...`;

    await sendReplyWithNav(sock, m, text, "xnxx2");

    if (d.url || d.downloadUrl) {
      const vidRes = await axios.get(d.url || d.downloadUrl, {
        responseType: "arraybuffer",
        timeout: 120000,
      });
      const buf = Buffer.from(vidRes.data);
      if (buf.length > 1000) {
        await sock.sendMessage(m.chat, { video: buf, caption: d.title || "" }, { quoted: m });
        await m.react("✅");
        return;
      }
    }

    return sendReplyWithNav(sock, m, "❌ File video gagal diunduh. Coba lagi nanti.", "xnxx2");
  } catch (err) {
    console.error("[XNXX2] Error:", err.message);
    await m.react("❌");
    return sendReplyWithNav(sock, m, te(m.prefix, m.command, m.pushName), "xnxx2");
  }
}

export { pluginConfig as config, handler };
