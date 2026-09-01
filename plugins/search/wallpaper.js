// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "wallpaper",
  alias: ["wallpaper", "wp", "wallsearch"],
  category: "search",
  description: "Cari wallpaper HD",
  usage: ".wallpaper <query>",
  example: ".wallpaper cyberpunk city",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const query = m.args.join(" ").trim();
    if (!query) {
      return m.reply(claraWrap("wallpaper", `Mau cari wallpaper apa?\n\nContoh: ${m.prefix}wallpaper cyberpunk city`, "guide"));
    }

    await m.react("🕒");

    let imageUrl = null;
    // Coba nyxs API dulu
    try {
      const { data } = await axios.get(`https://api.nyxs.my.id/api/wallpaper?query=${encodeURIComponent(query)}`, {
        timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (data && data.url) imageUrl = data.url;
      else if (data && data.result && Array.isArray(data.result) && data.result.length > 0) imageUrl = data.result[0].url || data.result[0];
      else if (data && data.data && Array.isArray(data.data) && data.data.length > 0) imageUrl = data.data[0].url || data.data[0];
    } catch (e) {
      console.error("wallpaper nyxs:", e.message);
    }

    // Fallback: wallpaperflare scrape
    if (!imageUrl) {
      try {
        const { data: html } = await axios.get(`https://www.wallpaperflare.com/search?query=${encodeURIComponent(query)}`, {
          timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
        });
        const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)];
        const candidates = matches.map(m => m[1]).filter(u => u.includes("wallpaper") && !u.includes("favicon"));
        if (candidates.length > 0) {
          // Upgrade thumbnail to full size
          imageUrl = candidates[0].replace(/\/thumbs\/small\//, "/download/");
          if (!imageUrl.startsWith("http")) imageUrl = "https://www.wallpaperflare.com" + imageUrl;
        }
      } catch (e) {
        console.error("wallpaperflare scrape:", e.message);
      }
    }

    if (!imageUrl) {
      await m.react("❌");
      return m.reply(claraWrap("wallpaper", `Wallpaper "${query}" tidak ditemukan.`, "error"));
    }

    const imgRes = await axios.get(imageUrl, {
      responseType: "arraybuffer", timeout: 30000,
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.wallpaperflare.com/" },
    });
    const buffer = Buffer.from(imgRes.data);

    await m.react("🐣");
    const caption = `╭─「 ✦ ᴡᴀʟʟᴘᴀᴘᴇʀ ✦ 」\n│ Query: *${query}*\n│ Source: wallpaperflare\n╰────  •  ────`;
    return await sock.sendMessage(m.chat, { image: buffer, caption });
  } catch (err) {
    console.error("wallpaper error:", err);
    await m.react("❌");
    return m.reply(claraWrap("wallpaper", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
