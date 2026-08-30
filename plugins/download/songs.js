// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// songs.js — Cari & play lagu (iTunes)
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "songs",
  alias: ["songs", "play", "playmusic"],
  category: "download",
  description: "Cari dan preview lagu dari iTunes",
  usage: ".songs <judul_lagu>",
  example: ".songs Bohemian Rhapsody",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    await m.react("🕒");
    const query = m.args?.join(" ").trim();
    if (!query) return m.reply(claraWrap("songs", `Masukkan judul lagu!\n\nContoh: .songs Bohemian Rhapsody`, "guide"));

    const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=5&media=music`);
    const results = res.data?.results || [];
    if (!results.length) return m.reply(claraWrap("songs", "Lagu tidak ditemukan!", "error"));

    // Send first result preview
    const track = results[0];
    if (track.previewUrl) {
      await sock.sendMessage(from, {
        audio: { url: track.previewUrl },
        mimetype: "audio/mpeg",
        caption: `🎵 ${track.trackName} - ${track.artistName}`
      }, { quoted: m });
    }

    let msg = `╭──「 *SONGS* 」\n`;
    msg += `│ Hasil: ${query}\n`;
    msg += `│\n`;
    results.forEach((t, i) => {
      msg += `│ ${i + 1}. ${t.trackName} - ${t.artistName}\n`;
      msg += `│    Album: ${t.collectionName || "Unknown"}\n`;
    });
    msg += `╰──────────`;
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("songs error:", err);
    await m.react("❌");
    return m.reply(claraWrap("songs", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
