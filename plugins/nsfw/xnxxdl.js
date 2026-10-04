// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// xnxxdl.js — Download video NSFW
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch nsfw) — helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "xnxxdl",
  alias: ["xnxxdl", "xnxxdownload"],
  category: "nsfw",
  description: "Download video NSFW dari URL",
  usage: ".xnxxdl <url>",
  example: ".xnxxdl https://...",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕠");
    const url = m.args?.[0]?.trim();
    if (!url) return m.reply(raraWrap("xnxxdl", "Masukkan URL video!", "guide"));

    const res = await axios.get(`https://api.siputzx.my.id/api/d/xnxx?url=${encodeURIComponent(url)}`, { timeout: 30000 });
    const data = res.data?.data || res.data;
    if (!data?.url && !data?.files?.high) return m.reply(raraWrap("xnxxdl", "Gagal mengambil video!", "error"));

    const videoUrl = data.url || data.files?.high || data.files?.low;
    const card = await dlCard("video", { url: videoUrl }, [["Engine", "API siputzx.my.id"], ["Judul", String(data.title || "-").slice(0, 60)]]);
    await sock.sendMessage(m.key.remoteJid, { video: { url: videoUrl }, caption: card ? `${data.title || "NSFW Video"}\n\n${card}` : data.title || "NSFW Video" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("xnxxdl error:", err);
    await m.react("❌");
    return m.reply(raraWrap("xnxxdl", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
