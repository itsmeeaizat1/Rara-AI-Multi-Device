// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ytstalk2.js — YouTube Stalker v2 (nexray API)
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch stalker) — helper ringkas, best-effort tak pernah ganggu kirim
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


const pluginConfig = {
  name: "ytstalk2",
  alias: ["ytstalk2", "ytstalker2", "ydstalk2"],
  category: "stalker",
  description: "Stalk YouTube channel v2 (nexray API)",
  usage: ".ytstalk2 <username channel>",
  example: ".ytstalk2 MrBeast",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const username = m.args.join(" ").trim().replace(/@/g, "");
    if (!username) {
      return m.reply(raraWrap("ytstalk2", `Stalk YouTube channel siapa?\n\nContoh: ${m.prefix}ytstalk2 MrBeast`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://api.nexray.web.id/stalker/youtube?username=${encodeURIComponent(username)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.result && !data.data)) {
      await m.react("❌");
      return m.reply(raraWrap("ytstalk2", `Channel "${username}" tidak ditemukan.`, "error"));
    }

    const r = data.result || data.data || data;
    await m.react("🐣");

    let msg = "";
    msg += `Nama: *${r.title || r.name || username}*\n`;
    if (r.description) msg += `Desc: ${r.description.slice(0, 100)}${r.description.length > 100 ? "..." : ""}\n`;
    if (r.subscribers || r.subscriberCount) msg += `Subscribers: *${r.subscribers || r.subscriberCount}*\n`;
    if (r.video_count || r.videoCount) msg += `Total Video: *${r.video_count || r.videoCount}*\n`;
    if (r.total_views || r.totalViews) msg += `Total Views: *${r.total_views || r.totalViews}*\n`;
    if (r.url || r.link) msg += `URL: ${r.url || r.link}\n`;
    if (r.avatar || r.thumbnail) msg += `Avatar: ${r.avatar || r.thumbnail}\n`;
    
    // Kirim dengan thumbnail jika ada
    const avatarUrl = r.avatar || r.thumbnail || r.banner;
    if (avatarUrl && avatarUrl.startsWith("http")) {
      try {
        const imgRes = await axios.get(avatarUrl, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
        const imgBuf = Buffer.from(imgRes.data);
        const card = await dlCard("gambar", { buffer: imgBuf }, [["Engine", "API nexray.web.id"], ["Target", "@" + username], ["Judul", String(r.title || r.name || username).slice(0, 40)]]);
        return await sock.sendMessage(m.chat, { image: imgBuf, caption: card ? `${msg}\n\n${card}` : msg });
      } catch {}
    }
    return m.reply(msg);
  } catch (err) {
    console.error("ytstalk2 error:", err);
    await m.react("❌");
    return m.reply(raraWrap("ytstalk2", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
