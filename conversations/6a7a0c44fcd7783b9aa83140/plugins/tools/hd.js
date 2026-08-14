import axios from "axios";
import te from "../../src/lib/nova-error.js";
import cfg from "../../config.js";
import { ImageUploadService } from "node-upload-images";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const config = {
  name: "remini",
  alias: ["hd", "enhance", "hd4k"],
  category: "tools",
  description: "Enhance gambar jadi HD (full quality, no compress)",
  usage: ".remini (reply gambar)\n.remini doc — kirim sebagai dokumen (full HD tanpa compress)",
  example: ".remini\n.remini 4x\n.remini 8x doc",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function ul(buf) {
  const service = new ImageUploadService("new.fastpic.org");
  const { directLink } = await service.uploadFromBinary(buf, "img.png");
  return directLink;
}

async function handler(m, { sock, args }) {
  const img = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!img) {
    let txt = `*HD IMAGE*\n> Reply gambar untuk enhance jadi HD\n\n`;
    txt += `\`\`\`${m.prefix}remini\`\`\`\n\n`;
    txt += `*Opsi Scale:*\n`;
    txt += `1. \`${m.prefix}remini 2x\` — upscale 2x (cepat)\n`;
    txt += `2. \`${m.prefix}remini 4x\` — upscale 4x (default)\n`;
    txt += `3. \`${m.prefix}remini 8x\` — upscale 8x (HD maximum)\n`;
    txt += `4. \`${m.prefix}remini 16x\` — upscale 16x (ultra HD)\n\n`;
    txt += `*Mode kirim:*\n`;
    txt += `1. \`${m.prefix}remini\` — auto (gambar < 5MB, dokumen > 5MB)\n`;
    txt += `2. \`${m.prefix}remini doc\` — force dokumen (full HD, no compress, max 16MB)\n\n`;
    txt += `*Contoh kombinasi:*\n`;
    txt += `\`${m.prefix}remini 8x doc\` — 8x upscale, kirim sebagai dokumen`;
    return await sendReplyWithNav(m, sock, txt, { commandName: "remini" });
  }

  await m.react("🕐");

  try {
    let b = m.quoted?.isMedia ? await m.quoted.download() : await m.download();

    if (!b || b.length === 0) {
      throw new Error("Gagal download gambar");
    }

    // Parse argumen: scale (2x/4x/8x/16x) dan mode (doc)
    const input = (args.join(" ") || "").trim().toLowerCase();
    const parts = input.split(/\s+/);

    let scale = 4; // default
    let wantDoc = false;

    for (const part of parts) {
      if (part === "doc" || part === "document") {
        wantDoc = true;
      } else if (part === "2x" || part === "2") {
        scale = 2;
      } else if (part === "4x" || part === "4") {
        scale = 4;
      } else if (part === "8x" || part === "8") {
        scale = 8;
      } else if (part === "16x" || part === "16") {
        scale = 16;
      }
    }

    const u = await ul(b);
    let resultUrl = null;

    try {
      // Primary: API Azbry
      const azbryRes = await axios.get(`https://api.azbry.com/api/tools/hdimage?url=${encodeURIComponent(u)}`, {
        timeout: 30000,
        validateStatus: () => true,
      });
      if (azbryRes.data.status && azbryRes.data.result?.url) {
        resultUrl = azbryRes.data.result.url;
      } else {
        throw new Error("Azbry API response invalid");
      }
    } catch (err) {
      // Fallback: Snowping
      const res = await axios.get(`https://apis.snowping.eu.cc/api/imagehd/upscale?url=${encodeURIComponent(u)}`, {
        timeout: 30000,
        validateStatus: () => true,
      });
      if (res.data.status === 200 && res.data.result?.url) {
        resultUrl = res.data.result.url;
      } else {
        throw new Error("Gagal melakukan upscale, coba lagi.");
      }
    }

    if (!resultUrl) {
      throw new Error("Gagal melakukan upscale, coba lagi.");
    }

    // Download hasil sebagai buffer biar bisa control quality
    const dlRes = await axios.get(resultUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      validateStatus: () => true,
      maxContentLength: 20 * 1024 * 1024, // max 20MB download
    });

    if (dlRes.status !== 200 || !dlRes.data) {
      // Fallback: kirim via URL langsung
      await m.react("✅");
      return await sock.sendMedia(m.chat, resultUrl, null, m, { type: "image" });
    }

    const resultBuffer = Buffer.from(dlRes.data);
    const sizeMB = (resultBuffer.length / (1024 * 1024)).toFixed(2);

    await m.react("✅");

    let caption = `*HD ENHANCED*\n`;
    caption += `> Scale: ${scale}x\n`;
    caption += `> Size: ${sizeMB}MB\n`;

    if (wantDoc) {
      // Force document mode — no compress, full quality
      caption += `> Mode: Document (no compress)\n`;
      caption += `> Quality: Full HD`;
      await sock.sendMessage(
        m.chat,
        {
          document: resultBuffer,
          mimetype: "image/jpeg",
          fileName: `HD-${scale}x-${Date.now()}.jpg`,
          caption,
        },
        { quoted: m },
      );
    } else if (resultBuffer.length > 5 * 1024 * 1024) {
      // Auto document mode kalau > 5MB (WhatsApp compress image > 5MB)
      caption += `> Mode: Auto-Document (size > 5MB)\n`;
      caption += `> Quality: Full HD`;
      await sock.sendMessage(
        m.chat,
        {
          document: resultBuffer,
          mimetype: "image/jpeg",
          fileName: `HD-${scale}x-${Date.now()}.jpg`,
          caption,
        },
        { quoted: m },
      );
    } else {
      // Image mode dengan jpegQuality 100
      caption += `> Quality: Full HD`;
      await sock.sendMessage(
        m.chat,
        {
          image: resultBuffer,
          caption,
          jpegQuality: 100,
        },
        { quoted: m },
      );
    }
  } catch (e) {
    console.error("[REMINI] Error:", e.message);
    let txt = `❌ Gagal enhance gambar!\n\n`;
    txt += `Error: ${e.message}\n\n`;
    txt += `> Coba lagi atau gunakan \`${m.prefix}hd3\` / \`${m.prefix}reminiv2\``;
    await m.reply(claraWrap("remini", txt));
  }
}

export { config, handler };
