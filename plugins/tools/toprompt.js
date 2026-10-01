// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import imgtoprompt from "../../src/scraper/img2prompt.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "toprompt",
  alias: ["toprompt"],
  category: "tools",
  description: "Menganalisis gambar dan menghasilkan prompt AI (Image to Prompt)",
  usage: ".toprompt (reply gambar)",
  example: ".toprompt",
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
      return m.reply(raraWrap("toprompt", "Reply atau kirim gambar dengan caption .toprompt untuk mendapatkan prompt AI.", "guide"));
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
      return m.reply(raraWrap("toprompt", "❌ Gagal mengunduh gambar."));
    }

    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, `toprompt_${Date.now()}.webp`);
    fs.writeFileSync(tempPath, mediaBuffer);

    let result;
    try {
      result = await imgtoprompt(tempPath);
    } finally {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (e) {}
    }

    if (!result || result.status === "eror" || !result.prompt) {
      await m.react("❌");
      return m.reply(raraWrap("toprompt", `❌ Gagal menghasilkan prompt: ${result?.msg || "Tidak ada deskripsi"}`));
    }

    await m.react("🐣");

    let responseText = `🎨 *IMAGE TO PROMPT*\n\n`;
    responseText += `\`\`\`${result.prompt.trim()}\`\`\``;

    return m.reply(responseText);
  } catch (err) {
    console.error("toprompt error:", err);
    await m.react("❌");
    return m.reply(raraWrap("toprompt", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
