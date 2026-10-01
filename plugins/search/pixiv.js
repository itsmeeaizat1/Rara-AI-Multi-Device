// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "pixiv",
  alias: ["pixiv"],
  category: "search",
  description: "Cari artwork di Pixiv",
  usage: ".pixiv <query>",
  example: ".pixiv rem",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const query = m.args?.join(" ")?.trim();

    if (!query) {
      return m.reply( novaWrap("Pixiv", `❌ *Masukkan kata kunci pencarian!*\n\n💡 *Contoh:* .pixiv rem`), { commandName: "pixiv" });
    }
    const apikey = config.APIkey?.neoxr || "Milik-Bot-NovaMD";
    const url = `https://api.neoxr.eu/api/pixiv-search?q=${encodeURIComponent(query)}&apikey=${apikey}`;

    const response = await axios.get(url, { timeout: 30000 });
    const data = response.data;

    if (!data.status || !data.data || data.data.length === 0) {
      return m.reply(novaWrap("pixiv", `❌ *tidak ditemukan hasil untuk:* ${query}`));
    }

    const results = data.data.slice(0, 10);

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

    let caption = `🎨 *pixiv search*\n`;
    caption += `📝 *kuery:* ${query}\n`;
    caption += `📊 *hasil:* ${results.length} artwork\n\n`;

    results.forEach((art, i) => {
      const aiLabel = art.aiType === 2 ? " 🤖" : "";
      const isNsfw = art.xRestrict > 0 ? " 🔞" : "";
      caption += `*${i + 1}.* ${art.title}${aiLabel}${isNsfw}\n`;
      caption += `   👤 ${art.userName}\n`;
      caption += `   📐 ${art.width}x${art.height} • 📄 ${art.pageCount} page\n`;
      caption += `   🔗 ${art.url}\n\n`;
    });

    caption += `🎨 Powered by Pixiv`;

    const buttons = results.slice(0, 5).map((art, i) => ({
      title: `${art.title.slice(0, 20)}${art.title.length > 20 ? "..." : ""}`,
      description: `by ${art.userName}`,
      id: `.pixivget ${art.url}`,
    }));


    await sock.sendMessage(
      m.chat,
      {
        text: caption,
        contextInfo: {
          forwardingScore: 0,
          isForwarded: false,
        },
      },
      { quoted: m },
    );
  } catch (error) {
    if (error.response?.status === 403) {
      return m.reply(novaWrap("Pixiv", `❌ *api key tidak valid atau limit tercapai*`));
    }
    m.reply(novaWrap("pixiv", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
