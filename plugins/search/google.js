// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { GoogleSearch } from "../../src/scraper/google.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "google",
  alias: ["gsearch", "googlenews"],
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
    return m.reply( `🔍 *ɢᴏᴏɢʟᴇ ɴᴇᴡꜱ*\n\n` +
        `Cari berita terbaru dari Google News.\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `*${m.prefix}google <topik>*\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `*${m.prefix}google gempa hari ini*\n` +
        `*${m.prefix}google teknologi terbaru*`, "google");
  }

  m.react("🕒");

  try {
    const result = await GoogleSearch(query);

    if (!result.status) {
      return m.reply(claraWrap("google", `❌ *ɢᴏᴏɢʟᴇ ɢᴀɢᴀʟ*\n\n${result.error}`));
    }

    const items = result.results.slice(0, 10);

    if (items.length === 0) {
      { const __navText = `❌ Nggak nemu hasil buat: *${query}*`; return await m.reply(__navText); };
    }

    let txt = `🔍 *ɢᴏᴏɢʟᴇ ɴᴇᴡꜱ*\n\n`;
    txt += `Pencarian: *${query}*\n\n`;

    items.forEach((item) => {
      txt += `*${item.index_node}.* ${item.resource_title}\n`;
      txt += `   ├ 📰 ${item.origin_node}\n`;
      txt += `   ├ 🕐 ${item.temporal_stamp}\n`;
      txt += `   └ 🔗 ${item.resolved_endpoint}\n\n`;
    });

    m.reply(txt.trim());
    m.react("🐣");
  } catch (e) {
    console.error(e);
    m.reply(claraWrap("google", "❌ Gagal mencari di Google, coba lagi nanti"));
  }
}

export { pluginConfig as config, handler };
