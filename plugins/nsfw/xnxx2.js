// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
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
  name: "xnxx2",
  alias: ["xnxx2"],
  category: "nsfw",
  description: "Download video dari XVideos/XNXX by URL (NSFW)",
  usage: ".xnxx2 <url>",
  example: ".xnxx2 https://www.xnxx.com/video-xxxx",
  isOwner: false, isPremium: true, isGroup: false, isPrivate: true,
  cooldown: 60, energi: 5, isEnabled: false,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url || (!url.includes("xnxx") && !url.includes("xvideos"))) {
    return m.reply(raraWrap("XNXX Download", `Kirim URL video XNXX/XVideos.\n\nContoh: ${m.prefix}xnxx2 https://www.xnxx.com/video-xxxx`));
  }
  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/xnxxdl?url=${encodeURIComponent(url)}`,
      { timeout: 60000 }
    );
    if (!res.data?.status || !res.data?.data) {
      return m.reply(raraWrap("XNXX Download", `Gagal download. URL mungkin tidak valid.`));
    }
    const d = res.data.data;
    const info = `Title: ${d.title || "-"}\nDurasi: ${d.duration || "-"}\nQuality: ${d.quality || "-"}\n\nSedang mengirim video...`;
    await m.reply(raraWrap("XNXX Download", info));

    if (d.url || d.downloadUrl) {
      const vidRes = await axios.get(d.url || d.downloadUrl, {
        responseType: "arraybuffer",
        timeout: 120000,
      });
      const buf = Buffer.from(vidRes.data);
      if (buf.length > 1000) {
        const card = await dlCard("video", { buffer: buf }, [["Engine", "API siputzx.my.id"], ["Judul", String(d.title || "-").slice(0, 60)], ["Durasi", String(d.duration || "-")], ["Kualitas", String(d.quality || "-")]]);
        await sock.sendMessage(m.chat, { video: buf, caption: card ? `${d.title || ""}\n\n${card}` : d.title || "" }, { quoted: m });
        return;
      }
    }
    return m.reply(raraWrap("XNXX Download", `File gagal diunduh. Coba lagi nanti.`));
  } catch (err) {
    console.error("[XNXX2] Error:", err.message);
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
