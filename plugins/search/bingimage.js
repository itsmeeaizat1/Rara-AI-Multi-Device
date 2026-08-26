// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import novaApi from "../../src/lib/nova-apimanager.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "bingimage",
  alias: ["bingimage"],
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
      return m.reply( claraWrap("Bingimage", `❌ *Masukkan kata kunci pencarian!*\n\nContoh: ${m.prefix}carigambar rem`), { commandName: "bingimage" });
    }

    await m.react("🕒");

    const apikey = config.APIkey?.neoxr || "Milik-Bot-NovaMD";
    const data = await novaApi.apiFaa.get(
      "/faa/google-image",
      {
        query,
        apikey,
      },
      { timeout: 30000 },
    );

    if (!data.status) {
      return m.reply(claraWrap("bingimage", `❌ *ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ ʜᴀꜱɪʟ ᴜɴᴛᴜᴋ:* ${query}`));
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
    m.reply(claraWrap("bingimage", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
