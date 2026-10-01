// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// oneyoutube.js — Onepunya API: YOUTUBE_SEARCH + YTMUSIC_PLAY.
// .oneyts <query>      — cari video YouTube (list 10 hasil)
// .oneytmusic <judul>  — cari lagu di YT Music → kirim MP3-nya langsung
// Sumber: onepunya.qzz.io (key .setkey onepunya) — numpang engine Onepunya,
// beda dari .yts (NeoXR) dan downloader YouTube yang udah ada.
import axios from "axios";
import { getApiKey } from "../../src/lib/nova-api-keys.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { youtubeSearch, ytmusicPlay } from "../../src/lib/nova-onepunya.js";

const pluginConfig = {
  name: "oneyoutube",
  alias: ["oneyoutube", "oneyts", "oneytmusic", "oneplay"],
  category: "search",
  description: "Cari YouTube & YT Music via Onepunya API (musik langsung dikirim MP3)",
  usage: ".oneyts <query> · .oneytmusic <judul lagu>",
  example: ".oneytmusic monolog pamungkas",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const cmd = (m.command || "").toLowerCase();
  const query = (m.args || []).join(" ").trim();
  if (!query) {
    return m.reply(novaWrap("Onepunya YouTube", `Masukkan kata kunci!\n\nContoh: .${cmd === "oneytmusic" || cmd === "oneplay" ? "oneytmusic monolog pamungkas" : "oneyts lagu hits"}`));
  }
  const apiKey = getApiKey("onepunya");

  // ── YT Music: cari lagu → langsung kirim MP3 via audioUrl ──
  if (cmd === "oneytmusic" || cmd === "oneplay") {
    try {
      const song = await ytmusicPlay(apiKey, query);
      if (!song?.audioUrl) {
        return m.reply(novaWrap("Onepunya YT Music", `Lagu "${query}" gak ketemu link audionya.`));
      }
      await m.reply(novaWrap("Onepunya YT Music", `🎵 ${song.title || query}\n👤 ${song.author || "-"} · ⏱ ${song.duration || "-"}\n\n⬇️ Lagu lagi dikirim...`));
      try {
        const res = await axios.get(song.audioUrl, { responseType: "arraybuffer", timeout: 120_000 });
        await sock.sendMessage(m.chat, {
          audio: Buffer.from(res.data),
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${String(song.title || "song").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80)}.mp3`,
        }, { quoted: m });
      } catch {
        await sock.sendMessage(m.chat, { document: { url: song.audioUrl }, fileName: `${String(song.title || "song").slice(0, 80)}.mp3`, mimetype: "audio/mpeg" }, { quoted: m });
      }
      return;
    } catch (e) {
      return m.reply(novaWrap("Onepunya YT Music", `Gagal: ${String(e.message || e).slice(0, 200)}`));
    }
  }

  // ── YouTube Search: list hasil ──
  try {
    const results = await youtubeSearch(apiKey, query);
    const list = (Array.isArray(results) ? results : []).slice(0, 10);
    if (!list.length) {
      return m.reply(novaWrap("Onepunya YouTube", `Gak ada hasil untuk: ${query}`));
    }
    let text = `▶️ Onepunya YouTube Search\nKueri: ${query}\n\n`;
    list.forEach((v, i) => {
      text += `${i + 1}. ${String(v.title || "").slice(0, 70)}\n   ${v.author || "-"} · ⏱ ${v.duration || "-"} · 👁 ${Number(v.views || 0).toLocaleString("id-ID")}\n   ${v.url || ""}\n`;
    });
    text += `\n💡 Download pakai: .onedl <link> [720p|mp3]`;
    return m.reply(novaWrap("Onepunya YouTube", text));
  } catch (e) {
    return m.reply(novaWrap("Onepunya YouTube", `Gagal: ${String(e.message || e).slice(0, 200)}`));
  }
}

export { pluginConfig as config, handler };
