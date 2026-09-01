// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import yts from "yt-search";

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
    return m.reply("Kirim judul lagu yang mau diputar.\nContoh: .play komang\nContoh: .play faded");
  }

  try {
    const search = await yts(query);
    if (!search.videos || search.videos.length === 0) {
      return m.reply("❌ Gagal: lagu tidak ditemukan, coba kata kunci lain");
    }

    const video = search.videos[0];
    const reply = [
      "✅ Berhasil!",
      `Title: ${video.title}`,
      `Channel: ${video.author.name}`,
      `Duration: ${video.duration.timestamp}`,
      `Views: ${formatViews(video.views)}`,
      `Link: ${video.url}`,
      `Audio: ${m.prefix}ytmp3 ${video.url}`,
      `Video: ${m.prefix}ytmp4 ${video.url}`,
    ].join("\n");

    return m.reply(reply);
  } catch (err) {
    console.error("[Play]", err.message || err);
    return m.reply(`❌ Gagal: ${err.message || "Coba lagi nanti"}`);
  }
}

export { pluginConfig as config, handler };
