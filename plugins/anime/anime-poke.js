// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "animepoke",
  alias: ["animepoke", "poke", "colok"],
  category: "anime",
  description: "Kirim reaction GIF anime mencolek (poke)",
  usage: ".animepoke [@tag]",
  example: ".animepoke @user",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

    let url = "";
    try {
      const res = await axios.get("https://api.waifu.pics/sfw/poke", {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      url = res.data?.url || "";
    } catch {
      try {
        const res2 = await axios.get("https://nekos.best/api/v2/poke", {
          timeout: 10000,
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        url = res2.data?.results?.[0]?.url || "";
      } catch {}
    }

    if (!url) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return m.reply(raraWrap("animepoke", "Gagal mengambil anime GIF. Coba lagi nanti.", "error"));
    }

    const senderJid = m.sender || m.key.participant || from;
    const mentioned = m.quoted?.sender || (m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : null);

    const senderName = m.pushName || `@${senderJid.split("@")[0]}`;
    let caption = "";
    let mentions = [senderJid];

    if (mentioned && mentioned !== senderJid) {
      const targetName = `@${mentioned.split("@")[0]}`;
      mentions.push(mentioned);
      caption = `${senderName} mencolek-colek ${targetName} 💕`;
    } else {
      caption = `${senderName} mencolek layar 💕`;
    }

    try {
      const imgRes = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const buffer = Buffer.from(imgRes.data);
      const isGif = url.endsWith(".gif");
      const eng = url.includes("waifu.pics") ? "waifu.pics" : "nekos.best";
      const card = await dlCard(isGif ? "gif" : "gambar", { buffer }, [["Aksi", "Colek"], ["Target", mentioned && mentioned !== senderJid ? "@" + mentioned.split("@")[0] : senderName], ["Engine", eng]]);
      const fullCap = card ? `${caption}\n\n${card}` : caption;
      if (isGif) {
        await sock.sendMessage(from, { video: buffer, gifPlayback: true, caption: fullCap, mentions }, { quoted: m });
      } else {
        await sock.sendMessage(from, { image: buffer, caption: fullCap, mentions }, { quoted: m });
      }
    } catch {
      const eng = url.includes("waifu.pics") ? "waifu.pics" : "nekos.best";
      const card = await dlCard("gambar", { url }, [["Aksi", "Colek"], ["Target", mentioned && mentioned !== senderJid ? "@" + mentioned.split("@")[0] : senderName], ["Engine", eng]]);
      await sock.sendMessage(from, { image: { url }, caption: card ? `${caption}\n\n${card}` : caption, mentions }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    console.error("animepoke error:", err);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap("animepoke", err.message || "Terjadi kesalahan", "error"));
  }
}

export { pluginConfig as config, handler };
