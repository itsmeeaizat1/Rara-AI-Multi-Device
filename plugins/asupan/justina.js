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
  name: "justina",
  alias: ["justina", "justinapic"],
  category: "asupan",
  description: "Random Justina photo",
  usage: ".justina",
  example: ".justina",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const seed = Math.floor(Math.random() * 10000);
    const query = "Justina"; // subjek foto (dulu variabel ini tidak pernah dideklarasikan -> ReferenceError)
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(query + " aesthetic photo")}?seed=${seed}&width=512&height=768&nologo=true`;
    const card = await dlCard("gambar", { url }, [["Engine", "Pollinations AI"], ["Prompt", (query + " aesthetic photo").slice(0, 60)], ["Seed", String(seed)]]);
    await sock.sendMessage(from, { image: { url }, caption: card || "Justina ~" }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap("justina", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
