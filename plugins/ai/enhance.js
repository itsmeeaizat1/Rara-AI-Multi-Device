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
  return path.join(TMP_DIR, `enhance_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");

    const media = (m.quoted && (m.quoted.isImage || m.quoted.isVideo)) || m.isImage || m.isVideo; // FIX 10 Sep: flags isImage/isVideo
    if (!media) {
      const text =
        novaCaption({
  emoji: "🤖",
  name: "enhance2",
  description: "Enhance kualitas foto/video",
  usage: `${prefix}enhance (reply media)`,
  example: `${prefix}enhance (reply foto)`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(text, "enhance");
      return { handled: true };
    }

    const src = (m.quoted && (m.quoted.isImage || m.quoted.isVideo)) ? m.quoted : m;
    const buffer = await src.download(); // FIX 10 Sep: download() framework, bukan sock.downloadMediaMessage
    const ext = src.isVideo ? ".mp4" : ".png";
    const filePath = tempPath(ext);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    const apiUrl = `https://api.zeks.xyz/api/enhance`;
    const form = new FormData();
    form.append("file", Buffer.from(buffer), `media${ext}`);

    const response = await axios.post(apiUrl, form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
      timeout: 10000,
    });

    const resultBuffer = Buffer.from(response.data);
    const resultExt = ext;
    const resultPath = tempPath(resultExt);
    fs.writeFileSync(resultPath, resultBuffer);

    const caption =
      claraWrap("Enhance", ["Status: *Berhasil*",
        "Model: *AI Enhancement*"].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}enhance untuk enhance media lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    if (resultExt === ".mp4") {
      await sock.sendMessage(m.chat, {
        video: fs.readFileSync(resultPath),
        caption,
      }, { quoted: m });
    } else {
      await sock.sendMessage(m.chat, {
        image: fs.readFileSync(resultPath),
        caption,
      }, { quoted: m });
    }
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Enhance", "Gagal nih, coba lagi ya");

    await m.reply(text, "enhance");
  }

  return { handled: true };
}

const pluginConfig = {
  name: "enhance2",
  alias: ["enhance2", "enhance"],
  category: 'ai image',
  description: "Enhance kualitas foto/video",
  usage: ".enhance (reply media)",
  example: ".enhance (reply foto)",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

export { pluginConfig as config, handler }
