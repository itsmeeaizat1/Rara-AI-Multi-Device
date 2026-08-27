// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "xnxx2",
  alias: ["xnxx2"],
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
    return m.reply( `🔞 *xɴxx ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\nKirim URL video XNXX/XVideos\n\n💡 *Contoh:* \`${m.prefix}xnxx2 https://www.xnxx.com/video-xxxx\``, "xnxx2");
  }

  await m.react("🕒");

  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/xnxxdl?url=${encodeURIComponent(url)}`,
      { timeout: 60000 }
    );

    if (!res.data?.status || !res.data?.data) {
      return m.reply( "❌ Gagal download. URL mungkin tidak valid.", "xnxx2");
    }

    const d = res.data.data;
    let text = `🔞 *xɴxx ᴅᴏᴡɴʟᴏᴀᴅ*\n\n`;
    text += `*ᴛɪᴛʟᴇ:* ${d.title || "-"}\n`;
    text += `*ᴅᴜʀᴀᴛɪᴏɴ:* ${d.duration || "-"}\n`;
    text += `*qᴜᴀʟɪᴛʏ:* ${d.quality || "-"}\n`;
    text += `\nSedang mengirim video...`;

    await m.reply( text, "xnxx2");

    if (d.url || d.downloadUrl) {
      const vidRes = await axios.get(d.url || d.downloadUrl, {
        responseType: "arraybuffer",
        timeout: 120000,
      });
      const buf = Buffer.from(vidRes.data);
      if (buf.length > 1000) {
        await sock.sendMessage(m.chat, { video: buf, caption: d.title || "" }, { quoted: m });
        await m.react("🐣");
        return;
      }
    }

    return m.reply( "❌ File video gagal diunduh. Coba lagi nanti.", "xnxx2");
  } catch (err) {
    console.error("[XNXX2] Error:", err.message);
    await m.react("❌");
    return m.reply( te(m.prefix, m.command, m.pushName), "xnxx2");
  }
}

export { pluginConfig as config, handler };
