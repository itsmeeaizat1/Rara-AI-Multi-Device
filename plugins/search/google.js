// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { GoogleSearch } from "../../src/scraper/google.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "google",
  alias: ["google"],
  category: "search",
  description: "Cari berita di Google News",
  usage: ".google <query>",
  example: ".google gempa hari ini",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.text?.trim();

  if (!query) {
    return m.reply( `🔍 *google news*\n\n` +
        `Cari berita terbaru dari Google News.\n\n` +
        `*cara pakai:*\n` +
        `*${m.prefix}google <topik>*\n\n` +
        `*contoh:*\n` +
        `*${m.prefix}google gempa hari ini*\n` +
        `*${m.prefix}google teknologi terbaru*`, "google");
  }
  try {
    const result = await GoogleSearch(query);

    if (!result.status) {
      return m.reply(novaError("Google", result.error || "Gagal cari nih"));
    }

    const items = result.results.slice(0, 10);

    if (items.length === 0) {
      return m.reply(novaError("Google", `Gak nemu hasil untuk: ${query} nih`));
    }

    let txt = `🔍 *google news*\n\n`;
    txt += `Pencarian: *${query}*\n\n`;

    items.forEach((item) => {
      txt += `*${item.index_node}.* ${item.resource_title}\n`;
      txt += `   ├ 📰 ${item.origin_node}\n`;
      txt += `   ├ 🕐 ${item.temporal_stamp}\n`;
      txt += `   └ 🔗 ${item.resolved_endpoint}\n\n`;
    });

    m.reply(txt.trim());
  } catch (e) {
    console.error(e);
    m.reply(novaError("Google", "Gagal cari di Google nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
