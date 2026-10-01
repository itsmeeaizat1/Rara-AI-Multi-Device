// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/rara-asset-manager.js";
import axios from "axios";
import config from "../../config.js";
import fs from "fs";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "apkmod",
  alias: ["apkmod"],
  category: "search",
  description: "Cari dan download APK MOD Premium",
  usage: ".apkmod <query>",
  example: ".apkmod vpn",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-RaraMD";

async function handler(m, { sock }) {
  const text = m.text?.trim();

  if (!text) {
    return m.reply( `📱 *apk mod search*\n\n` +
        `Cari APK MOD Premium\n\n` +
        `Contoh:\n` +
        `\`${m.prefix}apkmod vpn\``, "apkmod");
  }
  try {
    const { data } = await axios.get(
      `https://api.neoxr.eu/api/apkmod?q=${encodeURIComponent(text)}&apikey=${NEOXR_APIKEY}`,
      {
        timeout: 30000,
      },
    );

    if (!data?.status || !data?.data?.length) {
      return m.reply(`Gak nemu hasil untuk: ${text} nih`);
    }

    const apps = data.data.slice(0, 15);

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

    let caption = `📱 *Hasil pencarian dari ${text}*\n\n`;

    apps.forEach((app, i) => {
      caption += `*${i + 1}.* ${app.name}\n`;
      caption += `   ├ 🏷️ ${app.version}\n`;
      caption += `   └ 🔓 ${app.mod}\n\n`;
    });

    const buttons = apps.slice(0, 10).map((app, i) => ({
      title: `${i + 1}. ${app.name.substring(0, 24)}`,
      description: `${app.version} • ${app.mod}`,
      id: `${m.prefix}apkmod-get ${i + 1} ${text}`,
    }));

    global.apkmodSession = global.apkmodSession || {};
    global.apkmodSession[m.sender] = {
      results: apps,
      query: text,
      timestamp: Date.now(),
    };
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
              title: "📱 Pilih APK MOD",
              sections: [
                {
                  title: `Hasil untuk "${text}"`,
                  rows: buttons,
                },
              ],
            }),
          },
        ],
        footer: "Pilihlah",
      },
    );
  } catch (err) {
    return m.reply(raraWrap("apkmod", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
