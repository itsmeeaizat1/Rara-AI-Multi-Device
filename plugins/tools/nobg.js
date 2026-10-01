// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { pixa } from "../../src/scraper/removebackground.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "nobg",
  alias: ["nobg", "removebg", "hapusbg"],
  category: "tools",
  description: "Menghapus background dari gambar",
  usage: ".nobg (reply gambar)",
  example: ".nobg",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage"));
    if (!isImage) {
      return m.reply(raraWrap("nobg", "Reply atau kirim gambar dengan caption .nobg untuk menghapus background.", "guide"));
    }

    await m.react("🕒");

    let mediaBuffer;
    if (m.isImage && m.download) {
      mediaBuffer = await m.download();
    } else if (m.quoted && m.quoted.download) {
      mediaBuffer = await m.quoted.download();
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      await m.react("❌");
      return m.reply(raraWrap("nobg", "❌ Gagal mengunduh gambar."));
    }

    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, `nobg_${Date.now()}.jpg`);
    fs.writeFileSync(tempPath, mediaBuffer);

    let resultBuffer;
    try {
      resultBuffer = await pixa(tempPath);
    } finally {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (e) {}
    }

    if (!resultBuffer || !Buffer.isBuffer(resultBuffer) || resultBuffer.length === 0) {
      await m.react("❌");
      return m.reply(raraWrap("nobg", "❌ Gagal menghapus background gambar."));
    }

    await m.react("🐣");

    return await sock.sendMessage(
      m.chat,
      {
        image: resultBuffer,
        caption: "✅ *BACKGROUND REMOVED*",
      },
      { quoted: m }
    );
  } catch (err) {
    console.error("nobg error:", err);
    await m.react("❌");
    return m.reply(raraWrap("nobg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
