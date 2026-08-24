// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import config from '../../config.js'
import * as timeHelper from '../../src/lib/nova-time.js'
import path from 'path'
import fs from 'fs'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-NovaMD";

const pluginConfig = {
  name: "pixeldraindl",
  alias: ["pddl", "pixeldrain", "pddownload"],
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
    return m.reply( `📥 *Pixeldrain Download*\n\n` +
        `Download file dari Pixeldrain\n\n` +
        `*Format:*\n` +
        `\`${m.prefix}pixeldraindl <url>\`\n\n` +
        `*Contoh:*\n` +
        `\`${m.prefix}pixeldraindl https://pixeldrain.com/u/xxxxx\``, "pixeldraindl");
  }

  m.react("🕒");

  try {
    const apiUrl = `https://api.neoxr.eu/api/pixeldrain?url=${encodeURIComponent(url)}&apikey=${NEOXR_APIKEY}`;
    const data = await f(apiUrl)

    if (!data?.status || !data?.data) {
      return m.reply(
        "❌ *Gagal*\n\n> File tidak ditemukan atau link tidak valid",
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

      await sock.sendMedia(m.chat, file.url, null, m, {
        type: 'document',
        fileName: file.filename,
        mimetype: 'application/octet-stream',
        contextInfo: {
          forwardingScore: 0,
          isForwarded: false
        }
      })
    } else if (sizeInMB > 100) {
      await m.reply(claraWrap("Pixeldraindl", `⚠️ *File Terlalu Besar*\n\n> File ${file.size} terlalu besar untuk dikirim\n> Gunakan link download di atas`));
    }

    m.react("🐣");
  } catch (error) {
    m.reply(claraWrap("pixeldraindl", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler }