// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// igmp3.js — Download audio dari Instagram
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "igmp3",
  alias: ["igmp3", "instagrammp3", "igaudio"],
  category: "download",
  description: "Download audio dari Instagram",
  usage: ".igmp3 <url_instagram>",
  example: ".igmp3 https://instagram.com/reel/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const url = m.args?.[0]?.trim();
    if (!url || !url.includes("instagram")) return m.reply(claraWrap("igmp3", `Masukkan URL Instagram!\n\nContoh: .igmp3 https://instagram.com/reel/xxx`, "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/d/ig?url=${encodeURIComponent(url)}`);
    const data = res.data?.data || res.data;
    const audioUrl = data?.audio?.[0]?.url || data?.mp3 || data?.audio_url;
    if (!audioUrl) return m.reply(claraWrap("igmp3", "Gagal mengambil audio!", "error"));

    await sock.sendMessage(from, {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      caption: "Instagram Audio ~"
    }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("igmp3 error:", err);
    await m.react("❌");
    return m.reply(claraWrap("igmp3", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
