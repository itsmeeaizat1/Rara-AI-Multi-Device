// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import FormData from "form-data";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "shazam",
  alias: ["shazam", "whatmusic", "recognizesong", "songrecog"],
  category: "tools",
  description: "Recognize lagu dari audio/voice note (audd.io)",
  usage: "Reply/kirim audio dengan caption .shazam",
  example: ".shazam (reply audio)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    // Deteksi audio: reply atau langsung
    const quoted = m.quoted || m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isAudio = m.message?.audioMessage || (quoted && (quoted.audioMessage || quoted.pttMessage));

    if (!isAudio) {
      return m.reply(claraWrap("shazam", `Kirim/reply audio dengan caption ${m.prefix}shazam untuk recognize lagu.`, "guide"));
    }

    await m.react("🕒");

    // Download audio
    let audioBuffer;
    try {
      if (m.quoted) {
        audioBuffer = await m.quoted.download();
      } else {
        audioBuffer = await m.download();
      }
    } catch (e) {
      await m.react("❌");
      return m.reply(claraWrap("shazam", "Gagal download audio. Coba lagi.", "error"));
    }

    if (!audioBuffer) {
      await m.react("❌");
      return m.reply(claraWrap("shazam", "Audio tidak ditemukan.", "error"));
    }

    // Upload ke audd.io
    const token = process.env.AUDD_API_TOKEN || "";
    const form = new FormData();
    form.append("audio", audioBuffer, "audio.mp3");
    if (token) form.append("api_token", token);

    const { data } = await axios.post("https://api.audd.io/", form, {
      headers: form.getHeaders(), timeout: 30000,
    });

    if (!data || data.status !== "success" || !data.result) {
      await m.react("❌");
      return m.reply(claraWrap("shazam", "Lagu tidak dikenali. Coba audio yang lebih jelas.", "error"));
    }

    const r = data.result;
    await m.react("🐣");

    let msg = `╭─「 *sʜᴀᴢᴀᴍ* 」\n`;
    msg += `│ 🎵 Judul: *${r.title || "Tidak diketahui"}*\n`;
    msg += `│ 🎤 Artist: *${r.artist || "Tidak diketahui"}*\n`;
    if (r.album) msg += `│ 💿 Album: *${r.album}*\n`;
    if (r.release_date) msg += `│ 📅 Release: *${r.release_date}*\n`;
    if (r.spotify) {
      const sp = typeof r.spotify === "object" ? r.spotify : null;
      if (sp?.external_urls?.spotify) msg += `│ 🎧 Spotify: ${sp.external_urls.spotify}\n`;
      else if (typeof r.spotify === "string") msg += `│ 🎧 Spotify: ${r.spotify}\n`;
    }
    if (r.apple_music) {
      const am = typeof r.apple_music === "object" ? r.apple_music : null;
      if (am?.url) msg += `│ 🍎 Apple Music: ${am.url}\n`;
    }
    msg += `╰──────────`;
    return m.reply(msg);
  } catch (err) {
    console.error("shazam error:", err);
    await m.react("❌");
    return m.reply(claraWrap("shazam", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
