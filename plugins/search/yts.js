// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import yts from "yt-search";
import { raraGuide } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "yts",
  alias: ["yts", "ytsearch"],
  category: "search",
  description: "Cari video YouTube",
  usage: ".yts <kata kunci>",
  example: ".yts lagu galau indonesia",
  cooldown: 10,
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
    return m.reply(raraGuide("YTS", "Cari video di YouTube", `${m.prefix}yts <kata kunci>`));
  }

  try {
    await m.react("🕒");
    const search = await yts(query);
    if (!search.videos || search.videos.length === 0) {
      await m.react("❌");
      return m.reply("❌ Pencarian tidak menemukan hasil, coba kata kunci lain");
    }

    const v = search.videos[0];
    await m.react("🐣");
    const reply = [
      "✅ Ditemukan!",
      `Title: ${v.title}`,
      `Channel: ${v.author.name}`,
      `Duration: ${v.timestamp}`,
      `Views: ${formatViews(v.views)}`,
      `Upload: ${v.ago}`,
      `URL: ${v.url}`,
      `Audio: ${m.prefix}ytmp3 ${v.url}`,
      `Video: ${m.prefix}ytmp4 ${v.url}`,
    ].join("\n");

    return m.reply(reply);
  } catch (error) {
    console.error("[YTS]", error.message || error);
    await m.react("❌");
    return m.reply(`❌ Gagal mencari video: ${error.message || "Coba lagi nanti"}`);
  }
}

export { pluginConfig as config, handler };
