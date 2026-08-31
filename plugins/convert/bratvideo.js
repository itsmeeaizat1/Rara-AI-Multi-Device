// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "bratvideo",
  alias: ["bratvideo"],
  aliases: ["bratvideo", "bratvid", "bratvidio", "bratvid2"],
  category: "convert",
  description: "Generator sticker brat video animasi",
  usage: ".bratvideo <text>",
  example: ".bratvideo hai bang",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock, text }) {
  try {
    if (!text) return m.reply(claraWrap("bratvideo", `Kirim teks untuk brat video.\n\nContoh: .${m.command} hai bang`, "guide"));
    if (text.length > 250) return m.reply(claraWrap("bratvideo", "Karakter terbatas, max 250!", "info"));

    await m.react("🕒");

    const res = await axios.get(`https://anomali-api.vercel.app/tools/brat2?q=${encodeURIComponent(text)}`, {
      responseType: "arraybuffer",
      timeout: 60000,
    });

    const tmpDir = path.join(os.tmpdir(), "nova-brat");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, `brat-${Date.now()}.mp4`);
    fs.writeFileSync(outputPath, Buffer.from(res.data));

    await m.react("🐣");
    await sock.sendImageAsSticker(m.chat, outputPath, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });

    setTimeout(() => { try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {} }, 5000);
  } catch (e) {
    console.error("bratvideo error:", e.message);
    await m.react("❌");
    m.reply(claraWrap("bratvideo", "Gagal membuat brat video. API mungkin sedang maintenance.", "error"));
  }
}

export { pluginConfig as config, handler };
