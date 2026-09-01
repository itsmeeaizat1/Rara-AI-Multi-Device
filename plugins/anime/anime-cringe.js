// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "animecringe",
  alias: ["animecringe", "cringe", "jijik"],
  category: "anime",
  description: "Kirim reaction GIF anime merasa jijik (cringe)",
  usage: ".animecringe [@tag]",
  example: ".animecringe @user",
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
      const res = await axios.get("https://api.waifu.pics/sfw/cringe", {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      url = res.data?.url || "";
    } catch {
      try {
        const res2 = await axios.get("https://nekos.best/api/v2/facepalm", {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        url = res2.data?.results?.[0]?.url || "";
      } catch {}
    }

    if (!url) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return m.reply(claraWrap("animecringe", "Gagal mengambil anime GIF. Coba lagi nanti.", "error"));
    }

    const senderJid = m.sender || m.key.participant || from;
    const mentioned = m.quoted?.sender || (m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null);

    const senderName = m.pushName || `@${senderJid.split("@")[0]}`;
    let caption = "";
    let mentions = [senderJid];

    if (mentioned && mentioned !== senderJid) {
      const targetName = `@${mentioned.split("@")[0]}`;
      mentions.push(mentioned);
      caption = `╭─「 ✦ ᴀɴɪᴍᴇ ᴄʀɪɴɢᴇ ✦ 」\n│ ${senderName} merasa cringe melihat ${targetName} 💕\n╰────  •  ────`;
    } else {
      caption = `╭─「 ✦ ᴀɴɪᴍᴇ ᴄʀɪɴɢᴇ ✦ 」\n│ ${senderName} merasa sangat cringe 💕\n╰────  •  ────`;
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
        await sock.sendMessage(from, { video: buffer, gifPlayback: true, caption, mentions }, { quoted: m });
      } else {
        await sock.sendMessage(from, { image: buffer, caption, mentions }, { quoted: m });
      }
    } catch {
      await sock.sendMessage(from, { image: { url }, caption, mentions }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    console.error("animecringe error:", err);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(claraWrap("animecringe", err.message || "Terjadi kesalahan", "error"));
  }
}

export { pluginConfig as config, handler };
