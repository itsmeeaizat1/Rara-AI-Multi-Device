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

const ENDPOINTS = [
  "https://image.pollinations.ai/prompt/",
  "https://api.miaou.xyz/api/txt2img",
  "https://api.zeks.xyz/api/txt2img",
];

const pluginConfig = {
  name: "aiimggen2",
  alias: ["aiimggen2", "aiimggen"],
  category: 'ai image',
  description: "Generate gambar dari teks",
  usage: ".aiimggen <prompt>",
  example: ".aiimggen sunset over mountains",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "aiimggen2",
  description: "Generate gambar dari teks",
  usage: `${prefix}aiimggen <prompt>`,
  example: `${prefix}aiimggen sunset over mountains`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text, "aiimggen");
      return { handled: true };
    }

    let buffer = null;
    for (const baseUrl of ENDPOINTS) {
      try {
        const res = await axios.get(baseUrl, {
          params: { prompt },
          responseType: "arraybuffer",
          timeout: 60000,
        });
        if (res.status === 200 && res.data && res.data.length > 1000) {
          buffer = Buffer.from(res.data);
          break;
        }
      } catch (e) { console.error('[aiimggen.js]:', e.message); }
    }

    if (!buffer) throw new Error("Gagal generate gambar nih");

    const filePath = tempPath(".png");
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      image: fs.readFileSync(filePath),
      caption: `AI Image: ${prompt.slice(0, 200)}`,
    }, { quoted: m });

    const text =
      claraWrap("AI Image", [`Prompt: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`,
        "Status: *Berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}aiimggen <prompt> untuk gambar lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("AIImgGen", "Gagal nih, coba lagi ya");

    await m.reply(text, "aiimggen");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
