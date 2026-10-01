// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "xnxx",
  alias: ["xnxx"],
  category: "nsfw",
  description: "Cari video XNXX by keyword (NSFW 18+)",
  usage: ".xnxx <query>",
  example: ".xnxx amateur",
  isOwner: false, isPremium: true, isGroup: false, isPrivate: true,
  cooldown: 30, energi: 5, isEnabled: false,
};

async function handler(m, { sock }) {
  const query = m.args.join(" ").trim();
  if (!query) {
    return m.reply(raraWrap("XNXX Search", `Masukkan query pencarian.\n\nContoh: ${m.prefix}xnxx amateur`));
  }
  try {
    const res = await axios.get(
      `https://api.siputzx.my.id/api/s/xnxxsearch?query=${encodeURIComponent(query)}`,
      { timeout: 30000 }
    );
    if (!res.data?.status || !res.data?.data || res.data.data.length === 0) {
      return m.reply(raraWrap("XNXX Search", `Tidak ditemukan untuk: ${query}\nCoba keyword lain.`));
    }
    const results = res.data.data.slice(0, 5);
    let lines = `Hasil untuk: ${query}\n`;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      lines += `${i + 1}. ${r.title}\n`;
      lines += `Durasi: ${r.duration || "-"} | Quality: ${r.quality || "-"}\n`;
      lines += `Link: ${r.url || r.link || "-"}\n\n`;
    }
    lines += `_NSFW content - 18+ only_`;
    await m.reply(raraWrap("XNXX Search", lines));
  } catch (err) {
    console.error("[XNXX] Error:", err.message);
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
