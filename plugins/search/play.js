// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// play.js — Search YouTube, kasih link download audio & video
import yts from "yt-search";
import { novaGuide, novaError } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "play",
  alias: ["play"],
  category: "search",
  description: "Putar musik/video YouTube",
  usage: ".play <query>",
  example: ".play komang",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

async function handler(m, { sock, text }) {
  const query = (text || m.text || "").trim();
  if (!query) {
    return m.reply(novaGuide("Play", "Kirim judul lagu yang mau diputar!", `${m.prefix}play komang`));
  }

  try {
    await m.react("🕒");

    const search = await yts(query);
    if (!search.videos || search.videos.length === 0) {
      await m.react("❌");
      return m.reply(novaError("Play", "Lagu tidak ditemukan, coba kata kunci lain ya!"));
    }

    const video = search.videos[0];

    const reply = [
      `*YouTube Play*`,
      ``,
      `*Judul:* ${video.title}`,
      `*Channel:* ${video.author.name}`,
      `*Durasi:* ${video.duration.timestamp}`,
      `*Views:* ${formatViews(video.views)}`,
      ``,
      `Audio: \`${m.prefix}ytmp3 ${video.url}\``,
      `Video: \`${m.prefix}ytmp4 ${video.url}\``,
    ].join("\n");

    await m.react("🐣");
    return m.reply(reply);
  } catch (err) {
    console.error("[Play]", err.message || err);
    await m.react("❌");
    return m.reply(novaError("Play", err.message || "Gagal memutar lagu, coba lagi nanti ya!"));
  }
}

export { pluginConfig as config, handler };
