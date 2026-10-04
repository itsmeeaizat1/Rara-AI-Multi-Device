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

const STYLES = ["avataaars", "bottts", "fun-emoji", "lorelei", "micah", "notionists", "open-peeps", "personas", "pixel-art", "adventurer"];

const pluginConfig = {
  name: "profilepic",
  alias: ["profilepic", "ppgen"],
  category: "asupan",
  description: "Generate profile picture dari nama",
  usage: ".profilepic <nama>",
  example: ".profilepic Aizat",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    const text = m.args?.join(" ").trim() || m.pushName || "Rara";
    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const url = `https://api.dicebear.com/7.x/${style}/png?seed=${encodeURIComponent(text)}&size=512`;
    const card = await dlCard("gambar", { url }, [["Engine", "DiceBear API"], ["Style", String(style)], ["Seed", String(text).slice(0, 40)]]);
    await sock.sendMessage(from, { image: { url }, caption: card ? `Profile Pic: ${text}\nStyle: ${style}\n\n${card}` : `Profile Pic: ${text}\nStyle: ${style}` }, { quoted: m });
    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap("profilepic", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
