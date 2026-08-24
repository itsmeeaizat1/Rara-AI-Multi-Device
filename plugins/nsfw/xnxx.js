// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "xnxx",
  alias: ["xnxxsearch", "xnxxs"],
  category: "nsfw",
  description: "Search video dari XVideos/XNXX (NSFW)",
  usage: ".xnxx <query>",
  example: ".xnxx amateur",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: true,
  cooldown: 30,
  energi: 3,
  isEnabled: false,
};

async function handler(m, { sock }) {
  const query = m.text?.trim();

  if (!query) {
    return m.reply( `🔞 *XNXX Search*\n\nMasukkan query pencarian\n\nContoh: \`${m.prefix}xnxx amateur\``, "xnxx");
  }

  await m.react("🐣");

  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/xnxxsearch?query=${encodeURIComponent(query)}`,
      { timeout: 30000 }
    );

    if (!res.data?.status || !res.data?.data || res.data.data.length === 0) {
      return m.reply( `❌ Tidak ditemukan hasil untuk: ${query}`, "xnxx");
    }

    const results = res.data.data.slice(0, 5);
    let text = `🔞 *XNXX SEARCH*\n\nQuery: ${query}\n\n`;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      text += `${i + 1}. ${r.title}\n`;
      text += `   Duration: ${r.duration || "-"}\n`;
      text += `   Quality: ${r.quality || "-"}\n`;
      text += `   Link: ${r.url || r.link || "-"}\n\n`;
    }
    text += `_NSFW content - 18+ only_`;
    await m.reply( text, "xnxx");
    await m.react("✅");
  } catch (err) {
    console.error("[XNXX] Error:", err.message);
    await m.react("❌");
    return m.reply( te(m.prefix, m.command, m.pushName), "xnxx");
  }
}

export { pluginConfig as config, handler };
