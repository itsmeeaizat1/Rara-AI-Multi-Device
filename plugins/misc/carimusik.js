// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// carimusik.js — Cari musik (audio recognition)
import te from "../../src/lib/nova-error.js";
import { claraWrap , novaBox} from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "carimusik",
  alias: ["carimusik", "whatmusic", "shazam"],
  category: "misc",
  description: "Cari judul lagu dari audio (reply audio)",
  usage: ".carimusik (reply audio/voice note)",
  example: ".carimusik",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 3, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const quoted = m.quoted;
    if (!quoted || (quoted.mtype !== "audioMessage" && quoted.mtype !== "videoMessage")) {
      return m.reply(claraWrap("carimusik", "Reply audio/voice note yang ingin dicari!\n\nContoh: reply audio lalu .carimusik", "guide"));
    }
    await m.react("🕒");
    // Download quoted audio then upload to AUDD API
    const buffer = await quoted.download();
    if (!buffer) return m.reply(claraWrap("carimusik", "Gagal mengunduh audio!", "error"));

    const formData = new FormData();
    formData.append("file", new Blob([buffer]), "audio.mp3");
    formData.append("return", "apple_music,spotify");

    const res = await fetch("https://api.audd.io/?api_token=test", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.status !== "success" || !data.result) {
      await m.react("❌");
      return m.reply(claraWrap("carimusik", "Lagu tidak dikenali. Coba audio yang lebih jelas.", "error"));
    }

    const r = data.result;
    let _lines = [];
      _lines.push(`🎵 Judul: ${r.title || "Unknown"}`);
      _lines.push(`🎤 Artis: ${r.artist || "Unknown"}`);
      _lines.push(`💿 Album: ${r.album || "Unknown"}`);
    let msg = novaBox("MUSIC FOUND", _lines);
    if (r.release_date) _lines.push(`📅 Rilis: ${r.release_date}`);
    if (r.apple_music?.url) _lines.push(`🍎 Apple Music: ${r.apple_music.url}`);
    if (r.spotify?.external_urls?.spotify) _lines.push(`🟢 Spotify: ${r.spotify.external_urls.spotify}`);
    await m.react("🐣");
    return m.reply(msg);
  } catch (err) {
    console.error("carimusik error:", err);
    await m.react("❌");
    return m.reply(claraWrap("carimusik", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
