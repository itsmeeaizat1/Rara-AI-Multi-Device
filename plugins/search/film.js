// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import axios from "axios";
import config from "../../config.js";
import fs from "fs";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

const pluginConfig = {
  name: "film",
  alias: ["film"],
  category: "search",
  description: "Cari film dan nonton online",
  usage: ".film <judul>",
  example: ".film civil war",
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const filmSessions = new Map();

async function handler(m, { sock }) {
  const args = m.args || [];
  const query = args.join(" ").trim();

  if (!query) {
    return m.reply( `🎬 *ꜰɪʟᴍ ꜱᴇᴀʀᴄʜ*\n\n` +
        `Cari dan nonton film online\n\n` +
        `*ꜰᴏʀᴍᴀᴛ:*\n` +
        `\`${m.prefix}film <judul>\`\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `\`${m.prefix}film civil war\``, "film");
  }


  try {
    const apiUrl = `https://api.neoxr.eu/api/film?q=${encodeURIComponent(query)}&apikey=${NEOXR_APIKEY}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });

    if (!data?.status || !data?.data?.length) {
      return m.reply(
        `❌ *ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\nFilm "${query}" tidak ditemukan`,
      );
    }

    const films = data.data.slice(0, 10);

    filmSessions.set(m.sender, {
      films,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      filmSessions.delete(m.sender);
    }, 300000);

    let text = `🎬 *ʜᴀꜱɪʟ ᴘᴇɴᴄᴀʀɪᴀɴ*\n\n`;
    text += `Ditemukan *${films.length}* film untuk "${query}"\n\n`;

    films.forEach((f, i) => {
      text += `*${i + 1}. ${f.title}*\n`;
      text += `⭐ ${f.rating} | 📺 ${f.quality} | 📅 ${f.release}\n\n`;
    });

    text += `_Pilih film dari list di bawah_`;

    const listItems = films.map((f, i) => ({
      header: "",
      title: f.title,
      description: `⭐ ${f.rating} | ${f.quality} | ${f.release}`,
      id: `${m.prefix}filmget ${f.url}`,
    }));

    await sock.sendButton(
      m.chat,
      getAssetBuffer("example"),
      text,
      m,
      {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🎬 Pilih Film",
              sections: [
                {
                  title: "Hasil Pencarian",
                  rows: listItems,
                },
              ],
            }),
          },
        ],
        footer: "🎬 Film Search",
      },
    );
  } catch (error) {
    m.reply(claraWrap("film", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
