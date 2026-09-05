// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import * as timeHelper from '../../src/lib/nova-time.js'
import path from 'path'
import fs from 'fs'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine, mediaCaption, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

const pluginConfig = {
  name: "pixeldraindl",
  alias: ["pixeldraindl"],
  category: "download",
  description: "Download file dari Pixeldrain",
  usage: ".pixeldraindl <url>",
  example: ".pixeldraindl https://pixeldrain.com/u/xxxxx",
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.args || [];
  const url = args[0]?.trim();

  if (!url || !url.includes("pixeldrain.com")) {
    return m.reply( `📥 *ᴘɪxᴇʟᴅʀᴀɪɴ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
        `Download file dari Pixeldrain\n\n` +
        `*ꜰᴏʀᴍᴀᴛ:*\n` +
        `\`${m.prefix}pixeldraindl <url>\`\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `\`${m.prefix}pixeldraindl https://pixeldrain.com/u/xxxxx\``, "pixeldraindl");
  }
  try {
        await m.react("🕒");
    const apiUrl = `https://api.neoxr.eu/api/pixeldrain?url=${encodeURIComponent(url)}&apikey=${NEOXR_APIKEY}`;
    const data = await f(apiUrl)

    if (!data?.status || !data?.data) {
      return m.reply(
        novaError("PixelDrain", "File gak nemu nih — cek linknya ya"),
      );
    }

    const file = data.data;

    const sizeMatch = file.size?.match(/([\d.]+)\s*(MB|GB|KB)/i);
    let sizeInMB = 0;
    if (sizeMatch) {
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      if (unit === "GB") sizeInMB = value * 1024;
      else if (unit === "MB") sizeInMB = value;
      else if (unit === "KB") sizeInMB = value / 1024;
    }

    if (sizeInMB > 0 && sizeInMB <= 100) {

      const _cap = mediaCaption({ platformIcon: "🟦", platformName: "PixelDrain", title: file.name || "PixelDrain File", format: "File", method: "pixeldrain" });
      await sock.sendMessage(m.chat, {
        document: { url: file.url }, caption: _cap,
        fileName: file.filename,
        mimetype: 'application/octet-stream',
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m })
    } else if (sizeInMB > 100) {
      await m.reply(claraWrap("Pixeldraindl", `⚠️ *ꜰɪʟᴇ ᴛᴇʀʟᴀʟᴜ ʙᴇꜱᴀʀ*\n\nFile ${file.size} terlalu besar untuk dikirim\nGunakan link download di atas`));
    }
      await m.react("🐣"); await m.react("🐣"); m.reply(novaBerhasil("pixeldraindl"));
  } catch (error) {
    m.reply(novaGangguan("PixelDrain"));
  }
}

export { pluginConfig as config, handler }