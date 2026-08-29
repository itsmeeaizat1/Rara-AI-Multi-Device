// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `aiimg_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        novaCaption({
  emoji: "🎨",
  name: "ai-image",
  description: "Generate gambar dari teks",
  usage: `${prefix}ai-image <prompt>`,
  example: `${prefix}ai-image sunset over mountains`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "ai-image");
      return { handled: true };
    }

    const endpoints = [
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`,
      `https://api.miaou.xyz/api/txt2img?prompt=${encodeURIComponent(prompt)}`,
      `https://api.zeks.xyz/api/txt2img?prompt=${encodeURIComponent(prompt)}`,
    ];

    let buffer = null;
    for (const apiUrl of endpoints) {
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) continue;
        buffer = Buffer.from(await res.arrayBuffer());
        if (buffer && buffer.length > 1000) break;
      } catch (e) { console.error('[ai-image.js]:', e.message); }
    }

    if (!buffer) throw new Error("Gagal generate gambar nih");

    const filePath = tempPath(".png");
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      image: fs.readFileSync(filePath),
      caption: `AI Image: ${prompt.slice(0, 200)}`,
    }, { quoted: m });
    const text =
      claraWrap("AI Image", [`│ Prompt: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`,
        "│ Status: *ʙᴇʀʜᴀꜱɪʟ*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-image <prompt> untuk gambar lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIImage", "Gagal nih, coba lagi ya");

    await m.reply(text, "ai-image");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "ai-image",
  alias: ["ai-image", "ai"],
  category: "ai",
  description: "Generate gambar dari teks",
  usage: ".ai-image <prompt>",
  example: ".ai-image sunset over mountains",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
