// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import FormData from "form-data";
import { nexrayUpscale } from "../../src/scraper/nexray-maker.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "toreal",
  alias: ["toreal", "torealistic", "realify", "torealai"],
  category: "tools",
  description: "AI image enhancement — foto jadi realistic HD",
  usage: "Reply/kirim foto dengan caption .toreal",
  example: ".toreal (reply foto)",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, energi: 3, isEnabled: true,
};

async function uploadImage(buffer) {
  try {
    const form = new FormData();
    form.append("file", buffer, "image.jpg");
    const { data } = await axios.post("https://qu.ax/api/upload", form, {
      headers: form.getHeaders(), timeout: 30000,
    });
    return data?.url || data?.data?.url || (typeof data === "string" ? data : null);
  } catch (err) {
    console.error("uploadImage qu.ax:", err.message);
    return null;
  }
}

async function handler(m, { sock }) {
  try {
    // Deteksi image
    const quoted = m.quoted;
    const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isImage = m.message?.imageMessage || (quotedMsg && (quotedMsg.imageMessage || quotedMsg.stickerMessage));

    if (!isImage) {
      return m.reply(claraWrap("toreal", `Kirim/reply foto dengan caption ${m.prefix}toreal untuk enhance ke realistic.`, "guide"));
    }

    await m.react("🕒");

    // Download image
    let imageBuffer;
    try {
      if (quoted) {
        imageBuffer = await quoted.download();
      } else {
        imageBuffer = await m.download();
      }
    } catch (e) {
      await m.react("❌");
      return m.reply("❌ Gagal download foto.");
    }

    if (!imageBuffer) {
      await m.react("❌");
      return m.reply("❌ Foto tidak ditemukan.");
    }

    // Upload ke qu.ax
    const imageUrl = await uploadImage(imageBuffer);
    if (!imageUrl) {
      await m.react("❌");
      return m.reply("❌ Gagal upload foto. Coba lagi.");
    }

    // Upscale via nexray
    const result = await nexrayUpscale(imageUrl);

    if (!result.status || !result.buffer) {
      await m.react("❌");
      return m.reply("❌ Gagal enhance foto. API mungkin sedang down.");
    }

    await m.react("🐣");
    const caption = `✅ *TO REAL* Image enhanced to realistic
Engine: nexray AI`;
    return await sock.sendMessage(m.chat, { image: result.buffer, caption });
  } catch (err) {
    console.error("toreal error:", err);
    await m.react("❌");
    return m.reply(`❌ ${err.message || "Error"}`);
  }
}

export { pluginConfig as config, handler };
