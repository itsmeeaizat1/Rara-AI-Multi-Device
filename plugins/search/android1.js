// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import axios from "axios";
import config from "../../config.js";
import fs from "fs";
import { getDatabase } from "../../src/lib/nova-database.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "android1",
  alias: ["android1"],
  category: "search",
  description: "Cari dan download APK MOD dari Android1",
  usage: ".android1 <query>",
  example: ".android1 Subway Surfer",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];
  const text = m.text?.trim();

  if (!text) {
    return m.reply( `📱 *Android1 sEarch*\n\n` +
        `🔍 \`${m.prefix}android1 <query>\` - Cari APK\n` +
        `\n` +
        `Contoh:\n` +
        `\`${m.prefix}android1 Subway Surfer\``, "android1");
  }
  try {
    const { data } = await axios.get(
      `https://api.neoxr.eu/api/an1?q=${encodeURIComponent(text)}&apikey=${NEOXR_APIKEY}`,
      {
        timeout: 30000,
      },
    );

    if (!data?.status || !data?.data?.length) {
      return m.reply(`Gak nemu hasil untuk: ${text} nih`);
    }

    const apps = data.data.slice(0, 10);

    if (!db.db.data.sessions) db.db.data.sessions = {};
    const sessionKey = `an1_${m.sender}`;
    db.db.data.sessions[sessionKey] = {
      results: apps,
      query: text,
      timestamp: Date.now(),
    };
    db.save();

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

    let caption = `📱 Hasil dari pencarian apk mod *${text}*\n`;
    caption += `*${apps.length}* aplikasi ditemukan\n\n`;

    apps.forEach((app, i) => {
      caption += `*${i + 1}.* ${app.name}\n`;
      caption += `   ├ 👤 ${app.developer}\n`;
      caption += `   └ ⭐ ${app.rating}/5\n\n`;
    });

    caption += `Pilih angka untuk download langsung`;

    const buttons = apps.slice(0, 10).map((app, i) => ({
      title: `${i + 1}. ${app.name.substring(0, 20)}`,
      description: `${app.developer} • ⭐${app.rating}`,
      id: `${m.prefix}android1-get ${app.url}`,
    }));
    await sock.sendButton(
      m.chat,
      getAssetBuffer("search-thumb"),
      caption,
      m,
      {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "Pilih APK",
              sections: [
                {
                  title: "APK nya",
                  rows: buttons,
                },
              ],
            }),
          },
        ],
        footer: "📱 Android1 Search",
      },
    );
  } catch (err) {
    return m.reply(novaWrap("android1", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
