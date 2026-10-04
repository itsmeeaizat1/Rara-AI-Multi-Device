// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// gifblowjob.js — GIF blowjob (NSFW)
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
  name: "gifblowjob",
  alias: ["gifblowjob", "blowjob"],
  category: "nsfw",
  description: "GIF blowjob (NSFW)",
  usage: ".gifblowjob",
  example: ".gifblowjob",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕠");
    const res = await axios.get("https://nekos.life/api/v2/img/blowjob", { timeout: 15000 });
    const url = res.data?.url || res.data?.image;
    if (!url) {
      await m.react("❌");
      return m.reply(raraWrap("gifblowjob", "Gagal mengambil gambar!", "error"));
    }
    const card = await dlCard("gambar", { url }, [["Engine", "nekos.life"], ["Kategori", "blowjob"]]);
    await sock.sendMessage(from, { image: { url }, caption: card || "gifblowjob ~" }, { quoted: m });
    await m.react("🐣");
  } catch (err) {
    console.error("gifblowjob error:", err);
    await m.react("❌");
    return m.reply(raraWrap("gifblowjob", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
