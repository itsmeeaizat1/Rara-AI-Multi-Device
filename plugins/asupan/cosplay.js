// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch asupan) — helper ringkas, best-effort tak pernah ganggu kirim
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
  name: "cosplay",
  alias: ["cosplay", "cosplaypic"],
  category: "asupan",
  description: "Random cosplay photo",
  usage: ".cosplay",
  example: ".cosplay",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const res = await axios.get("https://api.waifu.pics/sfw/cuddle");
    if (!res.data?.url) throw new Error("Gagal mengambil gambar");
    const card = await dlCard("gambar", { url: res.data.url }, [["Engine", "waifu.pics"], ["Kategori", "sfw/cuddle"]]);
    await sock.sendMessage(from, { image: { url: res.data.url }, caption: card || "Cosplay ~" }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap("cosplay", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
