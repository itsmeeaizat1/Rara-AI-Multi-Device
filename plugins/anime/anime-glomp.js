// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaInfoLine } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "animeglomp",
  alias: ["animeglomp", "glomp", "terjang"],
  category: "anime",
  description: "Kirim reaction GIF anime menerjang memeluk (glomp)",
  usage: ".animeglomp [@tag]",
  example: ".animeglomp @user",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

    let url = "";
    try {
      const res = await axios.get("https://api.waifu.pics/sfw/glomp", {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      url = res.data?.url || "";
    } catch {
      try {
        const res2 = await axios.get("https://nekos.best/api/v2/hug", {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        url = res2.data?.results?.[0]?.url || "";
      } catch {}
    }

    if (!url) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return m.reply(raraWrap("animeglomp", "Gagal mengambil anime GIF. Coba lagi nanti.", "error"));
    }

    const senderJid = m.sender || m.key.participant || from;
    const mentioned = m.quoted?.sender || (m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null);

    const senderName = m.pushName || `@${senderJid.split("@")[0]}`;
    let caption = "";
    let mentions = [senderJid];

    if (mentioned && mentioned !== senderJid) {
      const targetName = `@${mentioned.split("@")[0]}`;
      mentions.push(mentioned);
      caption = `${senderName} menerjang memeluk erat ${targetName} 💕`;
    } else {
      caption = `${senderName} menerjang peluk! 💕`;
    }

    try {
      const imgRes = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const buffer = Buffer.from(imgRes.data);
      const isGif = url.endsWith(".gif");
      if (isGif) {
        await sock.sendMessage(from, { video: buffer, gifPlayback: true, caption: caption + "\n" + mediaInfoLine({ kind: "GIF", bytes: buffer.length }), mentions }, { quoted: m });
      } else {
        await sock.sendMessage(from, { image: buffer, caption: caption + "\n" + mediaInfoLine({ kind: "Gambar", bytes: buffer.length }), mentions }, { quoted: m });
      }
    } catch {
      await sock.sendMessage(from, { image: { url }, caption: caption + "\n" + mediaInfoLine({ kind: url.endsWith(".gif") ? "GIF" : "Gambar" }), mentions }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    console.error("animeglomp error:", err);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap("animeglomp", err.message || "Terjadi kesalahan", "error"));
  }
}

export { pluginConfig as config, handler };
