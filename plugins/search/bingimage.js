// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import raraApi from "../../src/lib/rara-apimanager.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "bingimage",
  alias: ["bingimage", "carigambar"],
  category: "search",
  description: "Cari artwork di Pixiv",
  usage: ".carigambar <query>",
  example: ".carigambar rem",
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
    const query = m.text;

    if (!query) {
      return m.reply( raraWrap("Bingimage", `❌ *Masukkan kata kunci pencarian!*\n\n💡 *Contoh:* ${m.prefix}carigambar rem`), { commandName: "bingimage" });
    }
    const apikey = config.APIkey?.neoxr || "Milik-Bot-RaraMD";
    const data = await raraApi.apiFaa.get(
      "/faa/google-image",
      {
        query,
        apikey,
      },
      { timeout: 30000 },
    );

    if (!data.status) {
      return m.reply(raraWrap("bingimage", `❌ *tidak ditemukan hasil untuk:* ${query}`));
    }
    const results = data.result;
    const album = await Promise.all(
      results.map(async (url) => {
        const res = await axios.get(url, { responseType: "arraybuffer" });
        return {
          image: Buffer.from(res.data),
        };
      }),
    );
    await sock.sendMessage(
      m.chat,
      {
        albumMessage: album,
      },
      { quoted: m },
    );
  } catch (error) {
    console.log(error);
    m.reply(raraWrap("bingimage", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
