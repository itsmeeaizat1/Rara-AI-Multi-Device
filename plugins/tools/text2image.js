// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "text2image",
  alias: ["text2image", "txt2img"],
  category: "tools",
  description: "Menghasilkan gambar dari deskripsi teks (Text to Image AI)",
  usage: ".text2image <prompt>",
  example: ".text2image a futuristic Cyberpunk city at night",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const prompt = m.args?.join(" ").trim() || (m.quoted && (m.quoted.text || m.quoted.caption));
    if (!prompt) {
      return m.reply(novaWrap("text2image", `Masukkan deskripsi gambar yang ingin dibuat!\n\nContoh: ${m.prefix}text2image a cute cat playing guitar`, "guide"));
    }

    await m.react("🕒");

    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    const res = await axios.get(imgUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    const buffer = Buffer.from(res.data);

    if (!buffer || buffer.length === 0) {
      await m.react("❌");
      return m.reply(novaWrap("text2image", "❌ Gagal menghasilkan gambar dari prompt."));
    }

    await m.react("🐣");

    return await sock.sendMessage(
      m.chat,
      {
        image: buffer,
        caption: `🎨 *TEXT TO IMAGE*\n\nPrompt: ${prompt}`,
      },
      { quoted: m }
    );
  } catch (err) {
    console.error("text2image error:", err);
    await m.react("❌");
    return m.reply(novaWrap("text2image", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
