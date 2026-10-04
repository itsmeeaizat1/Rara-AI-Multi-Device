// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { bratVid } from "brat-canvas/video";
import fs from "fs";
import path from "path";
import os from "os";
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "bratvideo",
  alias: ["bratvideo"],
  category: "convert",
  description: "Generator sticker brat video animasi (lokal canvas)",
  usage: ".bratvideo <text>",
  example: ".bratvideo hai bang",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock, text }) {
  try {
    if (!text) {
      return m.reply(raraWrap("bratvideo", `Kirim teks untuk brat video.\n\nContoh: .${m.command} hai bang`, "guide"));
    }
    if (text.length > 250) {
      return m.reply(raraWrap("bratvideo", "Karakter terbatas, max 250!", "info"));
    }

    await m.react("🕒");

    const urlOrBuffer = await bratVid(text, { outputFormat: "mp4" });
    
    // bratVid returns URL - download actual buffer
    let buffer
    if (Buffer.isBuffer(urlOrBuffer)) {
      buffer = urlOrBuffer
    } else {
      const axios = (await import('axios')).default
      const res = await axios.get(urlOrBuffer, { responseType: 'arraybuffer', timeout: 30000 })
      buffer = Buffer.from(res.data)
    }

    const tmpDir = path.join(os.tmpdir(), "rara-brat");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, `brat-${Date.now()}.mp4`);
    fs.writeFileSync(outputPath, buffer);

    await m.react("🐣");
    let card = "";
    try {
      const info = await probeMedia("file://" + outputPath);
      card = mediaResultCard({
        header: "bratvideo",
        type: "video",
        request: [["Teks", text]],
        size: info.size, mime: info.mime, width: info.width, height: info.height, duration: info.duration,
      });
    } catch { /* best-effort */ }

    await sock.sendVideoAsSticker(m.chat, outputPath, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });

    setTimeout(() => {
      try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }, 5000);
    if (card) {
      await m.reply(card);
    } else {
      await m.reply(raraBerhasil("bratvideo"));
    }
  } catch (e) {
    console.error("[bratvideo] error:", e.message);
    await m.react("❌");
    m.reply(raraWrap("bratvideo", "Gagal membuat brat video. Coba lagi ya.", "error"));
  }
}

export { pluginConfig as config, handler };
