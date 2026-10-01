// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { raraError, raraEmpty, raraGuide, raraNoInput,  tipText,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `aiav_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const ENDPOINTS = [
  "https://image.pollinations.ai/prompt/",
  "https://api.miaou.xyz/api/txt2img",
  "https://api.zeks.xyz/api/txt2img",
];

const pluginConfig = {
  name: "aiavatar",
  alias: ["aiavatar"],
  category: "ai",
  description: "Buat avatar/profil picture AI",
  usage: ".ai-avatar <prompt>",
  example: ".ai-avatar cyberpunk girl portrait",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const prompt = m.text?.trim();

    if (!prompt) {
      const text =
        raraCaption({
  emoji: "🤖",
  name: "aiavatar",
  description: "Buat avatar/profil picture AI",
  usage: `${prefix}ai-avatar <prompt>`,
  example: `${prefix}ai-avatar cyberpunk girl portrait`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "ai-avatar");
      return { handled: true };
    }

    const avatarPrompt = `avatar profile picture, ${prompt}, high quality, centered, clean background`;
    let buffer = null;

    for (const baseUrl of ENDPOINTS) {
      try {
        const res = await axios.get(baseUrl, {
          params: { prompt: avatarPrompt },
          responseType: "arraybuffer",
          timeout: 60000,
        });
        if (res.status === 200 && res.data && res.data.length > 1000) {
          buffer = Buffer.from(res.data);
          break;
        }
      } catch (e) { console.error('[ai-avatar.js]:', e.message); }
    }

    if (!buffer) throw new Error("Gagal generate avatar nih");

    const filePath = tempPath(".png");
    fs.writeFileSync(filePath, buffer);

    await sock.sendMessage(m.chat, {
      image: fs.readFileSync(filePath),
      caption: `AI Avatar: ${prompt.slice(0, 200)}`,
    }, { quoted: m });

    const text =
      raraWrap("AI Avatar", [`Prompt: *${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`,
        "Status: *berhasil*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}ai-avatar <prompt> untuk avatar lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      raraError("AIAvatar", "Gagal nih, coba lagi ya");

    await m.reply(text, "ai-avatar");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
